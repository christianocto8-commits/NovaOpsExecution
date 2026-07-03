from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth
from app.routers import builder_documents
from app.routers import execution_sessions
from app.routers import form_templates
from app.routers import health
from app.routers import outlets
from app.routers import reports
from app.routers import runtime_templates
from app.routers import settings

app = FastAPI(
    title="NovaOps API",
    version="0.5.4",
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

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(outlets.router)
app.include_router(form_templates.router)
app.include_router(runtime_templates.router)
app.include_router(builder_documents.router)
app.include_router(execution_sessions.router)
app.include_router(settings.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {
        "app": "NovaOps API",
        "status": "running",
        "version": "0.5.4",
    }