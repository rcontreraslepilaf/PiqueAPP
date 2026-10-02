from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import GeoPrivacy, Visibility


class SpotCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=3000)
    spot_type: str = Field(default="fishing", min_length=2, max_length=60)
    visibility: Visibility = Visibility.PRIVATE
    geo_privacy: GeoPrivacy = GeoPrivacy.PRIVATE
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    public_region: str | None = Field(default=None, max_length=160)


class SpotRead(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    description: str | None
    spot_type: str
    visibility: str
    geo_privacy: str
    latitude: float | None
    longitude: float | None
    public_region: str | None
    is_owner: bool
    created_at: datetime
