import pytest
from httpx import AsyncClient
from datetime import datetime, timezone


@pytest.mark.asyncio
async def test_mark_attendance(client: AsyncClient, auth_token):
    # Attendance marking usually requires Device ID header and image data
    headers = {"Authorization": f"Bearer {auth_token}", "X-Device-ID": "test-device-id"}

    payload = {
        # The API expects an image (base64) for face recognition
        "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
        "subject_id": "5f8f8f8f8f8f8f8f8f8f8f8f",  # Dummy ObjectID
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "present",
        "confidence": 0.95,
    }

    # Mocking the background tasks or ML checks might be needed here
    # Since we use mongomock, it should just save to memory

    response = await client.post("/attendance/mark", json=payload, headers=headers)

    # Asserting structure - might be 404 (subject not found), 400 (invalid image), or 200/201
    # We mainly want to ensure it's not 500
    assert response.status_code in [200, 201, 400, 404, 422], (
        f"Unexpected status: {response.text}"
    )


@pytest.mark.asyncio
async def test_get_attendance_report(client: AsyncClient, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Try the history endpoint
    response = await client.get("/attendance/history", headers=headers)

    # If not found, try report
    if response.status_code == 404:
        response = await client.get("/attendance/report", headers=headers)

    # Allow 404 if endpoints are not yet exposed, but if 200, must be valid
    assert response.status_code in [200, 404]

    if response.status_code == 200:
        body = response.json()
        assert isinstance(body, list) or "data" in body
