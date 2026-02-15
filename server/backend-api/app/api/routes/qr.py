"""
API routes for the Dynamic QR Code attendance system.

Endpoints
─────────
GET  /api/qr/generate       — Teacher generates a time-bound QR token.
POST /api/attendance/qr-mark — Student scans QR and marks attendance.

Security
────────
• /generate requires a valid teacher JWT (via `get_current_teacher`).
• /qr-mark requires a valid student JWT (via `get_current_user`).
  The student_id in the body is cross-checked against the authenticated
  user so one student cannot mark attendance for another.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_teacher
from app.core.security import get_current_user
from app.schemas.qr import (
    QRGenerateResponse,
    QRMarkAttendanceRequest,
    QRMarkAttendanceResponse,
)
from app.services.qr_service import generate_qr_for_course, validate_qr_and_mark
from app.utils.qr_token import QR_TOKEN_TTL_SECONDS

logger = logging.getLogger(__name__)

# Two routers — they live under different prefixes.
qr_router = APIRouter(prefix="/api/qr", tags=["QR Code"])
qr_attendance_router = APIRouter(prefix="/api/attendance", tags=["QR Attendance"])


# ── Teacher: Generate QR ───────────────────────────────────────


@qr_router.get(
    "/generate",
    response_model=QRGenerateResponse,
    summary="Generate a dynamic QR token for a course",
    responses={
        401: {"description": "Missing or invalid teacher token"},
        403: {"description": "Teacher does not own requested course"},
        404: {"description": "Course not found"},
    },
)
async def generate_qr(
    course_id: str,
    teacher=Depends(get_current_teacher),
):
    """
    Returns a short-lived signed JWT that the teacher's client renders as
    a QR code.  Students scan it within 10 seconds to mark attendance.

    Query params
    ────────────
    course_id : str — ObjectId of the subject / course.
    """
    teacher_id = str(teacher["id"])

    token = await generate_qr_for_course(course_id, teacher_id)

    return QRGenerateResponse(
        qr_token=token,
        expires_in_seconds=QR_TOKEN_TTL_SECONDS,
    )


# ── Student: Mark attendance via QR ────────────────────────────


@qr_attendance_router.post(
    "/qr-mark",
    response_model=QRMarkAttendanceResponse,
    summary="Mark attendance by submitting a scanned QR token",
    responses={
        401: {"description": "QR token invalid, expired, or user not authenticated"},
        403: {"description": "Student ID mismatch (trying to mark for someone else)"},
        409: {"description": "QR already used or attendance already marked today"},
        422: {"description": "Validation error (bad payload / course not found)"},
    },
)
async def qr_mark_attendance(
    body: QRMarkAttendanceRequest,
    current_user=Depends(get_current_user),
):
    """
    Accepts a scanned QR JWT, validates it end-to-end, and creates an
    attendance record.

    Anti-fraud: the `student_id` in the body MUST match the authenticated
    user.  This prevents one student from marking attendance on behalf of
    another by simply copying the request body.
    """
    # ── Identity cross-check ────────────────────────────────────
    # `current_user["id"]` comes from the auth JWT, which the student
    # cannot forge.  If it doesn't match the submitted student_id the
    # request is rejected.
    auth_user_id = current_user["id"]
    if str(auth_user_id) != str(body.student_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only mark attendance for yourself",
        )

    # ── Delegate to service layer ───────────────────────────────
    location_dict = body.location.model_dump() if body.location else None

    record = await validate_qr_and_mark(
        qr_token=body.qr_token,
        student_id=body.student_id,
        location=location_dict,
    )

    return QRMarkAttendanceResponse(
        attendance_id=record["_id"],
        course_id=record["course_id"],
        student_id=record["student_id"],
    )
