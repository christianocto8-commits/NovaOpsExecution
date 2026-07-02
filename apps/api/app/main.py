from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.modules.task_drafts.draft_router import router as task_drafts_router
from app.modules.tasks.router import router as tasks_router
from app.routers.auth import router as auth_router
from app.routers.builder_documents import router as builder_documents_router
from app.routers.execution_sessions import router as execution_sessions_router
from app.routers.form_templates import router as form_templates_router
from app.routers.health import router as health_router
from app.routers.outlets import router as outlets_router
from app.routers.runtime_templates import router as runtime_templates_router


app = FastAPI(
    title="NovaOps Enterprise API",
    version="0.5.0",
    description="Enterprise multi-outlet operations platform API",
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

API_PREFIX = "/api/v1"

app.include_router(health_router, prefix=API_PREFIX)
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(form_templates_router, prefix=API_PREFIX)
app.include_router(runtime_templates_router, prefix=API_PREFIX)
app.include_router(builder_documents_router, prefix=API_PREFIX)
app.include_router(execution_sessions_router, prefix=API_PREFIX)
app.include_router(outlets_router, prefix=API_PREFIX)
app.include_router(tasks_router, prefix=API_PREFIX)
app.include_router(task_drafts_router, prefix=API_PREFIX)


@app.get("/")
def root():
    return {
        "app": "NovaOps Enterprise API",
        "version": "0.5.0",
        "status": "running",
    }