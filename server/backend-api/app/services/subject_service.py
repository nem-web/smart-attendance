from bson import ObjectId
from app.db.mongo import db
from app.db.subjects_repo import (
    get_subject_by_code,
    create_subject,
    add_professor_to_subject,
)


async def add_subject_for_teacher(
    teacher_id: ObjectId, name: str, code: str, location: dict = None
):
    # 1. Find or create subject
    subject = await get_subject_by_code(code)

    if subject:
        if teacher_id not in subject.get("professor_ids", []):
            await add_professor_to_subject(subject["_id"], teacher_id)

        # Update location if provided (even if subject exists)
        if location:
            await db.subjects.update_one(
                {"_id": subject["_id"]}, {"$set": {"location": location}}
            )
    else:
        subject = await create_subject(name, code, teacher_id, location=location)

    # 2. DIRECTLY update teacher subjects (no service call)
    await db.teachers.update_one(
        {
            "$or": [
                {"userId": teacher_id},
                {"user_id": teacher_id},
            ]
        },
        {
            "$addToSet": {"subjects": subject["_id"]},
            "$currentDate": {"updatedAt": True},
        },
    )

    # 3. Return safe response (ObjectId → str)
    return {
        "subject_id": str(subject["_id"]),
        "name": subject["name"],
        "code": subject["code"],
    }
