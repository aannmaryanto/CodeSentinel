from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1 import api_v1_router, auth_router, projects_router, sources_router, scans_router
from app.schemas.health import HealthResponse
from app.core.errors import register_exception_handlers

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="AI-Powered Code Review & Security Analysis Platform API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Register Centralized Error Handlers
register_exception_handlers(app)

# Configure CORS Middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Health Check Endpoint
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def root_health_check() -> HealthResponse:
    """
    Root health check endpoint.
    """
    return HealthResponse(
        status="ok",
        app=settings.APP_NAME,
        version="0.1.0",
        environment=settings.APP_ENV,
    )

# Include API Routers
app.include_router(api_v1_router)
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])
app.include_router(sources_router, prefix="/api/projects", tags=["Source Input"])
app.include_router(scans_router, prefix="/api/projects", tags=["Scans"])


