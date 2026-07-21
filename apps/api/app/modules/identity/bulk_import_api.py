from __future__ import annotations

import csv
import io
import secrets

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import require_role
from app.modules.identity.models import Outlet, User
from app.modules.identity.repository import OrganizationRepository, OutletRepository, RoleRepository, UserRepository
from app.modules.identity.schemas import BulkImportResponse, BulkImportRowResult
from app.modules.identity.security import hash_password

router = APIRouter(prefix="/identity", tags=["Identity"])

OUTLET_HEADERS = {"name", "code", "region", "district", "address"}
USER_HEADERS = {"email", "name", "role", "outlet_code"}

ROLE_ALIASES = {
    "outlet_manager": "outlet",
    "outlet": "outlet",
    "staff": "outlet",
    "area_manager": "area_manager",
    "admin": "admin",
    "owner": "owner",
}


def _normalize_headers(row: list[str]) -> list[str]:
    return [cell.strip().lower().replace(" ", "_") for cell in row]


def _detect_import_type(headers: list[str]) -> str | None:
    header_set = set(headers)
    if OUTLET_HEADERS.issubset(header_set):
        return "outlets"
    if USER_HEADERS.issubset(header_set):
        return "users"
    return None


def _username_from_email(email: str) -> str:
    local = email.split("@", 1)[0].strip().lower()
    cleaned = "".join(char for char in local if char.isalnum() or char in "._-")
    return cleaned[:80] or "user"


def _sync_legacy_outlet_fields(
    db: Session,
    identity_outlet: Outlet,
    *,
    region: str | None,
    district: str | None,
) -> None:
    from app.modules.tasks.identity_bridge import get_or_create_legacy_outlet

    legacy = get_or_create_legacy_outlet(db, identity_outlet)
    legacy.region = region.strip() if region and region.strip() else None
    legacy.district = district.strip() if district and district.strip() else None
    db.add(legacy)
    db.flush()


@router.post("/bulk-import", response_model=BulkImportResponse)
async def bulk_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner", "admin")),
):
    del current_user

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File CSV kosong.")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File CSV harus UTF-8.",
        ) from exc

    reader = csv.reader(io.StringIO(text))
    rows = [row for row in reader if any(cell.strip() for cell in row)]

    if len(rows) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV harus memiliki header dan minimal satu baris data.",
        )

    headers = _normalize_headers(rows[0])
    import_type = _detect_import_type(headers)

    if not import_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Header tidak dikenali. Outlet: name,code,region,district,address. "
                "Users: email,name,role,outlet_code."
            ),
        )

    header_index = {header: index for index, header in enumerate(headers)}
    response = BulkImportResponse()
    organization = OrganizationRepository(db).first()

    if not organization:
        raise HTTPException(status_code=400, detail="Organization is not configured")

    outlets_repo = OutletRepository(db)
    users_repo = UserRepository(db)
    roles_repo = RoleRepository(db)

    for row_number, raw_row in enumerate(rows[1:], start=2):
        values = {
            header: raw_row[index].strip() if index < len(raw_row) else ""
            for header, index in header_index.items()
        }

        if import_type == "outlets":
            name = values.get("name", "")
            code = values.get("code", "").upper()

            if not name or not code:
                response.rows.append(
                    BulkImportRowResult(
                        row=row_number,
                        entity="outlet",
                        identifier=code or name or f"row-{row_number}",
                        status="error",
                        message="Kolom name dan code wajib diisi.",
                    )
                )
                continue

            if outlets_repo.code_exists(code):
                response.outlets_skipped += 1
                response.rows.append(
                    BulkImportRowResult(
                        row=row_number,
                        entity="outlet",
                        identifier=code,
                        status="skipped",
                        message="Kode outlet sudah ada.",
                    )
                )
                continue

            identity_outlet = Outlet(
                organization_id=organization.id,
                code=code,
                name=name.strip(),
                address=values.get("address") or None,
                status="active",
            )
            created = outlets_repo.create(identity_outlet)
            _sync_legacy_outlet_fields(
                db,
                created,
                region=values.get("region"),
                district=values.get("district"),
            )
            response.outlets_created += 1
            response.rows.append(
                BulkImportRowResult(
                    row=row_number,
                    entity="outlet",
                    identifier=code,
                    status="created",
                    message=created.name,
                )
            )
            continue

        email = values.get("email", "").strip().lower()
        full_name = values.get("name", "").strip()
        role_slug = ROLE_ALIASES.get(values.get("role", "").strip().lower(), "")
        outlet_code = values.get("outlet_code", "").strip().upper()

        if not email or not full_name or not role_slug:
            response.rows.append(
                BulkImportRowResult(
                    row=row_number,
                    entity="user",
                    identifier=email or f"row-{row_number}",
                    status="error",
                    message="Kolom email, name, dan role wajib diisi.",
                )
            )
            continue

        username = _username_from_email(email)
        if users_repo.email_or_username_exists(email=email, username=username):
            response.users_skipped += 1
            response.rows.append(
                BulkImportRowResult(
                    row=row_number,
                    entity="user",
                    identifier=email,
                    status="skipped",
                    message="Email atau username sudah ada.",
                )
            )
            continue

        role = roles_repo.find_by_slug(role_slug)
        if not role:
            response.rows.append(
                BulkImportRowResult(
                    row=row_number,
                    entity="user",
                    identifier=email,
                    status="error",
                    message=f"Role '{role_slug}' tidak ditemukan.",
                )
            )
            continue

        outlet: Outlet | None = None
        if role_slug == "outlet":
            if not outlet_code:
                response.rows.append(
                    BulkImportRowResult(
                        row=row_number,
                        entity="user",
                        identifier=email,
                        status="error",
                        message="outlet_code wajib untuk role outlet.",
                    )
                )
                continue

            outlet = outlets_repo.find_by_code(outlet_code)
            if not outlet:
                response.rows.append(
                    BulkImportRowResult(
                        row=row_number,
                        entity="user",
                        identifier=email,
                        status="error",
                        message=f"Outlet '{outlet_code}' tidak ditemukan.",
                    )
                )
                continue

        temp_password = secrets.token_urlsafe(10)
        user = User(
            email=email,
            username=username,
            full_name=full_name,
            password_hash=hash_password(temp_password),
            role_id=role.id,
            outlet_id=outlet.id if outlet else None,
            is_active=True,
        )

        if role_slug == "area_manager" and outlet_code:
            assigned = outlets_repo.find_by_code(outlet_code)
            if assigned:
                user.assigned_outlets = [assigned]

        users_repo.create(user)
        if outlet:
            from app.modules.tasks.identity_bridge import get_or_create_legacy_outlet

            get_or_create_legacy_outlet(db, outlet)

        response.users_created += 1
        response.rows.append(
            BulkImportRowResult(
                row=row_number,
                entity="user",
                identifier=email,
                status="created",
                message=f"Password sementara: {temp_password}",
            )
        )

    db.commit()
    return response
