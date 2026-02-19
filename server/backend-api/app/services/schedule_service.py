from typing import List, Dict, Optional
from app.db.mongo import db
from uuid import uuid4
import pymongo

COLLECTION_NAME = "schedules"

async def ensure_indexes():
    """
    Ensure that we have a unique index on (teacher_id, subject_id).
    This guarantees one schedule document per subject per teacher.
    """
    await db[COLLECTION_NAME].create_index(
        [("teacher_id", pymongo.ASCENDING), ("subject_id", pymongo.ASCENDING)],
        unique=True
    )

def generate_slot_id():
    return str(uuid4())


async def save_teacher_schedule(teacher_id: str, schedule_data: dict) -> None:
    """
    Saves a teacher's schedule by converting the blob format into Subject-based documents.
    Replaces existing entries for the teacher.
    """
    # Delete existing entries for this teacher to ensure clean slate
    await db[COLLECTION_NAME].delete_many({"teacher_id": teacher_id})

    subjects_map = {}
    timetable = schedule_data.get("timetable", []) or []

    for daily_item in timetable:
        day = daily_item.get("day")
        if not day:
            continue

        periods = daily_item.get("periods", [])
        for p in periods:
            metadata = p.get("metadata", {}) or {}
            subject_id = metadata.get("subject_id")
            
            if not subject_id:
                continue

            if subject_id not in subjects_map:
                subjects_map[subject_id] = {
                    "subject_id": subject_id,
                    "teacher_id": teacher_id,
                    "subject_name": metadata.get("subject_name"),
                    "weekly_schedule": []
                }
            
            slot_entry = {
                "slot_id": generate_slot_id(),
                "day": day,
                "slot": p.get("slot", 0),
                "start_time": p.get("start", ""),
                "end_time": p.get("end", ""),
                "room": metadata.get("room"),
                "tracked": metadata.get("tracked", True)
            }
            subjects_map[subject_id]["weekly_schedule"].append(slot_entry)

    if subjects_map:
        await db[COLLECTION_NAME].insert_many(list(subjects_map.values()))


async def get_teacher_schedule_blob(teacher_id: str) -> dict:
    """
    Retrieves the schedule for a teacher and reconstructs the blob format
    expected by the frontend (and existing Schema).
    """
    # 1. Fetch all subject-schedules for this teacher
    cursor = db[COLLECTION_NAME].find({"teacher_id": teacher_id})
    subject_docs = await cursor.to_list(length=None)

    # 2. Flatten into the old "Period" list format, grouped by day
    days_map: Dict[str, List[dict]] = {
        "Monday": [],
        "Tuesday": [],
        "Wednesday": [],
        "Thursday": [],
        "Friday": [],
        "Saturday": [],
        "Sunday": [],
    }

    for doc in subject_docs:
        subject_id = doc.get("subject_id")
        subject_name = doc.get("subject_name")
        weekly_schedule = doc.get("weekly_schedule", [])

        for slot in weekly_schedule:
            day = slot.get("day")
            if day in days_map:
                # Reconstruct Period object
                period = {
                    "slot": slot.get("slot", 0),
                    "start": slot.get("start_time"),
                    "end": slot.get("end_time"),
                    "metadata": {
                        "subject_id": subject_id,
                        "subject_name": subject_name,
                        "room": slot.get("room"),
                        "tracked": slot.get("tracked", True),
                        "teacher_id": teacher_id,
                        "slot_id": slot.get("slot_id") 
                    },
                }
                days_map[day].append(period)

    # 3. Sort periods by slot or start time
    timetable = []
    for day_name, periods in days_map.items():
        if periods:
            periods.sort(key=lambda x: x["slot"])
            timetable.append({"day": day_name, "periods": periods})

    # Return full Schedule structure
    return {
        "timetable": timetable,
        "recurring": None,
        "holidays": [],
        "exams": [],
        "meta": {},
    }


async def get_today_schedule_entries(teacher_id: str, day_of_week: str) -> List[dict]:
    """
    Get raw schedule entries for a specific teacher and day.
    """
    cursor = db[COLLECTION_NAME].find({"teacher_id": teacher_id, "weekly_schedule.day": day_of_week})
    subject_docs = await cursor.to_list(length=None)
    
    flattened_entries = []
    for doc in subject_docs:
        weekly = doc.get("weekly_schedule", [])
        # Filter for the specific day
        day_slots = [s for s in weekly if s.get("day") == day_of_week]
        
        for s in day_slots:
            entry = {
                "teacher_id": teacher_id,
                "day": s.get("day"),
                "slot": s.get("slot", 0),
                "start_time": s.get("start_time"),
                "end_time": s.get("end_time"),
                "subject_id": doc.get("subject_id"),
                "subject_name": doc.get("subject_name"),
                "room": s.get("room"),
                "tracked": s.get("tracked", True),
                "slot_id": s.get("slot_id")
            }
            flattened_entries.append(entry)
            
    # Sort
    flattened_entries.sort(key=lambda x: x.get("slot", 0))
    return flattened_entries


async def get_student_schedule_for_day(
    subject_ids: List[str], day_of_week: str
) -> List[dict]:
    """
    Get schedule entries for a student based on their enrolled subjects and the day.
    """
    if not subject_ids:
        return []

    # Find schedules where subject_id is in the student's list AND day matches
    query = {"subject_id": {"$in": subject_ids}, "weekly_schedule.day": day_of_week}

    cursor = db[COLLECTION_NAME].find(query)
    subject_docs = await cursor.to_list(length=None)

    flattened_entries = []
    for doc in subject_docs:
        weekly = doc.get("weekly_schedule", [])
        day_slots = [s for s in weekly if s.get("day") == day_of_week]
        
        for s in day_slots:
            entry = {
                "teacher_id": doc.get("teacher_id"),
                "day": s.get("day"),
                "slot": s.get("slot", 0),
                "start_time": s.get("start_time"),
                "end_time": s.get("end_time"),
                "subject_id": doc.get("subject_id"),
                "subject_name": doc.get("subject_name"),
                "room": s.get("room"),
                "tracked": s.get("tracked", True),
                "slot_id": s.get("slot_id")
            }
            flattened_entries.append(entry)

    flattened_entries.sort(key=lambda x: x.get("start_time", ""))
    return flattened_entries

