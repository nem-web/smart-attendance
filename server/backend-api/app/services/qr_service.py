"""
QR attendance business logic — generation & validation.

This module is the single source of truth for:
  • Creating short-lived QR tokens (teacher side)
  • Validating scanned QR tokens and marking attendance (student side)

Every validation step is explained inline so future contributors understand
*why* each check exists, not just *what* it does.
"""

import time
import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from app.db.mongo import db
from app.db.nonce_store import consume_nonce
from app.utils.qr_token import (
    create_qr_token,
    decode_qr_token,
    QR_TOKEN_TTL_SECONDS,
)

logger = logging.getLogger(__name__)

# MongoDB collections
attendance_col = db["attendance"]
qr_attendance_col = db["qr_attendance"]  # dedicated collection for QR-based records


# ── Generation ──────────────────────────────────────────────────


async def generate_qr_for_course(course_id: str, teacher_id: str) -> str:
    """
    Create a signed QR JWT for *course_id*.

    We verify that the course exists and is owned by the requesting teacher
    before issuing a token.  A stolen teacher JWT should not let an attacker
    generate QRs for courses they do not teach.
    """
    # Validate the course_id is a valid ObjectId
    try:
        course_oid = ObjectId(course_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid course_id",
        )

    # Validate the course exists
    course = await db.subjects.find_one({"_id": course_oid})
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    # Ownership check — the teacher must be linked to the course.
    # The subject document stores the teacher via `teacher_id` or
    # `teacherId`.  If neither field is set, reject — an unowned
    # course must not allow QR generation.
    owner = course.get("teacher_id") or course.get("teacherId")
    if not owner or str(owner) != str(teacher_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the teacher of this course",
        )

    token = create_qr_token(course_id)
    logger.info("QR token generated — course=%s teacher=%s", course_id, teacher_id)
    return token


# ── Validation & Attendance Marking ────────────────────────────


async def validate_qr_and_mark(
    qr_token: str,
    student_id: str,
    location: dict | None = None,
) -> dict:
    """
    Full validation pipeline.  Steps are executed in the order mandated by
    the specification so that cheaper / faster checks run first and we
    bail out as early as possible.

    Returns the newly-created attendance document on success.
    Raises HTTPException with the appropriate status code on failure.
    """

    # ── Step 1: Verify JWT signature + structural validity ──────
    # `decode_qr_token` checks signature, expiry (`exp`), required claims.
    # If the token was tampered with or is structurally invalid this raises
    # immediately — no further processing is needed.
    import jwt as pyjwt

    try:
        payload = decode_qr_token(qr_token)
    except pyjwt.ExpiredSignatureError:
        # Token lived longer than QR_TOKEN_TTL_SECONDS — reject.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="QR code has expired",
        )
    except pyjwt.InvalidTokenError as exc:
        # Covers bad signature, malformed JWT, missing required claims, etc.
        logger.warning("Invalid QR token: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid QR token",
        )

    # ── Step 2: Extract payload fields ──────────────────────────
    course_id: str = payload["course_id"]
    token_timestamp_ms: int = payload["timestamp"]
    nonce: str = payload["nonce"]

    # ── Step 3: Server-side time validation ─────────────────────
    # Even though `exp` provides a JWT-level guard, we perform an explicit
    # check using the `timestamp` field (milliseconds) because:
    #   • The spec requires it.
    #   • We can give a more descriptive error message.
    #   • Defence in depth — never trust a single layer.
    current_ms = int(time.time() * 1000)
    age_seconds = (current_ms - token_timestamp_ms) / 1000

    if age_seconds > QR_TOKEN_TTL_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                f"QR code expired ({age_seconds:.1f}s old, max {QR_TOKEN_TTL_SECONDS}s)"
            ),
        )

    if age_seconds < 0:
        # Token has a future timestamp — clocks should never differ because
        # we only trust the server clock, so this indicates tampering.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="QR token timestamp is in the future — possible tampering",
        )

    # ── Step 4: Duplicate attendance guard ──────────────────────
    # Check this BEFORE consuming the nonce so that a valid QR token
    # is not burned when the student already has attendance today.
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await qr_attendance_col.find_one(
        {
            "student_id": student_id,
            "course_id": course_id,
            "date": today_str,
        }
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance already marked for this course today",
        )

    # ── Step 5: Replay protection (nonce) ───────────────────────
    # `consume_nonce` is atomic: it returns True only the first time
    # this nonce is seen.  Consumed AFTER the duplicate check so we
    # don't burn a valid token unnecessarily.
    nonce_is_fresh = await consume_nonce(nonce)
    if not nonce_is_fresh:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="QR code has already been used (replay detected)",
        )

    # ── Step 6: Verify course exists ────────────────────────────
    try:
        course_oid = ObjectId(course_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid course_id in QR token",
        )
    course = await db.subjects.find_one({"_id": course_oid})
    if not course:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Course referenced in QR token does not exist",
        )

    # ── Step 7: Persist the attendance record ───────────────────
    record = {
        "student_id": student_id,
        "course_id": course_id,
        "date": today_str,
        "marked_at": datetime.now(timezone.utc).isoformat(),
        "method": "qr",  # distinguish from face-recognition attendance
        "nonce": nonce,  # audit trail — ties record to specific QR
        "qr_issued_at_ms": token_timestamp_ms,
    }

    if location:
        record["location"] = location

    result = await qr_attendance_col.insert_one(record)
    record["_id"] = str(result.inserted_id)

    logger.info(
        "QR attendance marked — student=%s course=%s date=%s",
        student_id,
        course_id,
        today_str,
    )
    return record
