"""
Integration tests for analytics endpoints.
"""

import pytest
from httpx import AsyncClient
from bson import ObjectId
from datetime import datetime, timedelta


@pytest.mark.asyncio
async def test_attendance_trend(client: AsyncClient, db):
    """Test GET /api/analytics/attendance-trend endpoint"""
    # Create a test class
    class_id = ObjectId()
    subject_id = class_id

    # Insert test data for different dates
    today = datetime.now().date()
    dates = [
        (today - timedelta(days=2)).isoformat(),
        (today - timedelta(days=1)).isoformat(),
        today.isoformat(),
    ]

    for i, date_str in enumerate(dates):
        await db.attendance_daily.insert_one(
            {
                "classId": class_id,
                "subjectId": subject_id,
                "date": date_str,
                "teacherId": ObjectId(),
                "summary": {
                    "present": 20 + i,
                    "absent": 5 - i,
                    "late": 1,
                    "total": 26,
                    "percentage": round(((20 + i) / 26) * 100, 2),
                },
                "createdAt": datetime.now(),
            }
        )

    # Test the endpoint
    response = await client.get(
        f"/api/analytics/attendance-trend?classId={str(class_id)}&dateFrom={dates[0]}&dateTo={dates[2]}"
    )

    assert response.status_code == 200
    data = response.json()

    assert data["classId"] == str(class_id)
    assert data["dateFrom"] == dates[0]
    assert data["dateTo"] == dates[2]
    assert len(data["data"]) == 3

    # Verify first record
    assert data["data"][0]["date"] == dates[0]
    assert data["data"][0]["present"] == 20
    assert data["data"][0]["absent"] == 5

    # Verify last record
    assert data["data"][2]["date"] == dates[2]
    assert data["data"][2]["present"] == 22
    assert data["data"][2]["absent"] == 3


@pytest.mark.asyncio
async def test_attendance_trend_invalid_dates(client: AsyncClient, db):
    """Test attendance trend with invalid date formats"""
    class_id = ObjectId()

    # Invalid date format
    response = await client.get(
        f"/api/analytics/attendance-trend?classId={str(class_id)}&dateFrom=invalid&dateTo=2024-01-01"
    )
    assert response.status_code == 400
    assert "Invalid date format" in response.json()["detail"]

    # dateFrom after dateTo
    response = await client.get(
        f"/api/analytics/attendance-trend?classId={str(class_id)}&dateFrom=2024-12-31&dateTo=2024-01-01"
    )
    assert response.status_code == 400
    assert "dateFrom must be before dateTo" in response.json()["detail"]


@pytest.mark.asyncio
async def test_attendance_trend_invalid_class_id(client: AsyncClient, db):
    """Test attendance trend with invalid classId"""
    response = await client.get(
        "/api/analytics/attendance-trend?classId=invalid&dateFrom=2024-01-01&dateTo=2024-12-31"
    )
    assert response.status_code == 400
    assert "Invalid classId" in response.json()["detail"]


@pytest.mark.asyncio
async def test_monthly_summary(client: AsyncClient, db):
    """Test GET /api/analytics/monthly-summary endpoint"""
    class_id = ObjectId()

    # Insert test data for different months
    await db.attendance_daily.insert_one(
        {
            "classId": class_id,
            "subjectId": class_id,
            "date": "2024-01-15",
            "teacherId": ObjectId(),
            "summary": {
                "present": 20,
                "absent": 5,
                "late": 1,
                "total": 26,
                "percentage": 76.92,
            },
        }
    )

    await db.attendance_daily.insert_one(
        {
            "classId": class_id,
            "subjectId": class_id,
            "date": "2024-01-20",
            "teacherId": ObjectId(),
            "summary": {
                "present": 22,
                "absent": 4,
                "late": 0,
                "total": 26,
                "percentage": 84.62,
            },
        }
    )

    await db.attendance_daily.insert_one(
        {
            "classId": class_id,
            "subjectId": class_id,
            "date": "2024-02-10",
            "teacherId": ObjectId(),
            "summary": {
                "present": 18,
                "absent": 8,
                "late": 0,
                "total": 26,
                "percentage": 69.23,
            },
        }
    )

    # Test without filter
    response = await client.get("/api/analytics/monthly-summary")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]) >= 2  # At least 2 months

    # Test with classId filter
    response = await client.get(
        f"/api/analytics/monthly-summary?classId={str(class_id)}"
    )
    assert response.status_code == 200
    data = response.json()

    assert len(data["data"]) == 2  # Two months
    # Data is sorted by month descending
    assert data["data"][0]["month"] == "2024-02"
    assert data["data"][0]["totalPresent"] == 18
    assert data["data"][0]["daysRecorded"] == 1

    assert data["data"][1]["month"] == "2024-01"
    assert data["data"][1]["totalPresent"] == 42  # 20 + 22
    assert data["data"][1]["daysRecorded"] == 2


