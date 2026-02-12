import sys
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

# Mock modules before importing app.main to avoid side effects if any
sys.modules["app.db.mongo"] = MagicMock()
sys.modules["motor.motor_asyncio"] = MagicMock()
sys.modules["pymongo"] = MagicMock()
sys.modules["app.services.ml_client"] = MagicMock()
sys.modules["app.services.attendance_daily"] = MagicMock()

from app.main import app  # noqa: E402


client = TestClient(app)


def test_read_root():
    # We expect a 404 for root "/" as it's not defined, or 200 if it is.
    response = client.get("/")
    assert response.status_code in [200, 404]  # nosec


def test_health_check_if_exists():
    response = client.get("/api/v1/health")
    # Just ensure it doesn't crash (500)
    assert response.status_code != 500  # nosec
