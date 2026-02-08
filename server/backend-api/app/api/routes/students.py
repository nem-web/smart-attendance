import uuid
import os
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from bson import ObjectId

from ...db.mongo import db
from ...core.security import get_current_user
from app.services.students import get_student_profile

from cloudinary.uploader import upload
import base64
from app.services.ml_client import ml_client


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
    
    # 1. Read image bytes
    image_bytes = await file.read()
    
    # 2. Convert to base64 for ML service
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
    
    # 3. Generate face embeddings via ML service
    try:
        ml_response = await ml_client.encode_face(
            image_base64=image_base64,
            validate_single=True,
            min_face_area_ratio=0.05,
            num_jitters=5
        )
        
        if not ml_response.get("success"):
            raise HTTPException(
                status_code=400,
                detail=f"Face encoding failed: {ml_response.get('error', 'Unknown error')}"
            )
        
        embedding = ml_response.get("embedding")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML service error: {str(e)}")
    
    # 4. Upload image to Cloudinary
    upload_result = upload(
        image_bytes,
        folder = "student_faces",
        public_id = str(current_user["id"]),
        overwrite=True,
        resource_type="image"
    )

    image_url = upload_result.get("secure_url")

    # 5. Store image_url + embeddings
    await db.students.update_one(
        {"userId": student_user_id},
        {
            "$set": {
                "image_url": image_url,
                "verified": True
            },
            "$push": {
                "face_embeddings": embedding
            }
        }
    )

    return {
        "message": "Photo uploaded and face registered successfully",
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
            "professor_ids": [str(pid) for pid in sub.get("professor_ids", [])],
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
    student_oid = ObjectId(current_user["id"])

    # 1️⃣ Fetch student
    student = await db.students.find_one({"userId": student_oid})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = await db.users.find_one({"_id": student["userId"]})
    student_name = user.get("name", "")

    # 2️⃣ Fetch subject
    subject = await db.subjects.find_one({"_id": subject_oid})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # 3️⃣ Add subject to student (ID only)
    await db.students.update_one(
        {"userId": student_oid},
        {"$addToSet": {"subjects": subject_oid}}
    )

    # 4️⃣ Add student to subject.students (CORRECT)
    await db.subjects.update_one(
        {
            "_id": subject_oid,
            "students.student_id": {"$ne": student_oid}  # ✅ FIX
        },
        {
            "$push": {
                "students": {
                    "student_id": student_oid,           # ✅ FIX
                    "name": student_name,
                    "verified": False,
                    "attendance": {
                        "present": 0,
                        "absent": 0,
                        "total": 0,
                        "percentage": 0
                    }
                }
            }
        }
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
    
    # Ensure subject exists
    subject = await db.subjects.find_one({"_id": subject_oid})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Remove subject from student
    result = await db.students.update_one(
        {"userId": user_oid},
        {"$pull": {"subjects": subject_oid}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Subject not assigned to student")
    
    # Remove student from subject.students
    await db.subjects.update_one(
        {"_id": subject_oid},
        {"$pull": {"students": {"student_id": user_oid}}}
    )
    
    return {"message": "Subject removed successfully"}