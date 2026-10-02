from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=100)
    bio: str | None = Field(default=None, max_length=1200)
    region: str | None = Field(default=None, max_length=120)


class ProfileSummaryRead(BaseModel):
    user_id: UUID
    email: EmailStr
    username: str
    display_name: str
    bio: str | None
    region: str | None
    avatar_url: str | None
    trophy_count: int
    credential_count: int
    wardrobe_count: int
