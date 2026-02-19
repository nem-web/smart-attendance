from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
import os
import pytz
from uuid import uuid4

from app.api.deps import get_current_teacher
from app.services import schedule_service
from app.db.mongo import db
from app.db.subjects_repo import get_subjects_by_ids

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


class AddSlotRequest(BaseModel):
    subject_id: str
    day: str
    start_time: str
    end_time: str
    room: Optional[str] = None
    slot: int = 0
    # Optional tracked or other metadata, sticking to core Requirement


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_schedule_slot(
    request: AddSlotRequest,
    current: dict = Depends(get_current_teacher)
):
    teacher = current.get("teacher")
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found"
        )
    teacher_id = str(teacher.get("userId"))
    
    # Verify subject exists via repo (optional but good practice)
    # We need subject name to store in the schedule doc?
    # If the schedule doc already exists, we might not strictly need it if we assume consistency.
    # But if we create a NEW schedule doc, we should probably have it.
    
    # Check if schedule doc exists for this subject
    schedule_doc = await db["schedules"].find_one({"subject_id": request.subject_id, "teacher_id": teacher_id})
    
    if not schedule_doc:
        # Fetch subject details to populate subject_name
        # Assuming subjects collection has name?
        # Using get_subjects_by_ids([request.subject_id])
        subjects = await get_subjects_by_ids([request.subject_id])
        if not subjects:
             raise HTTPException(status_code=404, detail="Subject not found")
        subject_name = subjects[0].get("name")
        
        new_doc = {
            "subject_id": request.subject_id,
            "teacher_id": teacher_id,
            "subject_name": subject_name,
            "weekly_schedule": []
        }
        await db["schedules"].insert_one(new_doc)
    
    new_slot = {
        "slot_id": str(uuid4()),
        "day": request.day,
        "slot": request.slot,
        "start_time": request.start_time,
        "end_time": request.end_time,
        "room": request.room,
        "tracked": True
    }
    
    result = await db["schedules"].update_one(
        {"subject_id": request.subject_id, "teacher_id": teacher_id},
        {"$push": {"weekly_schedule": new_slot}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to add slot")
        
    return {"status": "success", "slot_id": new_slot["slot_id"]}


@router.delete("/{slot_id}")
async def delete_schedule_slot(
    slot_id: str,
    current: dict = Depends(get_current_teacher)
):
    teacher = current.get("teacher")
    if not teacher:
         raise HTTPException(status_code=404, detail="Teacher not found")
    teacher_id = str(teacher.get("userId"))
    
    # We don't know the subject_id easily without querying.
    # But we can query where "weekly_schedule.slot_id": slot_id
    
    result = await db["schedules"].update_one(
        {"teacher_id": teacher_id, "weekly_schedule.slot_id": slot_id},
        {"$pull": {"weekly_schedule": {"slot_id": slot_id}}}
    )
    
    if result.modified_count == 0:
         raise HTTPException(status_code=404, detail="Slot not found or not owned by teacher")
         
    return {"status": "success", "deleted_slot_id": slot_id}


@router.get("", response_model=dict)
async def get_schedule(current: dict = Depends(get_current_teacher)):
    """
    Get the full schedule for the teacher, in the format expected by the frontend.
    """
    teacher = current.get("teacher")
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found"
        )
    teacher_id = str(teacher.get("userId"))
    return await schedule_service.get_teacher_schedule_blob(teacher_id)


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
            status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found"
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
            attendance_status=None,  # TODO: integrate with attendance check
        )
        today_classes.append(class_period)

    return TodayScheduleResponse(classes=today_classes, current_day=current_day)
