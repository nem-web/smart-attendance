from typing import List, Optional
from pydantic import BaseModel, Field
from uuid import uuid4

class ScheduleSlot(BaseModel):
    slot_id: str = Field(default_factory=lambda: str(uuid4()))
    day: str
    slot: int
    start_time: str
    end_time: str
    room: Optional[str] = None
    tracked: bool = True

class SubjectScheduleDB(BaseModel):
    """
    Representation of the schedule document in MongoDB.
    One document per subject per teacher.
    """
    subject_id: str
    teacher_id: str
    subject_name: Optional[str] = None
    weekly_schedule: List[ScheduleSlot] = []

    class Config:
        populate_by_name = True
