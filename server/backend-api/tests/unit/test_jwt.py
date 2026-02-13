import pytest
import jwt
from app.utils.jwt_token import create_jwt, decode_jwt


def test_jwt_lifecycle():
    user_id = "test_user"
    role = "student"
    email = "student@test.com"

    # Create token
    token = create_jwt(user_id, role, email)
    assert token is not None

    # Decode token
    # We use jwt.decode directly to check against secret if needed
    decoded = decode_jwt(token)
    assert decoded["user_id"] == user_id
    assert decoded["role"] == role
    assert decoded["email"] == email
    assert "exp" in decoded


def test_jwt_invalid_token():
    with pytest.raises(jwt.DecodeError):
        decode_jwt("invalid.token.string")
