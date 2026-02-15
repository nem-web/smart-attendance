"""
Notification service for sending and logging emails.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict
from bson import ObjectId

from ..core.email import BrevoEmailService
from ..db.mongo import db
from ..schemas.notifications import EmailLogEntry

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for handling email notifications and logging."""

    @staticmethod
    async def log_email(
        notification_type: str,
        recipient_email: str,
        recipient_name: str,
        subject: str,
        status: str,
        sent_by: str,
        error_message: str = None,
        metadata: dict = None
    ) -> str:
        """
        Log email send attempt to database.

        Args:
            notification_type: Type of notification (absence, assignment, etc.)
            recipient_email: Student email
            recipient_name: Student name
            subject: Email subject
            status: sent or failed
            sent_by: Teacher ID who sent the email
            error_message: Error message if failed
            metadata: Additional metadata

        Returns:
            Email log ID
        """
        log_entry = {
            "notification_type": notification_type,
            "recipient_email": recipient_email,
            "recipient_name": recipient_name,
            "subject": subject,
            "status": status,
            "error_message": error_message,
            "sent_by": ObjectId(sent_by),
            "sent_at": datetime.now(timezone.utc),
            "metadata": metadata or {}
        }

        try:
            result = await db.email_logs.insert_one(log_entry)
            return str(result.inserted_id)
        except Exception as e:
            # Log the DB error but don't propagate to avoid aborting email sends
            logger.error(f"Failed to log email to database: {str(e)}")
            return None

    @staticmethod
    async def send_absence_notifications(
        student_emails: List[str],
        subject: str,
        date: str,
        teacher_name: str,
        teacher_id: str
    ) -> Dict:
        """Send absence notifications to multiple students."""
        results = {"total": len(student_emails), "sent": 0, "failed": 0, "details": []}

        for email in student_emails:
            # Get student details
            student = await db.students.find_one({"email": email})
            if not student:
                results["failed"] += 1
                results["details"].append({
                    "email": email,
                    "status": "failed",
                    "error": "Student not found"
                })
                # Log the failure
                await NotificationService.log_email(
                    notification_type="absence",
                    recipient_email=email,
                    recipient_name="Unknown",
                    subject=f"Absence Notification - {subject}",
                    status="failed",
                    sent_by=teacher_id,
                    error_message="Student not found",
                    metadata={"subject": subject, "date": date}
                )
                continue

            student_name = student.get("name", "Student")

            # Send email
            result = await BrevoEmailService.send_absence_notification(
                to_email=email,
                student_name=student_name,
                subject=subject,
                date=date,
                teacher_name=teacher_name
            )

            # Log the attempt
            await NotificationService.log_email(
                notification_type="absence",
                recipient_email=email,
                recipient_name=student_name,
                subject=f"Absence Notification - {subject}",
                status=result["status"],
                sent_by=teacher_id,
                error_message=result.get("error"),
                metadata={"subject": subject, "date": date}
            )

            if result["status"] == "sent":
                results["sent"] += 1
            else:
                results["failed"] += 1

            results["details"].append({
                "email": email,
                "status": result["status"],
                "error": result.get("error")
            })

        return results

    @staticmethod
    async def send_low_attendance_warnings(
        warnings: List[Dict],
        teacher_id: str
    ) -> Dict:
        """Send low attendance warnings to students."""
        results = {"total": len(warnings), "sent": 0, "failed": 0, "details": []}

        for warning in warnings:
            email = warning["student_email"]
            student_name = warning["student_name"]
            subject = warning["subject"]
            attendance_percentage = warning["attendance_percentage"]
            threshold = warning.get("threshold", 75)

            # Send email
            result = await BrevoEmailService.send_low_attendance_warning(
                to_email=email,
                student_name=student_name,
                subject=subject,
                attendance_percentage=attendance_percentage,
                threshold=threshold
            )

            # Log the attempt
            await NotificationService.log_email(
                notification_type="low_attendance",
                recipient_email=email,
                recipient_name=student_name,
                subject=f"Low Attendance Warning - {subject}",
                status=result["status"],
                sent_by=teacher_id,
                error_message=result.get("error"),
                metadata={
                    "subject": subject,
                    "attendance_percentage": attendance_percentage,
                    "threshold": threshold
                }
            )

            if result["status"] == "sent":
                results["sent"] += 1
            else:
                results["failed"] += 1

            results["details"].append({
                "email": email,
                "status": result["status"],
                "error": result.get("error")
            })

        return results

    @staticmethod
    async def send_assignment_reminders(
        student_emails: List[str],
        assignment_title: str,
        subject: str,
        due_date: str,
        teacher_name: str,
        teacher_id: str
    ) -> Dict:
        """Send assignment reminders to students."""
        results = {"total": len(student_emails), "sent": 0, "failed": 0, "details": []}

        for email in student_emails:
            # Get student details
            student = await db.students.find_one({"email": email})
            if not student:
                results["failed"] += 1
                results["details"].append({
                    "email": email,
                    "status": "failed",
                    "error": "Student not found"
                })
                # Log the failure
                await NotificationService.log_email(
                    notification_type="assignment",
                    recipient_email=email,
                    recipient_name="Unknown",
                    subject=f"Assignment Reminder - {assignment_title}",
                    status="failed",
                    sent_by=teacher_id,
                    error_message="Student not found",
                    metadata={
                        "assignment_title": assignment_title,
                        "subject": subject,
                        "due_date": due_date
                    }
                )
                continue

            student_name = student.get("name", "Student")

            # Send email
            result = await BrevoEmailService.send_assignment_reminder(
                to_email=email,
                student_name=student_name,
                assignment_title=assignment_title,
                subject=subject,
                due_date=due_date,
                teacher_name=teacher_name
            )

            # Log the attempt
            await NotificationService.log_email(
                notification_type="assignment",
                recipient_email=email,
                recipient_name=student_name,
                subject=f"Assignment Reminder - {assignment_title}",
                status=result["status"],
                sent_by=teacher_id,
                error_message=result.get("error"),
                metadata={
                    "assignment_title": assignment_title,
                    "subject": subject,
                    "due_date": due_date
                }
            )

            if result["status"] == "sent":
                results["sent"] += 1
            else:
                results["failed"] += 1

            results["details"].append({
                "email": email,
                "status": result["status"],
                "error": result.get("error")
            })

        return results

    @staticmethod
    async def send_exam_alerts(
        student_emails: List[str],
        exam_name: str,
        subject: str,
        exam_date: str,
        time: str,
        venue: str,
        teacher_id: str
    ) -> Dict:
        """Send exam alerts to students."""
        results = {"total": len(student_emails), "sent": 0, "failed": 0, "details": []}

        for email in student_emails:
            # Get student details
            student = await db.students.find_one({"email": email})
            if not student:
                results["failed"] += 1
                results["details"].append({
                    "email": email,
                    "status": "failed",
                    "error": "Student not found"
                })
                # Log the failure
                await NotificationService.log_email(
                    notification_type="exam",
                    recipient_email=email,
                    recipient_name="Unknown",
                    subject=f"Exam Alert - {exam_name}",
                    status="failed",
                    sent_by=teacher_id,
                    error_message="Student not found",
                    metadata={
                        "exam_name": exam_name,
                        "subject": subject,
                        "exam_date": exam_date,
                        "time": time,
                        "venue": venue
                    }
                )
                continue

            student_name = student.get("name", "Student")

            # Send email
            result = await BrevoEmailService.send_exam_alert(
                to_email=email,
                student_name=student_name,
                exam_name=exam_name,
                subject=subject,
                exam_date=exam_date,
                time=time,
                venue=venue
            )

            # Log the attempt
            await NotificationService.log_email(
                notification_type="exam",
                recipient_email=email,
                recipient_name=student_name,
                subject=f"Exam Alert - {exam_name}",
                status=result["status"],
                sent_by=teacher_id,
                error_message=result.get("error"),
                metadata={
                    "exam_name": exam_name,
                    "subject": subject,
                    "exam_date": exam_date,
                    "time": time,
                    "venue": venue
                }
            )

            if result["status"] == "sent":
                results["sent"] += 1
            else:
                results["failed"] += 1

            results["details"].append({
                "email": email,
                "status": result["status"],
                "error": result.get("error")
            })

        return results

    @staticmethod
    async def send_custom_messages(
        student_emails: List[str],
        message_title: str,
        message_body: str,
        teacher_name: str,
        teacher_id: str
    ) -> Dict:
        """Send custom messages to students."""
        results = {"total": len(student_emails), "sent": 0, "failed": 0, "details": []}

        for email in student_emails:
            # Get student details
            student = await db.students.find_one({"email": email})
            if not student:
                results["failed"] += 1
                results["details"].append({
                    "email": email,
                    "status": "failed",
                    "error": "Student not found"
                })
                # Log the failure
                await NotificationService.log_email(
                    notification_type="custom",
                    recipient_email=email,
                    recipient_name="Unknown",
                    subject=message_title,
                    status="failed",
                    sent_by=teacher_id,
                    error_message="Student not found",
                    metadata={
                        "message_title": message_title,
                        "message_body": message_body[:200]  # Truncate for storage
                    }
                )
                continue

            student_name = student.get("name", "Student")

            # Send email
            result = await BrevoEmailService.send_custom_message(
                to_email=email,
                student_name=student_name,
                message_title=message_title,
                message_body=message_body,
                teacher_name=teacher_name
            )

            # Log the attempt
            await NotificationService.log_email(
                notification_type="custom",
                recipient_email=email,
                recipient_name=student_name,
                subject=message_title,
                status=result["status"],
                sent_by=teacher_id,
                error_message=result.get("error"),
                metadata={"message_body": message_body[:200]}  # Store truncated message
            )

            if result["status"] == "sent":
                results["sent"] += 1
            else:
                results["failed"] += 1

            results["details"].append({
                "email": email,
                "status": result["status"],
                "error": result.get("error")
            })

        return results

    @staticmethod
    async def get_email_stats(teacher_id: str, days: int = 30) -> Dict:
        """Get email statistics for a teacher."""
        since_date = datetime.now(timezone.utc) - timedelta(days=days)

        # Aggregate statistics
        pipeline = [
            {
                "$match": {
                    "sent_by": ObjectId(teacher_id),
                    "sent_at": {"$gte": since_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "status": "$status",
                        "type": "$notification_type"
                    },
                    "count": {"$sum": 1}
                }
            }
        ]

        stats_result = await db.email_logs.aggregate(pipeline).to_list(length=None)

        total_sent = 0
        total_failed = 0
        sent_by_type = {}

        for stat in stats_result:
            count = stat["count"]
            status = stat["_id"]["status"]
            ntype = stat["_id"]["type"]

            if status == "sent":
                total_sent += count
            else:
                total_failed += count

            if ntype not in sent_by_type:
                sent_by_type[ntype] = {"sent": 0, "failed": 0}

            # Use .get() to safely handle unexpected status values
            if status in ["sent", "failed"]:
                sent_by_type[ntype][status] += count

        # Get recent logs within the time window
        recent_logs = await db.email_logs.find(
            {
                "sent_by": ObjectId(teacher_id),
                "sent_at": {"$gte": since_date}
            },
            {"_id": 0}
        ).sort("sent_at", -1).limit(10).to_list(length=10)

        # Convert ObjectId to string for JSON serialization
        for log in recent_logs:
            if "sent_by" in log:
                log["sent_by"] = str(log["sent_by"])

        return {
            "total_sent": total_sent,
            "total_failed": total_failed,
            "sent_by_type": sent_by_type,
            "recent_logs": recent_logs
        }

    @staticmethod
    async def check_duplicate_send(
        teacher_id: str,
        notification_type: str,
        recipient_email: str,
        within_hours: int = 1
    ) -> bool:
        """
        Check if a similar email was recently sent to prevent spam.

        Args:
            teacher_id: ID of the teacher
            notification_type: Type of notification
            recipient_email: Student email
            within_hours: Time window to check for duplicates

        Returns:
            True if duplicate found, False otherwise
        """
        since_time = datetime.now(timezone.utc) - timedelta(hours=within_hours)

        recent_send = await db.email_logs.find_one({
            "sent_by": ObjectId(teacher_id),
            "notification_type": notification_type,
            "recipient_email": recipient_email,
            "status": "sent",
            "sent_at": {"$gte": since_time}
        })

        return recent_send is not None
