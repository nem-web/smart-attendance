import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import List

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# config.py is in app/core/, so go up 2 levels to backend-api/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env from backend-api/.env
load_dotenv(BASE_DIR / ".env")

APP_NAME = "Smart Attendance API"

# CORS origins (can override via env as comma-separated in production)
DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
    "https://sa-gl.vercel.app",
    "https://studentcheck.vercel.app",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
    "https://studentcheck-o25q.onrender.com",
    "https://smart-attendance-gsm7.onrender.com",
    "https://studentcheck-ml.onrender.com",
]

raw_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

# 🚫 HARD FAIL if wildcard is used
if "*" in raw_origins:
    raise RuntimeError("CORS_ORIGINS must not contain '*' when credentials are enabled")

ORIGINS: List[str] = raw_origins or DEFAULT_ORIGINS


class Settings(BaseSettings):
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = "HS256"

    class Config:
        env_file = str(BASE_DIR / ".env")
        extra = "ignore"


settings = Settings()

if not settings.JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is not set. "
        "Please set it in your .env file or environment variables."
    )

# SMTP_HOST = os.getenv("SMTP_HOST")
# SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
# SMTP_USER = os.getenv("SMTP_USER")
# SMTP_PASS = os.getenv("SMTP_PASS")

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL")


class BrevoSettings(BaseSettings):
    BREVO_API_KEY: str | None = os.getenv("BREVO_API_KEY")
    BREVO_SENDER_EMAIL: str | None = os.getenv("BREVO_SENDER_EMAIL")
    BREVO_SENDER_NAME: str | None = os.getenv("BREVO_SENDER_NAME")


brevo_settings = BrevoSettings()

# ML Service Configuration
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
ML_SERVICE_TIMEOUT = float(os.getenv("ML_SERVICE_TIMEOUT", "30"))
ML_SERVICE_MAX_RETRIES = int(os.getenv("ML_SERVICE_MAX_RETRIES", "3"))
ML_API_KEY = os.getenv("ML_API_KEY")

# Rate Limiting Configuration
RATE_LIMIT_LOGIN = os.getenv("RATE_LIMIT_LOGIN", "10/minute")
RATE_LIMIT_REGISTER = os.getenv("RATE_LIMIT_REGISTER", "5/minute")
RATE_LIMIT_ATTENDANCE_MARK = os.getenv("RATE_LIMIT_ATTENDANCE_MARK", "30/minute")
RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT", "100/minute")

# Trusted Proxies for X-Forwarded-For parsing
# Comma-separated list of IP addresses that are trusted proxies
TRUSTED_PROXIES = os.getenv("TRUSTED_PROXIES", "")

# ML Thresholds
ML_CONFIDENT_THRESHOLD = float(os.getenv("ML_CONFIDENT_THRESHOLD", "0.50"))
ML_UNCERTAIN_THRESHOLD = float(os.getenv("ML_UNCERTAIN_THRESHOLD", "0.60"))

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")
