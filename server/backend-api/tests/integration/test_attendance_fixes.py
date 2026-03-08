import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

try:
    from unittest.mock import AsyncMock
except ImportError:

    class AsyncMock(MagicMock):
        async def __call__(self, *args, **kwargs):
            return super(AsyncMock, self).__call__(*args, **kwargs)


from fastapi.testclient import TestClient
from app.main import app
from app.services.attendance import mark_attendance, ensure_indexes

client = TestClient(app)


def test_mark_attendance_missing_user_id_in_token():
    """Test that missing user_id in token raises 401."""
    # We patch decode_jwt in the route module
    with patch("app.api.routes.attendance.decode_jwt") as mock_decode:
        mock_decode.return_value = {"role": "student"}  # Missing user_id

        headers = {
            "Authorization": "Bearer valid_token_structure",  # Will be split(" ")[1] -> valid_token_structure
            "X-Device-ID": "test-device",
        }

        # We need to post some data.
        # The route /attendance/mark first checks headers (Device ID, Auth) before payload validation
        response = client.post(
            "/attendance/mark", json={"some": "data"}, headers=headers
        )

        # If decode_jwt returns dict without 'user_id', code raises ValueError -> caught -> HTTPException 401
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid token"


@pytest.mark.asyncio
async def test_mark_attendance_service_error_handling():
    """Test that service logs error and re-raises exception."""
    # Patch the collection object in app.services.attendance
    with patch("app.services.attendance.attendance_col") as mock_col:
        # Mock find_one to return None (no duplicate), insert_one to raise exception
        mock_col.find_one = AsyncMock(return_value=None)
        mock_col.insert_one = AsyncMock(side_effect=Exception("DB Error"))

        # Valid payload required to pass validation
        valid_payload = {
            "student_id": "123",
            "class_id": "math101",
            "date": "2024-01-01",
            "period": 1,
            "status": "present",
        }

        with pytest.raises(Exception) as excinfo:
            await mark_attendance(valid_payload)

        assert "DB Error" in str(excinfo.value)


@pytest.mark.asyncio
async def test_mark_attendance_duplicate_check():
    """Test that duplicate attendance raises 409."""
    with patch("app.services.attendance.attendance_col") as mock_col:
        # Mock find_one to return existing record
        mock_col.find_one = AsyncMock(return_value={"_id": "existing"})

        valid_payload = {
            "student_id": "123",
            "class_id": "math101",
            "date": "2024-01-01",
            "period": 1,
            "status": "present",
        }

        with pytest.raises(HTTPException) as excinfo:
            await mark_attendance(valid_payload)

        assert excinfo.value.status_code == 409
        assert "Attendance already marked" in excinfo.value.detail


@pytest.mark.asyncio
async def test_mark_attendance_validation_error():
    """Test that missing fields raise 422."""
    with patch("app.services.attendance.attendance_col"):
        payload = {"student_id": "123"}  # Missing class_id, date, etc.

        with pytest.raises(HTTPException) as excinfo:
            await mark_attendance(payload)

        assert excinfo.value.status_code == 422
        assert "Missing required field" in excinfo.value.detail


@pytest.mark.asyncio
async def test_ensure_indexes_called():
    """Test that ensure_indexes creates a unique index."""
    # We need to patch the collection object in the service module
    with patch("app.services.attendance.attendance_col") as mock_col:
        # Mock create_index to be an async function
        mock_col.create_index = AsyncMock()

        await ensure_indexes()

        mock_col.create_index.assert_called_once()
        # Verify arguments: check that unique=True was passed
        call_args = mock_col.create_index.call_args
        assert call_args is not None
        _, kwargs = call_args
        assert kwargs.get("unique") is True
