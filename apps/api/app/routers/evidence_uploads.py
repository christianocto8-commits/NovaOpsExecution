from datetime import datetime, UTC
import mimetypes
from pathlib import Path
import re
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.s3_storage import download_bytes, is_s3_configured, upload_bytes
from app.services.workspace_settings import get_max_upload_bytes

router = APIRouter(prefix="/evidence-uploads", tags=["Evidence Uploads"])
legacy_router = APIRouter(prefix="/uploads/evidence", tags=["Evidence Uploads"])

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "evidence"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "video/mp4",
    "video/webm",
    "video/quicktime",
}
SAFE_STORED_NAME = re.compile(r"^[0-9]{14}-[a-f0-9]{32}\.(jpg|jpeg|png|webp|heic|heif|mp4|webm|mov)$")


def _safe_extension(filename: str, content_type: str | None) -> str:
    suffix = Path(filename or "").suffix.lower()

    if suffix in {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".mp4", ".webm", ".mov"}:
        return suffix

    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/heic": ".heic",
        "image/heif": ".heif",
        "video/mp4": ".mp4",
        "video/webm": ".webm",
        "video/quicktime": ".mov",
    }.get(content_type or "", ".jpg")


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_evidence(
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
            detail="File evidence harus berupa gambar (JPG/PNG/WEBP/HEIC) atau video (MP4/WEBM/MOV).",
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
        upload_bytes(key=object_key, content=content, content_type=content_type)
    else:
        destination = UPLOAD_ROOT / stored_name
        destination.write_bytes(content)

    return {
        "url": f"/api/v1/evidence-uploads/{stored_name}",
        "file_name": file.filename or stored_name,
        "uploaded_at": datetime.now(UTC).isoformat(),
        "latitude": latitude,
        "longitude": longitude,
        "accuracy_m": accuracy_m,
    }


def _serve_evidence_file(stored_name: str):
    if not SAFE_STORED_NAME.fullmatch(stored_name):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    content_type = mimetypes.guess_type(stored_name)[0] or "application/octet-stream"

    if is_s3_configured():
        try:
            content = download_bytes(f"evidence/{stored_name}")
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found") from exc

        return Response(content=content, media_type=content_type)

    path = UPLOAD_ROOT / stored_name
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    return FileResponse(path, media_type=content_type)


@router.get("/{stored_name}", response_model=None)
def get_evidence_file(
    stored_name: str,
    current_user: User = Depends(get_current_user),
):
    del current_user
    return _serve_evidence_file(stored_name)


@legacy_router.get("/{stored_name}", response_model=None)
def get_legacy_evidence_file(
    stored_name: str,
    current_user: User = Depends(get_current_user),
):
    del current_user
    return _serve_evidence_file(stored_name)
