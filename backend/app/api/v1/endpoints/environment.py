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
    day: date | None = None,
):
    try:
        return await service.current_weather(latitude, longitude, day)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Weather provider unavailable",
        ) from exc


@router.get("/context")
async def outdoor_context(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    day: date | None = None,
):
    return await service.outdoor_context(latitude, longitude, day)


@router.get("/location/reverse")
async def reverse_location(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    return await service.reverse_geocode(latitude, longitude)


@router.get("/locations/search")
async def search_locations(
    q: str = Query(min_length=2, max_length=120),
    limit: int = Query(default=6, ge=1, le=8),
):
    try:
        return await service.search_locations(q, limit)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Location provider unavailable",
        ) from exc


@router.get("/solunar")
def solunar(day: date | None = None):
    return service.solunar_summary(day or date.today())
