import os
import jwt
import uuid
import hashlib
from datetime import datetime, timedelta, UTC

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


def generate_session_id() -> str:
    """
    Generate a unique session identifier using UUID4.

    Returns:
        A unique session ID string.
    """
    return str(uuid.uuid4())


def hash_session_id(session_id: str) -> str:
    """
    Hash a session ID for secure storage in the database.

    Args:
        session_id: The session ID to hash.

    Returns:
        SHA256 hash of the session ID.
    """
    return hashlib.sha256(session_id.encode()).hexdigest()


def extract_session_id(token: str) -> str | None:
    """
    Extract session ID from a JWT token without full validation.

    Args:
        token: The JWT token string.

    Returns:
        The session ID if present, None otherwise.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("session_id")
    except Exception:
        return None


def create_access_token(
    user_id: str, role: str, email: str = None, session_id: str = None
):
    """
    Create an access token with optional session ID.

    Args:
        user_id: The user's ID.
        role: The user's role.
        email: The user's email (optional).
        session_id: The session ID to embed in the token (optional).

    Returns:
        Encoded JWT access token.
    """
    payload = {
        "user_id": user_id,
        "role": role,
        "email": email,
        "type": "access",
        "iat": datetime.now(UTC),
        "exp": datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    if session_id:
        payload["session_id"] = session_id
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, session_id: str = None):
    """
    Create a refresh token with optional session ID.

    Args:
        user_id: The user's ID.
        session_id: The session ID to embed in the token (optional).

    Returns:
        Encoded JWT refresh token.
    """
    payload = {
        "user_id": user_id,
        "type": "refresh",
        "iat": datetime.now(UTC),
        "exp": datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    }
    if session_id:
        payload["session_id"] = session_id
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_jwt(user_id: str, role: str, email: str = None):
    """
    Legacy wrapper for backward compatibility.
    Returns a short-lived access token.
    """
    return create_access_token(user_id, role, email)


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
