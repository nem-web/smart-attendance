import json
from pydantic_settings import BaseSettings
from typing import List, Union


class Settings(BaseSettings):
    SERVICE_NAME: str = "ML Service"
    SERVICE_VERSION: str = "1.0.0"

    HOST: str = "0.0.0.0"
    PORT: int = 8001

    ML_MODEL: str = "hog"
    NUM_JITTERS: int = 5
    MIN_FACE_AREA_RATIO: float = 0.04

    # 👇 IMPORTANT FIX
    CORS_ORIGINS: Union[str, List[str]] = [
        "https://studentcheck.vercel.app",
        "https://sa-gl.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    LOG_LEVEL: str = "info"

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            try:
                return json.loads(self.CORS_ORIGINS)
            except Exception:
                return [self.CORS_ORIGINS]
        return self.CORS_ORIGINS


settings = Settings()
