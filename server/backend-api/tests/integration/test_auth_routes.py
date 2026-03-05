import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


@pytest.fixture
def mock_email():
    with patch(
        "app.core.email.BrevoEmailService._send_email", new_callable=AsyncMock
    ) as mock:
        yield mock


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient, db, mock_email):
    payload = {
        "email": "newuser@example.com",
        "password": "strongpassword123",
        "name": "New User",
        "role": "teacher",
        "college_name": "Test College",
        "employee_id": "EMP123",
        "phone": "9876543210",
        "branch": "CSE",
    }
    # with patch("app.core.email.BrevoEmailService._send_email", new_callable=AsyncMock) as mock_email:
    response = await client.post("/auth/register", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == payload["email"]
    assert "user_id" in data
    # Verify in DB
    user = await db.users.find_one({"email": payload["email"]})
    assert user is not None
    assert "is_verified" in user  # Should serve as a basic check


@pytest.mark.asyncio
async def test_login_user(client: AsyncClient, db):
    # Setup: Create and verify a user
    email = "login_test@example.com"
    password = "password123"

    # Manually insert verified user to skip email verification flow in test
    from app.core.security import hash_password

    await db.users.insert_one(
        {
            "email": email,
            "password_hash": hash_password(password),
            "name": "Login Test",
            "role": "teacher",
            "is_verified": True,
            "is_active": True,
            "created_at": None,
            "college_name": "Test College",
        }
    )

    # Test Login
    response = await client.post(
        "/auth/login",
        data={
            "username": email,  # OAuth2 password request form uses 'username' for email
            "password": password,
        },
    )

    # If using JSON body login
    if response.status_code == 422:
        response = await client.post(
            "/auth/login", json={"email": email, "password": password}
        )

    assert response.status_code == 200
    data = response.json()
    # UserResponse returns "token", not "access_token"
    assert "token" in data
    assert "refresh_token" in data
    # assert data["token_type"] == "bearer"  # Not in UserResponse model


@pytest.mark.asyncio
async def test_duplicate_registration(client: AsyncClient, db, mock_email):
    payload = {
        "email": "duplicate@example.com",
        "password": "password",
        "name": "Dup User",
        "role": "student",
        "college_name": "Test College",  # Required field
    }
    # First registration
    await client.post("/auth/register", json=payload)

    # Second registration
    response = await client.post("/auth/register", json=payload)
    if response.status_code == 422:
        pytest.fail(f"Got 422 Validation Error: {response.json()}")
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()
