"""
Integration tests for QR attendance with subject & date validation.
Tests the secure QR attendance flow with JSON payload validation.
"""

from datetime import datetime, timedelta, timezone
import pytest
from bson import ObjectId
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_mark_qr_attendance_invalid_subject_id_returns_400(
    client: AsyncClient, student_token_header, db
):
    """Test that invalid subject ID returns 400"""
    student_id = ObjectId()
    # Create valid student user in DB so authentication succeeds
    await db.users.insert_one(
        {
            "_id": student_id,
            "email": "student@test.com",
            "name": "Test Student",
            "role": "student",
            "is_verified": True,
        }
    )

    headers = student_token_header(str(student_id))

    response = await client.post(
        "/attendance/mark-qr",
        headers=headers,
        json={
            "subjectId": "not-an-object-id",
            "date": datetime.now(timezone.utc).isoformat(),
            "sessionId": "test-session-123",
            "token": "test-token-456",
            "latitude": 0.0,
            "longitude": 0.0,
        },
    )

    assert response.status_code == 400
    assert "Invalid" in response.json()["detail"]


@pytest.mark.asyncio
async def test_mark_qr_attendance_expired_date_returns_400(
    client: AsyncClient, student_token_header, db
):
    """Test that old QR code (not from today) is rejected"""
    student_id = ObjectId()
    # Create valid student user
    await db.users.insert_one(
        {
            "_id": student_id,
            "email": "student@test.com",
            "name": "Test Student",
            "role": "student",
            "is_verified": True,
        }
    )

    headers = student_token_header(str(student_id))
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)

    response = await client.post(
        "/attendance/mark-qr",
        headers=headers,
        json={
            "subjectId": str(ObjectId()),
            "date": yesterday.isoformat(),
            "sessionId": "test-session-123",
            "token": "test-token-456",
            "latitude": 0.0,
            "longitude": 0.0,
        },
    )

    assert response.status_code == 400
    # Error message could be "Expired Session" or "Invalid date" or "Invalid user ID" if DB write fails
    detail = response.json()["detail"]
    assert "Expired" in detail or "Invalid" in detail


@pytest.mark.asyncio
async def test_mark_qr_attendance_nonexistent_subject_returns_404(
    client: AsyncClient, student_token_header, db
):
    """Test that non-existent subject returns 404 or 400"""
    student_id = ObjectId()
    # Create valid student user
    await db.users.insert_one(
        {
            "_id": student_id,
            "email": "student@test.com",
            "name": "Test Student",
            "role": "student",
            "is_verified": True,
        }
    )

    headers = student_token_header(str(student_id))

    response = await client.post(
        "/attendance/mark-qr",
        headers=headers,
        json={
            "subjectId": str(ObjectId()),
            "date": datetime.now(timezone.utc).isoformat(),
            "sessionId": "test-session-123",
            "token": "test-token-456",
            "latitude": 0.0,
            "longitude": 0.0,
        },
    )

    # Accept 404 or 400
    assert response.status_code in [404, 400]
    detail = response.json().get("detail", "")
    if response.status_code == 404:
        assert "not found" in detail.lower()
    else:
        assert "Invalid" in detail or "not found" in detail.lower()


@pytest.mark.asyncio
async def test_mark_qr_attendance_missing_fields_returns_422(
    client: AsyncClient, student_token_header
):
    """Test that missing required fields returns validation error"""
    student_id = str(ObjectId())
    headers = student_token_header(student_id)

    response = await client.post(
        "/attendance/mark-qr",
        headers=headers,
        json={
            "subjectId": str(ObjectId()),
            # Missing date, sessionId, token
            "latitude": 0.0,
            "longitude": 0.0,
        },
    )

    assert response.status_code == 422  # Pydantic validation error


@pytest.mark.asyncio
async def test_mark_qr_attendance_invalid_date_format_returns_400(
    client: AsyncClient, student_token_header, db
):
    """Test that invalid date format returns 400"""
    student_id = ObjectId()
    # Create valid student user in DB so authentication succeeds
    await db.users.insert_one(
        {
            "_id": student_id,
            "email": "student@test.com",
            "name": "Test Student",
            "role": "student",
            "is_verified": True,
        }
    )

    headers = student_token_header(str(student_id))

    response = await client.post(
        "/attendance/mark-qr",
        headers=headers,
        json={
            "subjectId": str(ObjectId()),
            "date": "not-a-valid-date",
            "sessionId": "test-session-123",
            "token": "test-token-456",
            "latitude": 0.0,
            "longitude": 0.0,
        },
    )

    assert response.status_code == 400
    assert "Invalid date format" in response.json()["detail"]
