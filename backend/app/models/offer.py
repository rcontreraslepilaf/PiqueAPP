from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from geoalchemy2 import Geography
from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import OfferValidationStatus, StockStatus


class Merchant(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "merchants"

    name: Mapped[str] = mapped_column(String(180), index=True)
    website_url: Mapped[str | None] = mapped_column(String(2048))
    merchant_type: Mapped[str] = mapped_column(String(50), default="online")
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)

    offers = relationship("ProductOffer", back_populates="merchant")


class ProductOffer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_offers"

    product_id: Mapped[UUID] = mapped_column(ForeignKey("catalog_products.id", ondelete="CASCADE"), index=True)
    merchant_id: Mapped[UUID] = mapped_column(ForeignKey("merchants.id", ondelete="CASCADE"), index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    normal_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="CLP")
    product_url: Mapped[str | None] = mapped_column(String(2048))
    stock_status: Mapped[StockStatus] = mapped_column(Enum(StockStatus, name="stock_status"), default=StockStatus.UNKNOWN)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    product = relationship("CatalogProduct", back_populates="offers")
    merchant = relationship("Merchant", back_populates="offers")
    history: Mapped[list[PriceHistory]] = relationship(back_populates="offer", cascade="all, delete-orphan")


class PriceHistory(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "price_history"

    offer_id: Mapped[UUID] = mapped_column(ForeignKey("product_offers.id", ondelete="CASCADE"), index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    offer: Mapped[ProductOffer] = relationship(back_populates="history")


class DealReport(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "deal_reports"

    reporter_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[UUID] = mapped_column(ForeignKey("catalog_products.id", ondelete="CASCADE"), index=True)
    merchant_id: Mapped[UUID | None] = mapped_column(ForeignKey("merchants.id", ondelete="SET NULL"), index=True)
    merchant_name: Mapped[str] = mapped_column(String(180))
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    normal_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="CLP")
    url: Mapped[str | None] = mapped_column(String(2048))
    notes: Mapped[str | None] = mapped_column(Text)
    store_location = mapped_column(Geography(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True)
    store_region: Mapped[str | None] = mapped_column(String(160), index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    validations: Mapped[list[DealValidation]] = relationship(back_populates="deal", cascade="all, delete-orphan")


class DealValidation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "deal_validations"
    __table_args__ = (UniqueConstraint("deal_id", "user_id", name="uq_deal_validation_user"),)

    deal_id: Mapped[UUID] = mapped_column(ForeignKey("deal_reports.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[OfferValidationStatus] = mapped_column(Enum(OfferValidationStatus, name="offer_validation_status"))

    deal: Mapped[DealReport] = relationship(back_populates="validations")
