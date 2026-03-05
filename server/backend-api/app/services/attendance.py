import logging
from app.db.mongo import db
from datetime import datetime, timezone
from bson import ObjectId

logger = logging.getLogger(__name__)
attendance_col = db["attendance"]


async def ensure_indexes():
    """Ensure unique indexes for attendance collection."""
    try:
        # Create unique index to prevent duplicate attendance for same student,
        # class, date, period
        # Using compound index: student_id + class_id + date + period
        await attendance_col.create_index(
            [("student_id", 1), ("class_id", 1), ("date", 1), ("period", 1)],
            unique=True,
            name="unique_student_attendance_idx",
        )
        logger.info("Attendance indexes ensured")
    except Exception as e:
        logger.error(f"Failed to create attendance indexes: {e}")


async def mark_attendance(payload: dict):
    try:
        payload["created_at"] = datetime.now(timezone.utc).isoformat()
        result = await attendance_col.insert_one(payload)
        attendance_record = await attendance_col.find_one({"_id": result.inserted_id})
        attendance_record["_id"] = str(attendance_record["_id"])
        return attendance_record
    except Exception as e:
        logger.error(f"Error marking attendance: {str(e)}")
        raise


async def log_grouped_attendance(
    subject_id: str | ObjectId,
    date_str: str,
    students: list,
    teacher_id: str | ObjectId | None = None,
):
    """
    Groups attendance logs by subject and date.
    students: List of { studentId: ObjectId, scanTime: str, method: str }
    """
    subject_oid = ObjectId(subject_id)
    tid = ObjectId(teacher_id) if teacher_id else None

    # Update doc
    update_doc = {
        "$addToSet": {"students": {"$each": students}},
        "$setOnInsert": {
            "createdAt": datetime.now(timezone.utc),
        },
    }

    if tid:
        # If teacherId is provided, we set it (or overwrite it if needed)
        # But usually we just set upon insert. Let's make it $set just in case.
        # However, to avoid overriding with None, we check.
        if "$set" not in update_doc:
            update_doc["$set"] = {}
        update_doc["$set"]["teacherId"] = tid

    await db.attendance_logs.update_one(
        {"subjectId": subject_oid, "date": date_str},
        update_doc,
        upsert=True,
    )

    # Return the updated document count if possible, or we might need to fetch it
    # But for efficiency, we can just return nothing and let caller decide.
    # However, for analytics, we might want to know the total count.
    # Let's return the new document or fetch it.

    return await db.attendance_logs.find_one(
        {"subjectId": subject_oid, "date": date_str}
    )


async def get_attendance_for_student(student_id: str, start_date=None, end_date=None):
    q = {"student_id": ObjectId(student_id)}
    if start_date and end_date:
        q["date"] = {"$gte": start_date, "$lte": end_date}
    cursor = attendance_col.find(q).sort("date", 1)
    out = []
    async for r in cursor:
        r["_id"] = str(r["_id"])
        out.append(r)
    return out
