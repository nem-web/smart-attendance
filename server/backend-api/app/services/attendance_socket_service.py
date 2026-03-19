import logging
import time
from datetime import datetime, date
from typing import Dict, List, Any

import socketio
from bson import ObjectId
from bson import errors as bson_errors
from pymongo import UpdateOne

from app.core.config import ORIGINS, ML_CONFIDENT_THRESHOLD, ML_UNCERTAIN_THRESHOLD
from app.db.mongo import db
from app.services.attendance import log_grouped_attendance
from app.services.attendance_daily import save_daily_summary
from app.utils.geo import calculate_distance
from app.utils.jwt_token import decode_jwt

logger = logging.getLogger(__name__)

# Initialize Socket.IO server
# cors_allowed_origins uses the same whitelist as the FastAPI CORS middleware
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=ORIGINS,
    cors_credentials=True,
)

# In-memory storage for active sessions
# Key: session_id (str)
# Value: List of scan records
active_sessions: Dict[str, List[Dict[str, Any]]] = {}

# Teacher location cache (to avoid DB lookup on every scan)
# Key: session_id
# Value: { lat: float, lon: float, subjectIdx: str }
session_locations: Dict[str, Dict[str, Any]] = {}

# Per-connection rate limiting for process_frame
# Key: sid, Value: last_process_time (float)
_frame_last_processed: Dict[str, float] = {}
_MIN_FRAME_INTERVAL = 0.5  # ~2 FPS per client


@sio.event
async def connect(sid, environ):
    logger.info(f"Socket connected: {sid}")


@sio.event
async def disconnect(sid):
    logger.info(f"Socket disconnected: {sid}")
    _frame_last_processed.pop(sid, None)


@sio.on("join_session")
async def handle_join_session(sid, data):
    """
    Teacher joins a session room.
    Data: { sessionId, subjectId, latitude, longitude }
    """
    session_id = data.get("sessionId")
    subject_id = data.get("subjectId")

    if not session_id:
        return

    # Join room
    await sio.enter_room(sid, session_id)

    # Store teacher location and subject mapping
    if "latitude" in data and "longitude" in data:
        session_locations[session_id] = {
            "lat": float(data["latitude"]),
            "lon": float(data["longitude"]),
            "subjectId": subject_id,
        }
    elif subject_id:
        session_locations[session_id] = {
            "lat": 0.0,
            "lon": 0.0,
            "subjectId": subject_id,
        }

    # Initialize buffer for this session if not exists
    if session_id not in active_sessions:
        active_sessions[session_id] = []

    logger.info(f"Teacher {sid} joined session {session_id} for subject {subject_id}")
    await sio.emit("session_joined", {"sessionId": session_id}, room=sid)


@sio.on("student_scan")
async def handle_scan_qr(sid, data):
    """
    Student scans QR code.
    Data: { sessionId, studentId, latitude, longitude, timestamp }
    """
    session_id = data.get("sessionId")
    student_id = data.get("studentId")
    lat = data.get("latitude")
    lon = data.get("longitude")
    timestamp = data.get("timestamp", datetime.utcnow().isoformat())

    if not session_id or not student_id:
        await sio.emit("scan_error", {"message": "Invalid data"}, room=sid)
        return

    # Get session info
    session_info = session_locations.get(session_id)
    teacher_lat = session_info.get("lat") if session_info else 0
    teacher_lon = session_info.get("lon") if session_info else 0
    subject_id = session_info.get("subjectId") if session_info else None

    if not subject_id:
        # If subjectId is missing we can't persist, but we can still emit.
        pass

    # 1. Proxy Calculation
    is_proxy = False
    proxy_distance = 0

    teacher_loc = session_locations.get(session_id)
    if teacher_loc and lat and lon:
        try:
            # Using standard util
            teacher_lat = teacher_loc["lat"]
            teacher_lon = teacher_loc["lon"]

            # Use utility function
            proxy_distance = calculate_distance(
                float(lat), float(lon), teacher_lat, teacher_lon
            )

            if proxy_distance > 50:
                is_proxy = True
        except Exception as e:
            logger.error(f"Error calculating distance: {e}")

    # 2. Deduplication (Simple check in current buffer)
    already_scanned = any(
        s["studentId"] == student_id for s in active_sessions.get(session_id, [])
    )

    scan_status = "Proxy" if is_proxy else "Present"
    if already_scanned:
        scan_status = "Duplicate"

    scan_data = {
        "studentId": student_id,
        "timestamp": timestamp,
        "location": {"lat": lat, "lon": lon},
        "status": scan_status,
        "distance": proxy_distance,
        "isProxy": is_proxy,
        "subjectId": subject_id,  # Needed for persistence
    }

    # 3. Add to Buffer
    if session_id not in active_sessions:
        active_sessions[session_id] = []

    if not already_scanned:
        active_sessions[session_id].append(scan_data)

    # 4. Emit event to room (Teacher receives this)
    await sio.emit("student_scanned", scan_data, room=session_id)

    # Acknowledge to student
    await sio.emit("scan_ack", {"status": "recorded", "isProxy": is_proxy}, room=sid)


