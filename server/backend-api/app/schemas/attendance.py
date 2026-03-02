from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, List


class AttendanceCreate(BaseModel):
    student_id: str
    class_id: str
    date: date
    period: int
    present: bool
    marked_by: Optional[str]


class AttendanceOut(AttendanceCreate):
    id: str = Field(..., alias="_id")
    created_at: Optional[str]


class AttendanceConfirm(BaseModel):
    subject_id: str
    date: date
    present_students: List[str]
    absent_students: List[str]

class QRAttendanceRequest(BaseModel):
    subjectId: str
    date: str
    sessionId: str
    token: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    webauthn_credential: Optional[dict] = None
