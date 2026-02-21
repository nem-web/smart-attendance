import logging
from datetime import datetime, date
from typing import Dict, List, Any

import socketio
from bson import ObjectId
from pymongo import UpdateOne

from app.core.config import ORIGINS
from app.db.mongo import db
from app.utils.geo import calculate_distance

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


@sio.event
async def connect(sid, environ):
    logger.info(f"Socket connected: {sid}")


@sio.event
async def disconnect(sid):
    logger.info(f"Socket disconnected: {sid}")


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

                # Insert logs
                log_entries = []
                for scan in unique_scans:
                    log_entries.append(
                        {
                            "student_id": ObjectId(scan["studentId"]),
                            "subject_id": ObjectId(subject_id),
                            "date": today_str,
                            "timestamp": scan["timestamp"],
                            "session_id": session_id,
                            "latitude": scan["location"]["lat"],
                            "longitude": scan["location"]["lon"],
                            "distance_from_teacher": scan["distance"],
                            "is_proxy_suspected": scan["isProxy"],
                            "method": "qr",
                        }
                    )
                if log_entries:
                    await db.attendance_logs.insert_many(log_entries)

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

                    log_entries = []

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

                        log_entries.append(
                            {
                                "student_id": ObjectId(scan["studentId"]),
                                "subject_id": ObjectId(subject_id),
                                "date": today_str,
                                "timestamp": scan["timestamp"],
                                "session_id": session_id,
                                "latitude": scan["location"]["lat"],
                                "longitude": scan["location"]["lon"],
                                "distance_from_teacher": scan["distance"],
                                "is_proxy_suspected": scan["isProxy"],
                                "method": "qr",
                            }
                        )

                    if operations:
                        await db.subjects.bulk_write(operations)
                        if log_entries:
                            await db.attendance_logs.insert_many(log_entries)
                        result_msg = f"Saved {len(operations)} records."
                except Exception as e:
                    logger.error(f"Error saving session {session_id}: {e}")
                    result_msg = f"Error: {str(e)}"

        del active_sessions[session_id]
        if session_id in session_locations:
            del session_locations[session_id]

    return {"message": "Session closed", "details": result_msg}
