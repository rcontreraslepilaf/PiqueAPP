from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Visibility


class WardrobeItemCreate(BaseModel):
    catalog_product_id: UUID | None = None
    category: str = Field(min_length=2, max_length=100)
    brand: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=160)
    name: str = Field(min_length=2, max_length=180)
    description: str | None = None
    specifications: dict = Field(default_factory=dict)
    photo_url: str | None = Field(default=None, max_length=2048)
    visibility: Visibility = Visibility.PUBLIC


class WardrobeItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    catalog_product_id: UUID | None
    category: str
    brand: str | None
    model: str | None
    name: str
    description: str | None
    specifications: dict
    photo_url: str | None
    visibility: Visibility
