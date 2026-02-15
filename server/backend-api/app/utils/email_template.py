import html

def otp_email_template(otp: str, user: str) -> str:
    """
    Generate HTML body for password reset OTP email.
    """
    safe_user = html.escape(user)
    safe_otp = html.escape(otp)

    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >
</head>
<body
    style="
        margin: 0;
        padding: 0;
        background-color: #f3f4f6;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    "
>
    <div
        style="
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        "
    >
        <div
            style="
                background: linear-gradient(
                    135deg,
                    #4F46E5 0%,
                    #7C3AED 100%
                );
                padding: 30px 20px;
                text-align: center;
            "
        >
            <h1
                style="
                    color: #ffffff;
                    margin: 0;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: 1px;
                "
            >
                Smart Attendance
            </h1>
        </div>

        <div style="padding: 40px 30px; color: #374151;">
            <h2
                style="
                    margin-top: 0;
                    color: #1F2937;
                    font-size: 20px;
                    font-weight: 600;
                "
            >
                Password Reset Request
            </h2>

            <p
                style="
                    font-size: 16px;
                    line-height: 1.6;
                    color: #4B5563;
                    margin-bottom: 24px;
                "
            >
                Hi <strong>{safe_user}</strong>,<br>
                We received a request to reset the password for your
                Smart Attendance account.
                Use the code below to complete the process.
            </p>

            <div style="margin: 32px 0; text-align: center;">
                <div
                    style="
                        display: inline-block;
                        background-color: #EEF2FF;
                        border: 1px dashed #6366F1;
                        border-radius: 12px;
                        padding: 20px 40px;
                    "
                >
                    <span
                        style="
                            font-size: 14px;
                            color: #6366F1;
                            display: block;
                            margin-bottom: 8px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        "
                    >
                        Your OTP Code
                    </span>

                    <strong
                        style="
                            font-size: 36px;
                            letter-spacing: 8px;
                            color: #1F2937;
                            display: block;
                        "
                    >
                        {safe_otp}
                    </strong>
                </div>
            </div>

            <p
                style="
                    font-size: 14px;
                    color: #6B7280;
                    text-align: center;
                    margin-bottom: 30px;
                "
            >
                ⚠️ This code expires in <strong>10 minutes</strong>.<br>
                Please do not share this code with anyone.
            </p>

            <hr
                style="
                    border: none;
                    border-top: 1px solid #E5E7EB;
                    margin: 24px 0;
                "
            >

            <p
                style="
                    font-size: 14px;
                    color: #6B7280;
                    line-height: 1.5;
                "
            >
                If you did not request a password reset,
                you can safely ignore this email.
                Your account remains secure.
            </p>

            <p
                style="
                    margin-top: 30px;
                    font-size: 16px;
                    font-weight: 600;
                    color: #1F2937;
                "
            >
                Best regards,<br>
                <span style="color: #4F46E5;">
                    The Smart Attendance Team
                </span>
            </p>
        </div>

        <div
            style="
                background-color: #F9FAFB;
                padding: 20px;
                text-align: center;
                border-top: 1px solid #E5E7EB;
            "
        >
            <p
                style="
                    margin: 0;
                    font-size: 12px;
                    color: #9CA3AF;
                "
            >
                &copy; Smart Attendance System.
                All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
