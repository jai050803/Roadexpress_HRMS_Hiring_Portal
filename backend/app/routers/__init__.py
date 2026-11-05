from app.routers.auth import router as auth_router
from app.routers.jobs import router as jobs_router
from app.routers.applications import router as applications_router

__all__ = ["auth_router", "jobs_router", "applications_router"]
