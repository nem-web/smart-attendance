import html


def verification_email_template(verification_link: str, user: str) -> str:
    safe_user = html.escape(user)
    return f"""
    <html>
        <body>
            <p>Hi, {safe_user}</p>
            <p>Please verify your email by clicking the link below:</p>
            <p><a href="{verification_link}" target="_blank" 
                  style="background-color: #3333FF; color: white; padding: 10px 20px; 
                         text-decoration: none; border-radius: 5px;">
                  Verify Email
               </a></p>
            <p>Or copy this link and paste on the browser tab: {verification_link}</p>
            <br>
            <p>Thanks,<br><b>Smart Attendance Team</b></p>
        </body>
    </html>
    """
