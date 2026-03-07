import json
from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import List, Union


class Settings(BaseSettings):
    SERVICE_NAME: str = "ML Service"
    SERVICE_VERSION: str = "1.0.0"

    ML_SERVICE_HOST: str = "0.0.0.0"
    ML_SERVICE_PORT: int = 8001
    BACKEND_API_URL: str = "http://localhost:8000"

    HOST: str = "0.0.0.0"
    PORT: int = 8001

    ML_MODEL: str = "hog"
    NUM_JITTERS: int = 5
    MIN_FACE_AREA_RATIO: float = 0.04

    # Liveness Detection (Anti-Spoofing)
    ML_LIVENESS_CHECK: bool = True

    CORS_ORIGINS: Union[str, List[str]] = [
        "https://studentcheck.vercel.app",
        "http://localhost:5173",
    ]

    LOG_LEVEL: str = "info"

    # API Key fields - will be validated by model_validator
    ML_API_KEY: str = ""
    API_KEY: str | None = None

    class Config:
        env_file = ".env"
        case_sensitive = True

    @model_validator(mode="after")
    def validate_api_keys(self) -> "Settings":
        """
        Validate API keys with legacy fallback logic.
        Prefers ML_API_KEY then API_KEY, raises ValueError if neither is set.
        """
        api_key = self.ML_API_KEY or self.API_KEY
        if not api_key:
            raise ValueError(
                "ML_API_KEY environment variable is required. "
                "Set ML_API_KEY (or legacy API_KEY) to configure the ML service API key."
            )
        # Keep both fields in sync for legacy and current access paths
        self.ML_API_KEY = api_key
        self.API_KEY = api_key
        return self

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            try:
                return json.loads(self.CORS_ORIGINS)
            except Exception:
                return [self.CORS_ORIGINS]
        return self.CORS_ORIGINS


settings = Settings()
