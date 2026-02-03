import os
import jwt
from datetime import datetime, timedelta,UTC

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

def create_jwt(user_id: str, role: str, email: str = None):
    payload = {
        "user_id": user_id,          # ✅ FIXED
        "role": role,
        "email": email,
        "iat": datetime.now(UTC),
        "exp": datetime.now(UTC)+ timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
