from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.routers.auth import router as auth_router
from app.routers.jobs import router as jobs_router
from app.routers.applications import router as applications_router
from app.routers.resumes import router as resumes_router
from app.routers.cv_bank import router as cv_bank_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    yield
    # Shutdown cleanup


app = FastAPI(
    title="Road Express HRMS API",
    description="Recruitment Pipeline and Hiring Management API for Road Express",
    version="1.0.0",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    openapi_url="/openapi.json" if settings.APP_ENV != "production" else None,
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        error_code = detail.get("error", "http_error")
        message = detail.get("message", str(detail))
        details = detail.get("details", {})
    else:
        error_code = "http_error"
        message = str(detail)
        details = {}

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": error_code, "message": message, "details": details},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "validation_error",
            "message": "Input validation failed",
            "details": exc.errors(),
        },
    )


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "Road Express HRMS API",
        "version": "1.0.0",
        "status": "operational",
        "docs_url": "/docs" if settings.APP_ENV != "production" else None,
    }


@app.get("/health", tags=["Health"])
@app.get("/v1/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "app": "Road Express HRMS",
        "env": settings.APP_ENV,
    }


# Register domain routers
app.include_router(auth_router)
app.include_router(auth_router, prefix="/v1")
app.include_router(jobs_router)
app.include_router(jobs_router, prefix="/v1")
app.include_router(applications_router)
app.include_router(applications_router, prefix="/v1")
app.include_router(resumes_router)
app.include_router(resumes_router, prefix="/v1")
app.include_router(cv_bank_router)
app.include_router(cv_bank_router, prefix="/v1")