@sio.on("process_frame")
async def handle_process_frame(sid, data):
    """
    Teacher emits webcam frame for ML face recognition.
    Data: { session_id, image (base64), subject_id, token }
    """
    from app.services.ml_client import ml_client  # local import to avoid circular

    token = data.get("token")
    image_b64 = data.get("image")
    subject_id = data.get("subject_id")

    # 1. Authenticate
    if not token:
        await sio.emit("ml_error", {"message": "Missing token"}, room=sid)
        return

    try:
        payload = decode_jwt(token)
        if payload.get("type") != "access":
            await sio.emit("ml_error", {"message": "Unauthorized"}, room=sid)
            return

        user_id = payload.get("user_id")
        if not user_id:
            await sio.emit("ml_error", {"message": "Unauthorized"}, room=sid)
            return

        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user.get("role") not in ["teacher", "admin"]:
            await sio.emit("ml_error", {"message": "Forbidden"}, room=sid)
            return

    except Exception as exc:
        logger.error(f"process_frame auth error: {exc}")
        await sio.emit("ml_error", {"message": "Auth failed"}, room=sid)
        return

    if not image_b64 or not subject_id:
        await sio.emit("ml_error", {"message": "Missing image or subject_id"}, room=sid)
        return

    # 2. Rate limiting
    now = time.time()
    last = _frame_last_processed.get(sid, 0.0)
    if now - last < _MIN_FRAME_INTERVAL:
        await sio.emit("frame_skipped", {"status": "rate_limited"}, room=sid)
        return
    _frame_last_processed[sid] = now

    matched_results = []
    unmatched_results = []

    try:
        # Strip data URL header if present
        if "," in image_b64:
            _, image_b64 = image_b64.split(",", 1)

        # Detect faces
        ml_response = await ml_client.detect_faces(
            image_base64=image_b64,
            min_face_area_ratio=0.01,
            num_jitters=3,
            model="hog",
        )

        if not ml_response.get("success"):
            await sio.emit(
                "ml_error",
                {"message": ml_response.get("error", "ML Error")},
                room=sid,
            )
            return

        faces = ml_response.get("faces", [])
        count = len(faces)

        await sio.emit(
            "processing_started",
            {"status": "processing", "matched": [], "pending": count},
            room=sid,
        )

        if count == 0:
            await sio.emit(
                "complete",
                {
                    "type": "complete",
                    "status": "complete",
                    "matched": [],
                    "unmatched": [],
                },
                room=sid,
            )
            return

        # Fetch subject and enrolled students
        try:
            subject_oid = ObjectId(subject_id)
            subject = await db.subjects.find_one(
                {"_id": subject_oid}, {"students": 1, "professor_ids": 1}
            )
        except bson_errors.InvalidId:
            subject = None

        if not subject:
            await sio.emit("ml_error", {"message": "Subject not found"}, room=sid)
            return

        if user.get("role") != "admin" and ObjectId(user_id) not in subject.get(
            "professor_ids", []
        ):
            await sio.emit("ml_error", {"message": "Forbidden"}, room=sid)
            return

        student_user_ids = [
            s["student_id"]
            for s in subject.get("students", [])
            if s.get("verified", False)
        ]

        students_cursor = db.students.find(
            {
                "userId": {"$in": student_user_ids},
                "verified": True,
                "face_embeddings": {"$exists": True, "$ne": []},
            }
        )
        students_list = await students_cursor.to_list(length=500)

        candidate_embeddings = [
            {
                "student_id": str(s["userId"]),
                "embeddings": s["face_embeddings"],
            }
            for s in students_list
        ]

        for i, face in enumerate(faces):
            match_resp = await ml_client.match_faces(
                query_embedding=face["embedding"],
                candidate_embeddings=candidate_embeddings,
                threshold=ML_UNCERTAIN_THRESHOLD,
            )

            if not match_resp.get("success"):
                raise RuntimeError(match_resp.get("error", "ML match failed"))

            match_data = match_resp.get("match") or {}
            best_student_id = match_data.get("student_id")
            distance = match_data.get("distance", 1.0)
            confidence = match_data.get("confidence", 0.0)

            status_str = "unknown"
            student_details = None

            if best_student_id:
                if distance < ML_CONFIDENT_THRESHOLD:
                    status_str = "present"
                elif distance < ML_UNCERTAIN_THRESHOLD:
                    status_str = "uncertain"

                if status_str in ("present", "uncertain"):
                    matched_student = next(
                        (
                            s
                            for s in students_list
                            if str(s["userId"]) == best_student_id
                        ),
                        None,
                    )
                    if matched_student:
                        user_info = await db.users.find_one(
                            {"_id": matched_student["userId"]}, {"name": 1, "roll": 1}
                        )
                        student_details = {
                            "id": str(matched_student["userId"]),
                            "name": matched_student.get("name")
                            or (user_info.get("name") if user_info else "Unknown"),
                            "roll": user_info.get("roll") if user_info else "",
                        }

            is_live = face.get("is_live")
            if is_live is False:
                status_str = "spoof"
                student_details = None
            elif is_live is None:
                status_str = "unknown"
                student_details = None
                logger.warning(f"Face live check returned None (index {i})")

            result_item = {
                "box": {
                    "top": face["location"].get("top"),
                    "right": face["location"].get("right"),
                    "bottom": face["location"].get("bottom"),
                    "left": face["location"].get("left"),
                },
                "status": status_str,
                "distance": round(distance, 4) if best_student_id else None,
                "confidence": round(confidence, 3) if best_student_id else None,
                "student": student_details,
            }

            if status_str in ("present", "uncertain"):
                matched_results.append(result_item)
            else:
                unmatched_results.append(result_item)

            await sio.emit(
                "match_update",
                {"match": result_item, "pending": count - (i + 1)},
                room=sid,
            )

        await sio.emit(
            "complete",
            {
                "type": "complete",
                "status": "complete",
                "matched": matched_results,
                "unmatched": unmatched_results,
            },
            room=sid,
        )

    except Exception as exc:
        logger.error(f"Error processing frame for {sid}: {exc}", exc_info=True)
        await sio.emit("ml_error", {"message": f"Processing failed: {exc}"}, room=sid)
        await sio.emit(
            "complete",
            {
                "type": "complete",
                "status": "failed",
                "matched": matched_results,
                "unmatched": unmatched_results,
            },
            room=sid,
        )


