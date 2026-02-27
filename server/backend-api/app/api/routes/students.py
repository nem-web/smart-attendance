from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from bson import ObjectId
from datetime import datetime, timezone

from ...db.mongo import db
from ...core.security import get_current_user
from app.services.students import get_student_profile

from cloudinary.uploader import upload
import base64
from app.services.ml_client import ml_client

from app.services import schedule_service
import pytz
import os
# from typing import List

router = APIRouter(prefix="/students", tags=["students"])


# ============================
# GET TODAY'S SCHEDULE
# ============================
@router.get("/me/today-schedule")
async def api_get_my_today_schedule(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Not a student")

    student = await db.students.find_one({"userId": ObjectId(current_user["id"])})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Ensure subject_ids are strings for the query
    raw_subject_ids = student.get("subjects", [])
    str_subject_ids = [str(sid) for sid in raw_subject_ids]

    # Get current day
    timezone_str = os.getenv("SCHOOL_TIMEZONE", "Asia/Kolkata")
    try:
        school_tz = pytz.timezone(timezone_str)
    except pytz.UnknownTimeZoneError:
        school_tz = pytz.timezone("Asia/Kolkata")

    days_of_week = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]
    now_in_school_tz = datetime.now(school_tz)
    current_day = days_of_week[now_in_school_tz.weekday()]

    entries = await schedule_service.get_student_schedule_for_day(
        str_subject_ids, current_day
    )

    # Process entries for frontend
    schedule_list = []
    for entry in entries:
        schedule_list.append(
            {
                "id": str(entry.get("_id") or ""),
                "subject_name": str(entry.get("subject_name") or "Unknown Subject"),
                "start_time": str(entry.get("start_time") or ""),
                "end_time": str(entry.get("end_time") or ""),
                "room": str(entry.get("room") or ""),
                "status": "scheduled",
            }
        )

    return {
        "day": current_day,
        "date": now_in_school_tz.strftime("%Y-%m-%d"),
        "classes": schedule_list,
    }


# ============================
# GET MY PROFILE
# ============================
@router.get("/me/profile")
async def api_get_my_profile(current_user: dict = Depends(get_current_user)):
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
    file: UploadFile = File(...), current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Not a student")

    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Only JPG/PNG allowed")

    student_user_id = ObjectId(current_user["id"])

    # 1. Read image bytes
    image_bytes = await file.read()

    # 2. Convert to base64 for ML service
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    # 3. Generate face embeddings via ML service
    try:
        ml_response = await ml_client.encode_face(
            image_base64=image_base64,
            validate_single=True,
            min_face_area_ratio=0.05,
            num_jitters=5,
        )

        if not ml_response.get("success"):
            raise HTTPException(
                status_code=400,
                detail=f"Face encoding failed: {ml_response.get('error', 'Unknown error')}",  # noqa: E501
            )

        embedding = ml_response.get("embedding")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML service error: {str(e)}")

    # 4. Upload image to Cloudinary
    upload_result = upload(
        image_bytes,
        folder="student_faces",
        public_id=str(current_user["id"]),
        overwrite=True,
        resource_type="image",
    )

    image_url = upload_result.get("secure_url")

    # 5. Store image_url + embeddings
    await db.students.update_one(
        {"userId": student_user_id},
        {
            "$set": {"image_url": image_url, "verified": True},
            "$push": {"face_embeddings": embedding},
        },
    )

    return {
        "message": "Photo uploaded and face registered successfully",
        "image_url": image_url,
    }


