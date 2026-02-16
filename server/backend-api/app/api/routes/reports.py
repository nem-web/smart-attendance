"""
Reports Export Routes - PDF & CSV Export for Attendance Reports
"""

import html
import io
import csv
import re
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from bson import ObjectId
from bson.errors import InvalidId
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER

from app.db.mongo import db
from app.api.deps import get_current_teacher

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["Reports"])

# Maximum number of attendance records to load into memory at once
MAX_RECORDS = 10000


def _safe_filename(name: str) -> str:
    """Sanitize a string for use in a Content-Disposition filename.

    Strips non-alphanumeric characters (except underscores and hyphens),
    collapses duplicate underscores, and limits length.
    """
    sanitized = re.sub(r'[^\w\-]', '_', name)
    sanitized = re.sub(r'_+', '_', sanitized).strip('_')
    return sanitized[:100] or 'subject'


def _sanitize_csv_value(value: str) -> str:
    """Prevent CSV injection by prefixing dangerous characters with a single quote.

    Spreadsheet applications may interpret cells starting with =, +, -, or @
    as formulas. Prefixing with a single quote neutralises this.
    """
    if isinstance(value, str) and value and value[0] in ('=', '+', '-', '@'):
        return f"'{value}"
    return value


async def _get_subject_and_validate(subject_id: str, current_teacher: dict):
    """Fetch subject from DB and verify the teacher has access.

    Returns:
        tuple: (subject_doc, teacher_id)

    Raises:
        HTTPException: On invalid ID, missing subject, or access denial.
    """
    try:
        oid = ObjectId(subject_id)
    except (InvalidId, Exception):
        raise HTTPException(status_code=400, detail="Invalid subject ID format")

    subject = await db.subjects.find_one({"_id": oid})

    # Fallback: try "classes" collection if "subjects" returned nothing
    if not subject:
        subject = await db.classes.find_one({"_id": oid})

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    teacher_id = current_teacher["id"]
    professor_ids = [str(pid) for pid in subject.get("professor_ids", [])]

    # Also check "teacher_id" field in case the schema uses that instead
    subject_teacher = str(subject.get("teacher_id", ""))

    if str(teacher_id) not in professor_ids and str(teacher_id) != subject_teacher:
        raise HTTPException(status_code=403, detail="Access denied for this subject")

    return subject, teacher_id


async def _get_attendance_and_students(
    subject_id: str,
    start_date: Optional[str],
    end_date: Optional[str],
):
    """Query attendance records and build a student lookup dict.

    Returns:
        tuple: (attendance_records, students_dict, was_truncated)
    """
    query = {"subject_id": ObjectId(subject_id)}

    # Convert string dates to datetime objects for proper MongoDB comparison.
    date_filter = {}
    if start_date:
        try:
            date_filter["$gte"] = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format for start_date. Expected YYYY-MM-DD.",
            )
    if end_date:
        try:
            # Set to end of day so the entire last day is included
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            date_filter["$lte"] = end_dt.replace(hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format for end_date. Expected YYYY-MM-DD.",
            )
    if date_filter:
        query["date"] = date_filter

    attendance_records = await (
        db.attendance.find(query)
        .sort("date", -1)
        .to_list(length=MAX_RECORDS)
    )

    was_truncated = len(attendance_records) >= MAX_RECORDS

    # Safely collect student IDs (skip records missing the field)
    student_ids = []
    for record in attendance_records:
        sid = record.get("student_id")
        if sid:
            student_ids.append(sid)

    # Deduplicate before querying
    unique_ids = list(set(str(sid) for sid in student_ids))
    object_ids = []
    for sid in unique_ids:
        try:
            object_ids.append(ObjectId(sid))
        except (InvalidId, Exception):
            pass

    students = {}
    if object_ids:
        students_cursor = db.users.find({"_id": {"$in": object_ids}})
        students = {
            str(s["_id"]): s for s in await students_cursor.to_list(length=None)
        }

    return attendance_records, students, was_truncated


def _add_page_footer(canvas, doc, school_name):
    """Draw page number, timestamp, and confidentiality note on every page."""
    canvas.saveState()
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(colors.gray)

    # Page number on the right
    page_num = canvas.getPageNumber()
    canvas.drawRightString(doc.pagesize[0] - 30, 30, f"Page {page_num}")

    # School name + confidential on the left
    canvas.drawString(30, 30, f"{school_name} - Confidential")

    # Generated timestamp in the center
    canvas.setFont('Helvetica', 7)
    timestamp = f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    canvas.drawCentredString(doc.pagesize[0] / 2, 30, timestamp)

    canvas.restoreState()


