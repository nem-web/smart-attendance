import pytest
from app.db.indexes import create_indexes


@pytest.mark.asyncio
async def test_create_indexes(db):
    """
    Test that indexes are created correctly on the collections.
    """
    # Execute the function to create indexes
    await create_indexes(db)

    # Verify Users Collection Indexes
    users_indexes = await db.users.index_information()
    # Check for email unique index
    assert "email_1" in users_indexes, "Index on 'email' missing in users collection"
    assert users_indexes["email_1"].get("unique") is True, (
        "Index on 'email' should be unique"
    )
    # Check for role index
    assert "role_1" in users_indexes, "Index on 'role' missing in users collection"

    # Verify Students Collection Indexes
    students_indexes = await db.students.index_information()
    assert "user_id_1" in students_indexes, (
        "Index on 'user_id' missing in students collection"
    )
    assert "subject_ids_1" in students_indexes, (
        "Index on 'subject_ids' missing in students collection"
    )

    # Verify Subjects Collection Indexes
    subjects_indexes = await db.subjects.index_information()
    assert "teacher_id_1" in subjects_indexes, (
        "Index on 'teacher_id' missing in subjects collection"
    )
    assert "student_ids_1" in subjects_indexes, (
        "Index on 'student_ids' missing in subjects collection"
    )

    # Verify Attendance Records Collection Indexes
    attendance_indexes = await db.attendance_records.index_information()
    # Compound index default name: subject_id_1_date_1
    assert "subject_id_1_date_1" in attendance_indexes, (
        "Compound index on (subject_id, date) missing in attendance_records"
    )
    assert "student_id_1" in attendance_indexes, (
        "Index on 'student_id' missing in attendance_records"
    )

    # Verify Refresh Tokens Collection Indexes
    refresh_tokens_indexes = await db.refresh_tokens.index_information()
    assert "expires_at_1" in refresh_tokens_indexes, (
        "Index on 'expires_at' missing in refresh_tokens"
    )
    # Check TTL property
    assert "expireAfterSeconds" in refresh_tokens_indexes["expires_at_1"], (
        "TTL property missing on 'expires_at' index"
    )
    assert refresh_tokens_indexes["expires_at_1"]["expireAfterSeconds"] == 0, (
        "TTL expireAfterSeconds should be 0"
    )
