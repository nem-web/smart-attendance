from typing import List, Dict
from app.db.mongo import db

COLLECTION_NAME = "schedules"

async def save_teacher_schedule(teacher_id: str, schedule_data: dict) -> None:
    """
    Saves a teacher's schedule by converting the blob format into individual entries.
    Replaces existing entries for the teacher.
    """
    # Delete existing entries for this teacher to ensure clean slate
    await db[COLLECTION_NAME].delete_many({"teacher_id": teacher_id})

    entries = []
    timetable = schedule_data.get("timetable", []) or []

    for daily_item in timetable:
        # daily_item is structured like { "day": "Monday", "periods": [...] }
        # Need to handle potential dict or Pydantic object if passed from controller
        day = daily_item.get("day")
        if not day:
            continue
        
        periods = daily_item.get("periods", [])
        for p in periods:
            # p is { "slot": 1, "start": "09:00", "end": "10:00", "metadata": {...} }
            metadata = p.get("metadata", {}) or {}
            
            entry = {
                "teacher_id": teacher_id,
                "day": day,
                "slot": p.get("slot", 0),
                "start_time": p.get("start", ""),
                "end_time": p.get("end", ""),
                "subject_id": metadata.get("subject_id"),
                "subject_name": metadata.get("subject_name"),
                "room": metadata.get("room"),
                # Optional fields
                "tracked": metadata.get("tracked", True)
            }
            entries.append(entry)

    if entries:
        await db[COLLECTION_NAME].insert_many(entries)


async def get_teacher_schedule_blob(teacher_id: str) -> dict:
    """
    Retrieves the schedule for a teacher and reconstructs the blob format
    expected by the frontend (and existing Schema).
    """
    cursor = db[COLLECTION_NAME].find({"teacher_id": teacher_id})
    entries = await cursor.to_list(length=None)

    # Group by day
    days_map: Dict[str, List[dict]] = {
        "Monday": [],
        "Tuesday": [],
        "Wednesday": [],
        "Thursday": [],
        "Friday": [],
        "Saturday": [],
        "Sunday": []
    }

    for entry in entries:
        day = entry.get("day")
        if day in days_map:
            # Reconstruct Period object
            period = {
                "slot": entry.get("slot"),
                "start": entry.get("start_time"),
                "end": entry.get("end_time"),
                "metadata": {
                    "subject_id": entry.get("subject_id"),
                    "subject_name": entry.get("subject_name"),
                    "room": entry.get("room"),
                    "tracked": entry.get("tracked", True), 
                    "teacher_id": teacher_id,
                }
            }
            days_map[day].append(period)

    # Sort periods by slot or start time
    timetable = []
    for day_name, periods in days_map.items():
        if periods:
            periods.sort(key=lambda x: x["slot"])
            timetable.append({
                "day": day_name,
                "periods": periods
            })

    # Return full Schedule structure
    return {
        "timetable": timetable,
        "recurring": None,  # Not migrated yet or stored separately
        "holidays": [],      # Not migrated yet
        "exams": [],         # Not migrated yet
        "meta": {}
    }

async def get_today_schedule_entries(teacher_id: str, day_of_week: str) -> List[dict]:
    """
    Get raw schedule entries for a specific teacher and day.
    """
    cursor = db[COLLECTION_NAME].find({
        "teacher_id": teacher_id,
        "day": day_of_week
    }).sort("slot", 1) # Sort by slot
    
    return await cursor.to_list(length=None)
