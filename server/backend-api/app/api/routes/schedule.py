from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
import os
import pytz

from app.api.deps import get_current_teacher
from app.services import schedule_service

router = APIRouter(prefix="/schedule", tags=["schedule"])


# Response Models
class ClassPeriod(BaseModel):
    subject: Optional[str] = None
    grade: Optional[str] = None
    room: Optional[str] = None
    start_time: str  # "HH:MM"
    end_time: str  # "HH:MM"
    slot: int
    attendance_status: Optional[str] = None  # "completed", "pending", None


class TodayScheduleResponse(BaseModel):
    classes: List[ClassPeriod]
    current_day: str


@router.get("/today", response_model=TodayScheduleResponse)
async def get_today_schedule(current: dict = Depends(get_current_teacher)):
    """
    Get today's schedule for the authenticated teacher using the 
    dedicated schedule service.
    Returns all classes
    scheduled for the current day of the week.
    """
    teacher = current.get("teacher")
    # Teacher ID is stored as ObjectId in 'userId' (reference to users collection)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Teacher profile not found"
        )
    
    teacher_id = str(teacher.get("userId"))

    # Get current day of week with timezone awareness
    timezone_str = os.getenv("SCHOOL_TIMEZONE", "Asia/Kolkata")
    try:
        school_tz = pytz.timezone(timezone_str)
    except pytz.UnknownTimeZoneError:
        school_tz = pytz.timezone("Asia/Kolkata")

    days_of_week = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]
    now_in_school_tz = datetime.now(school_tz)
    current_day = days_of_week[now_in_school_tz.weekday()]

    # Use the service to fetch schedule entries
    entries = await schedule_service.get_today_schedule_entries(teacher_id, current_day)
    
    today_classes = []
    for entry in entries:
        # Validate time format (HH:MM) - though service handles storage, 
        # extra check doesn't hurt
        start_time = entry.get("start_time", "")
        end_time = entry.get("end_time", "")
        
        if not start_time or not end_time:
            continue

        class_period = ClassPeriod(
            subject=entry.get("subject_name"),
            grade=entry.get("semester"),  # Map semester/batch to grade if applicable
            room=entry.get("room"),
            start_time=start_time,
            end_time=end_time,
            slot=entry.get("slot", 0),
            attendance_status=None, # TODO: integrate with attendance check
        )
        today_classes.append(class_period)

    return TodayScheduleResponse(classes=today_classes, current_day=current_day)
