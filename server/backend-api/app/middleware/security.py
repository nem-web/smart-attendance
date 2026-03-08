import os
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.csp_policy = os.getenv(
            "CONTENT_SECURITY_POLICY",
            "default-src 'self'; "
            "img-src 'self' data: https:; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline';"
        )
        self.hsts_max_age = os.getenv("HSTS_MAX_AGE", "63072000")
        self.enable_hsts = os.getenv("ENABLE_HSTS", "true").lower() == "true"

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = self.csp_policy
        
        if self.enable_hsts:
            response.headers["Strict-Transport-Security"] = (
                f"max-age={self.hsts_max_age}; includeSubDomains"
            )

        return response
