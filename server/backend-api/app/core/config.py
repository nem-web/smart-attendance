from typing import List, Optional, Union

from pydantic import AnyHttpUrl, EmailStr, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_HERE_CHANGE_IN_PRODUCTION"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    SERVER_NAME: str = "Smart Attendance API"
    SERVER_HOST: AnyHttpUrl = "http://localhost:8000"

    # CORS configuration
    BACKEND_CORS_ORIGINS: List[Union[str, AnyHttpUrl]] = [
        # e.g., 'http://localhost:5173', 'https://smart-attendance-app.vercel.app'
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"  # Replace with your Atlas URI often
    MONGO_DB_NAME: str = "smart_attendance_db"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = "demo"
    CLOUDINARY_API_KEY: str = "12345678"
    CLOUDINARY_API_SECRET: str = "abcdefgh"

    # ML Service
    # Update to http://localhost:8001 if running locally
    ML_SERVICE_URL: str = "http://localhost:8001"

    # Email (Brevo / Sendinblue)
    BREVO_API_KEY: Optional[str] = None
    EMAIL_SENDER_NAME: str = "Smart Attendance System"
    EMAIL_SENDER_ADDRESS: EmailStr = "noreply@smartattendance.com"

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
