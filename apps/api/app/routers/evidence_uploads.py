from datetime import datetime, UTC
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/evidence-uploads", tags=["Evidence Uploads"])

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "evidence"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


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
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    del current_user

    content_type = (file.content_type or "").lower()

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File evidence harus berupa gambar JPG, PNG, WEBP, atau HEIC.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File evidence kosong.")

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ukuran file maksimal 10 MB.")

    extension = _safe_extension(file.filename or "evidence", content_type)
    stored_name = f"{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}-{uuid4().hex}{extension}"
    destination = UPLOAD_ROOT / stored_name
    destination.write_bytes(content)

    public_url = str(request.base_url).rstrip("/") + f"/uploads/evidence/{stored_name}"

    return {
        "url": public_url,
        "file_name": file.filename or stored_name,
        "uploaded_at": datetime.now(UTC).isoformat(),
    }
