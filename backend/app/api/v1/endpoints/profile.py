import os
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.credential import Credential
from app.models.gear import WardrobeItem
from app.models.trophy import Trophy
from app.models.user import Profile, User
from app.schemas.profile import ProfileSummaryRead, ProfileUpdate
from app.services.images import read_clean_image


router = APIRouter(prefix="/profile", tags=["profile"])

PROFILE_STORAGE_ROOT = Path(
    os.getenv(
        "PROFILE_STORAGE_DIR",
        "/data/media/profiles",
    )
)
PROFILE_STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_BYTES = 8 * 1024 * 1024


def _profile(current_user: User, db: Session) -> Profile:
    profile = db.scalar(
        select(Profile).where(Profile.user_id == current_user.id)
    )
    if profile is None:
        profile = Profile(
            user_id=current_user.id,
            display_name=current_user.username,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _safe_path(relative_path: str) -> Path:
    root = PROFILE_STORAGE_ROOT.resolve()
    target = (root / relative_path).resolve()
    if target != root and root not in target.parents:
        raise HTTPException(status_code=400, detail="Invalid avatar path")
    return target


def _remove_avatar(relative_path: str | None) -> None:
    if not relative_path:
        return
    target = _safe_path(relative_path)
    if target.exists() and target.is_file():
        target.unlink()


def _summary(
    current_user: User,
    profile: Profile,
    db: Session,
) -> ProfileSummaryRead:
    trophy_count = int(
        db.scalar(
            select(func.count())
            .select_from(Trophy)
            .where(Trophy.user_id == current_user.id)
        )
        or 0
    )
    credential_count = int(
        db.scalar(
            select(func.count())
            .select_from(Credential)
            .where(Credential.user_id == current_user.id)
        )
        or 0
    )
    wardrobe_count = int(
        db.scalar(
            select(func.count())
            .select_from(WardrobeItem)
            .where(WardrobeItem.owner_id == current_user.id)
        )
        or 0
    )

    return ProfileSummaryRead(
        user_id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        display_name=profile.display_name,
        bio=profile.bio,
        region=profile.region,
        avatar_url=profile.avatar_url,
        trophy_count=trophy_count,
        credential_count=credential_count,
        wardrobe_count=wardrobe_count,
    )


@router.get("/me", response_model=ProfileSummaryRead)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _profile(current_user, db)
    return _summary(current_user, profile, db)


@router.patch("/me", response_model=ProfileSummaryRead)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _profile(current_user, db)

    if payload.display_name is not None:
        profile.display_name = payload.display_name.strip()
    if payload.bio is not None:
        profile.bio = payload.bio.strip() or None
    if payload.region is not None:
        profile.region = payload.region.strip() or None

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return _summary(current_user, profile, db)


@router.post("/avatar", response_model=ProfileSummaryRead)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _profile(current_user, db)

    image = await read_clean_image(file, MAX_IMAGE_BYTES)
    extension = image.extension

    user_folder = PROFILE_STORAGE_ROOT / str(current_user.id)
    user_folder.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    target = user_folder / filename
    target.write_bytes(image.data)

    previous = profile.avatar_url
    profile.avatar_url = f"{current_user.id}/{filename}"
    db.add(profile)
    db.commit()
    db.refresh(profile)
    _remove_avatar(previous)

    return _summary(current_user, profile, db)


@router.get("/avatar")
def get_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _profile(current_user, db)
    if not profile.avatar_url:
        raise HTTPException(status_code=404, detail="Profile has no avatar")

    target = _safe_path(profile.avatar_url)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Avatar not found")

    media_type = "image/png" if target.suffix.lower() == ".png" else "image/jpeg"
    return FileResponse(
        target,
        media_type=media_type,
        filename=target.name,
        content_disposition_type="inline",
    )
