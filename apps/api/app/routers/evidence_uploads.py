from datetime import datetime, UTC
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.s3_storage import is_s3_configured, upload_bytes
from app.services.workspace_settings import get_max_upload_bytes

router = APIRouter(prefix="/evidence-uploads", tags=["Evidence Uploads"])

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "evidence"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


def _safe_extension(filename: str, content_type: str | None) -> str:
    suffix = Path(filename or "").suffix.lower()

    if suffix in {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}:
        return suffix

    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/heic": ".heic",
        "image/heif": ".heif",
    }.get(content_type or "", ".jpg")


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    request: Request,
    file: UploadFile = File(...),
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
    accuracy_m: float | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str | float | None]:
    del current_user

    max_file_size_bytes = get_max_upload_bytes(db)

    content_type = (file.content_type or "").lower()

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File evidence harus berupa gambar JPG, PNG, WEBP, atau HEIC.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File evidence kosong.")

    if len(content) > max_file_size_bytes:
        max_mb = max(1, max_file_size_bytes // (1024 * 1024))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ukuran file maksimal {max_mb} MB.",
        )

    extension = _safe_extension(file.filename or "evidence", content_type)
    stored_name = f"{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}-{uuid4().hex}{extension}"

    if is_s3_configured():
        object_key = f"evidence/{stored_name}"
        public_url = upload_bytes(key=object_key, content=content, content_type=content_type)
    else:
        destination = UPLOAD_ROOT / stored_name
        destination.write_bytes(content)
        public_url = str(request.base_url).rstrip("/") + f"/uploads/evidence/{stored_name}"

    return {
        "url": public_url,
        "file_name": file.filename or stored_name,
        "uploaded_at": datetime.now(UTC).isoformat(),
        "latitude": latitude,
        "longitude": longitude,
        "accuracy_m": accuracy_m,
    }