@router.get("/export/pdf")
async def export_attendance_pdf(
    subject_id: str = Query(..., description="Subject ID"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_teacher: dict = Depends(get_current_teacher),
):
    """Export attendance report as a professional PDF document.
    
    Generates aggregated statistics for verified students.
    """
    try:
        # --- Validate subject & teacher access ---
        subject, teacher_id = await _get_subject_and_validate(
            subject_id, current_teacher
        )

        # --- Get teacher name ---
        teacher = await db.users.find_one({"_id": ObjectId(teacher_id)})
        teacher_name = (
            teacher.get("name", "Unknown Teacher") if teacher else "Unknown Teacher"
        )
        school_name = "Smart Attendance System"

        # --- Get students with their attendance data from subject ---
        subject_students = subject.get("students", [])
        
        # Get student user IDs
        student_user_ids = [s["student_id"] for s in subject_students]
        
        # Fetch student profiles and users
        students_cursor = db.students.find({"userId": {"$in": student_user_ids}})
        users_cursor = db.users.find({"_id": {"$in": student_user_ids}})
        
        students_map = {str(s["userId"]): s async for s in students_cursor}
        users_map = {str(u["_id"]): u async for u in users_cursor}

        # --- Create PDF buffer ---
        buffer = io.BytesIO()

        # Portrait A4 is sufficient for aggregated data
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=30,
            leftMargin=30,
            topMargin=50,
            bottomMargin=50,
        )

        elements = []

        # --- Styles ---
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
        )

        header_style = ParagraphStyle(
            'HeaderStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#374151'),
            spaceAfter=6,
            fontName='Helvetica',
        )

        # --- Header Section ---
        elements.append(Paragraph(html.escape(school_name), title_style))
        elements.append(Spacer(1, 10))

        # Report metadata (2-column layout)
        date_range_str = f"{start_date or 'All Time'} to {end_date or 'Present'}"
        safe_teacher = html.escape(teacher_name)
        safe_subject = html.escape(subject.get('name', 'Unknown'))
        safe_code = html.escape(subject.get('code', 'N/A'))

        metadata_data = [
            [
                Paragraph(f"<b>Teacher:</b> {safe_teacher}", header_style),
                Paragraph(f"<b>Subject:</b> {safe_subject}", header_style),
            ],
            [
                Paragraph(
                    f"<b>Date Range:</b> {html.escape(date_range_str)}",
                    header_style,
                ),
                Paragraph(
                    f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    header_style,
                ),
            ],
            [
                Paragraph(
                    f"<b>Total Students:</b> "
                    f"{len([s for s in subject_students if s.get('verified', False)])}",
                    header_style,
                ),
                Paragraph(f"<b>Subject Code:</b> {safe_code}", header_style),
            ],
        ]

        metadata_table = Table(metadata_data, colWidths=[doc.width / 2.0] * 2)
        metadata_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(metadata_table)
        elements.append(Spacer(1, 20))

        # --- Attendance Statistics Table ---
        table_data = [[
            "Student Name", "Roll No", "Total Classes",
            "Attended", "Percentage", "Status"
        ]]

        # Default threshold for status calculation
        threshold = 75

        for s in subject_students:
            # Only include verified students
            if not s.get("verified", False):
                continue
                
            student_id_str = str(s["student_id"])
            student_profile = students_map.get(student_id_str, {})
            user = users_map.get(student_id_str, {})
            
            # Get attendance counts
            attendance = s.get("attendance", {})
            present = attendance.get("present", 0)
            absent = attendance.get("absent", 0)
            total = present + absent
            
            # Calculate percentage
            percentage = 0 if total == 0 else round((present / total) * 100, 1)
            
            # Determine status and color
            if percentage >= threshold:
                status = "Good"
                status_color = "green"
            elif percentage >= threshold - 10:
                status = "Warning"
                status_color = "orange"
            else:
                status = "At Risk"
                status_color = "red"
            
            # Get student info
            name = html.escape(user.get("name", "Unknown"))
            roll_no = html.escape(str(student_profile.get("roll_number", "N/A")))

            table_data.append([
                name,
                roll_no,
                str(total),
                str(present),
                f"{percentage}%",
                Paragraph(
                    f"<font color='{status_color}'><b>{html.escape(status)}</b></font>",
                    styles['Normal'],
                ),
            ])

        if len(table_data) > 1:
            # Calculate column widths proportionally
            col_widths = [
                doc.width * 0.30,  # Name
                doc.width * 0.15,  # Roll
                doc.width * 0.15,  # Total
                doc.width * 0.15,  # Attended
                doc.width * 0.12,  # Percentage
                doc.width * 0.13,  # Status
            ]

            attendance_table = Table(
                table_data, colWidths=col_widths, repeatRows=1
            )
            attendance_table.setStyle(TableStyle([
                # Header row
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 10),

                # Body rows
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
                ('TOPPADDING', (0, 1), (-1, -1), 6),

                # Grid
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
                ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#1e40af')),

                # Alternating row backgrounds
                ('ROWBACKGROUNDS', (0, 1), (-1, -1),
                 [colors.white, colors.HexColor('#f9fafb')]),

                # Column alignments
                ('ALIGN', (0, 1), (0, -1), 'LEFT'),  # Name left-aligned
            ]))

            elements.append(attendance_table)
        else:
            no_data_style = ParagraphStyle(
                'NoData',
                parent=styles['Normal'],
                fontSize=12,
                alignment=TA_CENTER,
                textColor=colors.gray,
                spaceBefore=40,
            )
            elements.append(
                Paragraph(
                    "No verified students found for this subject.",
                    no_data_style,
                )
            )

        # --- Build PDF with footer ---
        doc.build(
            elements,
            onFirstPage=lambda c, d: _add_page_footer(c, d, school_name),
            onLaterPages=lambda c, d: _add_page_footer(c, d, school_name),
        )

        buffer.seek(0)

        safe_name = _safe_filename(subject.get('name', 'subject'))
        filename = (
            f"attendance_report_{safe_name}_"
            f"{datetime.now().strftime('%Y%m%d')}.pdf"
        )

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to generate PDF report")
        raise HTTPException(
            status_code=500, detail="Failed to generate PDF report"
        )


