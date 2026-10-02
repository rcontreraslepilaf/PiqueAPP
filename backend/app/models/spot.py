from __future__ import annotations

from uuid import UUID

from geoalchemy2 import Geography
from sqlalchemy import Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Spot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "spots"
    __table_args__ = (
        Index(
            "ix_spots_exact_location_gist",
            "exact_location",
            postgresql_using="gist",
        ),
        Index(
            "ix_spots_public_location_gist",
            "public_location",
            postgresql_using="gist",
        ),
    )

    owner_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    spot_type: Mapped[str] = mapped_column(
        String(60),
        default="fishing",
        nullable=False,
    )

    # Stored as strings on purpose: the API validates them with the existing
    # Visibility / GeoPrivacy enums, while the DB stays easy to evolve.
    visibility: Mapped[str] = mapped_column(
        String(20),
        default="private",
        index=True,
        nullable=False,
    )
    geo_privacy: Mapped[str] = mapped_column(
        String(30),
        default="private",
        nullable=False,
    )

    exact_location = mapped_column(
        Geography(
            geometry_type="POINT",
            srid=4326,
            spatial_index=False,
        ),
        nullable=False,
    )
    exact_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    exact_longitude: Mapped[float] = mapped_column(Float, nullable=False)

    public_location = mapped_column(
        Geography(
            geometry_type="POINT",
            srid=4326,
            spatial_index=False,
        ),
        nullable=True,
    )
    public_latitude: Mapped[float | None] = mapped_column(Float)
    public_longitude: Mapped[float | None] = mapped_column(Float)
    public_region: Mapped[str | None] = mapped_column(
        String(160),
        index=True,
    )
