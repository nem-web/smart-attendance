import base64
import logging
from datetime import date
from typing import Dict, List

from bson import ObjectId
from fastapi import APIRouter, HTTPException

from app.core.config import ML_CONFIDENT_THRESHOLD, ML_UNCERTAIN_THRESHOLD
from app.db.mongo import db
from app.services.ml_client import ml_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.post("/mark")
async def mark_attendance(payload: Dict):
    """
    Mark attendance by detecting faces in classroom image
    
    payload:
    {
      "image": "data:image/jpeg;base64,...",
      "subject_id": "..."
    }
    """

    image_b64 = payload.get("image")
    subject_id = payload.get("subject_id")
    
    if not image_b64 or not subject_id:
        raise HTTPException(status_code=400, detail="image and subject_id required")
    
    # Load subject
    subject = await db.subjects.find_one(
        {"_id": ObjectId(subject_id)},
        {"students": 1}
    )
    
    if not subject:
        raise HTTPException(404, "Subject not found")
    
    student_user_ids = [
        s["student_id"]
        for s in subject["students"]
        if s.get("verified", False)
    ]

    # Strip base64 header
    if "," in image_b64:
        _, image_b64 = image_b64.split(",", 1)

    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")

    # Call ML service to detect faces
    try:
        ml_response = await ml_client.detect_faces(
            image_base64=image_b64,
            min_face_area_ratio=0.04,
            num_jitters=3,
            model="hog"
        )
        
        if not ml_response.get("success"):
            raise HTTPException(
                status_code=500,
                detail=f"ML service error: {ml_response.get('error', 'Unknown error')}"
            )
        
        detected_faces = ml_response.get("faces", [])
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to detect faces: {str(e)}"
        )

    if not detected_faces:
        return {"faces": [], "count": 0}

    # Load students of this subject with embeddings
    students_cursor = db.students.find({
        "userId": {"$in": student_user_ids},
        "verified": True,
        "face_embeddings": {"$exists": True, "$ne": []}
    })

    students = await students_cursor.to_list(length=500)
    
    # Prepare candidate embeddings for batch matching
    candidate_embeddings = []
    for student in students:
        candidate_embeddings.append({
            "student_id": str(student["userId"]),
            "embeddings": student["face_embeddings"]
        })

    # Call ML service to match faces
    try:
        match_response = await ml_client.batch_match(
            detected_faces=[{"embedding": face["embedding"]} for face in detected_faces],
            candidate_embeddings=candidate_embeddings,
            confident_threshold=ML_CONFIDENT_THRESHOLD,
            uncertain_threshold=ML_UNCERTAIN_THRESHOLD,
        )
        
        if not match_response.get("success"):
            raise HTTPException(
                status_code=500,
                detail=f"ML service error: {match_response.get('error', 'Unknown error')}"
            )
        
        matches = match_response.get("matches", [])
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to match faces: {str(e)}"
        )

    # Build results
    results = []
    logger.info("Faces detected: %d", len(detected_faces))

    for i, (face, match) in enumerate(zip(detected_faces, matches)):
        student_id = match.get("student_id")
        distance = match.get("distance")
        status = match.get("status")  # "present" or "unknown"

        # Find student details
        best_match = None
        if student_id:
            best_match = next((s for s in students if str(s["userId"]) == student_id), None)

        # Determine status based on config thresholds
        if distance < ML_CONFIDENT_THRESHOLD:
            status = "present"
        elif distance < ML_UNCERTAIN_THRESHOLD:
            status = "uncertain"
        else:
            status = "unknown"
            best_match = None

        logger.debug(
            "Match: %s distance=%.4f",
            best_match["name"] if best_match else "NONE",
            distance,
        )
        
        # Get user details
        user = None
        if best_match:
            user = await db.users.find_one(
                {"_id": best_match["userId"]},
                {"name": 1, "roll": 1}
            )

        # Build result
        location = face.get("location", {})
        results.append({
            "box": {
                "top": location.get("top"),
                "right": location.get("right"),
                "bottom": location.get("bottom"),
                "left": location.get("left")
            },
            "status": status,
            "distance": None if not best_match else round(distance, 4),
            "confidence": None if not best_match else round(
                max(0.0, 1.0 - distance), 3
            ),
            "student": None if not best_match else {
                "id": str(best_match["userId"]),
                "roll": user.get("roll") if user else None,
                "name": best_match["name"]
            }
        })
    
    return {
        "faces": results,
        "count": len(results)
    }


@router.post("/confirm")
async def confirm_attendance(payload: Dict):
    """
    Confirm attendance for students after manual review
    
    payload:
    {
      "subject_id": "...",
      "present_students": ["id1", "id2", ...],
      "absent_students": ["id3", "id4", ...]
    }
    """
    subject_id = payload.get("subject_id")
    present_students: List[str] = payload.get("present_students", [])
    absent_students: List[str] = payload.get("absent_students", [])

    if not subject_id:
        raise HTTPException(status_code=400, detail="subject_id required")
    
    today = date.today().isoformat()
    subject_oid = ObjectId(subject_id)
    present_oids = [ObjectId(sid) for sid in present_students]
    absent_oids = [ObjectId(sid) for sid in absent_students]
    
    # Mark PRESENT students
    await db.subjects.update_one(
        {"_id": subject_oid},
        {
            "$inc": {"students.$[p].attendance.present": 1},
            "$set": {"students.$[p].attendance.lastMarkedAt": today}
        },
        array_filters=[
            {
                "p.student_id": {"$in": present_oids},
                "p.attendance.lastMarkedAt": {"$ne": today}
            }
        ]
    )
    
    # Mark ABSENT students
    await db.subjects.update_one(
        {"_id": subject_oid},
        {
            "$inc": {"students.$[a].attendance.absent": 1},
            "$set": {"students.$[a].attendance.lastMarkedAt": today}
        },
        array_filters=[
            {
                "a.student_id": {"$in": absent_oids},
                "a.attendance.lastMarkedAt": {"$ne": today}
            }
        ]
    )

    return {
        "ok": True,
        "present_updated": len(present_students),
        "absent_updated": len(absent_students)
    }
