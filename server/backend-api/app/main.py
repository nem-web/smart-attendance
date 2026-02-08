import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .core.config import APP_NAME, ORIGINS

# Routes
from .api.routes.auth import router as auth_router
from .api.routes.students import router as students_router
from .api.routes.attendance import router as attendance_router

from app.api.routes import teacher_settings as settings_router
from app.core.cloudinary_config import cloudinary
from app.services.ml_client import ml_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(APP_NAME)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await ml_client.close()
    logger.info("ML client closed")


def create_app() -> FastAPI:
    app = FastAPI(title=APP_NAME, lifespan=lifespan)

    # CORS – use config ORIGINS so production can override via CORS_ORIGINS env
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # SessionMiddleware MUST be added before routers so authlib can use request.session reliably
    app.add_middleware(
        SessionMiddleware,
        secret_key=os.getenv("SESSION_SECRET_KEY", "kuch-to12hai-mujhse-raita"),
        session_cookie="session",
        max_age=14 * 24 * 3600,
        same_site="lax",
        https_only=False,
    )

    # Routers
    app.include_router(auth_router)
    app.include_router(students_router)
    app.include_router(attendance_router)
    app.include_router(settings_router.router)

    return app


app = create_app()

# Optional: run directly with `python -m app.main`
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
