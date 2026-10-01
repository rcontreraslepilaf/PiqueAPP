from enum import StrEnum


class ActivityType(StrEnum):
    FISHING = "fishing"
    HUNTING = "hunting"
    OUTDOOR = "outdoor"
    BOTH = "both"


class Visibility(StrEnum):
    PRIVATE = "private"
    FOLLOWERS = "followers"
    PUBLIC = "public"


class GeoPrivacy(StrEnum):
    EXACT = "exact"
    APPROX_1KM = "approx_1km"
    APPROX_5KM = "approx_5km"
    REGION_ONLY = "region_only"
    PRIVATE = "private"


class ReleaseStatus(StrEnum):
    RELEASED = "released"
    KEPT = "kept"
    NOT_APPLICABLE = "not_applicable"


class MediaType(StrEnum):
    IMAGE = "image"
    VIDEO = "video"


class OfferValidationStatus(StrEnum):
    AVAILABLE = "available"
    EXPIRED = "expired"
    WRONG_PRICE = "wrong_price"


class StockStatus(StrEnum):
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    UNKNOWN = "unknown"
