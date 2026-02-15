"""
Pydantic schemas for the Dynamic QR Code attendance system.

Separate schemas keep validation rules co-located and let FastAPI
auto-generate OpenAPI docs for the new endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Request Bodies ──────────────────────────────────────────────


class QRGenerateRequest(BaseModel):
    """Teacher requests a fresh QR token for a specific course."""

    course_id: str = Field(
        ...,
        description="The course / subject ObjectId the QR grants access to",
    )


class LocationPayload(BaseModel):
    """Optional geo-location sent by the student's device."""

    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class QRMarkAttendanceRequest(BaseModel):
    """Student scans a QR and submits this body to mark attendance."""

    qr_token: str = Field(
        ...,
        description="The JWT token embedded in the QR code",
    )
    student_id: str = Field(
        ...,
        description="The student's user ID",
    )
    location: Optional[LocationPayload] = Field(
        None,
        description="Device GPS coordinates (optional)",
    )


# ── Response Bodies ─────────────────────────────────────────────


class QRGenerateResponse(BaseModel):
    """Returned to the teacher after QR generation."""

    qr_token: str = Field(
        ...,
        description="Signed JWT to be encoded into a QR image",
    )
    expires_in_seconds: int = Field(
        default=10,
        description="Client-side hint: how long the QR is valid",
    )


class QRMarkAttendanceResponse(BaseModel):
    """Returned on successful attendance marking."""

    success: bool = True
    message: str = "Attendance marked successfully"
    attendance_id: str = Field(
        ...,
        description="Database ID of the new attendance record",
    )
    course_id: str
    student_id: str


class QRErrorResponse(BaseModel):
    """Generic error envelope (used in OpenAPI examples only)."""

    detail: str
