from datetime import datetime

from pydantic import BaseModel


class AffiliateRecommendationRead(BaseModel):
    platform: str
    platform_label: str
    item_id: str
    title: str
    image_url: str | None = None
    price: float | None = None
    currency: str | None = None
    affiliate_url: str
    source_url: str | None = None
    fetched_at: datetime