@pytest.mark.asyncio
async def test_monthly_summary_invalid_class_id(client: AsyncClient, db):
    """Test monthly summary with invalid classId"""
    response = await client.get("/api/analytics/monthly-summary?classId=invalid")
    assert response.status_code == 400
    assert "Invalid classId" in response.json()["detail"]


@pytest.mark.asyncio
async def test_class_risk(client: AsyncClient, db):
    """Test GET /api/analytics/class-risk endpoint"""
    # Create test classes with different attendance rates
    
    # Class 1: High attendance (>75%)
    class1_id = ObjectId()
    await db.subjects.insert_one(
        {
            "_id": class1_id,
            "name": "Computer Science",
            "code": "CS101",
        }
    )
    await db.attendance_daily.insert_one(
        {
            "classId": class1_id,
            "subjectId": class1_id,
            "date": "2024-01-15",
            "summary": {
                "present": 23,
                "absent": 3,
                "late": 0,
                "total": 26,
                "percentage": 88.46,
            },
        }
    )

    # Class 2: Low attendance (<75%)
    class2_id = ObjectId()
    await db.subjects.insert_one(
        {
            "_id": class2_id,
            "name": "Mathematics",
            "code": "MATH101",
        }
    )
    await db.attendance_daily.insert_one(
        {
            "classId": class2_id,
            "subjectId": class2_id,
            "date": "2024-01-15",
            "summary": {
                "present": 15,
                "absent": 11,
                "late": 0,
                "total": 26,
                "percentage": 57.69,
            },
        }
    )

    # Class 3: Low attendance (<75%)
    class3_id = ObjectId()
    await db.subjects.insert_one(
        {
            "_id": class3_id,
            "name": "Physics",
            "code": "PHY101",
        }
    )
    await db.attendance_daily.insert_one(
        {
            "classId": class3_id,
            "subjectId": class3_id,
            "date": "2024-01-16",
            "summary": {
                "present": 18,
                "absent": 8,
                "late": 0,
                "total": 26,
                "percentage": 69.23,
            },
        }
    )

    # Test the endpoint
    response = await client.get("/api/analytics/class-risk")
    assert response.status_code == 200
    data = response.json()

    assert "data" in data
    # Should only return classes with <75% attendance
    assert len(data["data"]) == 2

    # Verify classes are sorted by percentage (ascending)
    assert data["data"][0]["attendancePercentage"] <= data["data"][1]["attendancePercentage"]

    # Verify the low attendance class is included
    class_ids = [c["classId"] for c in data["data"]]
    assert str(class2_id) in class_ids
    assert str(class3_id) in class_ids
    assert str(class1_id) not in class_ids  # High attendance class should not be included

    # Verify class details
    math_class = next(c for c in data["data"] if c["classId"] == str(class2_id))
    assert math_class["className"] == "Mathematics"
    assert math_class["classCode"] == "MATH101"
    assert math_class["attendancePercentage"] == 57.69
    assert math_class["totalPresent"] == 15
    assert math_class["totalAbsent"] == 11


@pytest.mark.asyncio
async def test_class_risk_empty(client: AsyncClient, db):
    """Test class risk when no classes are at risk"""
    # Create a class with high attendance
    class_id = ObjectId()
    await db.subjects.insert_one(
        {
            "_id": class_id,
            "name": "Computer Science",
            "code": "CS101",
        }
    )
    await db.attendance_daily.insert_one(
        {
            "classId": class_id,
            "subjectId": class_id,
            "date": "2024-01-15",
            "summary": {
                "present": 24,
                "absent": 2,
                "late": 0,
                "total": 26,
                "percentage": 92.31,
            },
        }
    )

    # Test the endpoint
    response = await client.get("/api/analytics/class-risk")
    assert response.status_code == 200
    data = response.json()

    assert "data" in data
    assert len(data["data"]) == 0  # No classes at risk


