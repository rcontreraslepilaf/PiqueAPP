from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ActivityType, MediaType


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    brand: str
    name: str
    model: str | None
    category: str
    activity_type: ActivityType
    description: str | None
    specifications: dict
    recommendation_context: dict
    evidence_count: int = 0
    review_count: int = 0
    average_rating: float | None = None
    lowest_price: Decimal | None = None
    currency: str | None = None
    media_urls: list[str] = Field(default_factory=list)


class ProductCompareRequest(BaseModel):
    product_ids: list[UUID] = Field(min_length=2, max_length=4)


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(default=None, max_length=160)
    comment: str = Field(min_length=3, max_length=5000)
    context: dict = Field(default_factory=dict)


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    user_id: UUID
    rating: int
    title: str | None
    comment: str
    context: dict
    verified_use: bool
    created_at: datetime


class EvidenceCreate(BaseModel):
    trophy_id: UUID | None = None
    media_type: MediaType
    media_url: str = Field(min_length=5, max_length=2048)
    caption: str | None = None
    usage_context: dict = Field(default_factory=dict)


class EvidenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    user_id: UUID
    trophy_id: UUID | None
    media_type: MediaType
    media_url: str
    caption: str | None
    usage_context: dict
    verified_usage: bool
    created_at: datetime
