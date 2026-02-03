from app.db.mongo import db
from datetime import datetime,UTC
from bson import ObjectId

attendance_col = db["attendance"]

async def mark_attendance(payload: dict):
    payload["created_at"] = datetime.now(UTC).isoformat()
    res = await attendance_col.insert_one(payload)
    doc = await attendance_col.find_one({"_id": res.inserted_id})
    doc["_id"] = str(doc["_id"])
    return doc

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
