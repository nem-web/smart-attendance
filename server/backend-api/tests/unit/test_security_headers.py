import os
import pytest

@pytest.fixture(autouse=True)
def setup_jwt_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-key-123")

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.testclient import TestClient

from app.middleware.security import SecurityHeadersMiddleware

REQUIRED_HEADERS = {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}


def _create_test_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)

    @app.get("/ping")
    async def ping():
        return JSONResponse({"status": "ok"})

    return app


def test_security_headers_present():
    app = _create_test_app()
    client = TestClient(app)
    response = client.get("/ping")

    assert response.status_code == 200
    for header, expected_value in REQUIRED_HEADERS.items():
        assert header in response.headers, f"Missing header: {header}"
        assert response.headers[header] == expected_value, (
            f"{header}: expected '{expected_value}', got '{response.headers[header]}'"
        )


def test_content_security_policy_present():
    app = _create_test_app()
    client = TestClient(app)
    response = client.get("/ping")

    assert "Content-Security-Policy" in response.headers
    csp = response.headers["Content-Security-Policy"]
    assert "default-src" in csp


def test_hsts_disabled_via_env(monkeypatch):
    monkeypatch.setenv("ENABLE_HSTS", "false")

    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)

    @app.get("/ping")
    async def ping():
        return JSONResponse({"status": "ok"})

    client = TestClient(app)
    response = client.get("/ping")

    assert "Strict-Transport-Security" not in response.headers
