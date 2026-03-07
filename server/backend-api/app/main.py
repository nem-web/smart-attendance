import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import socketio
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

# routers
from .api.v1.__init__ import router as api_v1_router
from .api.v1.__init__ import legacyRouter as api_legacy_router

from .core.config import APP_NAME, ORIGINS
from app.services.attendance_daily import (
    ensure_indexes as ensure_attendance_daily_indexes,
)
from app.services.attendance import ensure_indexes as ensure_attendance_indexes
from app.services.schedule_service import ensure_indexes as ensure_schedule_indexes
from app.db.init_indexes import create_indexes as create_refresh_token_indexes
from app.services.ml_client import ml_client
from app.services.attendance_socket_service import sio
from app.db.nonce_store import close_redis
from app.core.scheduler import start_scheduler, shutdown_scheduler
from app.db.mongo import db
from app.db.indexes import create_indexes

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

from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter, rate_limit_exceeded_handler

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

        await ensure_attendance_indexes()
        logger.info("attendance core indexes ensured")

        await ensure_schedule_indexes()
        logger.info("schedule indexes ensured")

        await create_indexes(db)
        logger.info("application indexes ensured")
    except Exception as e:
        logger.warning(
            "Could not connect to MongoDB. Application will continue, "
            f"but DB features will fail. Error: {e}"
        )
        logger.warning("Please check your MONGO_URI in .env")

    try:
        await create_refresh_token_indexes()
        logger.info("refresh_tokens indexes ensured")
    except Exception as e:
        logger.error(f"Failed to create refresh token indexes: {e}")
        import sys
        sys.exit(1)

    try:
        start_scheduler()
    except Exception as e:
        logger.exception(f"Failed to start scheduler: {e}")

    yield
    await ml_client.close()
    logger.info("ML client closed")
    await close_redis()
    shutdown_scheduler()


def create_app() -> FastAPI:
    app = FastAPI(
        title=APP_NAME,
        lifespan=lifespan,
    )

    # Rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # CORS MUST be added FIRST so headers are present even on errors
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+",
        allow_origins=ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(TimingMiddleware)

    # SessionMiddleware MUST be added before routers so authlib can use request.session reliably # noqa: E501
    app.add_middleware(
        SessionMiddleware,
        secret_key=os.getenv("SESSION_SECRET_KEY", "temporary-dev-secret-key"),
        session_cookie="session",
        max_age=14 * 24 * 3600,
        same_site="none",
        https_only=True,
    )

    # Exception Handlers
    app.add_exception_handler(
        SmartAttendanceException, smart_attendance_exception_handler
    )
    app.add_exception_handler(Exception, generic_exception_handler)

    # Routes Mounting
    # Legacy routes support Router
    app.include_router(api_legacy_router)
    # v1 router
    app.include_router(api_v1_router)

    return app


app = create_app()

# Instrumentator
Instrumentator().instrument(app).expose(app)

# Wrap FastAPI app with Socket.IO as the outermost ASGI layer
app = socketio.ASGIApp(sio, app)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)  # nosec
