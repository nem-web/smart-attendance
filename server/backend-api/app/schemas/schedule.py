from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import date


class ClassMetadata(BaseModel):
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    room: Optional[str] = None
    teacher_id: Optional[str] = None
    tracked: bool = True


class Period(BaseModel):
    slot: int
    start: str
    end: str
    metadata: Optional[ClassMetadata] = None


class DailySchedule(BaseModel):
    day: str  # e.g. "Monday"
    periods: List[Period] = []


class RecurringSchedule(BaseModel):
    weekly: List[DailySchedule] = []


class Holiday(BaseModel):
    date: date
    name: Optional[str] = None
    all_day: bool = True
    notes: Optional[str] = None
    overrides: Optional[List[Period]] = None


class ExamOverride(BaseModel):
    date: date
    name: Optional[str] = None
    periods: Optional[List[Period]] = None
    notes: Optional[str] = None


class Schedule(BaseModel):
    timetable: Optional[List[DailySchedule]] = []
    recurring: Optional[RecurringSchedule] = None
    holidays: Optional[List[Holiday]] = []
    exams: Optional[List[ExamOverride]] = []
    meta: Optional[Dict[str, str]] = None
