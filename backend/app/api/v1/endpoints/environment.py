from datetime import date

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.services.environment import EnvironmentService

router = APIRouter(prefix="/environment", tags=["environment"])
service = EnvironmentService()


@router.get("/weather/current")
async def current_weather(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    try:
        return await service.current_weather(latitude, longitude)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Weather provider unavailable") from exc


@router.get("/context")
async def outdoor_context(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    return await service.outdoor_context(latitude, longitude)


@router.get("/solunar")
def solunar(day: date | None = None):
    return service.solunar_summary(day or date.today())
