import math
import secrets
from dataclasses import dataclass

from geoalchemy2.elements import WKTElement

from app.models.enums import GeoPrivacy


@dataclass(frozen=True)
class PublicLocation:
    geography: WKTElement | None
    latitude: float | None
    longitude: float | None


def _offset_coordinate(latitude: float, longitude: float, radius_m: int) -> tuple[float, float]:
    # Uniform-enough random point inside a circle for public obfuscation.
    angle = (secrets.randbelow(1_000_000) / 1_000_000) * 2 * math.pi
    distance = math.sqrt(secrets.randbelow(1_000_000) / 1_000_000) * radius_m
    delta_lat = distance * math.cos(angle) / 111_320
    lon_scale = max(math.cos(math.radians(latitude)), 0.1)
    delta_lon = distance * math.sin(angle) / (111_320 * lon_scale)
    return latitude + delta_lat, longitude + delta_lon


def geography_point(latitude: float, longitude: float) -> WKTElement:
    return WKTElement(f"POINT({longitude} {latitude})", srid=4326)


def make_public_location(latitude: float | None, longitude: float | None, privacy: GeoPrivacy) -> PublicLocation:
    if latitude is None or longitude is None:
        return PublicLocation(None, None, None)
    if privacy in {GeoPrivacy.PRIVATE, GeoPrivacy.REGION_ONLY}:
        return PublicLocation(None, None, None)
    if privacy == GeoPrivacy.EXACT:
        return PublicLocation(geography_point(latitude, longitude), latitude, longitude)

    radius = 1_000 if privacy == GeoPrivacy.APPROX_1KM else 5_000
    public_lat, public_lon = _offset_coordinate(latitude, longitude, radius)
    return PublicLocation(geography_point(public_lat, public_lon), public_lat, public_lon)
