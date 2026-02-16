import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from bson import ObjectId
from app.services.attendance_daily import save_daily_summary

@pytest.mark.asyncio
async def test_save_daily_summary_schema_refactor():
    # Setup Mocks
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_db.__getitem__.return_value = mock_collection
    mock_collection.update_one = AsyncMock()

    subject_id = ObjectId()
    teacher_id = ObjectId()
    record_date = "2026-02-11"
    present = 10
    absent = 2
    late = 1

    # Patch the db in the service
    with patch("app.services.attendance_daily.db", mock_db):
        await save_daily_summary(
            subject_id=subject_id,
            teacher_id=teacher_id,
            record_date=record_date,
            present=present,
            absent=absent,
            late=late,
        )

        # Verify usage of attendance_daily collection
        mock_db.__getitem__.assert_called_with("attendance_daily")

        # Verify update_one arguments
        args, kwargs = mock_collection.update_one.call_args
        filter_q, update_doc = args
        
        # 1. Verify Filter: Should be by subject/class only, NOT date
        assert filter_q["subjectId"] == subject_id
        assert "date" not in filter_q # Ensure date is NOT in filter

        # 2. Verify Update: Should set daily.{date}
        assert f"daily.{record_date}" in update_doc["$set"]
        daily_summary = update_doc["$set"][f"daily.{record_date}"]
        assert daily_summary["teacherId"] == teacher_id
        assert daily_summary["present"] == present
        assert daily_summary["absent"] == absent
        assert daily_summary["late"] == late
        assert daily_summary["total"] == present + absent + late
        assert daily_summary["percentage"] == round(10 / 13 * 100, 2)
        
        # Verify classId is NOT in $set (it is redundant)
        assert "classId" not in update_doc["$set"]

        # 3. Verify Upsert
        assert kwargs["upsert"] is True

if __name__ == "__main__":
    # helper to run with python directly
    import asyncio
    asyncio.run(test_save_daily_summary_schema_refactor())
