"""
QR-specific JWT helpers.

We intentionally use a *separate* secret (QR_JWT_SECRET) from the main
auth JWT_SECRET so that compromise of one channel does not affect the other.
If QR_JWT_SECRET is not set we fall back to JWT_SECRET — but operators
SHOULD set a dedicated value in production.

The token lifetime is deliberately short (10 s).  A cryptographic nonce
is embedded to provide replay protection even within the validity window.
"""

import os
import time
import secrets
import logging

import jwt  # PyJWT — already in requirements.txt

logger = logging.getLogger(__name__)

# ── Configuration ───────────────────────────────────────────────
# Dedicated secret for QR tokens; falls back to main JWT secret.
QR_JWT_SECRET: str = os.getenv("QR_JWT_SECRET") or os.getenv("JWT_SECRET", "")
QR_JWT_ALGORITHM: str = os.getenv("QR_JWT_ALGORITHM", "HS256")

if not QR_JWT_SECRET:
    raise RuntimeError(
        "QR_JWT_SECRET (or JWT_SECRET) is not set. "
        "QR tokens cannot be signed without a secret."
    )

# How long (in seconds) a QR token remains valid.
QR_TOKEN_TTL_SECONDS: int = int(os.getenv("QR_TOKEN_TTL_SECONDS", "10"))


def create_qr_token(course_id: str) -> str:
    """
    Build a signed JWT that will be rendered as a QR code.

    Payload fields
    ──────────────
    course_id : str   — identifies which course this QR is for.
    timestamp : int   — server-generated UNIX time in **milliseconds**.
    nonce     : str   — 32-byte cryptographically-random hex string.
    iat       : int   — standard "issued at" (seconds).
    exp       : int   — standard expiry = iat + QR_TOKEN_TTL_SECONDS.

    Why milliseconds for `timestamp`?
    The spec explicitly requires UNIX ms.  We also set `exp` (in seconds)
    so that PyJWT's built-in expiry check serves as a hard ceiling.
    """
    now_s = int(time.time())
    now_ms = int(time.time() * 1000)

    payload = {
        "course_id": course_id,
        "timestamp": now_ms,  # UNIX ms — spec requirement
        "nonce": secrets.token_hex(32),  # 256-bit random
        "iat": now_s,
        "exp": now_s + QR_TOKEN_TTL_SECONDS,  # hard JWT expiry
    }

    token = jwt.encode(payload, QR_JWT_SECRET, algorithm=QR_JWT_ALGORITHM)
    logger.debug("QR token issued for course=%s, nonce=%s", course_id, payload["nonce"])
    return token


def decode_qr_token(token: str) -> dict:
    """
    Verify signature + expiry and return the payload dict.

    Raises
    ──────
    jwt.ExpiredSignatureError  — token older than QR_TOKEN_TTL_SECONDS
    jwt.InvalidTokenError      — bad signature / malformed
    """
    payload = jwt.decode(
        token,
        QR_JWT_SECRET,
        algorithms=[QR_JWT_ALGORITHM],
        options={
            "require": ["course_id", "timestamp", "nonce", "exp", "iat"],
        },
    )
    return payload
