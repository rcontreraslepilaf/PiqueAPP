from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from geoalchemy2 import Geography
from sqlalchemy import DateTime, Enum, Float, ForeignKey, Numeric, String, Table, Column, Uuid, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ActivityType, GeoPrivacy, MediaType, ReleaseStatus, Visibility


trophy_equipment = Table(
    "trophy_equipment",
    Base.metadata,
    Column("trophy_id", Uuid, ForeignKey("trophies.id", ondelete="CASCADE"), primary_key=True),
    Column("wardrobe_item_id", Uuid, ForeignKey("wardrobe_items.id", ondelete="CASCADE"), primary_key=True),
)


class Trophy(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "trophies"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    activity_type: Mapped[ActivityType] = mapped_column(Enum(ActivityType, name="trophy_activity_type"), default=ActivityType.FISHING)
    species_name: Mapped[str] = mapped_column(String(160), index=True)
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str | None] = mapped_column(Text)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    length_cm: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    release_status: Mapped[ReleaseStatus] = mapped_column(
        Enum(ReleaseStatus, name="release_status"), default=ReleaseStatus.NOT_APPLICABLE
    )
    visibility: Mapped[Visibility] = mapped_column(Enum(Visibility, name="trophy_visibility"), default=Visibility.PUBLIC)
    geo_privacy: Mapped[GeoPrivacy] = mapped_column(Enum(GeoPrivacy, name="geo_privacy"), default=GeoPrivacy.REGION_ONLY)

    # Exact location is returned only to the owner (or authorized services).
    exact_location = mapped_column(Geography(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True)
    # Public point is already obfuscated. Never derive/obfuscate only in the UI.
    public_location = mapped_column(Geography(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True)
    public_latitude: Mapped[float | None] = mapped_column(Float)
    public_longitude: Mapped[float | None] = mapped_column(Float)
    public_region: Mapped[str | None] = mapped_column(String(160), index=True)
    environmental_snapshot: Mapped[dict | None] = mapped_column(JSONB)

    user = relationship("User", back_populates="trophies")
    media: Mapped[list[TrophyMedia]] = relationship(back_populates="trophy", cascade="all, delete-orphan")
    equipment = relationship("WardrobeItem", secondary=trophy_equipment, back_populates="trophies")
    product_evidence = relationship("ProductEvidence", back_populates="trophy")


class TrophyMedia(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "trophy_media"

    trophy_id: Mapped[UUID] = mapped_column(ForeignKey("trophies.id", ondelete="CASCADE"), index=True)
    media_type: Mapped[MediaType] = mapped_column(Enum(MediaType, name="trophy_media_type"))
    media_url: Mapped[str] = mapped_column(String(2048))
    thumbnail_url: Mapped[str | None] = mapped_column(String(2048))
    metadata_json: Mapped[dict | None] = mapped_column(JSONB)

    trophy: Mapped[Trophy] = relationship(back_populates="media")
