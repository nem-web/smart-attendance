import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import List

load_dotenv()

APP_NAME = "Smart Attendance API"

# CORS origins (can override via env as comma-separated in production)
_default_origins = [
    "http://localhost:5173",
    "https://sa-gl.vercel.app",
    "https://studentcheck.vercel.app",
    "http://127.0.0.1:5173",
]
ORIGINS: List[str] = (
    [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
    or _default_origins
)


class Settings(BaseSettings):
    MONGO_URI: str = ""
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# SMTP_HOST = os.getenv("SMTP_HOST")
# SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
# SMTP_USER = os.getenv("SMTP_USER")
# SMTP_PASS = os.getenv("SMTP_PASS")

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL")

class BrevoSettings(BaseSettings):
    BREVO_API_KEY:str=os.getenv("BREVO_API_KEY")
    BREVO_SENDER_EMAIL:str=os.getenv("BREVO_SENDER_EMAIL")
    BREVO_SENDER_NAME:str=os.getenv("BREVO_SENDER_NAME")
    
brevo_settings=BrevoSettings()

# ML Service Configuration
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
ML_SERVICE_TIMEOUT = float(os.getenv("ML_SERVICE_TIMEOUT", "30"))
ML_SERVICE_MAX_RETRIES = int(os.getenv("ML_SERVICE_MAX_RETRIES", "3"))

# ML Thresholds
ML_CONFIDENT_THRESHOLD = float(os.getenv("ML_CONFIDENT_THRESHOLD", "0.50"))
ML_UNCERTAIN_THRESHOLD = float(os.getenv("ML_UNCERTAIN_THRESHOLD", "0.60"))

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

