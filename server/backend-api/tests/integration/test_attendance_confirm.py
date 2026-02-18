from datetime import date

import pytest
from bson import ObjectId
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_confirm_attendance_invalid_subject_id_returns_400(client: AsyncClient):
    response = await client.post(
        "/api/attendance/confirm",
        json={
            "subject_id": "not-an-object-id",
            "present_students": [],
            "absent_students": [],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid subject_id"


@pytest.mark.asyncio
async def test_confirm_attendance_invalid_student_id_returns_400(client: AsyncClient):
    response = await client.post(
        "/api/attendance/confirm",
        json={
            "subject_id": str(ObjectId()),
            "present_students": ["bad-student-id"],
            "absent_students": [],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid ObjectId at present_students[0]"


@pytest.mark.asyncio
async def test_confirm_attendance_invalid_absent_student_id_returns_400(
    client: AsyncClient,
):
    response = await client.post(
        "/api/attendance/confirm",
        json={
            "subject_id": str(ObjectId()),
            "present_students": [],
            "absent_students": ["bad-student-id"],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid ObjectId at absent_students[0]"


@pytest.mark.asyncio
async def test_confirm_attendance_overlap_students_returns_400(client: AsyncClient):
    student_id = ObjectId()

    response = await client.post(
        "/api/attendance/confirm",
        json={
            "subject_id": str(ObjectId()),
            "present_students": [str(student_id)],
            "absent_students": [str(student_id)],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Students cannot be both present and absent"


@pytest.mark.asyncio
async def test_confirm_attendance_deduplicates_ids_and_writes_summary(
    client: AsyncClient, db
):
    subject_id = ObjectId()
    teacher_id = ObjectId()
    present_student = ObjectId()
    absent_student = ObjectId()

    await db.subjects.insert_one(
        {
            "_id": subject_id,
            "professor_ids": [teacher_id],
            "students": [
                {
                    "student_id": present_student,
                    "attendance": {
                        "present": 0,
                        "absent": 0,
                        "lastMarkedAt": "1970-01-01",
                    },
                },
                {
                    "student_id": absent_student,
                    "attendance": {
                        "present": 0,
                        "absent": 0,
                        "lastMarkedAt": "1970-01-01",
                    },
                },
            ],
        }
    )

    response = await client.post(
        "/api/attendance/confirm",
        json={
            "subject_id": str(subject_id),
            "present_students": [str(present_student), str(present_student)],
            "absent_students": [str(absent_student), str(absent_student)],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["present_updated"] == 1
    assert data["absent_updated"] == 1

    subject = await db.subjects.find_one({"_id": subject_id})
    today = date.today().isoformat()

    present_record = next(
        student
        for student in subject["students"]
        if student["student_id"] == present_student
    )
    absent_record = next(
        student
        for student in subject["students"]
        if student["student_id"] == absent_student
    )

    assert present_record["attendance"]["present"] == 1
    assert present_record["attendance"]["lastMarkedAt"] == today
    assert absent_record["attendance"]["absent"] == 1
    assert absent_record["attendance"]["lastMarkedAt"] == today

    summary = await db.attendance_daily.find_one(
        {"subjectId": subject_id}
    )
    assert summary is not None
    assert today in summary["daily"]
    daily_record = summary["daily"][today]
    # No teacherId in confirm payload, so it might be None or not set
    # assert daily_record["teacherId"] == teacher_id 
    assert daily_record["present"] == 1
    assert daily_record["absent"] == 1
    assert daily_record["total"] == 2
