from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.credential import Credential
from app.models.user import User
from app.schemas.credential import CredentialCreate, CredentialRead


router = APIRouter(prefix="/credentials", tags=["credentials"])


@router.get("", response_model=list[CredentialRead])
def list_credentials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statement = (
        select(Credential)
        .where(Credential.user_id == current_user.id)
        .order_by(Credential.expires_at.desc().nullslast(), Credential.created_at.desc())
    )
    return list(db.scalars(statement).all())


@router.post("", response_model=CredentialRead, status_code=status.HTTP_201_CREATED)
def create_credential(
    payload: CredentialCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    credential = Credential(
        user_id=current_user.id,
        credential_type=payload.credential_type,
        title=payload.title,
        authority=payload.authority,
        license_number=payload.license_number or None,
        valid_from=payload.valid_from,
        expires_at=payload.expires_at,
        document_url=payload.document_url or None,
        notes=payload.notes or None,
    )

    db.add(credential)
    db.commit()
    db.refresh(credential)

    return credential


@router.delete("/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credential(
    credential_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    credential = db.scalar(
        select(Credential).where(
            Credential.id == credential_id,
            Credential.user_id == current_user.id,
        )
    )

    if credential is None:
        raise HTTPException(status_code=404, detail="Credential not found")

    db.delete(credential)
    db.commit()
