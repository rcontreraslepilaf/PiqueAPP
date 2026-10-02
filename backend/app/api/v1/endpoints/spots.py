from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.enums import Visibility
from app.models.spot import Spot
from app.models.user import User
from app.schemas.spot import SpotCreate, SpotRead
from app.services.location_privacy import geography_point, make_public_location

router = APIRouter(prefix="/spots", tags=["spots"])


def _spot_read(spot: Spot, current_user: User) -> SpotRead:
    is_owner = spot.owner_id == current_user.id

    if is_owner:
        latitude = spot.exact_latitude
        longitude = spot.exact_longitude
    else:
        latitude = spot.public_latitude
        longitude = spot.public_longitude

    return SpotRead(
        id=spot.id,
        owner_id=spot.owner_id,
        name=spot.name,
        description=spot.description,
        spot_type=spot.spot_type,
        visibility=spot.visibility,
        geo_privacy=spot.geo_privacy,
        latitude=latitude,
        longitude=longitude,
        public_region=spot.public_region,
        is_owner=is_owner,
        created_at=spot.created_at,
    )


@router.get("", response_model=list[SpotRead])
def list_spots(
    mine: bool = Query(False),
    limit: int = Query(100, ge=1, le=250),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Spot).order_by(Spot.created_at.desc()).limit(limit)

    if mine:
        stmt = stmt.where(Spot.owner_id == current_user.id)
    else:
        stmt = stmt.where(
            (Spot.visibility == Visibility.PUBLIC.value)
            | (Spot.owner_id == current_user.id)
        )

    return [
        _spot_read(item, current_user)
        for item in db.scalars(stmt).all()
    ]


@router.post(
    "",
    response_model=SpotRead,
    status_code=status.HTTP_201_CREATED,
)
def create_spot(
    payload: SpotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    public = make_public_location(
        payload.latitude,
        payload.longitude,
        payload.geo_privacy,
    )

    spot = Spot(
        owner_id=current_user.id,
        name=payload.name.strip(),
        description=(payload.description or "").strip() or None,
        spot_type=payload.spot_type,
        visibility=payload.visibility.value,
        geo_privacy=payload.geo_privacy.value,
        exact_location=geography_point(
            payload.latitude,
            payload.longitude,
        ),
        exact_latitude=payload.latitude,
        exact_longitude=payload.longitude,
        public_location=public.geography,
        public_latitude=public.latitude,
        public_longitude=public.longitude,
        public_region=payload.public_region,
    )

    db.add(spot)
    db.commit()
    db.refresh(spot)

    return _spot_read(spot, current_user)


@router.delete(
    "/{spot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_spot(
    spot_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    spot = db.scalar(
        select(Spot).where(
            Spot.id == spot_id,
            Spot.owner_id == current_user.id,
        )
    )

    if spot is None:
        raise HTTPException(status_code=404, detail="Spot not found")

    db.delete(spot)
    db.commit()
