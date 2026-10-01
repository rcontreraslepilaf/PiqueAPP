from __future__ import annotations

from uuid import UUID

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import Visibility


class WardrobeItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "wardrobe_items"

    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    catalog_product_id: Mapped[UUID | None] = mapped_column(ForeignKey("catalog_products.id", ondelete="SET NULL"), index=True)
    category: Mapped[str] = mapped_column(String(100), index=True)
    brand: Mapped[str | None] = mapped_column(String(120), index=True)
    model: Mapped[str | None] = mapped_column(String(160), index=True)
    name: Mapped[str] = mapped_column(String(180))
    description: Mapped[str | None] = mapped_column(Text)
    specifications: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(2048))
    visibility: Mapped[Visibility] = mapped_column(Enum(Visibility, name="wardrobe_visibility"), default=Visibility.PUBLIC)

    owner = relationship("User", back_populates="wardrobe_items")
    catalog_product = relationship("CatalogProduct")
    trophies = relationship("Trophy", secondary="trophy_equipment", back_populates="equipment")
