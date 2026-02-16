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
from reportlab.lib.pagesizes import A4, landscape
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
    sanitized = re.sub(r"[^\w\-]", "_", name)
    sanitized = re.sub(r"_+", "_", sanitized).strip("_")
    return sanitized[:100] or "subject"


def _sanitize_csv_value(value: str) -> str:
    """Prevent CSV injection by prefixing dangerous characters with a single quote.

    Spreadsheet applications may interpret cells starting with =, +, -, or @
    as formulas. Prefixing with a single quote neutralises this.
    """
    if isinstance(value, str) and value and value[0] in ("=", "+", "-", "@"):
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
        db.attendance.find(query).sort("date", -1).to_list(length=MAX_RECORDS)
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
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.gray)

    # Page number on the right
    page_num = canvas.getPageNumber()
    canvas.drawRightString(doc.pagesize[0] - 30, 30, f"Page {page_num}")

    # School name + confidential on the left
    canvas.drawString(30, 30, f"{school_name} - Confidential")

    # Generated timestamp in the center
    canvas.setFont("Helvetica", 7)
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
    """Export attendance report as a professional PDF document."""
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

        # --- Query attendance + students ---
        (
            attendance_records,
            students,
            was_truncated,
        ) = await _get_attendance_and_students(subject_id, start_date, end_date)

        # --- Create PDF buffer ---
        buffer = io.BytesIO()

        # Landscape A4 for wider tables
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            rightMargin=30,
            leftMargin=30,
            topMargin=50,
            bottomMargin=50,
        )

        elements = []

        # --- Styles ---
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

        # --- Header Section ---
        elements.append(Paragraph(html.escape(school_name), title_style))
        elements.append(Spacer(1, 10))

        # Report metadata (2-column layout)
        date_range_str = f"{start_date or 'All Time'} to {end_date or 'Present'}"
        safe_teacher = html.escape(teacher_name)
        safe_subject = html.escape(subject.get("name", "Unknown"))
        safe_code = html.escape(subject.get("code", "N/A"))

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
                    f"<b>Total Records:</b> {len(attendance_records)}",
                    header_style,
                ),
                Paragraph(f"<b>Subject Code:</b> {safe_code}", header_style),
            ],
        ]

        if was_truncated:
            metadata_data.append(
                [
                    Paragraph(
                        f"<b><font color='red'>Note:</font></b> "
                        f"Results truncated to {MAX_RECORDS:,} records.",
                        header_style,
                    ),
                    Paragraph("", header_style),
                ]
            )

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

        # --- Attendance Data Table ---
        table_data = [["Date", "Student Name", "Roll Number", "Status", "Time"]]

        for record in attendance_records:
            student_id_str = str(record.get("student_id", ""))
            student = students.get(student_id_str, {})

            date_val = record.get("date", "N/A")
            date_str = (
                date_val.strftime("%Y-%m-%d")
                if isinstance(date_val, datetime)
                else str(date_val)
            )
            name = html.escape(student.get("name", "Unknown"))
            roll = html.escape(
                str(student.get("roll", student.get("roll_number", "N/A")))
            )
            status = record.get("status", "unknown").capitalize()
            time_str = record.get("time", "N/A")

            # Color-coded status
            status_colors = {
                "Present": "green",
                "Absent": "red",
                "Late": "orange",
                "Excused": "blue",
            }
            status_color = status_colors.get(status, "black")

            table_data.append(
                [
                    date_str,
                    name,
                    roll,
                    Paragraph(
                        f"<font color='{status_color}'>"
                        f"<b>{html.escape(status)}</b></font>",
                        styles["Normal"],
                    ),
                    time_str,
                ]
            )

        if len(table_data) > 1:
            # Calculate column widths proportionally
            col_widths = [
                doc.width * 0.15,  # Date
                doc.width * 0.30,  # Name
                doc.width * 0.15,  # Roll
                doc.width * 0.20,  # Status
                doc.width * 0.20,  # Time
            ]

            attendance_table = Table(table_data, colWidths=col_widths, repeatRows=1)
            attendance_table.setStyle(
                TableStyle(
                    [
                        # Header row
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 11),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("TOPPADDING", (0, 0), (-1, 0), 10),
                        # Body rows
                        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                        ("TEXTCOLOR", (0, 1), (-1, -1), colors.black),
                        ("ALIGN", (0, 1), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                        ("FONTSIZE", (0, 1), (-1, -1), 10),
                        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
                        ("TOPPADDING", (0, 1), (-1, -1), 6),
                        # Grid
                        ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e5e7eb")),
                        ("LINEBELOW", (0, 0), (-1, 0), 2, colors.HexColor("#1e40af")),
                        # Alternating row backgrounds
                        (
                            "ROWBACKGROUNDS",
                            (0, 1),
                            (-1, -1),
                            [colors.white, colors.HexColor("#f9fafb")],
                        ),
                        # Column alignments
                        ("ALIGN", (1, 1), (1, -1), "LEFT"),  # Name left-aligned
                    ]
                )
            )

            elements.append(attendance_table)
        else:
            no_data_style = ParagraphStyle(
                "NoData",
                parent=styles["Normal"],
                fontSize=12,
                alignment=TA_CENTER,
                textColor=colors.gray,
                spaceBefore=40,
            )
            elements.append(
                Paragraph(
                    "No attendance records found for the selected criteria.",
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

        safe_name = _safe_filename(subject.get("name", "subject"))
        filename = (
            f"attendance_report_{safe_name}_{datetime.now().strftime('%Y%m%d')}.pdf"
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
        raise HTTPException(status_code=500, detail="Failed to generate PDF report")


@router.get("/export/csv")
async def export_attendance_csv(
    subject_id: str = Query(..., description="Subject ID"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_teacher: dict = Depends(get_current_teacher),
):
    """Export attendance report as a CSV file.

    Generates a detailed log of attendance events corresponding to the date filters.
    """
    try:
        # --- Validate subject & teacher access ---
        subject, teacher_id = await _get_subject_and_validate(
            subject_id, current_teacher
        )

        # --- Query attendance + students ---
        (
            attendance_records,
            students,
            was_truncated,
        ) = await _get_attendance_and_students(subject_id, start_date, end_date)

        # --- Build CSV in memory ---
        string_buffer = io.StringIO()
        writer = csv.writer(string_buffer)

        # Header row
        writer.writerow(["Date", "Student Name", "Roll Number", "Status", "Time"])

        for record in attendance_records:
            student_id_str = str(record.get("student_id", ""))
            student = students.get(student_id_str, {})

            date_val = record.get("date", "N/A")
            date_str = (
                date_val.strftime("%Y-%m-%d")
                if isinstance(date_val, datetime)
                else str(date_val)
            )

            writer.writerow(
                [
                    _sanitize_csv_value(date_str),
                    _sanitize_csv_value(student.get("name", "Unknown")),
                    _sanitize_csv_value(
                        str(student.get("roll", student.get("roll_number", "N/A")))
                    ),
                    _sanitize_csv_value(record.get("status", "unknown").capitalize()),
                    _sanitize_csv_value(str(record.get("time", "N/A"))),
                ]
            )

        # Convert to bytes for streaming
        csv_bytes = io.BytesIO(string_buffer.getvalue().encode("utf-8"))
        csv_bytes.seek(0)

        safe_name = _safe_filename(subject.get("name", "subject"))
        filename = (
            f"attendance_report_{safe_name}_{datetime.now().strftime('%Y%m%d')}.csv"
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
        raise HTTPException(status_code=500, detail="Failed to generate CSV report")
