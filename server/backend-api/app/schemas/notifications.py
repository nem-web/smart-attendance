"""
Schemas for email notifications system.
"""

from datetime import datetime, timezone
from typing import List, Optional, Literal
from pydantic import BaseModel, EmailStr, Field


class SendAbsenceNotificationRequest(BaseModel):
    """Request to send absence notification."""
    student_emails: List[EmailStr] = Field(..., max_length=200)
    subject: str
    date: str
    teacher_name: str


class SendLowAttendanceWarningRequest(BaseModel):
    """Request to send low attendance warning."""
    student_email: EmailStr
    student_name: str
    subject: str
    attendance_percentage: float
    threshold: int = 75


class SendAssignmentReminderRequest(BaseModel):
    """Request to send assignment reminder."""
    student_emails: List[EmailStr] = Field(..., max_length=200)
    assignment_title: str
    subject: str
    due_date: str
    teacher_name: str


class SendExamAlertRequest(BaseModel):
    """Request to send exam alert."""
    student_emails: List[EmailStr] = Field(..., max_length=200)
    exam_name: str
    subject: str
    exam_date: str
    time: str
    venue: str


class SendCustomMessageRequest(BaseModel):
    """Request to send custom message."""
    student_emails: List[EmailStr] = Field(..., max_length=200)
    message_title: str
    message_body: str = Field(..., min_length=1, max_length=2000)
    teacher_name: str


class EmailLogEntry(BaseModel):
    """Schema for email log entry."""
    email_id: Optional[str] = None
    notification_type: Literal[
        "absence",
        "low_attendance",
        "assignment",
        "exam",
        "custom"
    ]
    recipient_email: EmailStr
    recipient_name: str
    subject: str
    status: Literal["sent", "failed"]
    error_message: Optional[str] = None
    sent_by: str  # Teacher ID
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Optional[dict] = None


class BulkEmailResponse(BaseModel):
    """Response for bulk email sending."""
    total: int
    sent: int
    failed: int
    details: List[dict]


class EmailStatsResponse(BaseModel):
    """Email statistics for teacher."""
    total_sent: int
    total_failed: int
    sent_by_type: dict
    recent_logs: List[dict]
