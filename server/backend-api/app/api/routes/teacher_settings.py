# backend/app/api/routes/settings.py
from app.db.mongo import db
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pathlib import Path
from datetime import datetime
import aiofiles

from app.services.teacher_settings_service import (
    ensure_settings_for_user,
    patch_settings,
    replace_settings,
)
from app.db.teacher_settings_repo import create_index_once
from app.db.subjects_repo import ensure_indexes as ensure_subject_indexes
from app.utils.utils import serialize_bson
from app.api.deps import get_current_teacher
from app.services.subject_service import add_subject_for_teacher
from app.db.subjects_repo import get_subjects_by_ids
from bson import ObjectId

router = APIRouter(prefix="/settings", tags=["settings"])

# ensure DB index
@router.on_event("startup")
async def _ensure_indexes():
    await create_index_once()
    await ensure_subject_indexes()

# ---------------- GET SETTINGS ----------------
@router.get("", response_model=dict)
async def get_settings(
    current=Depends(get_current_teacher),
):
    user_id = current["id"]
    user = current["user"]
    teacher = current["teacher"]
    

    profile = {
        "id": user_id,
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "phone": teacher.get("profile", {}).get("phone", ""),
        "role": "teacher",
        "employee_id": teacher.get("employee_id"),
        "subjects": teacher.get("profile", {}).get("subjects", []),
        "department": teacher.get("department"),
        "avatarUrl": teacher.get("avatarUrl"),
    }

    doc = await ensure_settings_for_user(user_id, profile)
    
    subject_ids = teacher.get("profile", {}).get("subjects", [])
    populated_subjects = await get_subjects_by_ids(subject_ids)
    print(subject_ids, populated_subjects)
    
    doc["profile"]["subjects"] = populated_subjects
    
    return serialize_bson(doc)

# ---------------- PATCH SETTINGS ----------------
@router.patch("", response_model=dict)
async def patch_settings_route(
    payload: dict,
    current=Depends(get_current_teacher),
):
    if not payload:
        raise HTTPException(status_code=400, detail="Empty payload")

    updated = await patch_settings(current["id"], payload)
    return serialize_bson(updated)

# ---------------- PUT SETTINGS ----------------
@router.put("", response_model=dict)
async def put_settings_route(
    payload: dict,
    current=Depends(get_current_teacher),
):
    updated = await replace_settings(current["id"], payload)
    return serialize_bson(updated)

# ---------------- AVATAR UPLOAD ----------------
UPLOAD_DIR = Path("app/static/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload-avatar", response_model=dict)
async def upload_avatar(
    file: UploadFile = File(...),
    current=Depends(get_current_teacher),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    fname = f"{current['id']}_{int(datetime.utcnow().timestamp())}{ext}"
    dest = UPLOAD_DIR / fname

    async with aiofiles.open(dest, "wb") as out:
        await out.write(await file.read())

    avatar_url = f"/static/avatars/{fname}"

    updated = await patch_settings(
        current["id"],
        {"profile": {"avatarUrl": avatar_url}},
    )

    return {
        "avatarUrl": avatar_url,
        "settings": serialize_bson(updated),
    }
    
@router.post("/add-subject", response_model=dict)
async def add_subject(
    payload: dict,
    current = Depends(get_current_teacher)
):
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


@router.get("/teachers/me/subjects")
async def get_my_subjects(current_user: dict = Depends(get_current_teacher)):
    # if current_user.get("role") != "teacher":
    #     raise HTTPException(status_code=403, detail="not a teacher")
    
    prof_id = ObjectId(current_user["id"])
    
    subjects = await db.subjects.find(
        {"professor_ids": prof_id}
    ).to_list(None)
    
    return [
        {
            "_id": str(s["_id"]),
            "name": s["name"],
            "code": s.get("code")
        }
        for s in subjects
    ]
    
# GET STUDENTS OF A SUBJECT
@router.get("/teachers/subjects/{subject_id}/students")
async def get_subject_students(
    subject_id: str,
    current_user: dict = Depends(get_current_teacher)
):
    # if current_user.get("role") != "teacher":
    #     raise HTTPException(status_code=403, detail="not a teacher")
    
    subject = await db.subjects.find_one(
        {"_id": ObjectId(subject_id)},
        {"students": 1}
    )
    
    if not subject:
        raise HTTPException(404, "Subject not found")
    
    subject_students = subject.get("students", [])
    student_user_ids = [s["student_id"] for s in subject_students]
    
    # students collection
    students_map = {
        str(s["userId"]): s
        async for s in db.students.find({"userId": {"$in": student_user_ids}})
    }
    
    # user's collections
    users = {
        str(u["_id"]) : u
        async for u in db.users.find({"_id": {"$in": student_user_ids}})
    }
    
    response = []
    
    for s in subject_students:
        uid = str(s["student_id"])
        user = users.get(uid)
        student_doc = students_map.get(uid)
        
        if not user:
            continue
        
        response.append({
            "student_id": uid,
            "name": user.get("name"),
            "roll": user.get("roll"),      # ✅ now exists
            "year": user.get("year"),      # ✅ now exists
            "branch": user.get("branch"),
            "embeddings": student_doc.get("face_embeddings") if student_doc else [],
            "avatar": student_doc.get("image_url") if student_doc else None,
            "verified": s.get("verified", False),
            "attendance": s.get("attendance", {
                "present": 0,
                "absent": 0
            }),
        })
    
    return response


@router.post("/teachers/subjects/{subject_id}/students/{student_id}/verify")
async def verify_student(
    subject_id: str,
    student_id: str,
    current_user: dict = Depends(get_current_teacher)
):
    prof_id = ObjectId(current_user["id"])
    
    result = await db.subjects.update_one(
        {
            "_id": ObjectId(subject_id),
            "professor_ids": prof_id,
            "students.student_id": ObjectId(student_id)
        },
        {
            "$set":{"students.$.verified": True}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(404, "Student or subject not found")
    
    return {"message": "Student Verified"}



@router.delete("/teachers/subjects/{subject_id}/students/{student_id}")
async def remove_student(
    subject_id: str,
    student_id: str,
    current_user: dict = Depends(get_current_teacher)
):
    prof_id = ObjectId(current_user["id"])
    subject_oid = ObjectId(subject_id)
    student_oid = ObjectId(student_id)

    # 1️⃣ Remove from subject.students
    await db.subjects.update_one(
        {
            "_id": subject_oid,
            "professor_ids": prof_id,
        },
        {
            "$pull": {"students": {"student_id": student_oid}}
        }
    )

    # 2️⃣ Remove subject from student.subjects
    await db.students.update_one(
        {"userId": student_oid},
        {"$pull": {"subjects": subject_oid}}
    )

    return {"message": "Student removed from subject"}
