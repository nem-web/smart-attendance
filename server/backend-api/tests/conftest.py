import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

# Set environment variable BEFORE any app import
os.environ["MONGO_DB_NAME"] = "test_smart_attendance"
os.environ["JWT_SECRET"] = "test-secret-key-123"


# MongoDB client shared across all tests but properly scoped
_db_client = None


async def get_db_client():
    """Get or create the database client"""
    global _db_client
    if _db_client is None:
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        _db_client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=2000)
        try:
            await _db_client.admin.command("ping")
        except Exception:
            _db_client.close()
            _db_client = None
            pytest.skip("MongoDB not available - skipping integration tests")
    return _db_client


def pytest_sessionfinish(session, exitstatus):
    """Clean up the MongoDB client at the end of the test session"""
    global _db_client
    if _db_client is not None:
        _db_client.close()
        _db_client = None


@pytest_asyncio.fixture(scope="function")
async def db_client():
    """Get the MongoDB client for tests"""
    client = await get_db_client()
    yield client


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
    yield database

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
