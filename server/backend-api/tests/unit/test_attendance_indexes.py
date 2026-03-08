import pytest
from unittest.mock import patch, AsyncMock
from app.services.attendance import ensure_indexes

@pytest.mark.asyncio
async def test_ensure_indexes_success():
    with patch("app.services.attendance.attendance_col") as mock_col:
        mock_col.create_index = AsyncMock()
        await ensure_indexes()
        mock_col.create_index.assert_called_once()

@pytest.mark.asyncio
async def test_ensure_indexes_failure():
    with patch("app.services.attendance.attendance_col") as mock_col:
        mock_col.create_index = AsyncMock(side_effect=Exception("DB Error"))
        
        with pytest.raises(Exception) as excinfo:
            await ensure_indexes()
        
        assert "DB Error" in str(excinfo.value)