@pytest.mark.asyncio
async def test_global_stats(client: AsyncClient, db, teacher_token_header):
    """Test GET /api/analytics/global endpoint"""
    # Get teacher ID from the token header
    # For this test, we'll use a mock teacher ID
    teacher_id = ObjectId()

    # Create subjects for the teacher
    subject1_id = ObjectId()
    subject2_id = ObjectId()
    subject3_id = ObjectId()

    await db.subjects.insert_many(
        [
            {
                "_id": subject1_id,
                "name": "Computer Science",
                "code": "CS101",
                "professor_ids": [teacher_id],
            },
            {
                "_id": subject2_id,
                "name": "Mathematics",
                "code": "MATH101",
                "professor_ids": [teacher_id],
            },
            {
                "_id": subject3_id,
                "name": "Physics",
                "code": "PHY101",
                "professor_ids": [teacher_id],
            },
        ]
    )

    # Create attendance records for each subject
    # Subject 1: High attendance (85%)
    await db.attendance_daily.insert_many(
        [
            {
                "classId": subject1_id,
                "subjectId": subject1_id,
                "teacherId": teacher_id,
                "date": "2024-01-15",
                "summary": {
                    "present": 22,
                    "absent": 4,
                    "late": 0,
                    "total": 26,
                    "percentage": 84.62,
                },
            },
            {
                "classId": subject1_id,
                "subjectId": subject1_id,
                "teacherId": teacher_id,
                "date": "2024-01-16",
                "summary": {
                    "present": 23,
                    "absent": 3,
                    "late": 0,
                    "total": 26,
                    "percentage": 88.46,
                },
            },
        ]
    )

    # Subject 2: Medium attendance (70% - at risk)
    await db.attendance_daily.insert_one(
        {
            "classId": subject2_id,
            "subjectId": subject2_id,
            "teacherId": teacher_id,
            "date": "2024-01-15",
            "summary": {
                "present": 18,
                "absent": 8,
                "late": 0,
                "total": 26,
                "percentage": 69.23,
            },
        }
    )

    # Subject 3: High attendance (90%)
    await db.attendance_daily.insert_one(
        {
            "classId": subject3_id,
            "subjectId": subject3_id,
            "teacherId": teacher_id,
            "date": "2024-01-15",
            "summary": {
                "present": 24,
                "absent": 2,
                "late": 0,
                "total": 26,
                "percentage": 92.31,
            },
        }
    )

    # Test the endpoint
    response = await client.get(
        "/api/analytics/global", headers=teacher_token_header(str(teacher_id))
    )

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "overall_attendance" in data
    assert "risk_count" in data
    assert "top_subjects" in data

    # Verify calculations
    # Subject 1 avg: (22+23)/(26+26) * 100 = 45/52 * 100 = 86.54%
    # Subject 2 avg: 18/26 * 100 = 69.23%
    # Subject 3 avg: 24/26 * 100 = 92.31%
    # Overall avg: (86.54 + 69.23 + 92.31) / 3 = 82.69%
    assert data["overall_attendance"] > 80
    assert data["overall_attendance"] < 85

    # Risk count: subjects with < 75% (only Subject 2)
    assert data["risk_count"] == 1

    # Top subjects should be sorted by percentage (descending)
    assert len(data["top_subjects"]) == 3
    assert data["top_subjects"][0]["attendancePercentage"] >= data["top_subjects"][1][
        "attendancePercentage"
    ]
    assert data["top_subjects"][1]["attendancePercentage"] >= data["top_subjects"][2][
        "attendancePercentage"
    ]

    # Verify subject details
    assert data["top_subjects"][0]["subjectName"] == "Physics"
    assert data["top_subjects"][0]["attendancePercentage"] == 92.31


@pytest.mark.asyncio
async def test_global_stats_no_subjects(client: AsyncClient, db, teacher_token_header):
    """Test global stats when teacher has no subjects"""
    teacher_id = ObjectId()

    response = await client.get(
        "/api/analytics/global", headers=teacher_token_header(str(teacher_id))
    )

    assert response.status_code == 200
    data = response.json()

    assert data["overall_attendance"] == 0.0
    assert data["risk_count"] == 0
    assert data["top_subjects"] == []


@pytest.mark.asyncio
async def test_global_stats_no_attendance_data(
    client: AsyncClient, db, teacher_token_header
):
    """Test global stats when subjects have no attendance records"""
    teacher_id = ObjectId()
    subject_id = ObjectId()

    await db.subjects.insert_one(
        {
            "_id": subject_id,
            "name": "Computer Science",
            "code": "CS101",
            "professor_ids": [teacher_id],
        }
    )

    response = await client.get(
        "/api/analytics/global", headers=teacher_token_header(str(teacher_id))
    )

    assert response.status_code == 200
    data = response.json()

    # Should return empty stats when no attendance data exists
    assert data["overall_attendance"] == 0.0
    assert data["risk_count"] == 0
    assert data["top_subjects"] == []


@pytest.mark.asyncio
async def test_global_stats_non_teacher(client: AsyncClient, db, student_token_header):
    """Test that non-teachers cannot access global stats"""
    student_id = ObjectId()

    response = await client.get(
        "/api/analytics/global", headers=student_token_header(str(student_id))
    )

    assert response.status_code == 403
    assert "Only teachers" in response.json()["detail"]
