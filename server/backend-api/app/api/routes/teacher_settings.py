# backend/app/api/routes/settings.py
from app.db.mongo import db
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from datetime import datetime, UTC

from app.core.cloudinary_config import cloudinary

from app.utils.utils import serialize_bson
from app.api.deps import get_current_teacher
from app.services.subject_service import add_subject_for_teacher
from app.db.subjects_repo import get_subjects_by_ids
from bson import ObjectId, errors as bson_errors
from app.schemas.schedule import Schedule

router = APIRouter(prefix="/settings", tags=["settings"])


def validate_object_id(id_str: str, field_name: str = "id") -> ObjectId:
    """Helper to validate and convert string to ObjectId"""
    try:
        return ObjectId(id_str)
    except (bson_errors.InvalidId, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name} format",
        )


# ---------------- GET SETTINGS ----------------
@router.get("", response_model=dict)
async def get_settings(current: dict = Depends(get_current_teacher)):
    user_id = current["id"]

    # fetched in dependency
    user = current["user"]
    teacher = current["teacher"]

    # 1. Subject ids population
    subject_ids = teacher.get("subjects", [])
    subjects = await get_subjects_by_ids(subject_ids)

    profile = {
        "id": user_id,
        # Identity (Users collection)
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": "teacher",
        "employee_id": user.get("employee_id"),
        "phone": teacher.get("phone", ""),
        "branch": teacher.get("branch"),
        # Settings & Subjects
        "avatarUrl": teacher.get("avatarUrl"),
        "department": teacher.get("department"),
        "subjects": subjects,
        "settings": teacher.get("settings", {}),
        "schedule": teacher.get("schedule", {}),
    }

    return serialize_bson(profile)


