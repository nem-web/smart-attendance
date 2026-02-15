import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.api.routes import teacher_settings as settings_router
from .api.routes.attendance import router as attendance_router
from .api.routes.auth import router as auth_router
from .api.routes.students import router as students_router
from .api.routes.notifications import router as notifications_router
from .core.config import APP_NAME, ORIGINS
from .api.routes.analytics import router as analytics_router
from app.services.attendance_daily import (
    ensure_indexes as ensure_attendance_daily_indexes,
)
from app.services.ml_client import ml_client

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
from .middleware.security import SecurityHeadersMiddleware

from .api.routes.health import router as health_router
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

load_dotenv()

# Setup structured logging
setup_logging()
logger = logging.getLogger(APP_NAME)

if SENTRY_DSN := os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=0.1,
        integrations=[FastApiIntegration()],
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await ensure_attendance_daily_indexes()
        logger.info("attendance_daily indexes ensured")
    except Exception as e:
        logger.warning(
            f"Could not connect to MongoDB. Application will continue, but DB features will fail. Error: {e}"  # noqa: E501
        )
        logger.warning("Please check your MONGO_URI in .env")

    yield
    await ml_client.close()
    logger.info("ML client closed")


def create_app() -> FastAPI:
    app = FastAPI(title=APP_NAME, lifespan=lifespan)

    # Rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS MUST be added FIRST so headers are present even on errors
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ORIGINS,
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(TimingMiddleware)

    # SessionMiddleware MUST be added before routers so authlib can use request.session reliably  # noqa: E501
    app.add_middleware(
        SessionMiddleware,
        secret_key=os.getenv("SESSION_SECRET_KEY", "temporary-dev-secret-key"),
        session_cookie="session",
        max_age=14 * 24 * 3600,
        same_site="lax",
        https_only=False,
    )

    # Exception Handlers
    app.add_exception_handler(
        SmartAttendanceException, smart_attendance_exception_handler
    )
    app.add_exception_handler(Exception, generic_exception_handler)

    # Routers
    app.include_router(auth_router)
    app.include_router(students_router)
    app.include_router(attendance_router)
    app.include_router(settings_router.router)
    app.include_router(notifications_router)
    app.include_router(analytics_router)
    app.include_router(health_router, tags=["Health"])

    return app


app = create_app()

# Instrumentator
Instrumentator().instrument(app).expose(app)

# Optional: run directly with `python -m app.main`
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)  # nosec
