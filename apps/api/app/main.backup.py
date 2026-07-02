from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import models agar SQLAlchemy & Alembic mengenali seluruh tabel
from app.models import (
    role,
    user,
    outlet,
    form_template,
    form_field,
    form_schedule,
    form_submission,
    form_answer,
    task,
    task_comment,
    builder_document,
    runtime_template,
    execution_session,
)

# Routers
from app.routers.health import router as health_router
from app.routers.form_templates import router as form_templates_router
from app.routers.builder_documents import router as builder_documents_router
from app.routers.runtime_templates import router as runtime_templates_router
from app.routers.execution_sessions import router as execution_sessions_router

# Auth router (opsional jika file auth.py sudah dibuat)
try:
    from app.routers.auth import router as auth_router
    HAS_AUTH = True
except Exception:
    HAS_AUTH = False

app = FastAPI(
    title="NovaOps Execution API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_router)
app.include_router(form_templates_router)
app.include_router(builder_documents_router)
app.include_router(runtime_templates_router)
app.include_router(execution_sessions_router)

if HAS_AUTH:
    app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "message": "NovaOps Execution API is running",
        "version": "1.0.0",
    }