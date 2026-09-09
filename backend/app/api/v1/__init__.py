from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.sources import router as sources_router
from app.api.v1.scans import router as scans_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health_router, tags=["Health"])
api_v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_v1_router.include_router(projects_router, prefix="/projects", tags=["Projects"])
api_v1_router.include_router(sources_router, prefix="/projects", tags=["Source Input"])
api_v1_router.include_router(scans_router, prefix="/projects", tags=["Scans"])

__all__ = ["api_v1_router", "auth_router", "projects_router", "sources_router", "scans_router"]

