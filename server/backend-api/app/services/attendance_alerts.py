import logging

from app.db.mongo import db
from app.core.email import BrevoEmailService

logger = logging.getLogger(__name__)


async def send_low_attendance_for_teacher(teacher_id, teacher_doc):
    """
    Send low attendance warnings for a single teacher's subjects.
    Returns the number of emails sent.
    """
    emails_sent_count = 0

    subjects_cursor = db.subjects.find({"professor_ids": teacher_id})
    subjects = await subjects_cursor.to_list(length=None)

    for subject in subjects:
        subject_name = subject.get("name", "Unknown Subject")
        students = subject.get("students", [])

        for student_record in students:
            attendance = student_record.get("attendance", {})
            present = attendance.get("present", 0)
            absent = attendance.get("absent", 0)
            total = present + absent

            if total == 0:
                continue

            percentage = (present / total) * 100

            if percentage < 75.0:
                student_user_id = student_record.get("student_id")
                student_user = await db.users.find_one({"_id": student_user_id})

                if not student_user or not student_user.get("email"):
                    continue

                student_email = student_user["email"]
                student_name = student_user.get("name", "Student")

                result = await BrevoEmailService.send_low_attendance_warning(
                    to_email=student_email,
                    student_name=student_name,
                    subject=subject_name,
                    attendance_percentage=percentage,
                    threshold=75,
                    present_count=present,
                    total_count=total,
                )

                if result.get("status") == "sent":
                    emails_sent_count += 1
                    logger.info(
                        f"Sent alert to student {student_user_id} for "
                        f"{subject_name} ({percentage:.1f}%)"
                    )
                else:
                    error_msg = result.get("error", "Unknown error")
                    logger.error(
                        f"Failed to send alert to student {student_user_id}: "
                        f"{error_msg}"
                    )

    return emails_sent_count


async def process_monthly_low_attendance_alerts():
    """
    Scheduled job: runs on 1st of each month.
    1. Find teachers who have enabled 'email_low_attendance_automated'
    2. For each teacher, send low attendance warnings
    """
    logger.info(
        "Starting monthly low attendance alert processing via automatic scheduler..."
    )

    teachers_cursor = db.teachers.find(
        {
            "settings.emailPreferences": {
                "$elemMatch": {
                    "key": "settings.general.email_low_attendance_automated",
                    "enabled": True,
                }
            }
        }
    )

    teachers = await teachers_cursor.to_list(length=None)

    if not teachers:
        logger.info("No teachers have enabled automated low attendance alerts.")
        return

    logger.info(f"Found {len(teachers)} teachers with automated alerts enabled.")

    total_emails = 0

    for teacher in teachers:
        teacher_id = teacher.get("userId", teacher.get("_id"))
        count = await send_low_attendance_for_teacher(teacher_id, teacher)
        total_emails += count

    logger.info(
        f"Completed low attendance alert processing. Total emails sent: {total_emails}"
    )
