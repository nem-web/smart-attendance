from datetime import datetime, UTC

from bson import ObjectId

from app.db.mongo import db

COLLECTION = "attendance_daily"


async def ensure_indexes():
    """Create unique index to prevent duplicate records for the same subject."""  # noqa: E501
    await db[COLLECTION].create_index(
        [("subjectId", 1)],
        unique=True,
    )
    
    # Expire documents 86400 seconds (24 hours) after the 'createdAt' time
    await db.attendance_logs.create_index(
        "createdAt", 
        expireAfterSeconds=86400,
        background=True
    )


async def save_daily_summary(
    *,
    subject_id: ObjectId,
    teacher_id: ObjectId | None,
    record_date: str,
    present: int,
    absent: int,
    late: int = 0,
):
    """
    Insert or update a daily attendance summary.

    Refactored to store daily summaries in a map within a single subject document.
    """
    total = present + absent + late
    percentage = round((present / total) * 100, 2) if total > 0 else 0.0

    filter_q = {
        "subjectId": subject_id,
    }

    # We update the specific date in the 'daily' map
    daily_key = f"daily.{record_date}"

    update_doc = {
        "$set": {
            daily_key: {
                "teacherId": teacher_id,
                "present": present,
                "absent": absent,
                "late": late,
                "total": total,
                "percentage": percentage,
            },
            "updatedAt": datetime.now(UTC),
        },
        "$setOnInsert": {
            "subjectId": subject_id,
            "createdAt": datetime.now(UTC),
        },
    }

    await db[COLLECTION].update_one(filter_q, update_doc, upsert=True)
