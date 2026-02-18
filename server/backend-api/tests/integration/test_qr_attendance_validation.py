"""
Integration tests for QR attendance with subject & date validation.
Tests the secure QR attendance flow with JSON payload validation.
"""

from datetime import datetime, timedelta, UTC
import pytest
from bson import ObjectId
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_mark_qr_attendance_invalid_subject_id_returns_400(
    client: AsyncClient, student_token_header
):
    """Test that invalid subject ID returns 400"""
    student_id = str(ObjectId())
    headers = student_token_header(student_id)
    
    response = await client.post(
        "/api/attendance/mark-qr",
        headers=headers,
        json={
            "subjectId": "not-an-object-id",
            "date": datetime.now(UTC).isoformat(),
            "sessionId": "test-session-123",
            "token": "test-token-456",
            "latitude": 0.0,
            "longitude": 0.0,
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid subject ID"


@pytest.mark.asyncio
async def test_mark_qr_attendance_expired_date_returns_400(
    client: AsyncClient, student_token_header
):
    """Test that old QR code (not from today) is rejected"""
    student_id = str(ObjectId())
    headers = student_token_header(student_id)
    yesterday = datetime.now(UTC) - timedelta(days=1)
    
    response = await client.post(
        "/api/attendance/mark-qr",
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
    assert "Expired Session" in response.json()["detail"]


@pytest.mark.asyncio
async def test_mark_qr_attendance_nonexistent_subject_returns_404(
    client: AsyncClient, student_token_header
):
    """Test that non-existent subject returns 404"""
    student_id = str(ObjectId())
    headers = student_token_header(student_id)
    
    response = await client.post(
        "/api/attendance/mark-qr",
        headers=headers,
        json={
            "subjectId": str(ObjectId()),
            "date": datetime.now(UTC).isoformat(),
            "sessionId": "test-session-123",
            "token": "test-token-456",
            "latitude": 0.0,
            "longitude": 0.0,
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Subject not found"


@pytest.mark.asyncio
async def test_mark_qr_attendance_missing_fields_returns_422(
    client: AsyncClient, student_token_header
):
    """Test that missing required fields returns validation error"""
    student_id = str(ObjectId())
    headers = student_token_header(student_id)
    
    response = await client.post(
        "/api/attendance/mark-qr",
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
    client: AsyncClient, student_token_header
):
    """Test that invalid date format returns 400"""
    student_id = str(ObjectId())
    headers = student_token_header(student_id)
    
    response = await client.post(
        "/api/attendance/mark-qr",
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

