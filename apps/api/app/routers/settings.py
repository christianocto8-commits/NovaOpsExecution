from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.identity.dependencies import get_current_active_user, require_role
from app.modules.identity.models import User as IdentityUser
from app.bootstrap.ensure_operational_templates import (
    install_operational_templates,
    resolve_template_creator,
)
from app.schemas.settings import (
    ReportWipeRequest,
    ReportWipeResponse,
    SettingsResponse,
    SettingsUpdate,
    StarterPackInstallResponse,
    WorkspaceResetRequest,
    WorkspaceResetResponse,
)
from app.services.report_wipe import wipe_report_data_for_all_accounts
from app.services.workspace_reset import reset_workspace_for_smoke_test
from app.services.workspace_settings import (
    get_or_create_settings_row,
    get_workspace_settings,
    update_workspace_settings,
)

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(get_current_active_user),
):
    del current_user

    get_or_create_settings_row(db)
    return get_workspace_settings(db)


@router.put("", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user

    return update_workspace_settings(db, payload)


@router.post("/reset-workspace", response_model=WorkspaceResetResponse)
def reset_workspace(
    payload: WorkspaceResetRequest,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user

    if payload.confirm_phrase.strip().upper() != "RESET":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ketik RESET untuk konfirmasi.",
        )

    result = reset_workspace_for_smoke_test(db)
    total_deleted = sum(result["deleted"].values())

    return WorkspaceResetResponse(
        settings_reset=result["settings_reset"],
        deleted=result["deleted"],
        message=f"Workspace direset ke default. {total_deleted} baris data operasional dihapus.",
    )


def _is_wipe_reports_confirm_phrase(value: str) -> bool:
    normalized = " ".join(value.strip().upper().replace("_", " ").split())
    return normalized in {"WIPE REPORTS", "WIPE REPORT", "PUTIHKAN REPORT", "PUTIHKAN REPORTS"}


@router.post("/wipe-reports", response_model=ReportWipeResponse)
def wipe_reports(
    payload: ReportWipeRequest,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user

    if not _is_wipe_reports_confirm_phrase(payload.confirm_phrase):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Ketik "WIPE REPORTS" untuk konfirmasi pemutihan report.',
        )

    deleted = wipe_report_data_for_all_accounts(db)
    total_deleted = sum(deleted.values())

    return ReportWipeResponse(
        deleted=deleted,
        message=(
            f"Pemutihan report selesai untuk semua akun/outlet. "
            f"{total_deleted} baris data laporan dihapus. "
            "User, outlet, template, dan schedule tetap dipertahankan."
        ),
    )


@router.post("/install-starter-pack", response_model=StarterPackInstallResponse)
def install_starter_pack(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    creator = resolve_template_creator(db, current_user)
    result = install_operational_templates(db, creator=creator)
    if not result.get("ok"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message") or "Gagal memasang starter pack.",
        )

    db.commit()
    return StarterPackInstallResponse(**result)
