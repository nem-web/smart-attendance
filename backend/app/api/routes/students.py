import uuid
import os
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from bson import ObjectId

from ...db.mongo import db
from ...core.security import get_current_user
from app.services.students import get_student_profile

from cloudinary.uploader import upload

router = APIRouter(prefix="/students", tags=["students"])

# ============================
# GET MY PROFILE
# ============================
@router.get("/me/profile")
async def api_get_my_profile(
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Not a student")

    profile = await get_student_profile(current_user["id"])

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    return profile


# ============================
# GET STUDENT PROFILE (PUBLIC)
# ============================
@router.get("/{student_id}/profile")
async def api_get_student_profile(student_id: str):
    profile = await get_student_profile(student_id)

    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    return profile


# ============================
# UPLOAD FACE IMAGE
# ============================
@router.post("/me/face-image")
async def upload_image_url(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Not a student")

    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Only JPG/PNG allowed")

    student_user_id = ObjectId(current_user["id"])

    upload_result = upload(
        file.file,
        folder = "student_faces",
        public_id = str(current_user["id"]),
        overwite=True,
        resource_type="image"
    )

    image_url = upload_result.get("secure_url")

    await db.students.update_one(
        {"user_id": student_user_id},
        {"$set": {"image_url": image_url}}
    )

    return {
        "message": "Photo uploaded successfully",
        "image_url": image_url
    }


# ============================
# GET AVAILABLE SUBJECTS
# ============================
@router.get("/me/available-subjects")
async def get_available_subjects(
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Not a student")

    subjects = await db.subjects.find({}).to_list(None)

    # 🔴 IMPORTANT: Serialize ObjectIds
    return [
        {
            "_id": str(sub["_id"]),
            "name": sub["name"],
            "code": sub.get("code"),
            "type": sub.get("type"),
            "professor_id": str(sub["professor_id"]),
            "created_at": sub["created_at"]
        }
        for sub in subjects
    ]


# ============================
# ADD SUBJECT TO STUDENT
# ============================
@router.post("/me/subjects")
async def add_subject(
    subject_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Not a student")

    subject_oid = ObjectId(subject_id)
    user_oid = ObjectId(current_user["id"])

    subject = await db.subjects.find_one({"_id": subject_oid})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    await db.students.update_one(
        {"user_id": user_oid},
        {"$addToSet": {"subjects": subject_oid}}
    )

    return {"message": "Subject added successfully"}


# ============================
# DELETE SUBJECT TO STUDENT
# ============================
@router.delete("/me/remove-subject/{subject_id}")
async def remove_subject(
    subject_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Not a student")
    
    subject_oid = ObjectId(subject_id)
    user_oid = ObjectId(current_user["id"])
    
    subject = await db.subjects.find_one({"_id": subject_oid})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    result = await db.students.update_one(
        {"user_id": user_oid},
        {"$pull": {"subjects": subject_oid}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Subject not assigned to student")
    
    return {"message": "Subject removed successfully"}