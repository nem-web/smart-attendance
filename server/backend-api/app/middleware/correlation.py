import uuid
import time
import structlog
import jwt
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # 1. Correlation ID
        correlation_id = request.headers.get("X-Correlation-ID")
        if not correlation_id:
            correlation_id = str(uuid.uuid4())

        request.state.correlation_id = correlation_id

        # 2. Bind initial context
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            correlation_id=correlation_id,
            path=request.url.path,
            method=request.method,
        )

        # 3. Attempt to get User ID from token (best effort)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # Decode without verification to just get the sub/user_id for logging
                # We assume signature verification happens in the actual auth dependency
                payload = jwt.decode(
                    token, options={"verify_signature": False}, algorithms=["HS256"]
                )
                # Check for various user ID fields depending on token structure
                user_id = (
                    payload.get("sub") or payload.get("user_id") or payload.get("id")
                )
                if user_id:
                    structlog.contextvars.bind_contextvars(user_id=user_id)
            except Exception:
                pass  # safely ignore logging failures for auth

        start_time = time.time()

        try:
            response = await call_next(request)

            process_time = (time.time() - start_time) * 1000

            # Log successful request
            # Filter out health-check logs if desired? No, user didn't ask.
            logger.info(
                "request_finished",
                status_code=response.status_code,
                duration_ms=round(process_time, 2),
            )

            response.headers["X-Correlation-ID"] = correlation_id
            return response

        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                "request_failed",
                error=str(e),
                duration_ms=round(process_time, 2),
            )
            raise e
