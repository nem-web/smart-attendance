import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_manage_schedule(client: AsyncClient, auth_token, db):
    headers = {"Authorization": f"Bearer {auth_token}"}

    # 1. Get the current teacher user (created by auth_token fixture)
    # The default test_user_data has email "test@example.com"
    user = await db.users.find_one({"email": "test@example.com"})
    teacher_id = user["_id"]

    # 2. Create a subject for this teacher
    subject_doc = {
        "name": "Mathematics",
        "code": "MATH101",
        "teacher_id": teacher_id,
        "students": [],
    }
    result = await db.subjects.insert_one(subject_doc)
    subject_id = str(result.inserted_id)

    # 3. Add a schedule slot using the correct API format
    slot_payload = {
        "subject_id": subject_id,
        "day": "Monday",
        "start_time": "10:00",
        "end_time": "11:00",
        "room": "101",
        "slot": 1,
    }

    # Try the standard schedule creation/update route
    response = await client.post("/schedule", json=slot_payload, headers=headers)

    assert response.status_code == 201, f"Schedule update failed: {response.text}"

    data = response.json()
    assert data["status"] == "success"
    assert "slot_id" in data
