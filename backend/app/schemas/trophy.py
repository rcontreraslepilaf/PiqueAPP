from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import ActivityType, GeoPrivacy, ReleaseStatus, Visibility


class TrophyCreate(BaseModel):
    activity_type: ActivityType = ActivityType.FISHING
    species_name: str = Field(min_length=2, max_length=160)
    title: str = Field(min_length=2, max_length=180)
    description: str | None = None
    weight_kg: Decimal | None = Field(default=None, ge=0)
    length_cm: Decimal | None = Field(default=None, ge=0)
    captured_at: datetime
    release_status: ReleaseStatus = ReleaseStatus.NOT_APPLICABLE
    visibility: Visibility = Visibility.PUBLIC
    geo_privacy: GeoPrivacy = GeoPrivacy.REGION_ONLY
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    public_region: str | None = Field(default=None, max_length=160)
    environmental_snapshot: dict | None = None
    equipment_ids: list[UUID] = Field(default_factory=list)

    @model_validator(mode="after")
    def coordinates_are_paired(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be sent together")
        return self


class TrophyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    activity_type: ActivityType
    species_name: str
    title: str
    description: str | None
    weight_kg: Decimal | None
    length_cm: Decimal | None
    captured_at: datetime
    release_status: ReleaseStatus
    visibility: Visibility
    geo_privacy: GeoPrivacy
    public_latitude: float | None
    public_longitude: float | None
    public_region: str | None
    environmental_snapshot: dict | None
    created_at: datetime
