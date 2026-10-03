from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, get_db
from app.models.enums import MediaType, Visibility
from app.models.social import TrophyComment, TrophyLike
from app.models.trophy import Trophy, TrophyMedia
from app.models.user import Profile, User
from app.schemas.social import (
    CommentCreate,
    CommentRead,
    FeedEquipmentRead,
    FeedItemRead,
    LikeStateRead,
)

router = APIRouter(prefix="/social", tags=["social"])


def _visible_trophy(
    trophy_id: UUID,
    current_user: User,
    db: Session,
) -> Trophy:
    trophy = db.get(Trophy, trophy_id)
    if trophy is None:
        raise HTTPException(status_code=404, detail="Trophy not found")

    if (
        trophy.visibility != Visibility.PUBLIC
        and trophy.user_id != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Trophy not found")

    return trophy


def _author_name(user_id: UUID, db: Session) -> str:
    profile = db.scalar(
        select(Profile).where(Profile.user_id == user_id)
    )
    if profile:
        return profile.display_name

    user = db.get(User, user_id)
    return user.username if user else "Usuario"


@router.get("/feed", response_model=list[FeedItemRead])
def feed(
    limit: int = Query(30, ge=1, le=100),
    mine: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Trophy)
        .options(selectinload(Trophy.equipment))
        .order_by(Trophy.captured_at.desc())
        .limit(limit)
    )

    if mine:
        stmt = stmt.where(Trophy.user_id == current_user.id)
    else:
        stmt = stmt.where(
            (Trophy.visibility == Visibility.PUBLIC)
            | (Trophy.user_id == current_user.id)
        )

    trophies = list(db.scalars(stmt).all())
    result: list[FeedItemRead] = []

    for trophy in trophies:
        like_count = int(
            db.scalar(
                select(func.count())
                .select_from(TrophyLike)
                .where(TrophyLike.trophy_id == trophy.id)
            )
            or 0
        )
        comment_count = int(
            db.scalar(
                select(func.count())
                .select_from(TrophyComment)
                .where(TrophyComment.trophy_id == trophy.id)
            )
            or 0
        )
        liked_by_me = (
            db.scalar(
                select(TrophyLike.id).where(
                    TrophyLike.trophy_id == trophy.id,
                    TrophyLike.user_id == current_user.id,
                )
            )
            is not None
        )
        has_image = (
            db.scalar(
                select(TrophyMedia.id).where(
                    TrophyMedia.trophy_id == trophy.id,
                    TrophyMedia.media_type == MediaType.IMAGE,
                )
            )
            is not None
        )

        result.append(
            FeedItemRead(
                id=trophy.id,
                user_id=trophy.user_id,
                author_name=_author_name(trophy.user_id, db),
                species_name=trophy.species_name,
                title=trophy.title,
                description=trophy.description,
                weight_kg=(
                    float(trophy.weight_kg)
                    if trophy.weight_kg is not None
                    else None
                ),
                length_cm=(
                    float(trophy.length_cm)
                    if trophy.length_cm is not None
                    else None
                ),
                captured_at=trophy.captured_at,
                release_status=trophy.release_status.value,
                public_region=trophy.public_region,
                public_latitude=trophy.public_latitude,
                public_longitude=trophy.public_longitude,
                has_image=has_image,
                like_count=like_count,
                comment_count=comment_count,
                liked_by_me=liked_by_me,
                equipment=[
                    FeedEquipmentRead(
                        id=item.id,
                        category=item.category,
                        brand=item.brand,
                        model=item.model,
                        name=item.name,
                    )
                    for item in trophy.equipment
                ],
            )
        )

    return result


@router.post(
    "/trophies/{trophy_id}/like",
    response_model=LikeStateRead,
)
def toggle_like(
    trophy_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _visible_trophy(trophy_id, current_user, db)

    existing = db.scalar(
        select(TrophyLike).where(
            TrophyLike.trophy_id == trophy_id,
            TrophyLike.user_id == current_user.id,
        )
    )

    if existing:
        db.delete(existing)
        liked = False
    else:
        db.add(
            TrophyLike(
                trophy_id=trophy_id,
                user_id=current_user.id,
            )
        )
        liked = True

    db.commit()

    like_count = int(
        db.scalar(
            select(func.count())
            .select_from(TrophyLike)
            .where(TrophyLike.trophy_id == trophy_id)
        )
        or 0
    )

    return LikeStateRead(
        liked=liked,
        like_count=like_count,
    )


@router.get(
    "/trophies/{trophy_id}/comments",
    response_model=list[CommentRead],
)
def list_comments(
    trophy_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _visible_trophy(trophy_id, current_user, db)

    comments = list(
        db.scalars(
            select(TrophyComment)
            .where(TrophyComment.trophy_id == trophy_id)
            .order_by(TrophyComment.created_at.asc())
        ).all()
    )

    return [
        CommentRead(
            id=item.id,
            trophy_id=item.trophy_id,
            user_id=item.user_id,
            author_name=_author_name(item.user_id, db),
            body=item.body,
            created_at=item.created_at,
        )
        for item in comments
    ]


@router.post(
    "/trophies/{trophy_id}/comments",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    trophy_id: UUID,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _visible_trophy(trophy_id, current_user, db)

    body = payload.body.strip()
    if not body:
        raise HTTPException(
            status_code=422,
            detail="Comment cannot be empty",
        )

    comment = TrophyComment(
        trophy_id=trophy_id,
        user_id=current_user.id,
        body=body,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return CommentRead(
        id=comment.id,
        trophy_id=comment.trophy_id,
        user_id=comment.user_id,
        author_name=_author_name(comment.user_id, db),
        body=comment.body,
        created_at=comment.created_at,
    )
