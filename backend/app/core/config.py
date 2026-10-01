from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Pesca & Outdoor API"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"

    database_url: str = "postgresql+psycopg://pesca:pesca_dev_password@db:5432/pesca_outdoor"
    jwt_secret: str = "replace-this-secret"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 30
    cors_origins: list[str] | str = ["http://localhost:8081", "http://localhost:19006", "http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
