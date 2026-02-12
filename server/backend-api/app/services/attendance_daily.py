from datetime import datetime, UTC

from bson import ObjectId

from app.db.mongo import db

COLLECTION = "attendance_daily"


async def ensure_indexes():
    """Create unique index to ensure one document per subject."""
    # Index is now unique on subjectId only
    await db[COLLECTION].create_index("subjectId", unique=True)


async def save_daily_summary(
    *,
    class_id: ObjectId,
    subject_id: ObjectId,
    teacher_id: ObjectId | None,
    record_date: str,
    present: int,
    absent: int,
    late: int = 0,
):
    """
    Update the subject document by appending the daily attendance stats.
    Uses upsert to create the subject document if it doesn't exist.
    """
    total = present + absent + late
    percentage = round((present / total) * 100, 2) if total > 0 else 0.0

    filter_q = {
        "subjectId": subject_id
    }

    update_doc = {
        "$set": {
            "teacherId": teacher_id,
            "updatedAt": datetime.now(UTC),
            # Updates just the specific date key inside the daily map
            f"daily.{record_date}": {
                "present": present,
                "absent": absent,
                "late": late,
                "total": total,
                "percentage": percentage,
            },
        },
        "$setOnInsert": {
            "createdAt": datetime.now(UTC),
            "classId": class_id, # Preserve classId on creation
        },
    }

    await db[COLLECTION].update_one(filter_q, update_doc, upsert=True)