@sio.on("end_session")
async def handle_end_session(sid, data):
    """
    Teacher ends an attendance session.
    Data: { sessionId }
    """
    session_id = data.get("sessionId")
    if session_id:
        logger.info(f"end_session requested for {session_id} by {sid}")
        await stop_and_save_session(session_id)


async def flush_attendance_data():
    """
    Scheduled task to flush buffered attendance to MongoDB.
    """
    if not active_sessions:
        return

    logger.info("Flushing attendance data...")

    for session_id, scans in list(active_sessions.items()):
        if not scans:
            continue

        # We need subject_id to update db.subjects
        # It should be in the scans or session_locations
        # Assuming all scans in a session belong to the same subject
        first_scan = scans[0]
        subject_id = first_scan.get("subjectId")

        if not subject_id:
            # Fallback to session_locations
            sess_loc = session_locations.get(session_id)
            if sess_loc:
                subject_id = sess_loc.get("subjectId")

        if not subject_id:
            logger.error(f"Cannot flush session {session_id}: Missing subjectId")
            continue

        try:
            operations = []
            today_str = date.today().isoformat()

            # Deduplicate by student_id (first scan wins)
            unique_scans = {s["studentId"]: s for s in scans}.values()

            for scan in unique_scans:
                student_oid = ObjectId(scan["studentId"])

                attendance_record = {
                    "date": today_str,
                    "status": "Present",  # Or scan["status"]
                    "timestamp": scan["timestamp"],
                    "method": "qr",
                    "sessionId": session_id,
                    "isProxy": scan["isProxy"],
                    "distance": scan["distance"],
                }

                # Update subjects collection - push to attendanceRecords
                op_subjects = UpdateOne(
                    {"_id": ObjectId(subject_id), "students.student_id": student_oid},
                    {
                        "$push": {"students.$.attendanceRecords": attendance_record},
                        "$inc": {
                            "students.$.attendance.present": 1,
                            "students.$.attendance.total": 1,
                        },
                        "$set": {"students.$.attendance.lastMarkedAt": today_str},
                    },
                )
                operations.append(op_subjects)

            if operations:
                await db.subjects.bulk_write(operations)
                logger.info(
                    f"Flushed {len(operations)} records for session {session_id}"
                )

                # Insert grouped logs
                subject_doc = await db.subjects.find_one({"_id": ObjectId(subject_id)})
                teacher_id = (
                    subject_doc["professor_ids"][0]
                    if subject_doc and subject_doc.get("professor_ids")
                    else None
                )

                log_students_data = []
                for scan in unique_scans:
                    log_students_data.append(
                        {
                            "studentId": ObjectId(scan["studentId"]),
                            "scanTime": scan["timestamp"],
                            "method": "qr",
                            "sessionId": session_id,
                            "latitude": scan["location"]["lat"],
                            "longitude": scan["location"]["lon"],
                            "distance": scan["distance"],
                            "isProxy": scan["isProxy"],
                        }
                    )

                updated_logs = None
                if log_students_data:
                    updated_logs = await log_grouped_attendance(
                        subject_id=subject_id,
                        date_str=today_str,
                        students=log_students_data,
                        teacher_id=teacher_id,
                    )

                # Update Analytics
                if updated_logs and "students" in updated_logs:
                    present_count = len(updated_logs["students"])
                    total_enrolled = (
                        len(subject_doc.get("students", [])) if subject_doc else 0
                    )
                    absent_count = max(0, total_enrolled - present_count)

                    await save_daily_summary(
                        subject_id=ObjectId(subject_id),
                        teacher_id=teacher_id,
                        record_date=today_str,
                        present=present_count,
                        absent=absent_count,
                    )

            # Clear flushed items (keep session active but clear buffer)
            active_sessions[session_id] = []

        except Exception as e:
            logger.error(f"Error flushing session {session_id}: {e}")


