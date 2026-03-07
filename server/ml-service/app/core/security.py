from fastapi import HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from app.core.config import settings
from starlette.status import HTTP_401_UNAUTHORIZED

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    if not api_key:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="X-API-Key header is missing",
            headers={"WWW-Authenticate": "Api-Key"},
        )
    if api_key == settings.ML_API_KEY:
        return api_key
    raise HTTPException(
        status_code=HTTP_401_UNAUTHORIZED,
        detail="Invalid API key",
        headers={"WWW-Authenticate": "Api-Key"},
    )
