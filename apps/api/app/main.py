from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.bootstrap.ensure_online_admin import ensure_online_admin
from app.core.config import get_settings

settings = get_settings()
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
NovaOps Enterprise API.

Backend core for multi-outlet operations management, task execution,
dynamic forms, workflow approvals, reports, notifications, RBAC, and audit logs.
""",
    contact={
        "name": "NovaOps Engineering",
        "email": "engineering@novaops.dev",
    },
    openapi_tags=[
        {
            "name": "System",
            "description": "Health check, version, and platform diagnostics.",
        },
        {
            "name": "Authentication",
            "description": "Login, token management, and current user session.",
        },
        {
            "name": "Identity",
            "description": "Users, roles, permissions, organizations, and outlets.",
        },
        {
            "name": "Tasks",
            "description": "Enterprise task engine.",
        },
        {
            "name": "Forms",
            "description": "Dynamic form engine.",
        },
        {
            "name": "Workflows",
            "description": "Workflow approval and escalation engine.",
        },
        {
            "name": "Reports",
            "description": "Analytics, KPI, and reporting API.",
        },
        {
            "name": "Notifications",
            "description": "Notification delivery and reminder engine.",
        },
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.include_router(api_router)


@app.on_event("startup")
def bootstrap_online_admin() -> None:
    ensure_online_admin()


@app.get("/", tags=["System"])
def root() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }
