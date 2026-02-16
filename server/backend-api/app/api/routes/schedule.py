# backend/app/api/routes/schedule.py
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
import os
import pytz

from app.api.deps import get_current_teacher


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
    Get today's schedule for the authenticated teacher.
    Returns all classes scheduled for the current day of the week.
    """
    # Reuse teacher document from dependency to avoid redundant DB query
    teacher = current.get("teacher")

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    # Get current day of week with timezone awareness
    # Use school timezone from env or default to Asia/Kolkata (IST)
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

    # Extract schedule
    schedule = teacher.get("schedule", {})
    timetable = schedule.get("timetable", [])

    # Find today's schedule
    today_classes = []
    for day_schedule in timetable:
        if day_schedule.get("day") == current_day:
            periods = day_schedule.get("periods", [])

            for period in periods:
                metadata = period.get("metadata")

                # Only include periods with metadata (actual classes)
                if metadata and metadata.get("tracked", True):
                    # Validate that start and end times are present and non-empty
                    start_time = period.get("start")
                    end_time = period.get("end")

                    if not isinstance(start_time, str) or not start_time:
                        continue  # Skip periods with missing start time
                    if not isinstance(end_time, str) or not end_time:
                        continue  # Skip periods with missing end time

                    # Validate time format (HH:MM)
                    try:
                        # Simple validation: split by ':' and check parts
                        start_parts = start_time.split(":")
                        end_parts = end_time.split(":")
                        if len(start_parts) != 2 or len(end_parts) != 2:
                            continue
                        # Check if hours and minutes are valid numbers
                        int(start_parts[0]), int(start_parts[1])
                        int(end_parts[0]), int(end_parts[1])
                    except (ValueError, AttributeError):
                        continue  # Skip periods with invalid time format

                    class_period = ClassPeriod(
                        subject=metadata.get("subject_name"),
                        grade=None,  # Can be extracted from subject_name if needed
                        room=metadata.get("room"),
                        start_time=start_time,
                        end_time=end_time,
                        slot=period.get("slot", 0),
                        # TODO: Check if attendance exists for today
                        attendance_status=None,
                    )
                    today_classes.append(class_period)

            break  # Found today's schedule, no need to continue

    # Sort by start time using proper time parsing to avoid lexicographical issues
    today_classes.sort(key=lambda x: datetime.strptime(x.start_time, "%H:%M").time())

    return TodayScheduleResponse(classes=today_classes, current_day=current_day)
