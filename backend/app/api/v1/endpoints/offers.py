from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.enums import OfferValidationStatus
from app.models.offer import DealReport, DealValidation
from app.models.user import User
from app.schemas.offer import DealCreate, DealRead, DealValidationCreate
from app.services.location_privacy import geography_point

router = APIRouter(prefix="/deals", tags=["deals"])


def to_deal_read(deal: DealReport, db: Session) -> DealRead:
    rows = db.execute(
        select(DealValidation.status, func.count(DealValidation.id))
        .where(DealValidation.deal_id == deal.id)
        .group_by(DealValidation.status)
    ).all()
    counts = {status_value: count for status_value, count in rows}
    return DealRead(
        **{key: getattr(deal, key) for key in [
            "id", "reporter_id", "product_id", "merchant_id", "merchant_name", "price", "normal_price",
            "currency", "url", "notes", "store_region", "expires_at", "created_at"
        ]},
        available_votes=counts.get(OfferValidationStatus.AVAILABLE, 0),
        expired_votes=counts.get(OfferValidationStatus.EXPIRED, 0),
        wrong_price_votes=counts.get(OfferValidationStatus.WRONG_PRICE, 0),
    )


@router.post("", response_model=DealRead, status_code=status.HTTP_201_CREATED)
def report_deal(payload: DealCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = payload.model_dump(exclude={"store_latitude", "store_longitude"})
    store_location = None
    if payload.store_latitude is not None and payload.store_longitude is not None:
        store_location = geography_point(payload.store_latitude, payload.store_longitude)
    deal = DealReport(reporter_id=current_user.id, store_location=store_location, **data)
    db.add(deal)
    db.commit()
    db.refresh(deal)
    return to_deal_read(deal, db)


@router.get("", response_model=list[DealRead])
def list_deals(
    product_id: UUID | None = None,
    region: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    stmt = select(DealReport).order_by(DealReport.created_at.desc()).limit(limit)
    if product_id:
        stmt = stmt.where(DealReport.product_id == product_id)
    if region:
        stmt = stmt.where(DealReport.store_region.ilike(region))
    deals = db.scalars(stmt).all()
    return [to_deal_read(deal, db) for deal in deals]


@router.post("/{deal_id}/validate", response_model=DealRead)
def validate_deal(
    deal_id: UUID,
    payload: DealValidationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deal = db.get(DealReport, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    validation = db.scalar(
        select(DealValidation).where(DealValidation.deal_id == deal_id, DealValidation.user_id == current_user.id)
    )
    if validation:
        validation.status = payload.status
    else:
        db.add(DealValidation(deal_id=deal_id, user_id=current_user.id, status=payload.status))
    db.commit()
    return to_deal_read(deal, db)
