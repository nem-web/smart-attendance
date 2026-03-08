import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from app.main import create_app
from app.core.security import hash_password
from app.utils.jwt_token import hash_refresh_token, decode_jwt

@pytest.fixture
async def app():
    return create_app()

@pytest.fixture
async def client(app):
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def test_user(db):
    user_doc = {
        "name": "Test User",
        "email": "testuser@example.com",
        "password_hash": hash_password("password123"),
        "role": "student",
        "college_name": "Test College",
        "is_verified": True,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    yield user_doc
    
    await db.users.delete_one({"_id": result.inserted_id})
    await db.refresh_tokens.delete_many({"user_id": result.inserted_id})

@pytest.mark.asyncio
async def test_login_creates_refresh_token(client, test_user, db):
    response = await client.post(
        "/auth/login",
        json={"email": test_user["email"], "password": "password123"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "refresh_token" in data
    
    refresh_token_hash = hash_refresh_token(data["refresh_token"])
    stored_token = await db.refresh_tokens.find_one({"token_hash": refresh_token_hash})
    
    assert stored_token is not None
    assert stored_token["user_id"] == test_user["_id"]
    assert stored_token["revoked"] is False

@pytest.mark.asyncio
async def test_refresh_token_generates_new_tokens(client, test_user, db):
    login_response = await client.post(
        "/auth/login",
        json={"email": test_user["email"], "password": "password123"}
    )
    
    old_refresh_token = login_response.json()["refresh_token"]
    
    refresh_response = await client.post(
        "/auth/refresh-token",
        json={"refresh_token": old_refresh_token}
    )
    
    assert refresh_response.status_code == 200
    data = refresh_response.json()
    assert "token" in data
    assert "refresh_token" in data
    assert data["refresh_token"] != old_refresh_token
    
    old_token_hash = hash_refresh_token(old_refresh_token)
    old_stored_token = await db.refresh_tokens.find_one({"token_hash": old_token_hash})
    assert old_stored_token["revoked"] is True

@pytest.mark.asyncio
async def test_refresh_with_revoked_token_fails(client, test_user):
    login_response = await client.post(
        "/auth/login",
        json={"email": test_user["email"], "password": "password123"}
    )
    
    refresh_token = login_response.json()["refresh_token"]
    
    await client.post(
        "/auth/refresh-token",
        json={"refresh_token": refresh_token}
    )
    
    second_refresh = await client.post(
        "/auth/refresh-token",
        json={"refresh_token": refresh_token}
    )
    
    assert second_refresh.status_code == 401
    assert "Invalid or revoked refresh token" in second_refresh.json()["detail"]

@pytest.mark.asyncio
async def test_logout_revokes_refresh_tokens(client, test_user, db):
    login_response = await client.post(
        "/auth/login",
        json={"email": test_user["email"], "password": "password123"}
    )
    
    access_token = login_response.json()["token"]
    refresh_token = login_response.json()["refresh_token"]
    
    logout_response = await client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    assert logout_response.status_code == 200
    
    refresh_token_hash = hash_refresh_token(refresh_token)
    stored_token = await db.refresh_tokens.find_one({"token_hash": refresh_token_hash})
    assert stored_token["revoked"] is True

@pytest.mark.asyncio
async def test_expired_refresh_token_fails(client, test_user, db):
    login_response = await client.post(
        "/auth/login",
        json={"email": test_user["email"], "password": "password123"}
    )
    
    refresh_token = login_response.json()["refresh_token"]
    refresh_token_hash = hash_refresh_token(refresh_token)
    
    await db.refresh_tokens.update_one(
        {"token_hash": refresh_token_hash},
        {"$set": {"expires_at": datetime.now(timezone.utc) - timedelta(days=1)}}
    )
    
    refresh_response = await client.post(
        "/auth/refresh-token",
        json={"refresh_token": refresh_token}
    )
    
    assert refresh_response.status_code == 401
    assert "expired" in refresh_response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_invalid_refresh_token_fails(client):
    response = await client.post(
        "/auth/refresh-token",
        json={"refresh_token": "invalid.token.here"}
    )
    
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_access_token_type_validation(client, test_user):
    login_response = await client.post(
        "/auth/login",
        json={"email": test_user["email"], "password": "password123"}
    )
    
    access_token = login_response.json()["token"]
    
    response = await client.post(
        "/auth/refresh-token",
        json={"refresh_token": access_token}
    )
    
    assert response.status_code == 401
    assert "Invalid token type" in response.json()["detail"]
