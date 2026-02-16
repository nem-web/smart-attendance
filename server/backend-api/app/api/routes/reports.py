import csv
import io
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_teacher
from app.db.mongo import db
from app.utils.utils import serialize_bson

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/export/csv")
async def export_attendance_csv(
    subject_id: str = Query(..., description="The ID of the subject to export"),
    start_date: Optional[str] = Query(None, description="Start date for file naming (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date for file naming (YYYY-MM-DD)"),
    current_teacher: dict = Depends(get_current_teacher),
):
    """
    Export attendance data as a CSV file.
    
    Note: Currently exports all-time attendance totals as granular daily history 
    is not linked to individual students in a way that supports range filtering 
    for this report format. Dates are used for the filename.
    """
    
    # 1. Validate Subject ID
    try:
        subject_oid = ObjectId(subject_id)
        teacher_oid = ObjectId(current_teacher["id"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # 2. Fetch Subject & Verify Access
    subject = await db.subjects.find_one(
        {"_id": subject_oid, "professor_ids": teacher_oid},
        {"name": 1, "code": 1, "students": 1}
    )

    if not subject:
        raise HTTPException(
            status_code=404, 
            detail="Subject not found or you do not have permission to access it"
        )

    # 3. Fetch Student Details
    # The 'students' array in subject doc contains {student_id, attendance: {present, absent}, verified}
    subject_students = subject.get("students", [])
    
    # Filter for verified students only? Usually reports include all, but verified is safer.
    # Let's include all but maybe mark status. For now, let's stick to verified to match UI.
    verified_students = [s for s in subject_students if s.get("verified")]
    
    student_ids = [s["student_id"] for s in verified_students]
    
    # Fetch user details (names, roll numbers)
    users_cursor = db.users.find(
        {"_id": {"$in": student_ids}},
        {"name": 1, "email": 1, "usn": 1} # Assuming USN/Roll is here
    )
    users_map = {str(u["_id"]): u async for u in users_cursor}
    
    # Fetch detailed student profile for Roll/Branch if needed (students collection)
    students_profile_cursor = db.students.find(
        {"userId": {"$in": student_ids}},
        {"userId": 1, "roll": 1, "roll_number": 1} # Handle potential field name variations
    )
    students_profile_map = {str(s["userId"]): s async for s in students_profile_cursor}

    # 4. Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # CSV Headers
    headers = [
        "Student Name",
        "Roll No",
        "Total Classes",
        "Attended",
        "Percentage",
        "Status"
    ]
    writer.writerow(headers)
    
    for s_record in verified_students:
        s_id = str(s_record["student_id"])
        user = users_map.get(s_id, {})
        profile = students_profile_map.get(s_id, {})
        
        name = user.get("name", "Unknown")
        # specific logic to find roll number
        roll = profile.get("roll_number") or profile.get("roll") or user.get("usn") or "N/A"
        
        attendance = s_record.get("attendance", {})
        present = attendance.get("present", 0)
        absent = attendance.get("absent", 0)
        total = present + absent
        
        percentage = round((present / total) * 100, 2) if total > 0 else 0.0
        
        # Determine status (logic from Reports.jsx)
        # Default threshold 75%
        if percentage >= 75:
            status = "Good"
        elif percentage >= 65:
            status = "Warning"
        else:
            status = "At Risk"
            
        writer.writerow([
            name,
            roll,
            total,
            present,
            f"{percentage}%",
            status
        ])
        
    output.seek(0)
    
    # 5. Prepare Filename
    # naming convention: attendance_report_[subject_code]_[date].csv
    date_str = start_date if start_date else datetime.now().strftime("%Y-%m-%d")
    filename = f"attendance_report_{subject.get('code', 'subject')}_{date_str}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
