import logging

import httpx

from .config import brevo_settings
from ..utils.email_template import (
    verification_email_template,
    otp_email_template,
    absence_notification_template,
    low_attendance_warning_template,
    assignment_reminder_template,
    exam_alert_template,
    custom_message_template,
)

logger = logging.getLogger(__name__)
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


class BrevoEmailService:
    """
    Email delivery via Brevo (Sendinblue) API.

    All public methods use the shared _send_email helper to avoid duplication
    of request payload and error handling.
    """

    @staticmethod
    async def _send_email(to_email: str, subject: str, html_content: str) -> None:
        """
        Send a single transactional email via the Brevo SMTP API.

        Args:
            to_email: Recipient email address.
            subject: Email subject line.
            html_content: HTML body of the email.

        Raises:
            httpx.HTTPError: If the request fails or returns non-2xx status.
        """
        payload = {
            "sender": {
                "email": brevo_settings.BREVO_SENDER_EMAIL,
                "name": brevo_settings.BREVO_SENDER_NAME,
            },
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content,
        }
        headers = {
            "api-key": brevo_settings.BREVO_API_KEY,
            "content-type": "application/json",
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(BREVO_URL, json=payload, headers=headers)
            response.raise_for_status()

    @staticmethod
    async def send_otp_email(to_email: str, user_name: str, otp: str) -> None:
        """
        Send the password reset OTP to the user (Issue #196).

        Args:
            to_email: Recipient email address.
            user_name: Display name used in the email body.
            otp: The 6-digit OTP to include in the email.
            
        Raises:
            Exception: If email sending fails.
        """
        try:
            await BrevoEmailService._send_email(
                to_email=to_email,
                subject="Your password reset code - Smart Attendance",
                html_content=otp_email_template(otp, user_name),
            )
        except Exception as e:
            logger.error(f"Failed to send OTP email: {e}")
            raise

    @staticmethod
    async def send_verification_email(to_email: str, user: str, verification_link: str) -> None:
        """
        Send the email verification link to the user after registration.

        Args:
            to_email: Recipient email address.
            user: Display name used in the email body.
            verification_link: Full URL the user must visit to verify.
            
        Raises:
            Exception: If email sending fails.
        """
        try:
            await BrevoEmailService._send_email(
                to_email=to_email,
                subject="Verify your email for Smart Attendance",
                html_content=verification_email_template(verification_link, user),
            )
        except Exception as e:
            logger.error(f"Failed to send verification email to {to_email}: {e}")
            raise

    @staticmethod
    async def send_absence_notification(
        to_email: str,
        student_name: str,
        subject: str,
        date: str,
        teacher_name: str
    ) -> dict:
        """Send absence notification to student."""
        try:
            await BrevoEmailService._send_email(
                to_email=to_email,
                subject=f"Absence Notification - {subject}",
                html_content=absence_notification_template(
                    student_name, subject, date, teacher_name
                ),
            )
            return {"status": "sent", "error": None}
        except Exception as e:
            logger.error(f"Failed to send absence notification: {e}")
            return {"status": "failed", "error": str(e)}

    @staticmethod
    async def send_low_attendance_warning(
        to_email: str,
        student_name: str,
        subject: str,
        attendance_percentage: float,
        threshold: int
    ) -> dict:
        """Send low attendance warning to student."""
        try:
            await BrevoEmailService._send_email(
                to_email=to_email,
                subject=f"Low Attendance Warning - {subject}",
                html_content=low_attendance_warning_template(
                    student_name, subject, attendance_percentage, threshold
                ),
            )
            return {"status": "sent", "error": None}
        except Exception as e:
            logger.error(f"Failed to send low attendance warning: {e}")
            return {"status": "failed", "error": str(e)}

    @staticmethod
    async def send_assignment_reminder(
        to_email: str,
        student_name: str,
        assignment_title: str,
        subject: str,
        due_date: str,
        teacher_name: str
    ) -> dict:
        """Send assignment reminder to student."""
        try:
            await BrevoEmailService._send_email(
                to_email=to_email,
                subject=f"Assignment Reminder - {assignment_title}",
                html_content=assignment_reminder_template(
                    student_name, assignment_title, subject, due_date, teacher_name
                ),
            )
            return {"status": "sent", "error": None}
        except Exception as e:
            logger.error(f"Failed to send assignment reminder: {e}")
            return {"status": "failed", "error": str(e)}

    @staticmethod
    async def send_exam_alert(
        to_email: str,
        student_name: str,
        exam_name: str,
        subject: str,
        exam_date: str,
        time: str,
        venue: str
    ) -> dict:
        """Send exam alert to student."""
        try:
            await BrevoEmailService._send_email(
                to_email=to_email,
                subject=f"Exam Alert - {exam_name}",
                html_content=exam_alert_template(
                    student_name, exam_name, subject, exam_date, time, venue
                ),
            )
            return {"status": "sent", "error": None}
        except Exception as e:
            logger.error(f"Failed to send exam alert: {e}")
            return {"status": "failed", "error": str(e)}

    @staticmethod
    async def send_custom_message(
        to_email: str,
        student_name: str,
        message_title: str,
        message_body: str,
        teacher_name: str
    ) -> dict:
        """Send custom message from teacher to student."""
        try:
            await BrevoEmailService._send_email(
                to_email=to_email,
                subject=message_title,
                html_content=custom_message_template(
                    student_name, message_title, message_body, teacher_name
                ),
            )
            return {"status": "sent", "error": None}
        except Exception as e:
            logger.error(f"Failed to send custom message: {e}")
            return {"status": "failed", "error": str(e)}


# def send_verification_email(to_email: str, verification_link: str):
#     try:
#         print("SMTP CONFIG:", SMTP_HOST, SMTP_PORT, SMTP_USER)

#         msg = EmailMessage()
#         msg["Subject"] = "Verify your email for Smart Attendance"
#         msg["From"] = SMTP_USER
#         msg["To"] = to_email

#         msg.set_content(
#             f"""
# Hi,

# Click the link below to verify your email:

# {verification_link}

# Thanks,
# Smart Attendance
# """
#         )

#         with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
#             server.starttls()
#             server.login(SMTP_USER, SMTP_PASS)
#             server.send_message(msg)

#         print("Verification email sent to", to_email)

#     except Exception as e:
#         print("EMAIL ERROR:", str(e))