# ---------------- PATCH SETTINGS ----------------
@router.patch("")
async def patch_settings_route(
    payload: dict,
    current: dict = Depends(get_current_teacher),
):
    if not payload or not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    user_id = validate_object_id(current["id"])
    now = datetime.utcnow()

    # Extract fields that need to sync across collections
    user_updates = {}
    for field in ("name", "email", "employee_id"):
        if field in payload:
            user_updates[field] = payload[field]

    # Update users collection
    if user_updates:
        await db.users.update_one(
            {"_id": user_id}, {"$set": {**user_updates, "updatedAt": now}}
        )

    # ---------------- TEACHERS COLLECTION ----------------
    teacher_updates = {}

    if "phone" in payload:
        teacher_updates["phone"] = payload["phone"]

    if "department" in payload:
        teacher_updates["department"] = payload["department"]

    if "settings" in payload and isinstance(payload["settings"], dict):
        teacher_updates["settings"] = payload["settings"]

    if teacher_updates:
        result = await db.teachers.update_one(
            {"userId": user_id}, {"$set": {**teacher_updates, "updatedAt": now}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Teacher profile not found")

    # ---------------- RETURN FRESH DATA ----------------
    fresh_user = await db.users.find_one({"_id": user_id})
    fresh_teacher = await db.teachers.find_one({"userId": user_id})

    if not fresh_user or not fresh_teacher:
        raise HTTPException(status_code=404, detail="Profile not found")

    subject_ids = fresh_teacher.get("subjects", [])
    subjects = await get_subjects_by_ids(subject_ids)

    profile = {
        "id": str(user_id),
        "name": fresh_user.get("name", ""),
        "email": fresh_user.get("email", ""),
        "phone": fresh_teacher.get("phone", ""),
        "employee_id": fresh_user.get("employee_id"),
        "role": "teacher",
        "department": fresh_teacher.get("department"),
        "avatarUrl": fresh_teacher.get("avatarUrl"),
        "subjects": subjects,
        "settings": fresh_teacher.get("settings", {}),
        "schedule": fresh_teacher.get("schedule", {}),
    }

    return serialize_bson(profile)


# ---------------- PUT SETTINGS ----------------
@router.put("", response_model=dict)
async def put_settings_route(
    payload: dict,
    current: dict = Depends(get_current_teacher),
):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload format")

    updated = await replace_settings(current["id"], payload)
    return serialize_bson(updated)


# ---------------- AVATAR UPLOAD ----------------

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current: dict = Depends(get_current_teacher),
):
    ext = file.filename.split(".")[-1].lower()
    if ext not in {"jpg", "jpeg", "png", "webp"}:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    allowed_content_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_content_types:
        raise HTTPException(status_code=400, detail="Invalid file content type")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max 5MB")

    try:
        upload_result = cloudinary.uploader.upload(
            contents,
            folder="teachers/avtars",
            public_id=str(current["id"]),
            overwrite=True,
            resource_type="image",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Cloudinary upload failed: {str(e)}"
        )

    avatarUrl = upload_result["secure_url"]

    # Update to teachers schema directly
    teacher_id = ObjectId(current["id"])
    result = await db.teachers.update_one(
        {"userId": teacher_id}, {"$set": {"avatarUrl": avatarUrl}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Teacher not found")

    return {
        "avatarUrl": avatarUrl,
    }


# Add - Subject
@router.post("/add-subject", response_model=dict)
async def add_subject(payload: dict, current: dict = Depends(get_current_teacher)):
    name = payload.get("name")
    code = payload.get("code")

    if not name or not code:
        raise HTTPException(status_code=400, detail="Name and Code required")

    subject = await add_subject_for_teacher(
        current["id"],
        name.strip(),
        code.strip().upper(),
    )

    return serialize_bson(subject)


async def replace_settings(user_id_str: str, payload: dict) -> dict:
    """Replace teacher settings document fields. This intentionally allows replacing
    `department`, `settings`, and `schedule` (a structured object matching
    the UI). Returns the fresh teacher+user profile.
    """
    user_id = validate_object_id(user_id_str)
    now = datetime.utcnow()

    teacher_updates = {}

    if "department" in payload:
        teacher_updates["department"] = payload["department"]

    if "settings" in payload and isinstance(payload["settings"], dict):
        teacher_updates["settings"] = payload["settings"]

    # Accept schedule as an object; basic type check performed here. More
    # validation can be added by parsing with `Schedule.parse_obj(...)`.
    if "schedule" in payload:
        if payload["schedule"] is None:
            teacher_updates["schedule"] = None
        elif isinstance(payload["schedule"], dict):
            # optional deeper validation
            try:
                Schedule.parse_obj(payload["schedule"])
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid schedule format")
            teacher_updates["schedule"] = payload["schedule"]
        else:
            raise HTTPException(status_code=400, detail="Invalid schedule format")

    if teacher_updates:
        result = await db.teachers.update_one(
            {"userId": user_id}, {"$set": {**teacher_updates, "updatedAt": now}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Teacher profile not found")

    # Return fresh merged profile
    fresh_user = await db.users.find_one({"_id": user_id})
    fresh_teacher = await db.teachers.find_one({"userId": user_id})
    if not fresh_user or not fresh_teacher:
        raise HTTPException(status_code=404, detail="Profile not found")

    subject_ids = fresh_teacher.get("subjects", [])
    subjects = await get_subjects_by_ids(subject_ids)

    profile = {
        "id": str(user_id),
        "name": fresh_user.get("name", ""),
        "email": fresh_user.get("email", ""),
        "phone": fresh_user.get("phone", ""),
        "employee_id": fresh_user.get("employee_id"),
        "role": "teacher",
        "department": fresh_teacher.get("department"),
        "avatarUrl": fresh_teacher.get("avatarUrl"),
        "subjects": subjects,
        "settings": fresh_teacher.get("settings", {}),
        "schedule": fresh_teacher.get("schedule", {}),
    }

    return profile


# ---------- My subjects ----------------
@router.get("/teachers/me/subjects", response_model=list)
async def get_my_subjects(current_user: dict = Depends(get_current_teacher)):
    prof_id = validate_object_id(current_user["id"])

    subjects = await db.subjects.find({"professor_ids": prof_id}).to_list(length=100)

    return [
        {
            "_id": str(s["_id"]),
            "name": s["name"],
            "code": s.get("code"),
            "student_count": len(s.get("students", [])),
        }
        for s in subjects
    ]


# GET STUDENTS OF A SUBJECT
@router.get("/teachers/subjects/{subject_id}/students", response_model=list)
async def get_subject_students(
    subject_id: str, current_user: dict = Depends(get_current_teacher)
):
    prof_id = validate_object_id(current_user["id"])
    subj_id = validate_object_id(subject_id, "subject_id")

    # SECURITY: Ensure teacher teaches this subject
    subject = await db.subjects.find_one(
        {"_id": subj_id, "professor_ids": prof_id}, {"students": 1, "name": 1}
    )

    if not subject:
        raise HTTPException(
            status_code=404, detail="Subject not found or access denied"
        )

    subject_students = subject.get("students", [])
    if not subject_students:
        return []

    student_user_ids = [s["student_id"] for s in subject_students]

    students_cursor = db.students.find({"userId": {"$in": student_user_ids}})
    users_cursor = db.users.find({"_id": {"$in": student_user_ids}})

    students_map = {str(s["userId"]): s async for s in students_cursor}
    users = {str(u["_id"]): u async for u in users_cursor}

    response = []
    for s in subject_students:
        uid = str(s["student_id"])
        user = users.get(uid)
        if not user:
            continue

        student_doc = students_map.get(uid, {})

        response.append(
            {
                "student_id": uid,
                "name": user.get("name", "Unknown"),
                "roll": student_doc.get("roll"),
                "year": student_doc.get("year"),
                "branch": student_doc.get("branch"),
                "embeddings": student_doc.get("face_embeddings", []),
                "avatar": student_doc.get("image_url"),
                "verified": s.get("verified", False),
                "attendance": s.get("attendance", {"present": 0, "absent": 0}),
            }
        )

    return response


@router.post("/teachers/subjects/{subject_id}/students/{student_id}/verify")
async def verify_student(
    subject_id: str, student_id: str, current_user: dict = Depends(get_current_teacher)
):
    prof_id = validate_object_id(current_user["id"])
    subj_id = validate_object_id(subject_id, "subject_id")
    stud_id = validate_object_id(student_id, "student_id")

    result = await db.subjects.update_one(
        {"_id": subj_id, "professor_ids": prof_id, "students.student_id": stud_id},
        {"$set": {"students.$.verified": True, "updated_at": datetime.utcnow()}},
    )

    if result.modified_count == 0:
        exists = await db.subjects.find_one({"_id": subj_id})
        if not exists:
            raise HTTPException(status_code=404, detail="Subject not found")
        raise HTTPException(
            status_code=404, detail="Student not enrolled in this subject"
        )

    return {"message": "Student verified successfully"}


@router.delete("/teachers/subjects/{subject_id}/students/{student_id}")
async def remove_student(
    subject_id: str, student_id: str, current_user: dict = Depends(get_current_teacher)
):
    prof_id = validate_object_id(current_user["id"])
    subj_id = validate_object_id(subject_id, "subject_id")
    stud_id = validate_object_id(student_id, "student_id")

    subject = await db.subjects.find_one(
        {"_id": subj_id, "professor_ids": prof_id}, {"_id": 1}
    )
    if not subject:
        raise HTTPException(
            status_code=404, detail="Subject not found or access denied"
        )

    await db.subjects.update_one(
        {"_id": subj_id}, {"$pull": {"students": {"student_id": stud_id}}}
    )

    await db.students.update_one({"userId": stud_id}, {"$pull": {"subjects": subj_id}})

    return {"message": "Student removed from subject"}


# ---------------- GET ALL STUDENTS (FOR MESSAGING) ----------------
@router.get("/teachers/students")
async def get_all_students(current_user: dict = Depends(get_current_teacher)):
    """Get all students for messaging purposes"""
    # Get all students (with limit to avoid memory issues)
    students = await db.students.find({}).to_list(length=None)
    
    if not students:
        return {"students": []}
    
    # Batch fetch all user data
    user_ids = [s.get("userId") for s in students if s.get("userId")]
    users_cursor = db.users.find({"_id": {"$in": user_ids}})
    users_map = {str(u["_id"]): u async for u in users_cursor}
    
    student_list = []
    for student in students:
        uid = str(student.get("userId"))
        user = users_map.get(uid)
        if user:
            student_list.append({
                "id": str(student["_id"]),
                "user_id": uid,
                "name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "usn": user.get("usn", ""),
                "branch": student.get("branch", ""),
                "semester": student.get("semester", 0),
                "verified": student.get("verified", False),
            })
    
    return {"students": student_list}
