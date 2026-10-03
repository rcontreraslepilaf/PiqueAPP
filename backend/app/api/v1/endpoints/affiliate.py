import json
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter

from app.schemas.affiliate import AffiliateRecommendationRead

router = APIRouter(prefix="/affiliate", tags=["affiliate"])

_CACHE: dict[str, Any] = {
    "expires_at": 0.0,
    "items": [],
}

CACHE_SECONDS = int(os.getenv("AFFILIATE_CACHE_SECONDS", "1800"))


def _configured_products() -> list[dict[str, str]]:
    """
    Ejemplo de AFFILIATE_PRODUCTS_JSON:

    [
      {
        "platform": "mercadolibre",
        "item_id": "MLC123456789",
        "affiliate_url": "https://...",
        "label": "Mercado Libre"
      }
    ]

    La URL debe ser el enlace real generado por el programa de afiliados.
    """
    raw = os.getenv("AFFILIATE_PRODUCTS_JSON", "[]")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return []

    if not isinstance(payload, list):
        return []

    result: list[dict[str, str]] = []

    for item in payload:
        if not isinstance(item, dict):
            continue

        platform = str(item.get("platform", "")).strip().lower()
        item_id = str(item.get("item_id", "")).strip()
        affiliate_url = str(item.get("affiliate_url", "")).strip()
        label = str(item.get("label", "")).strip()

        if platform and item_id and affiliate_url:
            result.append(
                {
                    "platform": platform,
                    "item_id": item_id,
                    "affiliate_url": affiliate_url,
                    "label": label,
                }
            )

    return result


async def _mercadolibre_item(
    client: httpx.AsyncClient,
    item_id: str,
    access_token: str,
) -> dict[str, Any] | None:
    response = await client.get(
        f"https://api.mercadolibre.com/items/{item_id}",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    if response.status_code != 200:
        return None

    return response.json()


@router.get(
    "/recommendations",
    response_model=list[AffiliateRecommendationRead],
)
async def affiliate_recommendations() -> list[AffiliateRecommendationRead]:
    """
    Devuelve tarjetas comerciales con datos remotos.

    PiqueAPP NO guarda las imágenes. Solo devuelve image_url y el cliente
    carga la fotografía desde el servidor externo.

    Para Mercado Libre:
    - MERCADOLIBRE_ACCESS_TOKEN: token de la app de desarrollador.
    - AFFILIATE_PRODUCTS_JSON: lista de item_id + affiliate_url oficiales.

    La metadata se conserva brevemente en memoria para no consultar la API
    externa cada vez que un usuario abre la pantalla.
    """
    now_ts = time.time()

    if _CACHE["items"] and now_ts < _CACHE["expires_at"]:
        return _CACHE["items"]

    configured = _configured_products()
    if not configured:
        return []

    ml_token = os.getenv("MERCADOLIBRE_ACCESS_TOKEN", "").strip()

    results: list[AffiliateRecommendationRead] = []
    fetched_at = datetime.now(timezone.utc)

    async with httpx.AsyncClient(timeout=10.0) as client:
        for product in configured:
            platform = product["platform"]

            if platform != "mercadolibre":
                # Preparado para futuros proveedores.
                # No se inventan APIs ni enlaces de otras plataformas.
                continue

            if not ml_token:
                continue

            data = await _mercadolibre_item(
                client,
                product["item_id"],
                ml_token,
            )

            if not data:
                continue

            pictures = data.get("pictures") or []
            first_picture = pictures[0] if pictures else {}
            image_url = (
                first_picture.get("secure_url")
                or first_picture.get("url")
            )

            raw_price = data.get("price")
            price = (
                float(raw_price)
                if isinstance(raw_price, (int, float))
                else None
            )

            results.append(
                AffiliateRecommendationRead(
                    platform="mercadolibre",
                    platform_label=product["label"] or "Mercado Libre",
                    item_id=product["item_id"],
                    title=str(data.get("title") or product["item_id"]),
                    image_url=image_url,
                    price=price,
                    currency=data.get("currency_id"),
                    affiliate_url=product["affiliate_url"],
                    source_url=data.get("permalink"),
                    fetched_at=fetched_at,
                )
            )

    _CACHE["items"] = results
    _CACHE["expires_at"] = now_ts + CACHE_SECONDS

    return results
