import os
import time
import logging
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.core.config import settings
from app.schemas.responses import HealthResponse
from app.api.routes.face_recognition import router as ml_router

# New Imports
from .core.logging import setup_logging
from .core.error_handlers import smart_attendance_exception_handler, generic_exception_handler
from .core.exceptions import SmartAttendanceException
from .middleware.correlation import CorrelationIdMiddleware
from .middleware.timing import TimingMiddleware

# Setup logging
setup_logging()
logger = logging.getLogger(settings.SERVICE_NAME)

if SENTRY_DSN := os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=0.1,
        integrations=[FastApiIntegration()]
    )

# Track service start time
service_start_time = time.time()


def create_app() -> FastAPI:
    """Create and configure the ML Service FastAPI application"""
    
    app = FastAPI(
        title=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        description="Machine Learning Service for Face Recognition"
    )

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
    app.add_exception_handler(SmartAttendanceException, smart_attendance_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # Include routers
    app.include_router(ml_router)
    
    return app


app = create_app()


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "status": "running"
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    """Health check endpoint"""
    uptime = time.time() - service_start_time

    # Check if ML dependencies are available (MediaPipe, OpenCV, NumPy)
    models_loaded = True
    try:
        import cv2
        import mediapipe as mp
        import numpy as np
    except ImportError:
        models_loaded = False

    return HealthResponse(
        status="healthy" if models_loaded else "degraded",
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        models_loaded=models_loaded,
        uptime_seconds=uptime
    )


# Run the service
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL
    )
