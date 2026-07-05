from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.modules.identity.api import router as auth_router
from app.modules.identity.authorization_api import router as authorization_router
from app.modules.identity.management_api import router as identity_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(identity_router)
api_router.include_router(authorization_router)