async def stop_and_save_session(session_id: str):
    """
    Triggers immediate flush for a specific session and clears it.
    """
    result_msg = "Session not found or empty"

    if session_id in active_sessions:
        # Reuse flush logic for this session?
        # Or just copy paste for simplicity/isolation

        # To reuse flush, we can just call it, but flush iterates all.
        # Let's extract flush logic for one session?
        # For MVP, I'll essentially run the same logic.

        scans = active_sessions[session_id]
        if scans:
            subject_id = scans[0].get("subjectId")
            if not subject_id:
                sess_loc = session_locations.get(session_id)
                if sess_loc:
                    subject_id = sess_loc.get("subjectId")

            if subject_id:
                try:
                    operations = []
                    today_str = date.today().isoformat()
                    unique_scans = {s["studentId"]: s for s in scans}.values()

                    # Grouped Logs & Analytics
                    subject_doc = await db.subjects.find_one(
                        {"_id": ObjectId(subject_id)}
                    )
                    teacher_id = (
                        subject_doc["professor_ids"][0]
                        if subject_doc and subject_doc.get("professor_ids")
                        else None
                    )

                    log_students_data = []
                    for scan in unique_scans:
                        student_oid = ObjectId(scan["studentId"])
                        attendance_record = {
                            "date": today_str,
                            "status": "Present",
                            "timestamp": scan["timestamp"],
                            "method": "qr",
                            "sessionId": session_id,
                            "isProxy": scan["isProxy"],
                            "distance": scan["distance"],
                        }

                        op_subjects = UpdateOne(
                            {
                                "_id": ObjectId(subject_id),
                                "students.student_id": student_oid,
                            },
                            {
                                "$push": {
                                    "students.$.attendanceRecords": attendance_record
                                },
                                "$inc": {
                                    "students.$.attendance.present": 1,
                                    "students.$.attendance.total": 1,
                                },
                                "$set": {
                                    "students.$.attendance.lastMarkedAt": today_str
                                },
                            },
                        )
                        operations.append(op_subjects)

                        log_students_data.append(
                            {
                                "studentId": ObjectId(scan["studentId"]),
                                "scanTime": scan["timestamp"],
                                "method": "qr",
                                "sessionId": session_id,
                                "latitude": scan["location"]["lat"],
                                "longitude": scan["location"]["lon"],
                                "distance": scan["distance"],
                                "isProxy": scan["isProxy"],
                            }
                        )

                    updated_logs = None
                    if log_students_data:
                        updated_logs = await log_grouped_attendance(
                            subject_id=subject_id,
                            date_str=today_str,
                            students=log_students_data,
                            teacher_id=teacher_id,
                        )

                    if updated_logs and "students" in updated_logs:
                        present_count = len(updated_logs["students"])
                        total_enrolled = (
                            len(subject_doc.get("students", [])) if subject_doc else 0
                        )
                        absent_count = max(0, total_enrolled - present_count)

                        await save_daily_summary(
                            subject_id=ObjectId(subject_id),
                            teacher_id=teacher_id,
                            record_date=today_str,
                            present=present_count,
                            absent=absent_count,
                        )

                    if operations:
                        await db.subjects.bulk_write(operations)
                        result_msg = f"Saved {len(operations)} records."
                except Exception as e:
                    logger.error(f"Error saving session {session_id}: {e}")
                    result_msg = f"Error: {str(e)}"

        del active_sessions[session_id]
        if session_id in session_locations:
            del session_locations[session_id]

    return {"message": "Session closed", "details": result_msg}