# ============================
# GET MY ENROLLED SUBJECTS
# ============================
@router.get("/me/subjects")
async def get_my_subjects(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Not a student")

    student_oid = ObjectId(current_user["id"])

    # 1. Fetch student to get subject IDs
    student = await db.students.find_one({"userId": student_oid})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    subject_ids = student.get("subjects", [])
    if not subject_ids:
        return []

    # 2. Fetch all subjects in one query
    subjects_cursor = db.subjects.find({"_id": {"$in": subject_ids}})

    results = []
    async for sub in subjects_cursor:
        # 3. Find this student in the subject's student list
        student_data = next(
            (
                s
                for s in sub.get("students", [])
                if str(s.get("student_id")) == str(student_oid)
            ),
            None,
        )

        attendance_data = (
            student_data.get("attendance", {})
            if student_data
            else {"present": 0, "absent": 0, "total": 0, "percentage": 0}
        )

        # Calculate percentage as fallback (in case it's not stored or is 0)
        total = attendance_data.get("total", 0)
        present = attendance_data.get("present", 0)
        percentage = attendance_data.get("percentage", 0)

        if total > 0 and percentage == 0:
            # Recalculate if total is set but percentage is 0
            percentage = round((present / total) * 100, 2)
        elif total == 0:
            percentage = 0

        results.append(
            {
                "id": str(sub["_id"]),
                "name": str(sub.get("name") or "Unknown"),
                "code": str(sub.get("code") or ""),
                "type": str(sub.get("type") or "Core"),
                "attendance": percentage,
                "attended": present,
                "total": total,
            }
        )

    return results


# ============================
# GET AVAILABLE SUBJECTS
# ============================
@router.get("/me/available-subjects")
async def get_available_subjects(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Not a student")

    subjects = await db.subjects.find({}).to_list(None)

    # 🔴 IMPORTANT: Serialize ObjectIds
    return [
        {
            "_id": str(sub["_id"]),
            "name": str(sub.get("name") or "Unknown Name"),
            "code": str(sub.get("code") or ""),
            "type": str(sub.get("type") or "Core"),
            "professor_ids": [str(pid) for pid in (sub.get("professor_ids") or [])],
            "created_at": sub.get("created_at"),
        }
        for sub in subjects
    ]


# ============================
# ADD SUBJECT TO STUDENT
# ============================
@router.post("/me/subjects")
async def add_subject(subject_id: str, current_user: dict = Depends(get_current_user)):
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
        {"userId": student_oid}, {"$addToSet": {"subjects": subject_oid}}
    )

    # 4️⃣ Add student to subject.students (CORRECT)
    await db.subjects.update_one(
        {
            "_id": subject_oid,
            "students.student_id": {"$ne": student_oid},  # ✅ FIX
        },
        {
            "$push": {
                "students": {
                    "student_id": student_oid,  # ✅ FIX
                    "name": student_name,
                    "verified": False,
                    "attendance": {
                        "present": 0,
                        "absent": 0,
                        "total": 0,
                        "percentage": 0,
                    },
                }
            }
        },
    )

    # 5️⃣ CREATE NOTIFICATION FOR TEACHERS
    # Get all professor IDs for this subject
    professor_ids = subject.get("professor_ids", [])
    subject_name = subject.get("name", "Unknown")

    # Create a notification for each teacher
    if professor_ids:
        notification_message = (
            f"Student {student_name} has registered for {subject_name}."
        )

        for teacher_id in professor_ids:
            await db.notifications.insert_one(
                {
                    "user_id": teacher_id,
                    "message": notification_message,
                    "notification_type": "enrollment",
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc),
                    "metadata": {
                        "student_id": str(student_oid),
                        "student_name": student_name,
                        "subject_id": str(subject_oid),
                        "subject_name": subject_name,
                    },
                }
            )

    return {"message": "Subject added successfully"}


