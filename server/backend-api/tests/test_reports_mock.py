import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from bson import ObjectId
from app.api.routes.reports import export_attendance_csv
from fastapi import HTTPException


# Helper for async iteration
class AsyncIterator:
    def __init__(self, items):
        self.items = iter(items)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self.items)
        except StopIteration:
            raise StopAsyncIteration


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

    # Configure find() to return an object that can be async iterated
    # The code calls: users_cursor = db.users.find(...)
    # then: async for u in users_cursor

    # We need mock_db.users.find(...) to return an AsyncIterator
    mock_db.users.find.return_value = AsyncIterator([mock_user])
    mock_db.students.find.return_value = AsyncIterator([mock_student_profile])

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

            assert (
                "Student Name,Roll No,Total Classes,Attended,Percentage,Status"
                in rows[0]
            )
            # Verify data - checking substring for flexibility
            assert "Student A" in rows[1]
            assert "Roll-001" in rows[1]
            assert "10" in rows[1]
            assert "8" in rows[1]
            assert "80.0%" in rows[1]
            assert "Good" in rows[1]

        except Exception as e:
            pytest.fail(f"Test raised exception: {e}")


@pytest.mark.asyncio
async def test_export_csv_not_found():
    mock_db = MagicMock()
    mock_db.subjects.find_one = AsyncMock(return_value=None)  # Subject not found

    teacher_id = ObjectId()
    subject_id = ObjectId()
    current_teacher = {"id": str(teacher_id)}

    with patch("app.api.routes.reports.db", mock_db):
        with pytest.raises(HTTPException) as excinfo:
            await export_attendance_csv(
                subject_id=str(subject_id), current_teacher=current_teacher
            )
        assert excinfo.value.status_code == 404
