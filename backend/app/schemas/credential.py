from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CredentialCreate(BaseModel):
    credential_type: str = Field(min_length=2, max_length=40)
    title: str = Field(min_length=2, max_length=120)
    authority: str = Field(min_length=2, max_length=120)

    license_number: str | None = Field(default=None, max_length=120)
    valid_from: date | None = None
    expires_at: date | None = None

    document_url: str | None = Field(default=None, max_length=1024)
    notes: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.valid_from and self.expires_at and self.expires_at < self.valid_from:
            raise ValueError("expires_at must be on or after valid_from")
        return self


class CredentialRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    credential_type: str
    title: str
    authority: str

    license_number: str | None
    valid_from: date | None
    expires_at: date | None

    document_url: str | None
    notes: str | None
