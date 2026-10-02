from __future__ import annotations

from uuid import UUID

from sqlalchemy import ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class TrophyLike(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "trophy_likes"
    __table_args__ = (
        UniqueConstraint(
            "trophy_id",
            "user_id",
            name="uq_trophy_likes_trophy_user",
        ),
    )

    trophy_id: Mapped[UUID] = mapped_column(
        ForeignKey("trophies.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )


class TrophyComment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "trophy_comments"

    trophy_id: Mapped[UUID] = mapped_column(
        ForeignKey("trophies.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
