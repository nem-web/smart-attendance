import logging

import httpx

from .config import brevo_settings
from ..utils.email_template import verification_email_template, otp_email_template

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

        Logs a warning on HTTP or network errors; does not raise.
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
            try:
                response = await client.post(BREVO_URL, json=payload, headers=headers)
                response.raise_for_status()
            except httpx.HTTPError as e:
                logger.warning("Failed to send email: %s", e)

    @staticmethod
    async def send_otp_email(to_email: str, user_name: str, otp: str) -> None:
        """
        Send the password reset OTP to the user (Issue #196).

        Args:
            to_email: Recipient email address.
            user_name: Display name used in the email body.
            otp: The 6-digit OTP to include in the email.
        """
        await BrevoEmailService._send_email(
            to_email=to_email,
            subject="Your password reset code - Smart Attendance",
            html_content=otp_email_template(otp, user_name),
        )

    @staticmethod
    async def send_verification_email(to_email: str, user: str, verification_link: str) -> None:
        """
        Send the email verification link to the user after registration.

        Args:
            to_email: Recipient email address.
            user: Display name used in the email body.
            verification_link: Full URL the user must visit to verify.
        """
        await BrevoEmailService._send_email(
            to_email=to_email,
            subject="Verify your email for Smart Attendance",
            html_content=verification_email_template(verification_link, user),
        )


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
