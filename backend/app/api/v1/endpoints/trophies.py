from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geometry
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, get_db
from app.models.enums import Visibility
from app.models.gear import WardrobeItem
from app.models.trophy import Trophy
from app.models.user import User
from app.schemas.trophy import TrophyCreate, TrophyRead
from app.services.location_privacy import geography_point, make_public_location

router = APIRouter(prefix="/trophies", tags=["trophies"])


@router.post("", response_model=TrophyRead, status_code=status.HTTP_201_CREATED)
def create_trophy(payload: TrophyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    public = make_public_location(payload.latitude, payload.longitude, payload.geo_privacy)
    trophy = Trophy(
        user_id=current_user.id,
        activity_type=payload.activity_type,
        species_name=payload.species_name,
        title=payload.title,
        description=payload.description,
        weight_kg=payload.weight_kg,
        length_cm=payload.length_cm,
        captured_at=payload.captured_at,
        release_status=payload.release_status,
        visibility=payload.visibility,
        geo_privacy=payload.geo_privacy,
        exact_location=(geography_point(payload.latitude, payload.longitude) if payload.latitude is not None else None),
        public_location=public.geography,
        public_latitude=public.latitude,
        public_longitude=public.longitude,
        public_region=payload.public_region,
        environmental_snapshot=payload.environmental_snapshot,
    )

    if payload.equipment_ids:
        equipment = db.scalars(
            select(WardrobeItem).where(
                WardrobeItem.id.in_(payload.equipment_ids), WardrobeItem.owner_id == current_user.id
            )
        ).all()
        trophy.equipment = list(equipment)

    db.add(trophy)
    db.commit()
    db.refresh(trophy)
    return trophy


@router.get("", response_model=list[TrophyRead])
def list_trophies(
    mine: bool = Query(False),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Trophy).order_by(Trophy.captured_at.desc()).limit(limit)
    if mine:
        stmt = stmt.where(Trophy.user_id == current_user.id)
    else:
        stmt = stmt.where((Trophy.visibility == Visibility.PUBLIC) | (Trophy.user_id == current_user.id))
    return list(db.scalars(stmt).all())


@router.get("/{trophy_id}", response_model=TrophyRead)
def get_trophy(trophy_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trophy = db.get(Trophy, trophy_id)
    if not trophy:
        raise HTTPException(status_code=404, detail="Trophy not found")
    if trophy.visibility != Visibility.PUBLIC and trophy.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trophy not found")
    return trophy


@router.get("/{trophy_id}/private-location")
def get_private_location(
    trophy_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trophy = db.get(Trophy, trophy_id)
    if not trophy or trophy.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trophy not found")
    if trophy.exact_location is None:
        return {"latitude": None, "longitude": None}

    geography_as_geometry = Trophy.exact_location.cast(Geometry(geometry_type="POINT", srid=4326))
    row = db.execute(
        select(func.ST_Y(geography_as_geometry), func.ST_X(geography_as_geometry)).where(Trophy.id == trophy_id)
    ).one()
    return {"latitude": row[0], "longitude": row[1]}


@router.delete("/{trophy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trophy(trophy_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trophy = db.get(Trophy, trophy_id)
    if not trophy or trophy.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trophy not found")
    db.delete(trophy)
    db.commit()
