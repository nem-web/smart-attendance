from pydantic import BaseModel
from datetime import date
from typing import Optional, Dict

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

class DailyStats(BaseModel):
    present: int
    absent: int
    late: int
    total: int
    percentage: float

class SubjectAttendanceSummaryOut(BaseModel):
    id: str = Field(..., alias="_id")
    subjectId: str
    teacherId: Optional[str]
    daily: Dict[str, DailyStats]
    createdAt: Optional[str]
    updatedAt: Optional[str]
