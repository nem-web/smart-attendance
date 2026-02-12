from pydantic import BaseModel, Field
from typing import List, Optional


class Period(BaseModel):
    slot: int
    subject: str
    start: str
    end: str
    teacher_id: Optional[str]


class TimetableCreate(BaseModel):
    class_id: str
    day: str
    periods: List[Period]


class TimetableOut(TimetableCreate):
    id: str = Field(..., alias="_id")
