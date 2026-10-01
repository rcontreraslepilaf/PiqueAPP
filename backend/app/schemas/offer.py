from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import OfferValidationStatus


class DealCreate(BaseModel):
    product_id: UUID
    merchant_id: UUID | None = None
    merchant_name: str = Field(min_length=2, max_length=180)
    price: Decimal = Field(gt=0)
    normal_price: Decimal | None = Field(default=None, gt=0)
    currency: str = Field(default="CLP", min_length=3, max_length=3)
    url: str | None = Field(default=None, max_length=2048)
    notes: str | None = None
    store_latitude: float | None = Field(default=None, ge=-90, le=90)
    store_longitude: float | None = Field(default=None, ge=-180, le=180)
    store_region: str | None = Field(default=None, max_length=160)
    expires_at: datetime | None = None


class DealValidationCreate(BaseModel):
    status: OfferValidationStatus


class DealRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reporter_id: UUID
    product_id: UUID
    merchant_id: UUID | None
    merchant_name: str
    price: Decimal
    normal_price: Decimal | None
    currency: str
    url: str | None
    notes: str | None
    store_region: str | None
    expires_at: datetime | None
    created_at: datetime
    available_votes: int = 0
    expired_votes: int = 0
    wrong_price_votes: int = 0
