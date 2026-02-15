import time
import structlog
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        logger.info(
            "Request completed",
            path=request.url.path,
            method=request.method,
            status_code=response.status_code,
            duration_ms=round(duration * 1000, 2)
        )

        response.headers['X-Process-Time'] = str(duration)
        return response
