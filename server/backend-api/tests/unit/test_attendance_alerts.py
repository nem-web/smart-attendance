import pytest
from unittest.mock import AsyncMock, patch
from bson import ObjectId


@pytest.mark.asyncio
async def test_send_low_attendance_for_teacher_no_subjects():
    """No subjects means 0 emails sent."""
    from app.services.attendance_alerts import send_low_attendance_for_teacher

    teacher_id = ObjectId()
    teacher_doc = {"_id": teacher_id}

    mock_cursor = AsyncMock()
    mock_cursor.to_list = AsyncMock(return_value=[])

    with patch("app.services.attendance_alerts.db") as mock_db:
        mock_db.subjects.find.return_value = mock_cursor
        result = await send_low_attendance_for_teacher(teacher_id, teacher_doc)

    assert result == 0


@pytest.mark.asyncio
async def test_send_low_attendance_for_teacher_skips_high_attendance():
    """Students above 75% should not receive emails."""
    from app.services.attendance_alerts import send_low_attendance_for_teacher

    teacher_id = ObjectId()
    student_id = ObjectId()

    subjects = [
        {
            "name": "Math",
            "students": [
                {
                    "student_id": student_id,
                    "attendance": {"present": 80, "absent": 10},
                }
            ],
        }
    ]

    mock_cursor = AsyncMock()
    mock_cursor.to_list = AsyncMock(return_value=subjects)

    with patch("app.services.attendance_alerts.db") as mock_db:
        mock_db.subjects.find.return_value = mock_cursor
        result = await send_low_attendance_for_teacher(teacher_id, {})

    assert result == 0


@pytest.mark.asyncio
async def test_send_low_attendance_for_teacher_sends_email():
    """Students below 75% should receive an email."""
    from app.services.attendance_alerts import send_low_attendance_for_teacher

    teacher_id = ObjectId()
    student_id = ObjectId()

    subjects = [
        {
            "name": "Math",
            "students": [
                {
                    "student_id": student_id,
                    "attendance": {"present": 5, "absent": 10},
                }
            ],
        }
    ]

    student_user = {"_id": student_id, "email": "s@test.com", "name": "Student"}

    mock_cursor = AsyncMock()
    mock_cursor.to_list = AsyncMock(return_value=subjects)

    with (
        patch("app.services.attendance_alerts.db") as mock_db,
        patch("app.services.attendance_alerts.BrevoEmailService") as mock_email,
    ):
        mock_db.subjects.find.return_value = mock_cursor
        mock_db.users.find_one = AsyncMock(return_value=student_user)
        mock_email.send_low_attendance_warning = AsyncMock(
            return_value={"status": "sent"}
        )

        result = await send_low_attendance_for_teacher(teacher_id, {})

    assert result == 1
    mock_email.send_low_attendance_warning.assert_called_once()


@pytest.mark.asyncio
async def test_send_low_attendance_skips_zero_attendance():
    """Students with 0 total classes should be skipped."""
    from app.services.attendance_alerts import send_low_attendance_for_teacher

    teacher_id = ObjectId()
    student_id = ObjectId()

    subjects = [
        {
            "name": "Math",
            "students": [
                {
                    "student_id": student_id,
                    "attendance": {"present": 0, "absent": 0},
                }
            ],
        }
    ]

    mock_cursor = AsyncMock()
    mock_cursor.to_list = AsyncMock(return_value=subjects)

    with patch("app.services.attendance_alerts.db") as mock_db:
        mock_db.subjects.find.return_value = mock_cursor
        result = await send_low_attendance_for_teacher(teacher_id, {})

    assert result == 0


@pytest.mark.asyncio
async def test_process_monthly_no_teachers_enabled():
    """When no teachers have alerts enabled, nothing should happen."""
    from app.services.attendance_alerts import (
        process_monthly_low_attendance_alerts,
    )

    mock_cursor = AsyncMock()
    mock_cursor.to_list = AsyncMock(return_value=[])

    with patch("app.services.attendance_alerts.db") as mock_db:
        mock_db.teachers.find.return_value = mock_cursor
        await process_monthly_low_attendance_alerts()

    mock_db.teachers.find.assert_called_once()
