import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.attendance import log_grouped_attendance, get_attendance_for_student
from bson import ObjectId

@pytest.mark.asyncio
async def test_log_grouped_attendance():
    """Test log_grouped_attendance function."""
    with patch("app.services.attendance.db") as mock_db:
        mock_logs = MagicMock() # Use MagicMock for collection access, methods are Async
        mock_db.attendance_logs = mock_logs
        mock_logs.update_one = AsyncMock()
        mock_logs.find_one = AsyncMock(return_value={"_id": "log1"})

        subject_id = str(ObjectId())
        date_str = "2024-01-01"
        students = [{"studentId": str(ObjectId())}]
        teacher_id = str(ObjectId())

        result = await log_grouped_attendance(subject_id, date_str, students, teacher_id)
        
        mock_logs.update_one.assert_called_once()
        assert result == {"_id": "log1"}

@pytest.mark.asyncio
async def test_get_attendance_for_student():
    """Test get_attendance_for_student function."""
    with patch("app.services.attendance.attendance_col") as mock_col:
        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = mock_cursor
        
        async def async_iter():
            yield {"_id": ObjectId()}
        
        mock_cursor.__aiter__.side_effect = async_iter
        
        mock_col.find.return_value = mock_cursor

        student_id = str(ObjectId())
        result = await get_attendance_for_student(student_id)
        
        mock_col.find.assert_called_once()
        assert len(result) == 1
