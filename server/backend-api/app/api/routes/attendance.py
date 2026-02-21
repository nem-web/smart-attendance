import base64
import logging
from datetime import date
from typing import Dict

from bson import ObjectId
from bson import errors as bson_errors
from fastapi import APIRouter, HTTPException, Request

from geopy.distance import geodesic
from app.core.config import ML_CONFIDENT_THRESHOLD, ML_UNCERTAIN_THRESHOLD
from app.db.mongo import db
from app.services.attendance_daily import save_daily_summary
from app.services.ml_client import ml_client
from app.utils.geo import calculate_distance
from app.schemas.attendance import QRAttendanceRequest
from app.core.security import get_current_user
from app.utils.jwt_token import decode_jwt
from fastapi import Depends

from app.services.attendance_socket_service import stop_and_save_session, sio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.post("/stop-session/{session_id}")
async def stop_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """
    Manually stop session, flush buffer, and close.
    """
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return await stop_and_save_session(session_id)


def _parse_object_id(value: str, field_name: str) -> ObjectId:
    """
    Parse a string value to ObjectId, raising HTTPException on failure.

    Args:
        value: The string value to parse
        field_name: The field name for error messages

    Returns:
        ObjectId: The parsed ObjectId

    Raises:
        HTTPException: If the value is not a valid ObjectId
    """
    if not value:
        raise HTTPException(status_code=400, detail=f"{field_name} is required")
    try:
        return ObjectId(value)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}")


def _parse_object_id_list(
    values: list[str], field_name: str
) -> tuple[list[ObjectId], set[ObjectId]]:
    """
    Parse a list of string values to ObjectIds with deduplication.

    Args:
        values: List of string values to parse
        field_name: The field name for error messages

    Returns:
        tuple: (list of ObjectIds, set of ObjectIds for deduplication)

    Raises:
        HTTPException: If any value is not a valid ObjectId
    """
    oid_list = []
    oid_set = set()

    for val in values:
        try:
            oid = ObjectId(val)
            oid_list.append(oid)
            oid_set.add(oid)
        except bson_errors.InvalidId:
            raise HTTPException(
                status_code=400, detail=f"Invalid ObjectId in {field_name}: {val}"
            )

    return oid_list, oid_set


