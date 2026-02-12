from datetime import datetime, UTC

from bson import ObjectId

from app.db.mongo import db

COLLECTION = "attendance_daily"


async def ensure_indexes():
    """Create unique index to prevent duplicate daily records for the same class + date."""  # noqa: E501
    await db[COLLECTION].create_index(
        [("classId", 1), ("subjectId", 1), ("date", 1)],
        unique=True,
    )


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
    Insert or update a daily attendance summary.

    Uses upsert so that re-confirming the same class+date will update
    instead of creating a duplicate.
    """
    total = present + absent + late
    percentage = round((present / total) * 100, 2) if total > 0 else 0.0

    filter_q = {
        "classId": class_id,
        "subjectId": subject_id,
        "date": record_date,
    }

    update_doc = {
        "$set": {
            "teacherId": teacher_id,
            "summary": {
                "present": present,
                "absent": absent,
                "late": late,
                "total": total,
                "percentage": percentage,
            },
        },
        "$setOnInsert": {
            "createdAt": datetime.now(UTC),
        },
    }

    await db[COLLECTION].update_one(filter_q, update_doc, upsert=True)
