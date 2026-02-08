import logging
import smtplib
from email.message import EmailMessage

import httpx

from .config import brevo_settings
from ..utils.email_template import verification_email_template

logger = logging.getLogger(__name__)
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


class BrevoEmailService:
    @staticmethod
    async def send_verification_email(to_email:str,user:str,verification_link:str):
        payload={
            "sender":{
                "email":brevo_settings.BREVO_SENDER_EMAIL,
                "name":brevo_settings.BREVO_SENDER_NAME,
            },
            "to":[
                {"email":to_email}
            ],
            "subject": "Verify your email for Smart Attendance",
            "htmlContent":verification_email_template(verification_link,user),
        }
    
        headers = {
        "api-key": brevo_settings.BREVO_API_KEY,
        "content-type": "application/json"
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                response=await client.post(BREVO_URL,json=payload,headers=headers)
                response.raise_for_status()
            except httpx.HTTPError as e:
                logger.warning("Failed to send email: %s", e)

















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
