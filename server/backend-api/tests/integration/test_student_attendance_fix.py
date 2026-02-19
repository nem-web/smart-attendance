"""
Test to verify the Student Dashboard attendance data fetching and calculation bug fix.

This test ensures that:
1. When attendance is marked (confirmed), the total and percentage are updated correctly
2. The get_my_subjects endpoint returns correct attendance data
"""

from datetime import date

import pytest
from bson import ObjectId
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_student_attendance_total_and_percentage_updated_on_confirm(
    client: AsyncClient, db
):
    """
    Test that when attendance is confirmed for a student,
    the total and percentage fields are properly updated.
    
    This fixes the bug where attendance showed 0% and 0/0 classes.
    """
    # Setup test data
    subject_id = ObjectId()
    teacher_id = ObjectId()
    student_id = ObjectId()
    
    # Create subject with student
    await db.subjects.insert_one(
        {
            "_id": subject_id,
            "name": "Math",
            "code": "MATH101",
            "professor_ids": [teacher_id],
            "students": [
                {
                    "student_id": student_id,
                    "name": "Test Student",
                    "verified": True,
                    "attendance": {
                        "present": 0,
                        "absent": 0,
                        "total": 0,
                        "percentage": 0,
                        "lastMarkedAt": "1970-01-01",
                    },
                }
            ],
        }
    )
    
    # Confirm first attendance (Mark Present)
    response = await client.post(
        "/api/attendance/confirm",
        json={
            "subject_id": str(subject_id),
            "present_students": [str(student_id)],
            "absent_students": [],
        },
    )
    
    assert response.status_code == 200
    assert response.json()["present_updated"] == 1
    
    # Verify that total and percentage are updated
    subject = await db.subjects.find_one({"_id": subject_id})
    student_record = subject["students"][0]
    attendance = student_record["attendance"]
    
    # After marking present once:
    # - total should be 1
    # - present should be 1
    # - percentage should be 100% (1/1 * 100)
    assert attendance["total"] == 1, f"Expected total=1, got {attendance['total']}"
    assert attendance["present"] == 1, f"Expected present=1, got {attendance['present']}"
    assert attendance["percentage"] == 100.0, f"Expected percentage=100, got {attendance['percentage']}"
    
    today = date.today().isoformat()
    assert attendance["lastMarkedAt"] == today


@pytest.mark.asyncio
async def test_student_attendance_percentage_calculated_correctly_present_and_absent(
    client: AsyncClient, db
):
    """
    Test that attendance percentage is calculated correctly when we have
    a mix of present and absent students.
    """
    subject_id = ObjectId()
    teacher_id = ObjectId()
    student_id = ObjectId()
    
    await db.subjects.insert_one(
        {
            "_id": subject_id,
            "name": "Physics",
            "code": "PHY101",
            "professor_ids": [teacher_id],
            "students": [
                {
                    "student_id": student_id,
                    "name": "Test Student",
                    "verified": True,
                    "attendance": {
                        "present": 0,
                        "absent": 0,
                        "total": 0,
                        "percentage": 0,
                        "lastMarkedAt": "1970-01-01",
                    },
                }
            ],
        }
    )
    
    # Mark as present 3 times
    for _ in range(3):
        response = await client.post(
            "/api/attendance/confirm",
            json={
                "subject_id": str(subject_id),
                "present_students": [str(student_id)],
                "absent_students": [],
            },
        )
        assert response.status_code == 200
        
        # Manually update lastMarkedAt to simulate different days
        await db.subjects.update_one(
            {"_id": subject_id, "students.student_id": student_id},
            {"$set": {"students.$[s].attendance.lastMarkedAt": "1970-01-01"}},
            array_filters=[{"s.student_id": student_id}]
        )
    
    # Mark as absent 2 times
    for _ in range(2):
        response = await client.post(
            "/api/attendance/confirm",
            json={
                "subject_id": str(subject_id),
                "present_students": [],
                "absent_students": [str(student_id)],
            },
        )
        assert response.status_code == 200
        
        # Manually update lastMarkedAt to simulate different days
        await db.subjects.update_one(
            {"_id": subject_id, "students.student_id": student_id},
            {"$set": {"students.$[s].attendance.lastMarkedAt": "1970-01-01"}},
            array_filters=[{"s.student_id": student_id}]
        )
    
    # Verify final state
    subject = await db.subjects.find_one({"_id": subject_id})
    student_record = subject["students"][0]
    attendance = student_record["attendance"]
    
    # After 3 present + 2 absent:
    # - total should be 5
    # - present should be 3
    # - absent should be 2
    # - percentage should be 60% (3/5 * 100)
    assert attendance["total"] == 5, f"Expected total=5, got {attendance['total']}"
    assert attendance["present"] == 3, f"Expected present=3, got {attendance['present']}"
    assert attendance["absent"] == 2, f"Expected absent=2, got {attendance['absent']}"
    assert attendance["percentage"] == 60.0, f"Expected percentage=60, got {attendance['percentage']}"