@router.post("/mark-qr")
async def mark_attendance_qr(
    payload: QRAttendanceRequest, current_user: dict = Depends(get_current_user)
):
    """
    Mark attendance via QR code with geofencing check and date validation.

    Validates:
    - subjectId exists
    - date is today (prevents scanning old screenshots)
    - token is valid
    - student location within allowed radius

    Updates:
    - subjects.students.attendance array (adds attendance record)
    - subjects.students.present_count (increments counter)
    """
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can mark attendance")

    student_oid = ObjectId(current_user["id"])
    subject_id = payload.subjectId

    if not ObjectId.is_valid(subject_id):
        raise HTTPException(status_code=400, detail="Invalid subject ID")

    subject_oid = ObjectId(subject_id)

    # Validate date is today
    from datetime import datetime, UTC

    try:
        qr_date = datetime.fromisoformat(payload.date.replace("Z", "+00:00"))
        today = datetime.now(UTC).date()
        qr_day = qr_date.date()

        if qr_day != today:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Expired Session: QR code is not from today. "
                    "Please scan a fresh QR code."
                ),
            )
    except (ValueError, AttributeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")

    # 1. Fetch Subject & Location
    subject = await db.subjects.find_one({"_id": subject_oid})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # 2. Geofencing Check
    is_proxy_suspected = False
    dist = 0.0

    # Try to get live session location first from socket service
    # This allows for dynamic location updates per session
    from app.services.attendance_socket_service import session_locations

    session_loc = session_locations.get(payload.sessionId)

    logger.debug("Session id: %s, session_loc: %s", payload.sessionId, session_loc)

    teacher_lat = 0.0
    teacher_lon = 0.0
    radius = 50.0  # Default radius

    location_cfg = subject.get("location")
    if location_cfg:
        radius = float(location_cfg.get("radius", 50.0))

    if session_loc and "lat" in session_loc and "lon" in session_loc:
        teacher_lat = float(session_loc["lat"])
        teacher_lon = float(session_loc["lon"])
        # If static location has radius configured, use it, else default 50
    elif location_cfg:
        # Fallback to static subject location
        teacher_lat = float(location_cfg.get("lat", 0.0))
        # Note: field name inconsistency possible: 'long' vs 'lon' vs 'lng'
        teacher_lon = float(
            location_cfg.get("long")
            or location_cfg.get("lon")
            or location_cfg.get("lng")
            or 0.0
        )

    logger.debug(
        "teacher_lat=%s, teacher_lon=%s, student_lat=%s, student_lon=%s",
        teacher_lat,
        teacher_lon,
        payload.latitude,
        payload.longitude,
    )

    if teacher_lat != 0.0 and teacher_lon != 0.0:
        dist = calculate_distance(
            teacher_lat, teacher_lon, payload.latitude, payload.longitude
        )
        logger.debug("Calculated distance=%s, radius=%s", dist, radius)

        if dist > radius:
            is_proxy_suspected = True
            logger.debug("Proxy suspected for session %s", payload.sessionId)
    else:
        logger.debug("Skipping distance calculation: teacher location is 0.0")

    # 3. Mark Attendance (Update Subject)
    today = date.today().isoformat()

    # Check if student has already marked attendance today for this subject
    existing_subject = await db.subjects.find_one(
        {
            "_id": subject_oid,
            "students": {
                "$elemMatch": {
                    "student_id": student_oid,
                    "attendance.lastMarkedAt": today,
                }
            },
        }
    )

    if existing_subject:
        raise HTTPException(
            status_code=409, detail="Attendance already marked for today"
        )

    # Update the student's attendance in the subject document
    # 1. Push attendance record to the attendance array
    # 2. Increment present counter
    # 3. Update lastMarkedAt
    # Note: attendanceRecords array will grow over time. For production use,
    # consider archiving old records or using a separate collection for
    # historical data to avoid hitting MongoDB's 16MB document size limit.
    attendance_record = {
        "date": today,
        "status": "Proxy" if is_proxy_suspected else "Present",
        "timestamp": datetime.now(UTC).isoformat(),
        "method": "qr",
    }

    update_query = {
        "$push": {"students.$.attendanceRecords": attendance_record},
        "$inc": {
            "students.$.attendance.total": 1,
        },
        "$set": {"students.$.attendance.lastMarkedAt": today},
    }

    if not is_proxy_suspected:
        update_query["$inc"]["students.$.attendance.present"] = 1
    else:
        update_query["$inc"]["students.$.attendance.absent"] = 1

    result = await db.subjects.update_one(
        {"_id": subject_oid, "students.student_id": student_oid},
        update_query,
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Student not enrolled in this subject or already marked",
        )

    # 4. Save audit record including is_proxy_suspected
    # Use a dedicated attendance_logs collection to store audit events,
    # avoiding unbounded growth and schema changes on the nested students
    # array in subjects.

    log_entry = {
        "student_id": student_oid,
        "subject_id": subject_oid,
        "date": today,
        "timestamp": datetime.now(UTC).isoformat(),
        "session_id": payload.sessionId,
        "token": payload.token,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "distance_from_teacher": dist,
        "is_proxy_suspected": is_proxy_suspected,
        "method": "qr",
    }

    await db.attendance_logs.insert_one(log_entry)

    # Need student info for socket event
    student_info = await db.students.find_one({"userId": student_oid})
    student_name = student_info.get("name", "Unknown") if student_info else "Unknown"
    student_roll = student_info.get("roll", "") if student_info else ""

    # Emit to teacher's room
    await sio.emit(
        "student_scanned",
        {
            "student": {
                "name": student_name,
                "roll": student_roll,
                "id": str(student_oid),
            },
            "timestamp": log_entry["timestamp"],
            "location": {
                "lat": payload.latitude,
                "lon": payload.longitude,
            },
            "is_proxy_suspected": is_proxy_suspected,
            "distance": dist,
        },
        room=payload.sessionId,
    )

    return {
        "message": "Attendance marked successfully",
        "proxy_suspected": is_proxy_suspected,
        "distance": dist,
    }


@router.post("/mark")
async def mark_attendance(request: Request, payload: Dict):
    """
    Mark attendance by detecting faces in classroom image

    payload:
    {
      "image": "data:image/jpeg;base64,...",
      "subject_id": "..."
    }

    headers:
    {
      "X-Device-ID": "unique-device-uuid"
    }
    """
    # Extract device ID from header
    device_id = request.headers.get("X-Device-ID")
    if not device_id:
        raise HTTPException(status_code=400, detail="X-Device-ID header is required")

    # Extract user from Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")

    try:
        token = auth_header.split(" ")[1]
        decoded = decode_jwt(token)
        user_id = decoded.get("user_id")
        user_role = decoded.get("role")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Check device binding - ONLY for students
    # Teachers and admins are exempt from device binding
    if user_role == "student":
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                raise HTTPException(status_code=401, detail="User not found")

            trusted_device_id = user.get("trusted_device_id")

            # Case A: First time (no trusted device set) - Auto-bind and allow
            if not trusted_device_id:
                logger.info(
                    "First-time device detected for user %s: %s. Auto-binding device.",
                    user_id,
                    device_id,
                )
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": {"trusted_device_id": device_id}},
                )
            # Case B: Device matches
            elif trusted_device_id == device_id:
                logger.debug("Device match for user %s", user_id)
            # Case C: Device mismatch - Require OTP verification
            else:
                logger.warning(
                    "Device mismatch for user %s. Trusted: %s, Current: %s",
                    user_id,
                    trusted_device_id,
                    device_id,
                )
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "New device detected. "
                        "Please verify with OTP sent to your email."
                    ),
                )
        except bson_errors.InvalidId:
            raise HTTPException(status_code=400, detail="Invalid user ID")
    else:
        logger.debug(
            "Skipping device binding check for non-student user %s with role: %s",
            user_id,
            user_role,
        )

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
                detail=(
                    f"ML service error: {match_response.get('error', 'Unknown error')}"
                ),  # noqa: E501
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

    response:
    - present_updated / absent_updated are counts of unique IDs submitted
      after deduplication (not the count of DB rows modified).
    """
    subject_oid = _parse_object_id(payload.get("subject_id"), "subject_id")
    present_oids, present_set = _parse_object_id_list(
        payload.get("present_students", []), "present_students"
    )
    absent_oids, absent_set = _parse_object_id_list(
        payload.get("absent_students", []), "absent_students"
    )

    overlap = present_set.intersection(absent_set)
    if overlap:
        raise HTTPException(
            status_code=400,
            detail="Students cannot be both present and absent",
        )

    subject = await db.subjects.find_one({"_id": subject_oid}, {"professor_ids": 1})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    today = date.today().isoformat()

    # Mark PRESENT students - increment total AND present
    if present_oids:
        await db.subjects.update_one(
            {"_id": subject_oid},
            {
                "$inc": {
                    "students.$[p].attendance.total": 1,
                    "students.$[p].attendance.present": 1,
                },
                "$set": {"students.$[p].attendance.lastMarkedAt": today},
            },
            array_filters=[
                {
                    "p.student_id": {"$in": present_oids},
                    "p.attendance.lastMarkedAt": {"$ne": today},
                }
            ],
        )

    # Mark ABSENT students - increment total AND absent
    if absent_oids:
        await db.subjects.update_one(
            {"_id": subject_oid},
            {
                "$inc": {
                    "students.$[a].attendance.total": 1,
                    "students.$[a].attendance.absent": 1,
                },
                "$set": {"students.$[a].attendance.lastMarkedAt": today},
            },
            array_filters=[
                {
                    "a.student_id": {"$in": absent_oids},
                    "a.attendance.lastMarkedAt": {"$ne": today},
                }
            ],
        )

    # Update percentage for all modified students
    # Fetch the subject to get updated student records
    updated_subject = await db.subjects.find_one({"_id": subject_oid}, {"students": 1})

    if updated_subject:
        # Calculate and update percentages for students with attendance marked
        all_modified_student_ids = present_oids + absent_oids

        for student in updated_subject.get("students", []):
            student_id = student.get("student_id")
            if student_id not in all_modified_student_ids:
                continue

            attendance = student.get("attendance", {})
            total = attendance.get("total", 0)
            present = attendance.get("present", 0)

            # Calculate percentage
            percentage = round((present / total) * 100, 2) if total > 0 else 0

            # Update percentage in database
            await db.subjects.update_one(
                {"_id": subject_oid, "students.student_id": student_id},
                {"$set": {"students.$[s].attendance.percentage": percentage}},
                array_filters=[{"s.student_id": student_id}],
            )

    # --- Write daily attendance summary ---
    teacher_id = (
        subject["professor_ids"][0]
        if subject and subject.get("professor_ids")
        else None
    )

    await save_daily_summary(
        subject_id=subject_oid,
        teacher_id=teacher_id,
        record_date=today,
        present=len(present_oids),
        absent=len(absent_oids),
    )

    return {
        "ok": True,
        "present_updated": len(present_oids),
        "absent_updated": len(absent_oids),
    }
