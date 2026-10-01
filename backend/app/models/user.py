from __future__ import annotations

from uuid import UUID

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ActivityType, Visibility


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    profile: Mapped[Profile | None] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    trophies = relationship("Trophy", back_populates="user", cascade="all, delete-orphan")
    wardrobe_items = relationship("WardrobeItem", back_populates="owner", cascade="all, delete-orphan")
    credentials = relationship("Credential", back_populates="user", cascade="all, delete-orphan")


class Profile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "profiles"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(String(1024))
    cover_url: Mapped[str | None] = mapped_column(String(1024))
    country_code: Mapped[str | None] = mapped_column(String(2))
    region: Mapped[str | None] = mapped_column(String(120))
    activity_preference: Mapped[ActivityType] = mapped_column(Enum(ActivityType, name="activity_type"), default=ActivityType.BOTH)
    profile_visibility: Mapped[Visibility] = mapped_column(Enum(Visibility, name="visibility"), default=Visibility.PUBLIC)

    user: Mapped[User] = relationship(back_populates="profile")