@pytest.mark.asyncio
async def test_get_my_subjects_returns_correct_attendance_data(
    client: AsyncClient, db, make_token_header
):
    """
    Test that the get_my_subjects endpoint returns correct attendance data.
    This was the original bug - it was returning 0% and 0/0 classes.
    """
    # Create test student user
    student_user_id = ObjectId()
    student_id = ObjectId()
    subject_id = ObjectId()
    teacher_id = ObjectId()
    
    # Create user document
    await db.users.insert_one(
        {
            "_id": student_user_id,
            "email": "student@test.com",
            "name": "Test Student",
            "role": "student",
            "is_verified": True,
        }
    )
    
    # Create student document linked to user
    await db.students.insert_one(
        {
            "_id": student_id,
            "userId": student_user_id,
            "subjects": [subject_id],
            "verified": True,
        }
    )
    
    # Create subject with student
    await db.subjects.insert_one(
        {
            "_id": subject_id,
            "name": "Chemistry",
            "code": "CHEM101",
            "type": "Core",
            "professor_ids": [teacher_id],
            "students": [
                {
                    "student_id": student_user_id,  # Fixed: should be userId, not student._id
                    "name": "Test Student",
                    "verified": True,
                    "attendance": {
                        "present": 0,
                        "absent": 0,
                        "total": 0,
                        "percentage": 0,
                    },
                }
            ],
        }
    )
    
    # Mark student present 4 times and absent 1 time
    for i in range(4):
        response = await client.post(
            "/api/attendance/confirm",
            json={
                "subject_id": str(subject_id),
                "present_students": [str(student_user_id)],  # Fixed: use userId
                "absent_students": [],
            },
        )
        assert response.status_code == 200
        
        # Reset lastMarkedAt to allow marking again
        await db.subjects.update_one(
            {"_id": subject_id, "students.student_id": student_user_id},  # Fixed: use userId
            {"$set": {"students.$[s].attendance.lastMarkedAt": "1970-01-01"}},
            array_filters=[{"s.student_id": student_user_id}]  # Fixed: use userId
        )
    
    # Mark absent once
    response = await client.post(
        "/api/attendance/confirm",
        json={
            "subject_id": str(subject_id),
            "present_students": [],
            "absent_students": [str(student_user_id)],  # Fixed: use userId
        },
    )
    assert response.status_code == 200
    
    # Now fetch student's subjects via the /me/subjects endpoint
    auth_header = make_token_header(str(student_user_id), "student")
    response = await client.get(
        "/students/me/subjects",
        headers=auth_header
    )
    
    assert response.status_code == 200
    subjects = response.json()
    
    assert len(subjects) == 1
    subject_data = subjects[0]
    
    # Verify attendance data is NOT 0% and 0/0
    assert subject_data["attendance"] == 80.0, f"Expected 80%, got {subject_data['attendance']}"
    assert subject_data["attended"] == 4, f"Expected 4 attended, got {subject_data['attended']}"
    assert subject_data["total"] == 5, f"Expected 5 total, got {subject_data['total']}"
    assert subject_data["name"] == "Chemistry"
    assert subject_data["code"] == "CHEM101"
