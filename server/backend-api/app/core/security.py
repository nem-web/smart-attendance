import logging
import hashlib
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.core.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = settings.JWT_ALGORITHM

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def decode_jwt_token(token: str):
    try:
        if token.startswith("Bearer "):
            token = token.split(" ")[1]

        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError as e:
        logger.debug("JWT decode error: %s", e)
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    payload = decode_jwt_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Minimal payload expectation: {"sub": "<user_id>", "role": "student"}
    user_id = payload.get("sub") or payload.get("user_id")
    role = payload.get("role")
    session_id = payload.get("session_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Validate session if session_id is present in token
    if session_id:
        from app.db.mongo import db
        from bson import ObjectId
        from app.utils.jwt_token import hash_session_id

        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                raise HTTPException(status_code=401, detail="User not found")

            stored_session_hash = user.get("current_active_session")
            if not stored_session_hash or stored_session_hash != hash_session_id(
                session_id
            ):
                raise HTTPException(
                    status_code=401,
                    detail="SESSION_CONFLICT: You have been logged out because this account was logged in on another device",
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Session validation error: {e}")
            raise HTTPException(status_code=401, detail="Session validation failed")

    # Return a lightweight user object (can extend with email/name if in payload)
    return {"id": user_id, "role": role, "email": payload.get("email")}


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _prehash(password: str) -> str:
    """
    Normalize + prehash password to avoid bcrypt 72-byte limit.
    """
    normalized = password.strip().encode("utf-8")
    return hashlib.sha256(normalized).hexdigest()


def hash_password(password: str) -> str:
    return pwd_context.hash(_prehash(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_prehash(plain_password), hashed_password)
