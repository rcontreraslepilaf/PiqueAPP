from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.catalog import CatalogProduct, ProductEvidence, ProductMedia, ProductReview
from app.models.offer import PriceHistory, ProductOffer
from app.models.trophy import Trophy
from app.models.user import User
from app.schemas.catalog import EvidenceCreate, EvidenceRead, ProductCompareRequest, ProductRead, ReviewCreate, ReviewRead

router = APIRouter(prefix="/catalog", tags=["catalog"])


def enrich_product(product: CatalogProduct, db: Session) -> ProductRead:
    evidence_count = db.scalar(select(func.count()).select_from(ProductEvidence).where(ProductEvidence.product_id == product.id)) or 0
    review_count, avg_rating = db.execute(
        select(func.count(ProductReview.id), func.avg(ProductReview.rating)).where(ProductReview.product_id == product.id)
    ).one()
    lowest = db.execute(
        select(ProductOffer.price, ProductOffer.currency)
        .where(ProductOffer.product_id == product.id)
        .order_by(ProductOffer.price.asc())
        .limit(1)
    ).first()
    return ProductRead(
        **{key: getattr(product, key) for key in [
            "id", "brand", "name", "model", "category", "activity_type", "description", "specifications", "recommendation_context"
        ]},
        evidence_count=evidence_count,
        review_count=review_count or 0,
        average_rating=round(float(avg_rating), 2) if avg_rating is not None else None,
        lowest_price=Decimal(lowest.price) if lowest else None,
        currency=lowest.currency if lowest else None,
        media_urls=list(db.scalars(select(ProductMedia.media_url).where(ProductMedia.product_id == product.id).order_by(ProductMedia.sort_order)).all()),
    )


@router.get("/products", response_model=list[ProductRead])
def search_products(
    q: str | None = Query(default=None, max_length=120),
    category: str | None = None,
    region: str | None = None,
    species: str | None = None,
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    stmt = select(CatalogProduct).where(CatalogProduct.is_active.is_(True))
    if q:
        needle = f"%{q}%"
        stmt = stmt.where(or_(CatalogProduct.name.ilike(needle), CatalogProduct.brand.ilike(needle), CatalogProduct.model.ilike(needle)))
    if category:
        stmt = stmt.where(CatalogProduct.category.ilike(category))
    # region/species are JSONB recommendation-context filters for the starter.
    if species:
        stmt = stmt.where(CatalogProduct.recommendation_context.contains({"species": [species]}))
    if region:
        stmt = stmt.where(CatalogProduct.recommendation_context.contains({"regions": [region]}))
    products = db.scalars(stmt.order_by(CatalogProduct.brand, CatalogProduct.name).limit(limit)).all()
    return [enrich_product(product, db) for product in products]


@router.get("/products/{product_id}", response_model=ProductRead)
def get_product(product_id: UUID, db: Session = Depends(get_db)):
    product = db.get(CatalogProduct, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    return enrich_product(product, db)


@router.get("/products/{product_id}/evidence", response_model=list[EvidenceRead])
def list_evidence(product_id: UUID, db: Session = Depends(get_db)):
    return list(
        db.scalars(
            select(ProductEvidence)
            .where(ProductEvidence.product_id == product_id)
            .order_by(ProductEvidence.created_at.desc())
            .limit(100)
        ).all()
    )


@router.post("/products/{product_id}/evidence", response_model=EvidenceRead, status_code=status.HTTP_201_CREATED)
def add_evidence(
    product_id: UUID,
    payload: EvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.get(CatalogProduct, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    verified = False
    if payload.trophy_id:
        trophy = db.get(Trophy, payload.trophy_id)
        if not trophy or trophy.user_id != current_user.id:
            raise HTTPException(status_code=400, detail="Trophy does not belong to the current user")
        verified = True

    evidence = ProductEvidence(
        product_id=product_id,
        user_id=current_user.id,
        verified_usage=verified,
        **payload.model_dump(),
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence


@router.post("/compare", response_model=list[ProductRead])
def compare_products(payload: ProductCompareRequest, db: Session = Depends(get_db)):
    products = db.scalars(select(CatalogProduct).where(CatalogProduct.id.in_(payload.product_ids))).all()
    by_id = {product.id: product for product in products}
    if len(by_id) != len(set(payload.product_ids)):
        raise HTTPException(status_code=404, detail="One or more products were not found")
    return [enrich_product(by_id[product_id], db) for product_id in payload.product_ids]


@router.get("/products/{product_id}/reviews", response_model=list[ReviewRead])
def list_reviews(product_id: UUID, db: Session = Depends(get_db)):
    return list(
        db.scalars(
            select(ProductReview)
            .where(ProductReview.product_id == product_id)
            .order_by(ProductReview.created_at.desc())
            .limit(100)
        ).all()
    )


@router.post("/products/{product_id}/reviews", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
def upsert_review(
    product_id: UUID,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.get(CatalogProduct, product_id):
        raise HTTPException(status_code=404, detail="Product not found")

    review = db.scalar(
        select(ProductReview).where(ProductReview.product_id == product_id, ProductReview.user_id == current_user.id)
    )
    verified_use = db.scalar(
        select(func.count()).select_from(ProductEvidence).where(
            ProductEvidence.product_id == product_id,
            ProductEvidence.user_id == current_user.id,
            ProductEvidence.verified_usage.is_(True),
        )
    ) > 0

    if review:
        for key, value in payload.model_dump().items():
            setattr(review, key, value)
        review.verified_use = verified_use
    else:
        review = ProductReview(
            product_id=product_id,
            user_id=current_user.id,
            verified_use=verified_use,
            **payload.model_dump(),
        )
        db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/products/{product_id}/offers")
def product_offers(product_id: UUID, db: Session = Depends(get_db)):
    offers = db.scalars(
        select(ProductOffer).where(ProductOffer.product_id == product_id).order_by(ProductOffer.price.asc())
    ).all()
    return [
        {
            "id": str(offer.id),
            "merchant_id": str(offer.merchant_id),
            "merchant_name": offer.merchant.name,
            "price": str(offer.price),
            "normal_price": str(offer.normal_price) if offer.normal_price is not None else None,
            "currency": offer.currency,
            "product_url": offer.product_url,
            "stock_status": offer.stock_status,
            "observed_at": offer.observed_at,
        }
        for offer in offers
    ]


@router.get("/offers/{offer_id}/history")
def offer_history(offer_id: UUID, db: Session = Depends(get_db)):
    offer = db.get(ProductOffer, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    history = db.scalars(
        select(PriceHistory).where(PriceHistory.offer_id == offer_id).order_by(PriceHistory.recorded_at.asc())
    ).all()
    return [{"price": str(item.price), "recorded_at": item.recorded_at} for item in history]
