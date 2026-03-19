import os
import structlog
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.middleware.sessions import SessionMiddleware

import socketio
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

# Routers
from app.api.routes.auth import router as auth_router
from app.api.routes.students import router as student_router
from app.api.routes.webauthn import router as webauthn_router
from app.api.routes.attendance import router as attendance_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.exams import router as exams_router
from app.api.routes.health import router as health_router
from app.api.routes.holidays import router as holidays_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.qr import qr_router, qr_attendance_router
from app.api.routes.reports import router as reports_router
from app.api.routes.schedule import router as schedule_router
from app.api.routes.teacher_settings import router as teacher_settings_router

# Config
from .core.config import APP_NAME, ORIGINS

# Services
from app.services.attendance_daily import ensure_indexes as ensure_attendance_daily_indexes
from app.services.attendance import ensure_indexes as ensure_attendance_indexes
from app.services.schedule_service import ensure_indexes as ensure_schedule_indexes
from app.services.ml_client import ml_client
from app.services.attendance_socket_service import sio

# DB
from app.db.mongo import db, verify_db_connection
from app.db.indexes import create_indexes
from app.db.init_indexes import create_indexes as create_refresh_token_indexes
from app.db.nonce_store import close_redis

# Scheduler
from app.core.scheduler import start_scheduler, shutdown_scheduler

# Logging
from prometheus_fastapi_instrumentator import Instrumentator
from .core.logging import setup_logging

# Exceptions
from .core.error_handlers import smart_attendance_exception_handler, generic_exception_handler
from .core.exceptions import SmartAttendanceException

# Middleware
from .middleware.correlation import CorrelationIdMiddleware
from .middleware.timing import TimingMiddleware
from .middleware.security import SecurityHeadersMiddleware

# Rate Limiter
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter, rate_limit_exceeded_handler


load_dotenv()

setup_logging(service_name="backend-api")
logger = structlog.get_logger()


# ---------------- SENTRY ----------------

if SENTRY_DSN := os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=0.1,
        integrations=[FastApiIntegration()],
    )


# ---------------- LIFESPAN ----------------

@asynccontextmanager
async def lifespan(app: FastAPI):

    try:
        await verify_db_connection()

        await ensure_attendance_daily_indexes()
        logger.info("attendance_daily indexes ensured")

        await ensure_attendance_indexes()
        logger.info("attendance core indexes ensured")

        await ensure_schedule_indexes()
        logger.info("schedule indexes ensured")

        await create_indexes(db)
        logger.info("application indexes ensured")

    except Exception as e:
        logger.warning(
            "MongoDB connection failed, continuing without DB features",
            error=str(e),
        )

    try:
        await create_refresh_token_indexes()
        logger.info("refresh_tokens indexes ensured")

    except Exception:
        logger.error("Failed to create refresh token indexes", exc_info=True)

    try:
        start_scheduler()
        logger.info("Scheduler started")

    except Exception:
        logger.exception("Scheduler failed to start")

    yield

    await ml_client.close()
    await close_redis()
    shutdown_scheduler()

    logger.info("Application shutdown complete")


# ---------------- CREATE APP ----------------

def create_app() -> FastAPI:

    app = FastAPI(
        title=APP_NAME,
        lifespan=lifespan,
    )

    # ---------------- RATE LIMITER ----------------

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # ---------------- PREVENT CORS PREFLIGHT FAILURE ----------------
    # Browser sends OPTIONS request before POST

    @app.middleware("http")
    async def allow_preflight(request: Request, call_next):

        if request.method == "OPTIONS":
            return Response(status_code=200)

        return await call_next(request)

    # ---------------- CORS ----------------

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


    # ---------------- SECURITY MIDDLEWARE ----------------

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(TimingMiddleware)

    # ---------------- SESSION ----------------

    app.add_middleware(
        SessionMiddleware,
        secret_key=os.getenv("SESSION_SECRET_KEY", "dev-secret"),
        session_cookie="session",
        max_age=14 * 24 * 3600,
        same_site="lax",
        https_only=False,
    )

    # ---------------- EXCEPTION HANDLERS ----------------

    app.add_exception_handler(
        SmartAttendanceException,
        smart_attendance_exception_handler,
    )

    app.add_exception_handler(
        Exception,
        generic_exception_handler,
    )

    # ---------------- ROUTES ----------------

    app.include_router(auth_router, prefix="/api")
    app.include_router(student_router, prefix="/api")
    app.include_router(webauthn_router, prefix="/api")
    app.include_router(attendance_router, prefix="/api")
    app.include_router(analytics_router, prefix="/api")
    app.include_router(exams_router, prefix="/api")
    app.include_router(health_router)
    app.include_router(holidays_router, prefix="/api")
    app.include_router(notifications_router, prefix="/api")
    app.include_router(qr_router, prefix="/api")
    app.include_router(qr_attendance_router, prefix="/api")
    app.include_router(reports_router, prefix="/api")
    app.include_router(schedule_router, prefix="/api")
    app.include_router(teacher_settings_router, prefix="/api")

    # Optional health check
    @app.get("/")
    async def root():
        return {"status": "Smart Attendance API running"}

    return app


# ---------------- APP INSTANCE ----------------

app = create_app()


# ---------------- METRICS ----------------

Instrumentator().instrument(app).expose(app)


# ---------------- SOCKET.IO ----------------

app = socketio.ASGIApp(sio, app)


# ---------------- LOCAL RUN ----------------

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
