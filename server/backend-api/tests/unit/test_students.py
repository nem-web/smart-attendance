import pytest
from unittest.mock import AsyncMock, patch
from bson import ObjectId
from fastapi import HTTPException

# Adjust import based on your actual structure
# Assuming app.api.routes.students is where the router is
from app.api.routes.students import api_get_my_today_schedule


@pytest.mark.asyncio
async def test_get_my_today_schedule_success():
    # Mock current_user
    current_user = {"id": str(ObjectId()), "role": "student"}

    # Mock DB student
    mock_student = {
        "userId": ObjectId(current_user["id"]),
        "subjects": [ObjectId(), ObjectId()],
    }

    # Mock DB
    mock_db = AsyncMock()
    mock_db.students.find_one.return_value = mock_student

    # Mock schedule_service
    mock_entries = [
        {
            "_id": ObjectId(),
            "subject_name": "Math",
            "start_time": "10:00",
            "end_time": "11:00",
            "room": "101",
        }
    ]

    with (
        patch("app.api.routes.students.db", mock_db),
        patch(
            "app.api.routes.students.schedule_service.get_student_schedule_for_day",
            new_callable=AsyncMock,
        ) as mock_get_schedule,
    ):
        mock_get_schedule.return_value = mock_entries

        result = await api_get_my_today_schedule(current_user)

        assert result["day"] is not None
        assert len(result["classes"]) == 1
        assert result["classes"][0]["subject_name"] == "Math"
        assert result["classes"][0]["status"] == "scheduled"


@pytest.mark.asyncio
async def test_get_my_today_schedule_not_student():
    current_user = {"id": "123", "role": "teacher"}

    with pytest.raises(HTTPException) as excinfo:
        await api_get_my_today_schedule(current_user)

    assert excinfo.value.status_code == 403
    assert excinfo.value.detail == "Not a student"


@pytest.mark.asyncio
async def test_get_my_today_schedule_student_not_found():
    current_user = {"id": str(ObjectId()), "role": "student"}

    mock_db = AsyncMock()
    mock_db.students.find_one.return_value = None

    with patch("app.api.routes.students.db", mock_db):
        with pytest.raises(HTTPException) as excinfo:
            await api_get_my_today_schedule(current_user)

        assert excinfo.value.status_code == 404
        assert excinfo.value.detail == "Student profile not found"
