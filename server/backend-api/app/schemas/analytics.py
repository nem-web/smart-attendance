from typing import List
from pydantic import BaseModel


class StudentStat(BaseModel):
    id: str
    name: str
    score: float  # Attendance Percentage


class SubjectStatsResponse(BaseModel):
    attendance: float  # Class Average %
    avgLate: int  # Average late count per student (placeholder 0 for now)
    riskCount: int  # Count of students < 75%
    lateTime: str  # Average late arrival time (placeholder "09:00 AM")

    bestPerforming: List[StudentStat]
    needsSupport: List[StudentStat]
