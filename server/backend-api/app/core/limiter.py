import os
import logging
from fastapi import Request
from slowapi import Limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import TRUSTED_PROXIES, RATE_LIMIT_DEFAULT

logger = logging.getLogger(__name__)


def _parse_trusted_proxies() -> set[str]:
    if not TRUSTED_PROXIES:
        return set()
    return {p.strip() for p in TRUSTED_PROXIES.split(",") if p.strip()}


def get_client_ip_for_rate_limit(request: Request) -> str:
    """Get client IP address while safely honoring trusted proxies."""
    trusted_proxies = _parse_trusted_proxies()
    client_host = request.client.host if request.client else None

    if client_host and trusted_proxies and client_host in trusted_proxies:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

    return get_remote_address(request)


def _get_user_id_from_request(request: Request) -> str | None:
    """Extract authenticated user_id from request state or bearer token."""
    if hasattr(request.state, "user_id") and request.state.user_id:
        return str(request.state.user_id)

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            from app.utils.jwt_token import decode_jwt

            token = auth_header.split(" ", 1)[1]
            decoded = decode_jwt(token)
            user_id = decoded.get("user_id")
            if user_id:
                return str(user_id)
        except Exception:
            return None
    return None


def get_teacher_rate_limit_key(request: Request) -> str:
    """Rate-limit key for attendance mark endpoint (per teacher, fallback to IP)."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            from app.utils.jwt_token import decode_jwt

            token = auth_header.split(" ", 1)[1]
            decoded = decode_jwt(token)
            if decoded.get("role") == "teacher" and decoded.get("user_id"):
                return f"teacher_id:{decoded['user_id']}"
        except Exception:
            pass
    return f"ip:{get_client_ip_for_rate_limit(request)}"


def get_default_rate_limit_key(request: Request) -> str:
    """Default key: per user when authenticated, otherwise per IP."""
    user_id = _get_user_id_from_request(request)
    if user_id:
        return f"user_id:{user_id}"
    return f"ip:{get_client_ip_for_rate_limit(request)}"


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Ensure 429 responses always include Retry-After."""
    response = _rate_limit_exceeded_handler(request, exc)
    if "Retry-After" not in response.headers:
        retry_after = getattr(exc, "retry_after", None)
        if retry_after is None:
            limit = getattr(exc, "limit", None)
            granularity = getattr(limit, "granularity", None)
            retry_after = getattr(granularity, "seconds", None)
        response.headers["Retry-After"] = str(int(retry_after or 60))
    return response


def _get_rate_limit_key_func():
    """
    Get the appropriate key function for rate limiting.

    For authenticated attendance endpoints, prefers user_id over IP to avoid
    shared rate limit buckets. Falls back to client IP for unauthenticated requests.

    Uses X-Forwarded-For header only if the immediate peer is a trusted proxy,
    otherwise falls back to remote address to prevent IP spoofing.
    """

    def key_func(request):
        """
        Rate limit key function that prefers user_id for authenticated requests.

        Checks for user_id in:
        1. request.state.user_id - set by get_current_user dependency
        2. Authorization header - decode JWT to extract user_id for manual auth

        Falls back to client IP for unauthenticated requests.
        """
        return get_default_rate_limit_key(request)

    return key_func


# Get Redis URL from environment
REDIS_URL = os.getenv("REDIS_URL", "")

# Configure limiter with dynamic key function and Redis storage if available
if REDIS_URL:
    limiter = Limiter(
        key_func=_get_rate_limit_key_func(),
        storage_uri=REDIS_URL,
        default_limits=[RATE_LIMIT_DEFAULT],
        headers_enabled=True,
    )
    logger.info("Rate limiter configured with Redis backend")
else:
    limiter = Limiter(
        key_func=_get_rate_limit_key_func(),
        default_limits=[RATE_LIMIT_DEFAULT],
        headers_enabled=True,
    )
    logger.info(
        "REDIS_URL not configured. Using in-memory rate limiting. "
        "Note: In-memory rate limiting does not work with multiple workers."
    )
