from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ActivityType, MediaType, Visibility


class CatalogProduct(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "catalog_products"

    brand: Mapped[str] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(180), index=True)
    model: Mapped[str | None] = mapped_column(String(160), index=True)
    category: Mapped[str] = mapped_column(String(100), index=True)
    activity_type: Mapped[ActivityType] = mapped_column(Enum(ActivityType, name="catalog_activity_type"))
    description: Mapped[str | None] = mapped_column(Text)
    specifications: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    recommendation_context: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    media: Mapped[list[ProductMedia]] = relationship(back_populates="product", cascade="all, delete-orphan")
    evidence: Mapped[list[ProductEvidence]] = relationship(back_populates="product", cascade="all, delete-orphan")
    reviews: Mapped[list[ProductReview]] = relationship(back_populates="product", cascade="all, delete-orphan")
    offers = relationship("ProductOffer", back_populates="product")


class ProductMedia(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_media"

    product_id: Mapped[UUID] = mapped_column(ForeignKey("catalog_products.id", ondelete="CASCADE"), index=True)
    media_type: Mapped[MediaType] = mapped_column(Enum(MediaType, name="product_media_type"))
    media_url: Mapped[str] = mapped_column(String(2048))
    source: Mapped[str] = mapped_column(String(50), default="catalog")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    product: Mapped[CatalogProduct] = relationship(back_populates="media")


class ProductEvidence(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_evidence"

    product_id: Mapped[UUID] = mapped_column(ForeignKey("catalog_products.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    trophy_id: Mapped[UUID | None] = mapped_column(ForeignKey("trophies.id", ondelete="SET NULL"), index=True)
    media_type: Mapped[MediaType] = mapped_column(Enum(MediaType, name="evidence_media_type"))
    media_url: Mapped[str] = mapped_column(String(2048))
    caption: Mapped[str | None] = mapped_column(Text)
    usage_context: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    verified_usage: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    product: Mapped[CatalogProduct] = relationship(back_populates="evidence")
    trophy = relationship("Trophy", back_populates="product_evidence")


class ProductReview(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_reviews"
    __table_args__ = (UniqueConstraint("product_id", "user_id", name="uq_product_review_user"),)

    product_id: Mapped[UUID] = mapped_column(ForeignKey("catalog_products.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    rating: Mapped[int] = mapped_column(Integer)
    title: Mapped[str | None] = mapped_column(String(160))
    comment: Mapped[str] = mapped_column(Text)
    context: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    verified_use: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    product: Mapped[CatalogProduct] = relationship(back_populates="reviews")