@router.get("/export/csv")
async def export_attendance_csv(
    subject_id: str = Query(..., description="Subject ID"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_teacher: dict = Depends(get_current_teacher),
):
    """Export attendance report as a CSV file.
    
    Generates aggregated attendance statistics per student.
    """
    try:
        # --- Validate subject & teacher access ---
        subject, teacher_id = await _get_subject_and_validate(
            subject_id, current_teacher
        )

        # --- Get students with their attendance data from subject ---
        subject_students = subject.get("students", [])
        
        # Get student user IDs
        student_user_ids = [s["student_id"] for s in subject_students]
        
        # Fetch student profiles and users
        students_cursor = db.students.find({"userId": {"$in": student_user_ids}})
        users_cursor = db.users.find({"_id": {"$in": student_user_ids}})
        
        students_map = {str(s["userId"]): s async for s in students_cursor}
        users_map = {str(u["_id"]): u async for u in users_cursor}

        # --- Build CSV in memory ---
        string_buffer = io.StringIO()
        writer = csv.writer(string_buffer)

        # Header row matching what the frontend displays
        writer.writerow([
            "Student Name", "Roll No", "Total Classes",
            "Attended", "Percentage", "Status"
        ])

        # Default threshold for status calculation
        threshold = 75

        for s in subject_students:
            # Only include verified students
            if not s.get("verified", False):
                continue
                
            student_id_str = str(s["student_id"])
            student_profile = students_map.get(student_id_str, {})
            user = users_map.get(student_id_str, {})
            
            # Get attendance counts
            attendance = s.get("attendance", {})
            present = attendance.get("present", 0)
            absent = attendance.get("absent", 0)
            total = present + absent
            
            # Calculate percentage
            percentage = 0 if total == 0 else round((present / total) * 100, 1)
            
            # Determine status
            if percentage >= threshold:
                status = "Good"
            elif percentage >= threshold - 10:
                status = "Warning"
            else:
                status = "At Risk"
            
            # Get student info
            name = user.get("name", "Unknown")
            roll_no = student_profile.get("roll_number", "N/A")
            
            writer.writerow([
                _sanitize_csv_value(name),
                _sanitize_csv_value(str(roll_no)),
                _sanitize_csv_value(str(total)),
                _sanitize_csv_value(str(present)),
                _sanitize_csv_value(f"{percentage}%"),
                _sanitize_csv_value(status),
            ])

        # Convert to bytes for streaming
        csv_bytes = io.BytesIO(string_buffer.getvalue().encode("utf-8"))
        csv_bytes.seek(0)

        safe_name = _safe_filename(subject.get('name', 'subject'))
        filename = (
            f"attendance_report_{safe_name}_"
            f"{datetime.now().strftime('%Y%m%d')}.csv"
        )

        return StreamingResponse(
            csv_bytes,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to generate CSV report")
        raise HTTPException(
            status_code=500, detail="Failed to generate CSV report"
        )