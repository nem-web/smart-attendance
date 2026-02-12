from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


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
