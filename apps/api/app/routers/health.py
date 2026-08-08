from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
def health_check():
    return {
        "status": "ok",
        "service": "NovaOps Execution API"
    }


@router.get("/db")
def database_health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "database": "connected"
    }


@router.get("/app-version")
def app_version_check():
    return {
        "latestVersionName": "1.0.1",
        "latestVersionCode": 2,
        "required": False,
        "downloadUrl": "https://nova-ops.cloud/downloads/NovaOps-Outlet-MatePad.apk",
        "releaseNotes": "Perbaikan format cetak printer thermal, optimasi layar tablet Huawei MatePad 11.5S, dan kestabilan sync offline."
    }