import pytest
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import jwt
import os

# Set fallback test JWT_SECRET BEFORE importing JWT utilities so module reads test secret on load
os.environ.setdefault("JWT_SECRET", "test-secret-key")

from app.utils.jwt_token import (
    create_access_token,
    create_refresh_token,
    decode_jwt,
    hash_refresh_token,
    generate_session_id,
)

JWT_SECRET = os.getenv("JWT_SECRET")

@pytest.fixture
def mock_user():
    return {
        "_id": ObjectId(),
        "email": "test@example.com",
        "role": "student",
        "name": "Test User",
        "password_hash": "hashed_password",
        "is_verified": True,
    }

@pytest.fixture
def session_id():
    return generate_session_id()

def test_create_access_token(mock_user, session_id):
    token = create_access_token(
        user_id=str(mock_user["_id"]),
        role=mock_user["role"],
        email=mock_user["email"],
        session_id=session_id,
    )
    
    assert token is not None
    decoded = decode_jwt(token)
    assert decoded["user_id"] == str(mock_user["_id"])
    assert decoded["role"] == mock_user["role"]
    assert decoded["email"] == mock_user["email"]
    assert decoded["type"] == "access"
    assert decoded["session_id"] == session_id

def test_create_refresh_token(mock_user, session_id):
    token = create_refresh_token(
        user_id=str(mock_user["_id"]),
        session_id=session_id,
    )
    
    assert token is not None
    decoded = decode_jwt(token)
    assert decoded["user_id"] == str(mock_user["_id"])
    assert decoded["type"] == "refresh"
    assert decoded["session_id"] == session_id

def test_access_token_expiry():
    user_id = str(ObjectId())
    token = create_access_token(user_id=user_id, role="student")
    decoded = decode_jwt(token)
    
    exp_time = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
    iat_time = datetime.fromtimestamp(decoded["iat"], tz=timezone.utc)
    
    time_diff = exp_time - iat_time
    assert time_diff.total_seconds() == 15 * 60

def test_refresh_token_expiry():
    user_id = str(ObjectId())
    token = create_refresh_token(user_id=user_id)
    decoded = decode_jwt(token)
    
    exp_time = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
    iat_time = datetime.fromtimestamp(decoded["iat"], tz=timezone.utc)
    
    time_diff = exp_time - iat_time
    assert time_diff.total_seconds() == 7 * 24 * 60 * 60

def test_expired_token():
    user_id = str(ObjectId())
    payload = {
        "user_id": user_id,
        "role": "student",
        "type": "access",
        "iat": datetime.now(timezone.utc) - timedelta(hours=2),
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    expired_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_jwt(expired_token)

def test_invalid_token():
    with pytest.raises(jwt.DecodeError):
        decode_jwt("invalid.token.here")

def test_hash_refresh_token():
    token = "test_refresh_token_12345"
    hash1 = hash_refresh_token(token)
    hash2 = hash_refresh_token(token)
    
    assert hash1 == hash2
    assert len(hash1) == 64
    
    different_token = "different_token"
    hash3 = hash_refresh_token(different_token)
    assert hash1 != hash3

def test_session_id_uniqueness():
    session_ids = [generate_session_id() for _ in range(100)]
    assert len(session_ids) == len(set(session_ids))
