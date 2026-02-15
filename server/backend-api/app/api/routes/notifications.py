"""
API routes for email notifications.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict
import logging

from ...schemas.notifications import (
    SendAbsenceNotificationRequest,
    SendLowAttendanceWarningRequest,
    SendAssignmentReminderRequest,
    SendExamAlertRequest,
    SendCustomMessageRequest,
    BulkEmailResponse,
    EmailStatsResponse,
)
from ...services.notification_service import NotificationService
from ...core.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/absence", response_model=BulkEmailResponse)
async def send_absence_notifications(
    payload: SendAbsenceNotificationRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Send absence notifications to students.
    
    Only teachers can send notifications.
    """
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can send notifications")

    teacher_id = str(current_user["id"])
    teacher_name = payload.teacher_name or current_user.get("name", "Your Teacher")

    # Send notifications
    result = await NotificationService.send_absence_notifications(
        student_emails=payload.student_emails,
        subject=payload.subject,
        date=payload.date,
        teacher_name=teacher_name,
        teacher_id=teacher_id
    )

    return BulkEmailResponse(**result)


@router.post("/low-attendance", response_model=BulkEmailResponse)
async def send_low_attendance_warnings(
    warnings: list[SendLowAttendanceWarningRequest],
    current_user: dict = Depends(get_current_user),
):
    """
    Send low attendance warnings to students.
    
    Only teachers can send notifications.
    """
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can send notifications")

    # Validate warnings list size to prevent DoS
    if len(warnings) > 200:
        raise HTTPException(
            status_code=400,
            detail="Cannot send more than 200 warnings at once"
        )

    teacher_id = str(current_user["id"])

    # Convert warnings to dict format
    warnings_data = [
        {
            "student_email": w.student_email,
            "student_name": w.student_name,
            "subject": w.subject,
            "attendance_percentage": w.attendance_percentage,
            "threshold": w.threshold,
        }
        for w in warnings
    ]

    # Send warnings
    result = await NotificationService.send_low_attendance_warnings(
        warnings=warnings_data,
        teacher_id=teacher_id
    )

    return BulkEmailResponse(**result)


@router.post("/assignment", response_model=BulkEmailResponse)
async def send_assignment_reminders(
    payload: SendAssignmentReminderRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Send assignment reminders to students.
    
    Only teachers can send notifications.
    """
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can send notifications")

    teacher_id = str(current_user["id"])
    teacher_name = payload.teacher_name or current_user.get("name", "Your Teacher")

    # Send reminders
    result = await NotificationService.send_assignment_reminders(
        student_emails=payload.student_emails,
        assignment_title=payload.assignment_title,
        subject=payload.subject,
        due_date=payload.due_date,
        teacher_name=teacher_name,
        teacher_id=teacher_id
    )

    return BulkEmailResponse(**result)


@router.post("/exam", response_model=BulkEmailResponse)
async def send_exam_alerts(
    payload: SendExamAlertRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Send exam alerts to students.
    
    Only teachers can send notifications.
    """
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can send notifications")

    teacher_id = str(current_user["id"])

    # Send alerts
    result = await NotificationService.send_exam_alerts(
        student_emails=payload.student_emails,
        exam_name=payload.exam_name,
        subject=payload.subject,
        exam_date=payload.exam_date,
        time=payload.time,
        venue=payload.venue,
        teacher_id=teacher_id
    )

    return BulkEmailResponse(**result)


@router.post("/custom", response_model=BulkEmailResponse)
async def send_custom_message(
    payload: SendCustomMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Send custom message to students.
    
    Only teachers can send notifications.
    """
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can send notifications")

    teacher_id = str(current_user["id"])
    teacher_name = payload.teacher_name or current_user.get("name", "Your Teacher")

    # Send messages
    result = await NotificationService.send_custom_messages(
        student_emails=payload.student_emails,
        message_title=payload.message_title,
        message_body=payload.message_body,
        teacher_name=teacher_name,
        teacher_id=teacher_id
    )

    return BulkEmailResponse(**result)


@router.get("/stats", response_model=EmailStatsResponse)
async def get_email_statistics(
    days: int = Query(default=30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
):
    """
    Get email statistics for the current teacher.
    
    Returns statistics for the last `days` days (default: 30).
    """
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view statistics")

    teacher_id = str(current_user["id"])
    
    stats = await NotificationService.get_email_stats(teacher_id, days)
    
    return EmailStatsResponse(**stats)


@router.get("/check-duplicate")
async def check_duplicate_email(
    notification_type: str,
    recipient_email: str,
    within_hours: int = Query(1, ge=1, le=168),  # 1 hour to 1 week
    current_user: dict = Depends(get_current_user),
):
    """
    Check if a similar email was recently sent to prevent spam.
    """
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can check duplicates")

    teacher_id = str(current_user["id"])
    
    is_duplicate = await NotificationService.check_duplicate_send(
        teacher_id=teacher_id,
        notification_type=notification_type,
        recipient_email=recipient_email,
        within_hours=within_hours
    )
    
    return {"is_duplicate": is_duplicate}
