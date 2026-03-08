import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from app.services.attendance import mark_attendance
# DuplicateKeyError removed as it was unused


try:
    from unittest.mock import AsyncMock
except ImportError:

    class AsyncMock(MagicMock):
        async def __call__(self, *args, **kwargs):
            return super(AsyncMock, self).__call__(*args, **kwargs)


@pytest.mark.asyncio
async def test_mark_attendance_validation_missing_fields():
    """Test that missing fields raise 400."""
    # payload missing class_id, date, etc.
    payload = {"student_id": "123"}

    with pytest.raises(HTTPException) as excinfo:
        await mark_attendance(payload)

    assert excinfo.value.status_code == 422
    assert "Missing required fields" in excinfo.value.detail


@pytest.mark.asyncio
async def test_mark_attendance_duplicate_detection():
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
async def test_mark_attendance_success():
    """Test successful attendance marking."""
    with patch("app.services.attendance.attendance_col") as mock_col:
        mock_col.find_one = AsyncMock(
            side_effect=[None, {"_id": "new_id", "created_at": "now"}]
        )
        mock_col.insert_one = AsyncMock(return_value=MagicMock(inserted_id="new_id"))

        valid_payload = {
            "student_id": "123",
            "class_id": "math101",
            "date": "2024-01-01",
            "period": 1,
            "status": "present",
        }

        result = await mark_attendance(valid_payload)

        assert result["_id"] == "new_id"
        mock_col.insert_one.assert_called_once()
