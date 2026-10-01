from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.gear import WardrobeItem
from app.models.user import User
from app.schemas.wardrobe import WardrobeItemCreate, WardrobeItemRead

router = APIRouter(prefix="/wardrobe", tags=["wardrobe"])


@router.get("", response_model=list[WardrobeItemRead])
def list_wardrobe(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list(db.scalars(select(WardrobeItem).where(WardrobeItem.owner_id == current_user.id)).all())


@router.post("", response_model=WardrobeItemRead, status_code=status.HTTP_201_CREATED)
def create_item(payload: WardrobeItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = WardrobeItem(owner_id=current_user.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.get(WardrobeItem, item_id)
    if not item or item.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Wardrobe item not found")
    db.delete(item)
    db.commit()