"""



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


def absence_notification_template(student_name: str, subject: str, date: str, teacher_name: str) -> str:
    """Generate HTML email for absence notification."""
    safe_student = html.escape(student_name)
    safe_subject = html.escape(subject)
    safe_date = html.escape(date)
    safe_teacher = html.escape(teacher_name)

    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <div style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">⚠️ Absence Notification</h1>
        </div>
        <div style="padding: 40px 30px; color: #374151;">
            <p style="font-size: 16px; line-height: 1.6; color: #4B5563; margin-bottom: 24px;">
                Dear <strong>{safe_student}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4B5563;">
                This is to notify you that you were marked <strong style="color: #DC2626;">absent</strong> for the following class:
            </p>
            <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 20px; margin: 24px 0; border-radius: 6px;">
                <p style="margin: 8px 0; color: #1F2937;"><strong>Subject:</strong> {safe_subject}</p>
                <p style="margin: 8px 0; color: #1F2937;"><strong>Date:</strong> {safe_date}</p>
                <p style="margin: 8px 0; color: #1F2937;"><strong>Teacher:</strong> {safe_teacher}</p>
            </div>
            <p style="font-size: 14px; color: #6B7280; line-height: 1.5;">
                Please ensure regular attendance to maintain good academic standing. If you believe this is an error, please contact your teacher immediately.
            </p>
            <p style="margin-top: 30px; font-size: 16px; font-weight: 600; color: #1F2937;">
                Best regards,<br>
                <span style="color: #4F46E5;">The Smart Attendance Team</span>
            </p>
        </div>
        <div style="background-color: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 12px; color: #9CA3AF;">&copy; Smart Attendance System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""


def low_attendance_warning_template(student_name: str, subject: str, attendance_percentage: float, threshold: int) -> str:
    """Generate HTML email for low attendance warning."""
    safe_student = html.escape(student_name)
    safe_subject = html.escape(subject)

    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">⚠️ Low Attendance Warning</h1>
        </div>
        <div style="padding: 40px 30px; color: #374151;">
            <p style="font-size: 16px; line-height: 1.6; color: #4B5563; margin-bottom: 24px;">
                Dear <strong>{safe_student}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4B5563;">
                Your attendance has dropped below the required threshold. Please take immediate action to improve your attendance.
            </p>
            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 24px 0; border-radius: 6px;">
                <p style="margin: 8px 0; color: #1F2937;"><strong>Subject:</strong> {safe_subject}</p>
                <p style="margin: 8px 0; color: #1F2937;"><strong>Current Attendance:</strong> <span style="color: #DC2626; font-size: 24px; font-weight: 700;">{attendance_percentage:.1f}%</span></p>
                <p style="margin: 8px 0; color: #1F2937;"><strong>Required Minimum:</strong> {threshold}%</p>
            </div>
            <div style="background-color: #DBEAFE; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; color: #1E40AF;">
                    <strong>💡 Action Required:</strong> Improve your attendance to avoid academic penalties and maintain eligibility for examinations.
                </p>
            </div>
            <p style="margin-top: 30px; font-size: 16px; font-weight: 600; color: #1F2937;">
                Best regards,<br>
                <span style="color: #4F46E5;">The Smart Attendance Team</span>
            </p>
        </div>
        <div style="background-color: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 12px; color: #9CA3AF;">&copy; Smart Attendance System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""


def assignment_reminder_template(student_name: str, assignment_title: str, subject: str, due_date: str, teacher_name: str) -> str:
    """Generate HTML email for assignment reminder."""
    safe_student = html.escape(student_name)
    safe_assignment = html.escape(assignment_title)
    safe_subject = html.escape(subject)
    safe_due = html.escape(due_date)
    safe_teacher = html.escape(teacher_name)

    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <div style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">📝 Assignment Reminder</h1>
        </div>
        <div style="padding: 40px 30px; color: #374151;">
            <p style="font-size: 16px; line-height: 1.6; color: #4B5563; margin-bottom: 24px;">
                Dear <strong>{safe_student}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4B5563;">
                This is a friendly reminder about your upcoming assignment:
            </p>
            <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; margin: 24px 0; border-radius: 6px;">
                <p style="margin: 8px 0; color: #1F2937;"><strong>Assignment:</strong> {safe_assignment}</p>
                <p style="margin: 8px 0; color: #1F2937;"><strong>Subject:</strong> {safe_subject}</p>
                <p style="margin: 8px 0; color: #1F2937;"><strong>Due Date:</strong> <span style="color: #DC2626; font-weight: 600;">{safe_due}</span></p>
                <p style="margin: 8px 0; color: #1F2937;"><strong>Teacher:</strong> {safe_teacher}</p>
            </div>
            <p style="font-size: 14px; color: #6B7280; line-height: 1.5;">
                Please submit your assignment on time to avoid late penalties.
            </p>
            <p style="margin-top: 30px; font-size: 16px; font-weight: 600; color: #1F2937;">
                Best regards,<br>
                <span style="color: #4F46E5;">The Smart Attendance Team</span>
            </p>
        </div>
        <div style="background-color: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 12px; color: #9CA3AF;">&copy; Smart Attendance System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""


def exam_alert_template(student_name: str, exam_name: str, subject: str, exam_date: str, time: str, venue: str) -> str:
    """Generate HTML email for exam alert."""
    safe_student = html.escape(student_name)
    safe_exam = html.escape(exam_name)
    safe_subject = html.escape(subject)
    safe_date = html.escape(exam_date)
    safe_time = html.escape(time)
    safe_venue = html.escape(venue)

    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <div style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">📚 Exam Alert</h1>
        </div>
        <div style="padding: 40px 30px; color: #374151;">
            <p style="font-size: 16px; line-height: 1.6; color: #4B5563; margin-bottom: 24px;">
                Dear <strong>{safe_student}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4B5563;">
                This is an important reminder about your upcoming examination:
            </p>
            <div style="background-color: #F5F3FF; border-left: 4px solid #7C3AED; padding: 20px; margin: 24px 0; border-radius: 6px;">
                <p style="margin: 8px 0; color: #1F2937;"><strong>Exam:</strong> {safe_exam}</p>
                <p style="margin: 8px 0; color: #1F2937;"><strong>Subject:</strong> {safe_subject}</p>
                <p style="margin: 8px 0; color: #1F2937;"><strong>Date:</strong> <span style="color: #DC2626; font-weight: 600;">{safe_date}</span></p>
                <p style="margin: 8px 0; color: #1F2937;"><strong>Time:</strong> {safe_time}</p>
                <p style="margin: 8px 0; color: #1F2937;"><strong>Venue:</strong> {safe_venue}</p>
            </div>
            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; color: #92400E;">
                    <strong>⏰ Important:</strong> Please arrive 15 minutes early. Bring your student ID and required materials.
                </p>
            </div>
            <p style="margin-top: 30px; font-size: 16px; font-weight: 600; color: #1F2937;">
                Best of luck!<br>
                <span style="color: #4F46E5;">The Smart Attendance Team</span>
            </p>
        </div>
        <div style="background-color: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 12px; color: #9CA3AF;">&copy; Smart Attendance System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""


def custom_message_template(student_name: str, message_title: str, message_body: str, teacher_name: str) -> str:
    """Generate HTML email for custom message from teacher."""
    safe_student = html.escape(student_name)
    safe_title = html.escape(message_title)
    safe_message = html.escape(message_body).replace('\n', '<br>')
    safe_teacher = html.escape(teacher_name)

    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">✉️ Message from Your Teacher</h1>
        </div>
        <div style="padding: 40px 30px; color: #374151;">
            <p style="font-size: 16px; line-height: 1.6; color: #4B5563; margin-bottom: 24px;">
                Dear <strong>{safe_student}</strong>,
            </p>
            <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 20px; margin: 24px 0; border-radius: 6px;">
                <h2 style="margin: 0 0 16px 0; color: #1F2937; font-size: 18px;">{safe_title}</h2>
                <p style="margin: 0; color: #374151; line-height: 1.6;">{safe_message}</p>
            </div>
            <p style="margin-top: 30px; font-size: 16px; font-weight: 600; color: #1F2937;">
                From,<br>
                <span style="color: #059669;">{safe_teacher}</span>
            </p>
        </div>
        <div style="background-color: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 12px; color: #9CA3AF;">&copy; Smart Attendance System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""
