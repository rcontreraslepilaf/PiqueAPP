from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.catalog import CatalogProduct
from app.models.enums import ActivityType
from app.models.offer import Merchant


def run() -> None:
    with SessionLocal() as db:
        if not db.scalar(select(CatalogProduct).limit(1)):
            db.add_all(
                [
                    CatalogProduct(
                        brand="Rapala",
                        name="X-Rap 08",
                        model="XR08",
                        category="señuelo",
                        activity_type=ActivityType.FISHING,
                        description="Señuelo tipo minnow/jerkbait para pesca deportiva.",
                        specifications={"length_cm": 8, "weight_g": 7, "type": "minnow"},
                        recommendation_context={"species": ["trucha"], "environments": ["río", "lago"], "regions": []},
                    ),
                    CatalogProduct(
                        brand="Shimano",
                        name="Sedona 2500",
                        model="2500",
                        category="carrete",
                        activity_type=ActivityType.FISHING,
                        description="Carrete spinning de propósito general.",
                        specifications={"size": 2500, "type": "spinning"},
                        recommendation_context={"species": ["trucha", "salmón"], "environments": ["río", "lago"], "regions": []},
                    ),
                ]
            )
        if not db.scalar(select(Merchant).limit(1)):
            db.add(Merchant(name="Tienda Demo Local", merchant_type="physical", is_verified=False))
        db.commit()


if __name__ == "__main__":
    run()
