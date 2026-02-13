import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_register_teacher_success(client: AsyncClient, db):
    payload = {
        "name": "Test Teacher",
        "email": "teacher@test.com",
        "password": "password123",
        "role": "teacher",
        "college_name": "Test College",
        "employee_id": "EMP123",
        "phone": "1234567890",
        "branch": "CSE",
    }

    # Mock the email service to avoid network calls
    with patch(
        "app.core.email.BrevoEmailService.send_verification_email",
        new_callable=AsyncMock,
    ):
        response = await client.post("/auth/register", json=payload)

    # Check database availability
    if response.status_code == 500 and "topology" in response.text.lower():
        pytest.skip("MongoDB not available")

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == payload["email"]
    assert "user_id" in data

    # Verify user in DB
    user = await db.users.find_one({"email": payload["email"]})
    assert user is not None
    assert user["role"] == "teacher"
    assert user["is_verified"] is False

    # Verify teacher profile in DB
    teacher = await db.teachers.find_one({"userId": user["_id"]})
    assert teacher is not None
    assert teacher["employee_id"] == "EMP123"


@pytest.mark.asyncio
async def test_login_flow(client: AsyncClient, db):
    # 1. Register
    register_payload = {
        "name": "Login User",
        "email": "login@test.com",
        "password": "password123",
        "role": "teacher",
        "college_name": "Test College",
        "employee_id": "EMP999",
        "phone": "0987654321",
        "branch": "IT",
    }

    with patch(
        "app.core.email.BrevoEmailService.send_verification_email",
        new_callable=AsyncMock,
    ):
        response = await client.post("/auth/register", json=register_payload)
        if response.status_code == 500 and "topology" in response.text.lower():
            pytest.skip("MongoDB not available")

    # 2. Login (Should fail - unverified)
    login_payload = {
        "email": register_payload["email"],
        "password": register_payload["password"],
    }
    response = await client.post("/auth/login", json=login_payload)
    # The app returns 403 for unverified
    assert response.status_code == 403
    assert "verify" in response.json()["detail"].lower()

    # 3. Manually verify user in DB
    await db.users.update_one(
        {"email": register_payload["email"]}, {"$set": {"is_verified": True}}
    )

    # 4. Login (Should success)
    response = await client.post("/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["email"] == register_payload["email"]
