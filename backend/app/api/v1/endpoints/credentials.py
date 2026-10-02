import os
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.credential import Credential
from app.models.user import User
from app.schemas.credential import CredentialCreate, CredentialRead


router = APIRouter(prefix="/credentials", tags=["credentials"])

STORAGE_ROOT = Path(
    os.getenv(
        "CREDENTIAL_STORAGE_DIR",
        "/data/credentials",
    )
)
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_BYTES = 8 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


def get_user_credential(
    credential_id: UUID,
    current_user: User,
    db: Session,
) -> Credential:
    credential = db.scalar(
        select(Credential).where(
            Credential.id == credential_id,
            Credential.user_id == current_user.id,
        )
    )

    if credential is None:
        raise HTTPException(
            status_code=404,
            detail="Credential not found",
        )

    return credential


def document_path(relative_path: str) -> Path:
    root = STORAGE_ROOT.resolve()
    target = (root / relative_path).resolve()

    if target != root and root not in target.parents:
        raise HTTPException(
            status_code=400,
            detail="Invalid document path",
        )

    return target


def remove_document(relative_path: str | None) -> None:
    if not relative_path:
        return

    target = document_path(relative_path)

    if target.exists() and target.is_file():
        target.unlink()


@router.get("", response_model=list[CredentialRead])
def list_credentials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statement = (
        select(Credential)
        .where(Credential.user_id == current_user.id)
        .order_by(
            Credential.expires_at.desc().nullslast(),
            Credential.created_at.desc(),
        )
    )

    return list(db.scalars(statement).all())


@router.post(
    "",
    response_model=CredentialRead,
    status_code=status.HTTP_201_CREATED,
)
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


@router.post(
    "/{credential_id}/document",
    response_model=CredentialRead,
)
async def upload_credential_document(
    credential_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    credential = get_user_credential(
        credential_id,
        current_user,
        db,
    )

    content_type = (
        file.content_type or ""
    ).lower()

    extension = ALLOWED_IMAGE_TYPES.get(
        content_type
    )

    if extension is None:
        raise HTTPException(
            status_code=415,
            detail="Only JPG and PNG images are allowed",
        )

    data = await file.read(
        MAX_IMAGE_BYTES + 1
    )

    if not data:
        raise HTTPException(
            status_code=400,
            detail="The image is empty",
        )

    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="The image exceeds the 8 MB limit",
        )

    user_folder = (
        STORAGE_ROOT /
        str(current_user.id)
    )
    user_folder.mkdir(
        parents=True,
        exist_ok=True,
    )

    filename = (
        f"{uuid4().hex}{extension}"
    )

    target = (
        user_folder / filename
    )

    target.write_bytes(data)

    previous_document = (
        credential.document_url
    )

    credential.document_url = (
        f"{current_user.id}/{filename}"
    )

    db.add(credential)
    db.commit()
    db.refresh(credential)

    remove_document(
        previous_document
    )

    return credential


@router.get(
    "/{credential_id}/document"
)
def read_credential_document(
    credential_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    credential = get_user_credential(
        credential_id,
        current_user,
        db,
    )

    if not credential.document_url:
        raise HTTPException(
            status_code=404,
            detail="This credential has no image",
        )

    target = document_path(
        credential.document_url
    )

    if not target.exists():
        raise HTTPException(
            status_code=404,
            detail="Credential image not found",
        )

    suffix = target.suffix.lower()

    media_type = (
        "image/png"
        if suffix == ".png"
        else "image/jpeg"
    )

    return FileResponse(
        target,
        media_type=media_type,
        filename=target.name,
        content_disposition_type="inline",
    )


@router.delete(
    "/{credential_id}/document",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_credential_document(
    credential_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    credential = get_user_credential(
        credential_id,
        current_user,
        db,
    )

    remove_document(
        credential.document_url
    )

    credential.document_url = None

    db.add(credential)
    db.commit()


@router.delete(
    "/{credential_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_credential(
    credential_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    credential = get_user_credential(
        credential_id,
        current_user,
        db,
    )

    remove_document(
        credential.document_url
    )

    db.delete(credential)
    db.commit()
