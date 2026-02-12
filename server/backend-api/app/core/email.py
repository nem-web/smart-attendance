import logging
from typing import List

from app.core.config import settings
from pydantic import EmailStr

# Setup basic logging
logger = logging.getLogger(__name__)


def send_email(
    to_email: EmailStr,
    subject: str,
    html_content: str,
    sender_name: str = settings.EMAIL_SENDER_NAME,
    sender_email: EmailStr = settings.EMAIL_SENDER_ADDRESS
) -> bool:
    """
    Sends an email using Brevo (formerly Sendinblue) API.
    Returns True if successful, False otherwise.
    """
    if not settings.BREVO_API_KEY:
        logger.warning(
            "BREVO_API_KEY is not set. Email to %s NOT sent.", to_email
        )
        return False

    import requests

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json"
    }

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }

    try:
        response = requests.post(
            url, json=payload, headers=headers, timeout=10
        )
        response.raise_for_status()
        logger.info("Email sent successfully to %s", to_email)
        return True
    except Exception as e:
        logger.error("Failed to send email: %s", e)
        return False


def send_batch_email(
    to_emails: List[EmailStr],
    subject: str,
    html_content: str
) -> None:
    for email in to_emails:
        send_email(email, subject, html_content)


class BrevoEmailService:
    @staticmethod
    def send_verification_email(email: str, name: str, link: str):
        subject = "Verify your email - Smart Attendance"
        html_content = (
            f"<h1>Hello, {name}</h1>"
            f"<p>Please verify your email clicking <a href='{link}'>here</a></p>"
        )
        send_email(email, subject, html_content)
