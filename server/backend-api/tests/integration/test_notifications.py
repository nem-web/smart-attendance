import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_send_absence_notifications(
    client: AsyncClient, auth_token, mock_all_emails, db
):
    await db.students.insert_many(
        [
            {"email": "student1@example.com", "name": "Student One"},
            {"email": "student2@example.com", "name": "Student Two"},
        ]
    )
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "student_emails": ["student1@example.com", "student2@example.com"],
        "subject": "Mathematics",
        "date": "2023-10-27",
        "teacher_name": "Test Teacher",
    }

    response = await client.post(
        "/notifications/absence", json=payload, headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sent"] == 2

    # Verify mock call
    assert mock_all_emails.called
    assert mock_all_emails.call_count == 2


@pytest.mark.asyncio
async def test_send_low_attendance_warnings(
    client: AsyncClient, auth_token, mock_all_emails
):
    headers = {"Authorization": f"Bearer {auth_token}"}
    # Provide a list of warnings
    payload = [
        {
            "student_email": "student1@example.com",
            "student_name": "Student One",
            "subject": "Mathematics",
            "attendance_percentage": 65.5,
            "threshold": 75,
        }
    ]

    response = await client.post(
        "/notifications/low-attendance", json=payload, headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sent"] == 1

    assert mock_all_emails.called


@pytest.mark.asyncio
async def test_send_assignment_reminders(
    client: AsyncClient, auth_token, mock_all_emails, db
):
    await db.students.insert_one(
        {"email": "student1@example.com", "name": "Student One"}
    )
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "student_emails": ["student1@example.com"],
        "assignment_title": "Homework 1",
        "subject": "Mathematics",
        "due_date": "2023-10-30",
        "teacher_name": "Test Teacher",
    }

    response = await client.post(
        "/notifications/assignment", json=payload, headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sent"] == 1


@pytest.mark.asyncio
async def test_send_exam_alerts(client: AsyncClient, auth_token, mock_all_emails, db):
    await db.students.insert_one(
        {"email": "student1@example.com", "name": "Student One"}
    )
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "student_emails": ["student1@example.com"],
        "exam_name": "Midterm",
        "subject": "Mathematics",
        "exam_date": "2023-11-01",
        "time": "10:00 AM",
        "venue": "Room 101",
    }

    response = await client.post("/notifications/exam", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["sent"] == 1


@pytest.mark.asyncio
async def test_send_custom_message(
    client: AsyncClient, auth_token, mock_all_emails, db
):
    await db.students.insert_one(
        {"email": "student1@example.com", "name": "Student One"}
    )
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "student_emails": ["student1@example.com"],
        "message_title": "Custom Alert",
        "message_body": "This is a test check.",
        "teacher_name": "Test Teacher",
    }

    response = await client.post("/notifications/custom", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["sent"] == 1


@pytest.mark.asyncio
async def test_get_email_stats(client: AsyncClient, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = await client.get("/notifications/stats", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_sent" in data
    assert "total_failed" in data
    assert "recent_logs" in data
    assert isinstance(data["recent_logs"], list)


@pytest.mark.asyncio
async def test_get_in_app_notifications(client: AsyncClient, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = await client.get("/notifications/in-app/list", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "unread_count" in data
    assert "notifications" in data
    assert isinstance(data["notifications"], list)
