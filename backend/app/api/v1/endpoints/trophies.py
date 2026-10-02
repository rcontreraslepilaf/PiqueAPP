import os
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from geoalchemy2 import Geometry
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.enums import MediaType, Visibility
from app.models.gear import WardrobeItem
from app.models.trophy import Trophy, TrophyMedia
from app.models.user import User
from app.schemas.trophy import TrophyCreate, TrophyRead
from app.services.location_privacy import geography_point, make_public_location

router = APIRouter(prefix="/trophies", tags=["trophies"])

TROPHY_STORAGE_ROOT = Path(
    os.getenv(
        "TROPHY_STORAGE_DIR",
        "/data/media/trophies",
    )
)
TROPHY_STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


def _owned_trophy(
    trophy_id: UUID,
    current_user: User,
    db: Session,
) -> Trophy:
    trophy = db.scalar(
        select(Trophy).where(
            Trophy.id == trophy_id,
            Trophy.user_id == current_user.id,
        )
    )
    if trophy is None:
        raise HTTPException(status_code=404, detail="Trophy not found")
    return trophy


def _visible_trophy(
    trophy_id: UUID,
    current_user: User,
    db: Session,
) -> Trophy:
    trophy = db.get(Trophy, trophy_id)
    if trophy is None:
        raise HTTPException(status_code=404, detail="Trophy not found")
    if trophy.visibility != Visibility.PUBLIC and trophy.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trophy not found")
    return trophy


def _safe_media_path(relative_path: str) -> Path:
    root = TROPHY_STORAGE_ROOT.resolve()
    target = (root / relative_path).resolve()
    if target != root and root not in target.parents:
        raise HTTPException(status_code=400, detail="Invalid trophy image path")
    return target


def _remove_media_file(relative_path: str | None) -> None:
    if not relative_path:
        return
    target = _safe_media_path(relative_path)
    if target.exists() and target.is_file():
        target.unlink()


@router.post("", response_model=TrophyRead, status_code=status.HTTP_201_CREATED)
def create_trophy(
    payload: TrophyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    public = make_public_location(
        payload.latitude,
        payload.longitude,
        payload.geo_privacy,
    )
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
        exact_location=(
            geography_point(payload.latitude, payload.longitude)
            if payload.latitude is not None
            else None
        ),
        public_location=public.geography,
        public_latitude=public.latitude,
        public_longitude=public.longitude,
        public_region=payload.public_region,
        environmental_snapshot=payload.environmental_snapshot,
    )

    if payload.equipment_ids:
        equipment = db.scalars(
            select(WardrobeItem).where(
                WardrobeItem.id.in_(payload.equipment_ids),
                WardrobeItem.owner_id == current_user.id,
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
        stmt = stmt.where(
            (Trophy.visibility == Visibility.PUBLIC)
            | (Trophy.user_id == current_user.id)
        )
    return list(db.scalars(stmt).all())


@router.post("/{trophy_id}/image")
async def upload_trophy_image(
    trophy_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trophy = _owned_trophy(trophy_id, current_user, db)

    content_type = (file.content_type or "").lower()
    extension = ALLOWED_IMAGE_TYPES.get(content_type)
    if extension is None:
        raise HTTPException(
            status_code=415,
            detail="Only JPG and PNG images are allowed",
        )

    data = await file.read(MAX_IMAGE_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="The image is empty")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="The image exceeds the 10 MB limit",
        )

    user_folder = TROPHY_STORAGE_ROOT / str(current_user.id) / str(trophy.id)
    user_folder.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    target = user_folder / filename
    target.write_bytes(data)

    previous_media = list(
        db.scalars(
            select(TrophyMedia).where(
                TrophyMedia.trophy_id == trophy.id,
                TrophyMedia.media_type == MediaType.IMAGE,
            )
        ).all()
    )

    relative_path = f"{current_user.id}/{trophy.id}/{filename}"
    media = TrophyMedia(
        trophy_id=trophy.id,
        media_type=MediaType.IMAGE,
        media_url=relative_path,
        thumbnail_url=None,
        metadata_json={"content_type": content_type},
    )
    db.add(media)

    for old in previous_media:
        db.delete(old)

    db.commit()

    for old in previous_media:
        _remove_media_file(old.media_url)

    return {"status": "ok", "has_image": True}


@router.get("/{trophy_id}/image")
def get_trophy_image(
    trophy_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trophy = _visible_trophy(trophy_id, current_user, db)

    media = db.scalar(
        select(TrophyMedia)
        .where(
            TrophyMedia.trophy_id == trophy.id,
            TrophyMedia.media_type == MediaType.IMAGE,
        )
        .order_by(TrophyMedia.created_at.desc())
    )
    if media is None:
        raise HTTPException(status_code=404, detail="Trophy has no image")

    target = _safe_media_path(media.media_url)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Trophy image not found")

    media_type = "image/png" if target.suffix.lower() == ".png" else "image/jpeg"
    return FileResponse(
        target,
        media_type=media_type,
        filename=target.name,
        content_disposition_type="inline",
    )


@router.delete(
    "/{trophy_id}/image",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_trophy_image(
    trophy_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trophy = _owned_trophy(trophy_id, current_user, db)
    media_items = list(
        db.scalars(
            select(TrophyMedia).where(
                TrophyMedia.trophy_id == trophy.id,
                TrophyMedia.media_type == MediaType.IMAGE,
            )
        ).all()
    )
    for media in media_items:
        _remove_media_file(media.media_url)
        db.delete(media)
    db.commit()


@router.get("/{trophy_id}", response_model=TrophyRead)
def get_trophy(
    trophy_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _visible_trophy(trophy_id, current_user, db)


@router.get("/{trophy_id}/private-location")
def get_private_location(
    trophy_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trophy = _owned_trophy(trophy_id, current_user, db)
    if trophy.exact_location is None:
        return {"latitude": None, "longitude": None}

    geography_as_geometry = Trophy.exact_location.cast(
        Geometry(geometry_type="POINT", srid=4326)
    )
    row = db.execute(
        select(
            func.ST_Y(geography_as_geometry),
            func.ST_X(geography_as_geometry),
        ).where(Trophy.id == trophy_id)
    ).one()
    return {"latitude": row[0], "longitude": row[1]}


@router.delete("/{trophy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trophy(
    trophy_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trophy = _owned_trophy(trophy_id, current_user, db)

    media_items = list(
        db.scalars(
            select(TrophyMedia).where(TrophyMedia.trophy_id == trophy.id)
        ).all()
    )
    for media in media_items:
        _remove_media_file(media.media_url)

    db.delete(trophy)
    db.commit()
