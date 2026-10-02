from app.models.catalog import CatalogProduct, ProductEvidence, ProductMedia, ProductReview
from app.models.credential import Credential
from app.models.gear import WardrobeItem
from app.models.offer import DealReport, DealValidation, Merchant, PriceHistory, ProductOffer
from app.models.social import TrophyComment, TrophyLike
from app.models.spot import Spot
from app.models.trophy import Trophy, TrophyMedia, trophy_equipment
from app.models.user import Profile, User

__all__ = [
    "User",
    "Profile",
    "Credential",
    "Trophy",
    "TrophyMedia",
    "TrophyLike",
    "TrophyComment",
    "Spot",
    "WardrobeItem",
    "CatalogProduct",
    "ProductMedia",
    "ProductEvidence",
    "ProductReview",
    "Merchant",
    "ProductOffer",
    "PriceHistory",
    "DealReport",
    "DealValidation",
    "trophy_equipment",
]
