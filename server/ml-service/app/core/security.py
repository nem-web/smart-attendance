from fastapi import HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from app.core.config import settings
from starlette.status import HTTP_403_FORBIDDEN

api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key == settings.API_KEY:
        return api_key
    raise HTTPException(
        status_code=HTTP_403_FORBIDDEN, detail="Could not validate credentials"
    )