# ============================
# DELETE SUBJECT TO STUDENT
# ============================
@router.delete("/me/remove-subject/{subject_id}")
async def remove_subject(
    subject_id: str, current_user: dict = Depends(get_current_user)
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
        {"userId": user_oid}, {"$pull": {"subjects": subject_oid}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Subject not assigned to student")

    # Remove student from subject.students
    await db.subjects.update_one(
        {"_id": subject_oid}, {"$pull": {"students": {"student_id": user_oid}}}
    )

    return {"message": "Subject removed successfully"}

@router.get("/export/roster/pdf")
async def export_student_roster_pdf(
    subject_id: str = None,
    current_teacher: dict = Depends(get_current_user),
):
    import html
    import io
    from datetime import datetime
    from fastapi import Query
    from fastapi.responses import StreamingResponse
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import (
        SimpleDocTemplate,
        Table,
        TableStyle,
        Paragraph,
        Spacer,
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    import re

    if current_teacher.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")

    teacher_id = ObjectId(current_teacher["id"])

    def _safe_filename(name: str) -> str:
        sanitized = re.sub(r"[^\w\-]", "_", name)
        sanitized = re.sub(r"_+", "_", sanitized).strip("_")
        return sanitized[:100] or "roster"

    def _add_page_footer(canvas, doc, school_name):
        canvas.saveState()
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.gray)
        page_num = canvas.getPageNumber()
        canvas.drawRightString(doc.pagesize[0] - 30, 30, f"Page {page_num}")
        canvas.drawString(30, 30, f"{school_name} - Confidential")
        canvas.setFont("Helvetica", 7)
        timestamp = f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        canvas.drawCentredString(doc.pagesize[0] / 2, 30, timestamp)
        canvas.restoreState()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=50,
        bottomMargin=50,
    )
    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=20,
        textColor=colors.HexColor("#1e40af"),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
    )

    header_style = ParagraphStyle(
        "HeaderStyle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#374151"),
        spaceAfter=6,
        fontName="Helvetica",
    )

    school_name = "Smart Attendance System"
    elements.append(Paragraph(html.escape(school_name), title_style))
    elements.append(Spacer(1, 10))

    teacher = await db.users.find_one({"_id": teacher_id})
    teacher_name = teacher.get("name", "Unknown Teacher") if teacher else "Unknown Teacher"

    if subject_id:
        try:
            subject_oid = ObjectId(subject_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid subject ID")

        subject = await db.subjects.find_one({"_id": subject_oid})
        if not subject:
            subject = await db.classes.find_one({"_id": subject_oid})
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")

        professor_ids = [str(pid) for pid in subject.get("professor_ids", [])]
        subject_teacher = str(subject.get("teacher_id", ""))
        if str(teacher_id) not in professor_ids and str(teacher_id) != subject_teacher:
            raise HTTPException(status_code=403, detail="Access denied for this subject")

        subject_students = [s for s in subject.get("students", []) if s.get("verified", False)]
        student_user_ids = [s["student_id"] for s in subject_students]

        students_cursor = db.students.find({"userId": {"$in": student_user_ids}})
        users_cursor = db.users.find({"_id": {"$in": student_user_ids}})

        students_map = {str(s["userId"]): s async for s in students_cursor}
        users_map = {str(u["_id"]): u async for u in users_cursor}

        metadata_data = [
            [
                Paragraph(f"<b>Teacher:</b> {html.escape(teacher_name)}", header_style),
                Paragraph(f"<b>Subject:</b> {html.escape(subject.get('name', 'Unknown'))}", header_style),
            ],
            [
                Paragraph(f"<b>Subject Code:</b> {html.escape(subject.get('code', 'N/A'))}", header_style),
                Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}", header_style),
            ],
            [
                Paragraph(f"<b>Total Students:</b> {len(subject_students)}", header_style),
                Paragraph("", header_style),
            ],
        ]

        metadata_table = Table(metadata_data, colWidths=[doc.width / 2.0] * 2)
        metadata_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        elements.append(metadata_table)
        elements.append(Spacer(1, 20))

        table_data = [["Name", "Roll Number", "Academic Year"]]

        for s in subject_students:
            student_id_str = str(s["student_id"])
            student_profile = students_map.get(student_id_str, {})
            user = users_map.get(student_id_str, {})

            name = html.escape(user.get("name", "Unknown"))
            roll_no = html.escape(str(student_profile.get("roll_number", "N/A")))
            year = html.escape(str(student_profile.get("year", "N/A")))

            table_data.append([name, roll_no, year])

        if len(table_data) > 1:
            col_widths = [doc.width * 0.50, doc.width * 0.25, doc.width * 0.25]
            roster_table = Table(table_data, colWidths=col_widths, repeatRows=1)
            roster_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 11),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("TOPPADDING", (0, 0), (-1, 0), 10),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                        ("TEXTCOLOR", (0, 1), (-1, -1), colors.black),
                        ("ALIGN", (0, 1), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                        ("FONTSIZE", (0, 1), (-1, -1), 10),
                        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
                        ("TOPPADDING", (0, 1), (-1, -1), 6),
                        ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e5e7eb")),
                        ("LINEBELOW", (0, 0), (-1, 0), 2, colors.HexColor("#1e40af")),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
                        ("ALIGN", (0, 1), (0, -1), "LEFT"),
                    ]
                )
            )
            elements.append(roster_table)
        else:
            no_data_style = ParagraphStyle(
                "NoData",
                parent=styles["Normal"],
                fontSize=12,
                alignment=TA_CENTER,
                textColor=colors.gray,
                spaceBefore=40,
            )
            elements.append(Paragraph("No verified students found for this subject.", no_data_style))

        doc.build(
            elements,
            onFirstPage=lambda c, d: _add_page_footer(c, d, school_name),
            onLaterPages=lambda c, d: _add_page_footer(c, d, school_name),
        )

        buffer.seek(0)
        safe_name = _safe_filename(subject.get("name", "subject"))
        filename = f"student_roster_{safe_name}_{datetime.now().strftime('%Y%m%d')}.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    else:
        subjects_cursor = db.subjects.find({"professor_ids": teacher_id})
        subjects = await subjects_cursor.to_list(length=None)

        if not subjects:
            subjects_cursor = db.classes.find({"teacher_id": teacher_id})
            subjects = await subjects_cursor.to_list(length=None)

        if not subjects:
            raise HTTPException(status_code=404, detail="No subjects found")

        metadata_data = [
            [
                Paragraph(f"<b>Teacher:</b> {html.escape(teacher_name)}", header_style),
                Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}", header_style),
            ],
            [
                Paragraph(f"<b>Total Subjects:</b> {len(subjects)}", header_style),
                Paragraph("", header_style),
            ],
        ]

        metadata_table = Table(metadata_data, colWidths=[doc.width / 2.0] * 2)
        metadata_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        elements.append(metadata_table)
        elements.append(Spacer(1, 20))

        for subject in subjects:
            subject_name = subject.get("name", "Unknown Subject")
            subject_code = subject.get("code", "N/A")

            subject_title_style = ParagraphStyle(
                "SubjectTitle",
                parent=styles["Heading2"],
                fontSize=14,
                textColor=colors.HexColor("#1e40af"),
                spaceAfter=10,
                fontName="Helvetica-Bold",
            )
            elements.append(Paragraph(f"{html.escape(subject_name)} ({html.escape(subject_code)})", subject_title_style))

            subject_students = [s for s in subject.get("students", []) if s.get("verified", False)]
            student_user_ids = [s["student_id"] for s in subject_students]

            students_cursor = db.students.find({"userId": {"$in": student_user_ids}})
            users_cursor = db.users.find({"_id": {"$in": student_user_ids}})

            students_map = {str(s["userId"]): s async for s in students_cursor}
            users_map = {str(u["_id"]): u async for u in users_cursor}

            table_data = [["Name", "Roll Number", "Academic Year"]]

            for s in subject_students:
                student_id_str = str(s["student_id"])
                student_profile = students_map.get(student_id_str, {})
                user = users_map.get(student_id_str, {})

                name = html.escape(user.get("name", "Unknown"))
                roll_no = html.escape(str(student_profile.get("roll_number", "N/A")))
                year = html.escape(str(student_profile.get("year", "N/A")))

                table_data.append([name, roll_no, year])

            if len(table_data) > 1:
                col_widths = [doc.width * 0.50, doc.width * 0.25, doc.width * 0.25]
                roster_table = Table(table_data, colWidths=col_widths, repeatRows=1)
                roster_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("FONTSIZE", (0, 0), (-1, 0), 11),
                            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                            ("TOPPADDING", (0, 0), (-1, 0), 10),
                            ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                            ("TEXTCOLOR", (0, 1), (-1, -1), colors.black),
                            ("ALIGN", (0, 1), (-1, -1), "CENTER"),
                            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                            ("FONTSIZE", (0, 1), (-1, -1), 10),
                            ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
                            ("TOPPADDING", (0, 1), (-1, -1), 6),
                            ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e5e7eb")),
                            ("LINEBELOW", (0, 0), (-1, 0), 2, colors.HexColor("#1e40af")),
                            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
                            ("ALIGN", (0, 1), (0, -1), "LEFT"),
                        ]
                    )
                )
                elements.append(roster_table)
            else:
                no_data_style = ParagraphStyle(
                    "NoData",
                    parent=styles["Normal"],
                    fontSize=10,
                    alignment=TA_CENTER,
                    textColor=colors.gray,
                    spaceBefore=10,
                    spaceAfter=10,
                )
                elements.append(Paragraph("No verified students in this subject.", no_data_style))

            elements.append(Spacer(1, 20))

        doc.build(
            elements,
            onFirstPage=lambda c, d: _add_page_footer(c, d, school_name),
            onLaterPages=lambda c, d: _add_page_footer(c, d, school_name),
        )

        buffer.seek(0)
        filename = f"student_roster_all_subjects_{datetime.now().strftime('%Y%m%d')}.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

