import base64
import logging
from datetime import date
from typing import Dict, List

from bson import ObjectId
from fastapi import APIRouter, HTTPException

from geopy.distance import geodesic
from app.core.config import ML_CONFIDENT_THRESHOLD, ML_UNCERTAIN_THRESHOLD
from app.db.mongo import db
from app.services.attendance_daily import save_daily_summary
from app.services.ml_client import ml_client
from app.utils.geo import calculate_distance
from app.schemas.attendance import QRAttendanceRequest
from app.core.security import get_current_user
from fastapi import Depends

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.post("/mark-qr")
async def mark_attendance_qr(
    payload: QRAttendanceRequest, current_user: dict = Depends(get_current_user)
):
    """
    Mark attendance via QR code with geofencing check.
    """
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can mark attendance")

    student_oid = ObjectId(current_user["id"])
    subject_id = payload.token  # Assuming token is subject_id for MVP
    
    if not ObjectId.is_valid(subject_id):
         raise HTTPException(status_code=400, detail="Invalid subject ID")
         
    subject_oid = ObjectId(subject_id)

    # 1. Fetch Subject & Location
    subject = await db.subjects.find_one({"_id": subject_oid})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # 2. Geofencing Check
    is_proxy_suspected = False
    dist = 0.0
    
    location_cfg = subject.get("location")
    if location_cfg:
        # If teacher hasn't set location, use 0.0, 0.0 (or skip check? Prompt said use dummy to avoid crash)
        # But logically if teacher hasn't set location, we probably shouldn't flag as proxy based on distance to 0,0.
        # However, prompt said: "Fetch the teacher's current session location (use dummy coordinates 0.0, 0.0 if the teacher's lat/lon isn't in the DB yet, to avoid crashes)."
        # I will follow this but maybe I should check if it's 0,0 before flagging? 
        # Actually if teacher is at 0,0 and student is at real location, distance will be huge -> proxy suspected.
        # That seems bad if teacher just forgot to set it. 
        # But I must follow "If distance > 50 meters, set a variable is_proxy = True."
        # I'll code it as requested but maybe add a check that if teacher loc is missing/invalid, we rely on 0.0
        
        teacher_lat = float(location_cfg.get("lat", 0.0))
        teacher_lon = float(location_cfg.get("long", 0.0))
        radius = float(location_cfg.get("radius", 50.0))
        
        dist = calculate_distance(
            teacher_lat, teacher_lon, payload.latitude, payload.longitude
        )
        
        if dist > radius:
            is_proxy_suspected = True
    else:
        # No location config at all? 
        # Using 0.0 as dummy as per prompt implies we should still calc distance?
        # "Fetch the teacher's current session location (use dummy coordinates 0.0, 0.0 if the teacher's lat/lon isn't in the DB yet)"
        # This implies we proceed.
        teacher_lat = 0.0
        teacher_lon = 0.0
        radius = 50.0
        dist = calculate_distance(0.0, 0.0, payload.latitude, payload.longitude)
        if dist > radius:
            is_proxy_suspected = True

    # 3. Mark Attendance (Update Subject)
    today = date.today().isoformat()
    
    # We update the student's attendance in the subject document
    # Using the same logic as confirm_attendance essentially, but for one student
    await db.subjects.update_one(
        {"_id": subject_oid},
        {
            "$inc": {"students.$[p].attendance.present": 1},
            "$set": {"students.$[p].attendance.lastMarkedAt": today},
        },
        array_filters=[
            {
                "p.student_id": student_oid,
                "p.attendance.lastMarkedAt": {"$ne": today},
            }
        ],
    )
    
    # 4. Save Audit Record (Crucial: Save is_proxy_suspected)
    # The prompt says "Save the record to MongoDB with the new field is_proxy_suspected: bool."
    # Since we can't easily add this to the nested array in subjects without schema changes or unbounded growth,
    # I'll create a separate log entry.
    
    log_entry = {
        "student_id": student_oid,
        "subject_id": subject_oid,
        "date": today,
        "timestamp": date.today().isoformat(), # or datetime.now()
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "distance_from_teacher": dist,
        "is_proxy_suspected": is_proxy_suspected,
        "method": "qr"
    }
    
    await db.attendance_logs.insert_one(log_entry)

    return {
        "message": "Attendance marked successfully",
        "proxy_suspected": is_proxy_suspected,
        "distance": dist
    }


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
    try:
        subject = await db.subjects.find_one(
            {"_id": ObjectId(subject_id)}, {"students": 1, "location": 1}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid subject ID format")

    if not subject:
        raise HTTPException(404, "Subject not found")

    # Geofencing Check
    location_cfg = subject.get("location")
    if (
        location_cfg
        and location_cfg.get("lat") is not None
        and location_cfg.get("long") is not None
    ):
        req_lat = payload.get("latitude")
        req_long = payload.get("longitude")

        if req_lat is None or req_long is None:
            raise HTTPException(
                status_code=400,
                detail="Location coordinates (latitude, longitude) required",
            )

        try:
            student_pos = (float(req_lat), float(req_long))
            class_pos = (float(location_cfg["lat"]), float(location_cfg["long"]))
            # Default radius 50m if not set
            allowed_radius = float(location_cfg.get("radius", 50))
            
            if allowed_radius <= 0:
                raise ValueError("Radius must be positive")

            dist = geodesic(class_pos, student_pos).meters

            if dist > allowed_radius:
                raise HTTPException(
                    status_code=403,
                    detail="You are too far from the classroom.",
                )
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid coordinates format")

    student_user_ids = [
        s["student_id"] for s in subject.get("students", []) if s.get("verified", False)
    ]

    # Strip base64 header
    if "," in image_b64:
        _, image_b64 = image_b64.split(",", 1)

    try:
        _ = base64.b64decode(image_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")

    # Call ML service to detect faces
    try:
        ml_response = await ml_client.detect_faces(
            image_base64=image_b64, min_face_area_ratio=0.04, num_jitters=3, model="hog"
        )

        if not ml_response.get("success"):
            raise HTTPException(
                status_code=500,
                detail=f"ML service error: {ml_response.get('error', 'Unknown error')}",
            )

        detected_faces = ml_response.get("faces", [])

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to detect faces: {str(e)}")

    if not detected_faces:
        return {"faces": [], "count": 0}

    # Load students of this subject with embeddings
    students_cursor = db.students.find(
        {
            "userId": {"$in": student_user_ids},
            "verified": True,
            "face_embeddings": {"$exists": True, "$ne": []},
        }
    )

    students = await students_cursor.to_list(length=500)

    # Prepare candidate embeddings for batch matching
    candidate_embeddings = []
    for student in students:
        candidate_embeddings.append(
            {
                "student_id": str(student["userId"]),
                "embeddings": student["face_embeddings"],
            }
        )

    # Call ML service to match faces
    try:
        match_response = await ml_client.batch_match(
            detected_faces=[
                {"embedding": face["embedding"]} for face in detected_faces
            ],
            candidate_embeddings=candidate_embeddings,
            confident_threshold=ML_CONFIDENT_THRESHOLD,
            uncertain_threshold=ML_UNCERTAIN_THRESHOLD,
        )

        if not match_response.get("success"):
            raise HTTPException(
                status_code=500,
                detail=f"ML service error: {match_response.get('error', 'Unknown error')}",  # noqa: E501
            )

        matches = match_response.get("matches", [])

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to match faces: {str(e)}")

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
            best_match = next(
                (s for s in students if str(s["userId"]) == student_id), None
            )

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
                {"_id": best_match["userId"]}, {"name": 1, "roll": 1}
            )

        # Build result
        location = face.get("location", {})
        results.append(
            {
                "box": {
                    "top": location.get("top"),
                    "right": location.get("right"),
                    "bottom": location.get("bottom"),
                    "left": location.get("left"),
                },
                "status": status,
                "distance": None if not best_match else round(distance, 4),
                "confidence": None
                if not best_match
                else round(max(0.0, 1.0 - distance), 3),
                "student": None
                if not best_match
                else {
                    "id": str(best_match["userId"]),
                    "roll": user.get("roll") if user else None,
                    "name": best_match["name"],
                },
            }
        )

    return {"faces": results, "count": len(results)}


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
            "$set": {"students.$[p].attendance.lastMarkedAt": today},
        },
        array_filters=[
            {
                "p.student_id": {"$in": present_oids},
                "p.attendance.lastMarkedAt": {"$ne": today},
            }
        ],
    )

    # Mark ABSENT students
    await db.subjects.update_one(
        {"_id": subject_oid},
        {
            "$inc": {"students.$[a].attendance.absent": 1},
            "$set": {"students.$[a].attendance.lastMarkedAt": today},
        },
        array_filters=[
            {
                "a.student_id": {"$in": absent_oids},
                "a.attendance.lastMarkedAt": {"$ne": today},
            }
        ],
    )

    # --- Write daily attendance summary ---
    subject = await db.subjects.find_one({"_id": subject_oid}, {"professor_ids": 1})
    teacher_id = (
        subject["professor_ids"][0]
        if subject and subject.get("professor_ids")
        else None
    )

    await save_daily_summary(
        class_id=subject_oid,
        subject_id=subject_oid,
        teacher_id=teacher_id,
        record_date=today,
        present=len(present_students),
        absent=len(absent_students),
    )

    return {
        "ok": True,
        "present_updated": len(present_students),
        "absent_updated": len(absent_students),
    }
