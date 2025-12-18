import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from fastapi.staticfiles import StaticFiles

from .core.config import APP_NAME, ORIGINS

# Routes
from .api.routes.auth import router as auth_router
from .api.routes.students import router as students_router
from .api.routes.attendance import router as attendance_router

from app.api.routes import teacher_settings as settings_router
from app.core.cloudinary_config import cloudinary



def create_app() -> FastAPI:
    app = FastAPI(title=APP_NAME)

    # CORS
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
        https_only = False,
    )

    # Routers
    app.include_router(auth_router)
    app.include_router(students_router)
    app.include_router(attendance_router)
    app.include_router(settings_router.router)
    
    # serve static files (avatars)
    app.mount("/static", StaticFiles(directory="app/static"), name="static")

    return app


app = create_app()

# Optional: run directly with `python -m app.main`
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
