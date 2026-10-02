from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FeedItemRead(BaseModel):
    id: UUID
    user_id: UUID
    author_name: str
    species_name: str
    title: str
    description: str | None
    weight_kg: float | None
    length_cm: float | None
    captured_at: datetime
    release_status: str
    public_region: str | None
    public_latitude: float | None
    public_longitude: float | None
    has_image: bool
    like_count: int
    comment_count: int
    liked_by_me: bool


class LikeStateRead(BaseModel):
    liked: bool
    like_count: int


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=1000)


class CommentRead(BaseModel):
    id: UUID
    trophy_id: UUID
    user_id: UUID
    author_name: str
    body: str
    created_at: datetime
