import sys
import os
import asyncio
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

# Set environment variable BEFORE any app import
os.environ["MONGO_DB_NAME"] = "test_smart_attendance"
os.environ["JWT_SECRET"] = "test-secret-key-123"

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


# @pytest.fixture(scope="session")
# def event_loop():
#     """Provide a fresh event loop per test session (avoids closed-loop errors)."""
#     loop = asyncio.new_event_loop()
#     yield loop
#     loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_client():
    """Get the MongoDB client for tests"""
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=2000)
    try:
        await client.admin.command("ping")
    except Exception:
        client.close()
        pytest.skip("MongoDB not available - skipping integration tests")

    yield client

    # Close client after test
    client.close()


@pytest_asyncio.fixture(scope="function")
async def db(db_client):
    """
    Returns a clean database for each test.
    """
    db_name = os.environ["MONGO_DB_NAME"]
    # Drop database to ensure clean state
    try:
        await db_client.drop_database(db_name)
    except Exception:
        pass

    database = db_client[db_name]

    # Patch the global db instance to use the test client's database
    # This ensures it uses the correct event loop for each test function
    # Also patch modules that have already imported db
    patchers = [
        patch("app.db.mongo.db", database),
        patch("app.db.mongo.client", db_client),
    ]

    # Try patching other modules if they are already imported
    modules_to_patch = [
        "app.api.routes.analytics.db",
        "app.api.routes.attendance.db",
        "app.api.routes.teacher_settings.db",
        "app.api.deps.db",
        "app.services.attendance.db",
        "app.services.attendance_daily.db",
        "app.services.qr_service.db",
        "app.services.students.db",
        "app.services.subject_service.db",
        "app.db.subjects_repo.db",
    ]

    started_patchers = []

    for p in patchers:
        p.start()
        started_patchers.append(p)

    for target in modules_to_patch:
        try:
            # Check if module is loaded (simple heuristic using sys.modules)
            module_name = target.rsplit(".", 1)[0]
            if module_name in sys.modules:
                p = patch(target, database)
                p.start()
                started_patchers.append(p)
        except Exception:
            pass

    try:
        yield database
    finally:
        for p in reversed(started_patchers):
            p.stop()

    # Cleanup after test
    try:
        await db_client.drop_database(db_name)
    except Exception:
        pass


@pytest_asyncio.fixture(scope="function")
async def client(db):
    """
    Async client for API requests.
    """
    from app.main import app

    # Ensure app uses the correct DB.
    # app.db.mongo.db should point to 'test_smart_attendance' because of env var.

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture(autouse=True)
def mock_ml_client():
    """Mock ML client to avoid closing the event loop during tests."""
    with patch("app.services.ml_client.ml_client") as mock:
        mock.close = AsyncMock()
        mock.detect_faces = AsyncMock(return_value={"success": True, "faces": []})
        mock.get_embeddings = AsyncMock(
            return_value={"success": True, "embeddings": []}
        )
        yield mock


@pytest.fixture
def test_user_data():
    return {
        "email": "test@example.com",
        "name": "Test Teacher",
        "password": "password123",
        "role": "teacher",
        "college_name": "Test College",
        "employee_id": "EMP001",
        "phone": "1234567890",
        "branch": "CSE",
    }


@pytest_asyncio.fixture(scope="function")
async def auth_token(client, db, test_user_data):
    """
    Registers and logs in a test user, returning a valid JWT token.
    """
    # Mock email service
    from unittest.mock import patch

    # Register
    with patch("app.core.email.BrevoEmailService.send_verification_email"):
        await client.post("/auth/register", json=test_user_data)

    # Verify manually
    await db.users.update_one(
        {"email": test_user_data["email"]}, {"$set": {"is_verified": True}}
    )

    # Login
    login_data = {
        "email": test_user_data["email"],
        "password": test_user_data["password"],
    }
    response = await client.post("/auth/login", json=login_data)
    return response.json()["token"]


@pytest.fixture
def make_token_header():
    """
    Factory fixture to create JWT token headers for any role, with exp claim.
    """
    from jose import jwt
    from app.core.config import settings

    def _create_header(user_id: str, role: str, email: str = None):
        email = email or f"{role}@test.com"
        exp = datetime.now(timezone.utc) + timedelta(days=30)
        token_payload = {
            "sub": user_id,
            "role": role,
            "email": email,
            "exp": int(exp.timestamp()),
        }
        token = jwt.encode(
            token_payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
        )
        return {"Authorization": f"Bearer {token}"}

    return _create_header


@pytest.fixture
def teacher_token_header(make_token_header):
    return lambda tid: make_token_header(tid, "teacher")


@pytest.fixture
def student_token_header(make_token_header):
    return lambda sid: make_token_header(sid, "student")
