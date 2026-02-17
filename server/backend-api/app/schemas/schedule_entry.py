from typing import Optional
from pydantic import BaseModel, Field

class ScheduleEntry(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    teacher_id: str
    day: str  # e.g. "Monday"
    slot: int
    start_time: str  # "HH:MM"
    end_time: str  # "HH:MM"
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    room: Optional[str] = None
    semester: Optional[str] = None
    branch: Optional[str] = None
    batch: Optional[str] = None
    tracked: bool = True
    
    class Config:
        populate_by_name = True
