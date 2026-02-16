import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from bson import ObjectId
from app.api.routes.reports import export_attendance_csv
from fastapi import HTTPException
from datetime import datetime


# Helper for find().sort().to_list() chain
class AsyncFindMock:
    def __init__(self, items):
        self.items = items

    def sort(self, field, direction):
        return self

    async def to_list(self, length):
        return self.items


@pytest.mark.asyncio
async def test_export_csv_logic():
    # Setup Mocks
    mock_db = MagicMock()

    teacher_id = ObjectId()
    subject_id = ObjectId()
    student_id = ObjectId()

    current_teacher = {"id": str(teacher_id)}

    # Mock Subject Find
    mock_subject = {
        "_id": subject_id,
        "name": "Math 101",
        "code": "MATH101",
        "professor_ids": [teacher_id],
        "students": [
            {
                "student_id": student_id,
                "verified": True,
                "attendance": {"present": 8, "absent": 2},  # Total 10, 80%
            }
        ],
    }

    # find_one is awaited, so it should be an AsyncMock returning the dict
    mock_db.subjects.find_one = AsyncMock(return_value=mock_subject)
    mock_db.classes.find_one = AsyncMock(return_value=None)

    # Mock attendance records
    mock_attendance = [
        {
            "student_id": student_id,
            "date": datetime(2023, 1, 15),
            "status": "present",
            "time": "09:00:00",
        }
    ]

    # Mock attendance find chain
    mock_db.attendance.find = MagicMock(
        return_value=AsyncFindMock(mock_attendance)
    )

    # Mock Users Find (Cursor)
    mock_user = {
        "_id": student_id,
        "name": "Student A",
        "email": "student@test.com",
        "role": "student",
        "usn": "USN123",
    }

    # Mock Students Find (Cursor)
    mock_student_profile = {"userId": student_id, "roll_number": "Roll-001"}

    # Mock db.users.find to return AsyncFindMock with to_list support
    mock_db.users.find = MagicMock(return_value=AsyncFindMock([mock_user]))
    mock_db.students.find = MagicMock(return_value=AsyncFindMock([mock_student_profile]))

    # Patch the db in the reports module
    with patch("app.api.routes.reports.db", mock_db):
        try:
            response = await export_attendance_csv(
                subject_id=str(subject_id),
                start_date="2023-01-01",
                end_date="2023-01-31",
                current_teacher=current_teacher,
            )

            # Check if response is JSON (error)
            if response.headers.get("content-type") == "application/json":
                import json

                body = json.loads(response.body)
                pytest.fail(f"Endpoint returned JSON error: {body}")

            # Verify Response
            assert response.status_code == 200
            assert "text/csv" in response.headers["content-type"]

            # Consume the streaming response
            body_iterator = response.body_iterator
            content = ""
            async for chunk in body_iterator:
                if isinstance(chunk, bytes):
                    content += chunk.decode()
                else:
                    content += chunk

            rows = content.strip().split("\r\n")
            print(f"CSV Content:\n{content}")  # For debugging

            # Check for basic CSV structure
            assert "Date" in rows[0]
            assert "Student Name" in rows[0]

        except Exception as e:
            pytest.fail(f"Test raised exception: {e}")


@pytest.mark.asyncio
async def test_export_csv_not_found():
    mock_db = MagicMock()
    mock_db.subjects.find_one = AsyncMock(return_value=None)  # Subject not found
    mock_db.classes.find_one = AsyncMock(return_value=None)  # Also not in classes

    teacher_id = ObjectId()
    subject_id = ObjectId()
    current_teacher = {"id": str(teacher_id)}

    with patch("app.api.routes.reports.db", mock_db):
        with pytest.raises(HTTPException) as excinfo:
            await export_attendance_csv(
                subject_id=str(subject_id), current_teacher=current_teacher
            )
        assert excinfo.value.status_code == 404
