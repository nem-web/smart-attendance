import os
import time
import logging
from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.core.config import settings
from app.api.routes.face_recognition import router as ml_router
from app.core.security import verify_api_key

# New Imports
from prometheus_fastapi_instrumentator import Instrumentator
from .core.logging import setup_logging
from .core.error_handlers import (
    smart_attendance_exception_handler,
    generic_exception_handler,
)
from .core.exceptions import SmartAttendanceException
from .middleware.correlation import CorrelationIdMiddleware
from .middleware.timing import TimingMiddleware

from .api.routes.health import router as health_router

# Setup logging
setup_logging()
logger = logging.getLogger(settings.SERVICE_NAME)

if SENTRY_DSN := os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=0.1,
        integrations=[FastApiIntegration()],
    )

# Track service start time
service_start_time = time.time()


def create_app() -> FastAPI:
    """Create and configure the ML Service FastAPI application"""

    app = FastAPI(
        title=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        description="Machine Learning Service for Face Recognition",
    )

    @app.middleware("http")
    async def enforce_api_key(request: Request, call_next):
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return JSONResponse(
                status_code=401,
                content={"detail": "X-API-Key header is missing"},
                headers={"WWW-Authenticate": "Api-Key"},
            )
        if api_key != settings.ML_API_KEY:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid API key"},
                headers={"WWW-Authenticate": "Api-Key"},
            )
        return await call_next(request)

    # Middleware
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(TimingMiddleware)

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,  # Allow all for ML service
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception Handlers
    app.add_exception_handler(
        SmartAttendanceException, smart_attendance_exception_handler
    )
    app.add_exception_handler(Exception, generic_exception_handler)

    # Include routers
    app.include_router(ml_router)
    app.include_router(health_router, tags=["Health"])

    return app


app = create_app()

# Instrumentator
Instrumentator().instrument(app).expose(app)


@app.get("/", tags=["Root"], dependencies=[Depends(verify_api_key)])
async def root():
    """Root endpoint"""
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "status": "running",
    }


# Run the service
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL,
    )
