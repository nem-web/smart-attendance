"""
Integration tests for device binding functionality.

Tests cover:
1. Teachers are exempt from device binding checks
2. Students are subject to device binding checks
3. OTP flow works correctly for students on new devices
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from datetime import datetime, UTC
from bson import ObjectId

from app.core.security import hash_password


@pytest.mark.asyncio
async def test_teacher_exempt_from_device_binding(client: AsyncClient, db):
    """
    Test that teachers can mark attendance from any device without device binding checks.
    
    Scenario:
    1. Register and login as a teacher
    2. Call /api/attendance/mark from device A
    3. Call /api/attendance/mark from device B (different device)
    4. Both should succeed without device binding errors
    """
    # 1. Register a teacher
    register_payload = {
        "name": "Teacher Device Test",
        "email": "teacher_device@test.com",
        "password": "password123",
        "role": "teacher",
        "college_name": "Test College",
        "employee_id": "EMP_DT001",
        "phone": "1234567890",
        "branch": "CSE",
    }
    
    with patch(
        "app.core.email.BrevoEmailService.send_verification_email",
        new_callable=AsyncMock,
    ):
        response = await client.post("/auth/register", json=register_payload)
        if response.status_code == 500 and "topology" in response.text.lower():
            pytest.skip("MongoDB not available")
        assert response.status_code == 200
    
    # 2. Verify user
    await db.users.update_one(
        {"email": register_payload["email"]}, {"$set": {"is_verified": True}}
    )
    
    # 3. Login
    login_payload = {
        "email": register_payload["email"],
        "password": register_payload["password"],
    }
    response = await client.post("/auth/login", json=login_payload)
    assert response.status_code == 200
    token = response.json()["token"]
    
    # 4. Create a test subject for attendance
    user = await db.users.find_one({"email": register_payload["email"]})
    teacher_doc = {
        "userId": user["_id"],
        "employee_id": "EMP_DT001",
        "college_name": "Test College",
        "phone": "1234567890",
        "branch": "CSE",
        "subjects": [],
        "createdAt": datetime.now(UTC),
    }
    await db.teachers.insert_one(teacher_doc)
    
    subject_doc = {
        "name": "Test Subject",
        "code": "TST101",
        "teacher_id": user["_id"],
        "students": [],
    }
    subject_result = await db.subjects.insert_one(subject_doc)
    subject_id = str(subject_result.inserted_id)
    
    # 5. Attempt to mark attendance from Device A
    with patch("app.services.ml_client.ml_client.detect_faces", new_callable=AsyncMock) as mock_detect:
        mock_detect.return_value = {"success": True, "faces": []}
        
        response = await client.post(
            "/api/attendance/mark",
            json={
                "image": "data:image/jpeg;base64,fake_image_data",
                "subject_id": subject_id,
            },
            headers={
                "Authorization": f"Bearer {token}",
                "X-Device-ID": "device-A-12345",
            },
        )
        
        # Should not return 403 device binding error
        assert response.status_code != 403 or "New device detected" not in response.json().get("detail", "")
    
    # 6. Attempt to mark attendance from Device B (different device)
    with patch("app.services.ml_client.ml_client.detect_faces", new_callable=AsyncMock) as mock_detect:
        mock_detect.return_value = {"success": True, "faces": []}
        
        response = await client.post(
            "/api/attendance/mark",
            json={
                "image": "data:image/jpeg;base64,fake_image_data",
                "subject_id": subject_id,
            },
            headers={
                "Authorization": f"Bearer {token}",
                "X-Device-ID": "device-B-67890",  # Different device ID
            },
        )
        
        # Should not return 403 device binding error
        assert response.status_code != 403 or "New device detected" not in response.json().get("detail", "")


@pytest.mark.asyncio
async def test_student_device_binding_enforcement(client: AsyncClient, db):
    """
    Test that students are subject to device binding checks.
    
    Scenario:
    1. Register and login as a student from Device A
    2. Student's device is auto-bound on first attendance
    3. Attempt to mark attendance from Device B
    4. Should get 403 with device binding error
    """
    # 1. Register a student
    register_payload = {
        "name": "Student Device Test",
        "email": "student_device@test.com",
        "password": "password123",
        "role": "student",
        "college_name": "Test College",
        "branch": "CSE",
        "roll": "CS001",
        "year": 2,
    }
    
    with patch(
        "app.core.email.BrevoEmailService.send_verification_email",
        new_callable=AsyncMock,
    ):
        response = await client.post("/auth/register", json=register_payload)
        if response.status_code == 500 and "topology" in response.text.lower():
            pytest.skip("MongoDB not available")
        assert response.status_code == 200
    
    # 2. Verify user
    await db.users.update_one(
        {"email": register_payload["email"]}, {"$set": {"is_verified": True}}
    )
    
    # 3. Login
    login_payload = {
        "email": register_payload["email"],
        "password": register_payload["password"],
    }
    response = await client.post("/auth/login", json=login_payload)
    assert response.status_code == 200
    login_data = response.json()
    token = login_data["token"]
    user_id = login_data["user_id"]
    
    # 4. Create a test subject with the student enrolled
    student_doc = {
        "userId": ObjectId(user_id),
        "name": register_payload["name"],
        "email": register_payload["email"],
        "college_name": register_payload["college_name"],
        "branch": register_payload["branch"],
        "roll": register_payload["roll"],
        "year": register_payload["year"],
    }
    await db.students.insert_one(student_doc)
    
    subject_doc = {
        "name": "Test Subject",
        "code": "TST101",
        "teacher_id": ObjectId(),
        "students": [
            {
                "studentId": ObjectId(user_id),
                "attendance": [],
                "present_count": 0,
            }
        ],
    }
    subject_result = await db.subjects.insert_one(subject_doc)
    subject_id = str(subject_result.inserted_id)
    
    # 5. First attendance from Device A (should auto-bind)
    with patch("app.services.ml_client.ml_client.detect_faces", new_callable=AsyncMock) as mock_detect:
        mock_detect.return_value = {"success": True, "faces": []}
        
        response = await client.post(
            "/api/attendance/mark",
            json={
                "image": "data:image/jpeg;base64,fake_image_data",
                "subject_id": subject_id,
            },
            headers={
                "Authorization": f"Bearer {token}",
                "X-Device-ID": "device-A-12345",
            },
        )
        
        # Should succeed (auto-bind on first use)
        # May return 200 or other status, but not 403 device binding error
        assert response.status_code != 403 or "New device detected" not in response.json().get("detail", "")
    
    # 6. Verify device was bound
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    assert user.get("trusted_device_id") == "device-A-12345"
    
    # 7. Attempt attendance from Device B (should be blocked)
    with patch("app.services.ml_client.ml_client.detect_faces", new_callable=AsyncMock) as mock_detect:
        mock_detect.return_value = {"success": True, "faces": []}
        
        response = await client.post(
            "/api/attendance/mark",
            json={
                "image": "data:image/jpeg;base64,fake_image_data",
                "subject_id": subject_id,
            },
            headers={
                "Authorization": f"Bearer {token}",
                "X-Device-ID": "device-B-67890",  # Different device
            },
        )
        
        # Should return 403 with device binding error
        assert response.status_code == 403
        assert "New device detected" in response.json()["detail"]


@pytest.mark.asyncio
async def test_device_binding_otp_flow(client: AsyncClient, db):
    """
    Test the complete OTP flow for device binding.
    
    Scenario:
    1. Student tries to mark attendance from a new device
    2. Gets blocked with 403
    3. Requests OTP via /auth/device-binding-otp
    4. Verifies OTP via /auth/verify-device-binding-otp
    5. Device is bound and subsequent requests succeed
    """
    # 1. Register and verify a student with a bound device
    register_payload = {
        "name": "Student OTP Test",
        "email": "student_otp@test.com",
        "password": "password123",
        "role": "student",
        "college_name": "Test College",
        "branch": "CSE",
        "roll": "CS002",
        "year": 2,
    }
    
    with patch(
        "app.core.email.BrevoEmailService.send_verification_email",
        new_callable=AsyncMock,
    ):
        response = await client.post("/auth/register", json=register_payload)
        if response.status_code == 500 and "topology" in response.text.lower():
            pytest.skip("MongoDB not available")
    
    await db.users.update_one(
        {"email": register_payload["email"]},
        {
            "$set": {
                "is_verified": True,
                "trusted_device_id": "device-A-12345",  # Pre-bind to device A
            }
        },
    )
    
    # 2. Login
    login_payload = {
        "email": register_payload["email"],
        "password": register_payload["password"],
    }
    response = await client.post("/auth/login", json=login_payload)
    assert response.status_code == 200
    token = response.json()["token"]
    
    # 3. Request OTP for new device
    with patch(
        "app.core.email.BrevoEmailService.send_otp_email",
        new_callable=AsyncMock,
    ) as mock_email:
        response = await client.post(
            "/auth/device-binding-otp",
            json={
                "email": register_payload["email"],
                "new_device_id": "device-B-67890",
            },
        )
        
        assert response.status_code == 200
        assert "OTP has been sent" in response.json()["message"]
        # Verify email was called
        mock_email.assert_called_once()
    
    # 4. Get the OTP from database (in real scenario, user gets it via email)
    user = await db.users.find_one({"email": register_payload["email"]})
    assert "device_binding_otp_hash" in user
    assert user.get("device_binding_new_device_id") == "device-B-67890"
    
    # For testing, we'll use a known OTP (in production, this would be from email)
    # We need to manually set a known OTP for testing
    test_otp = "123456"
    await db.users.update_one(
        {"email": register_payload["email"]},
        {"$set": {"device_binding_otp_hash": hash_password(test_otp)}},
    )
    
    # 5. Verify OTP
    response = await client.post(
        "/auth/verify-device-binding-otp",
        json={
            "email": register_payload["email"],
            "otp": test_otp,
            "new_device_id": "device-B-67890",
        },
    )
    
    assert response.status_code == 200
    assert "successfully bound" in response.json()["message"]
    
    # 6. Verify device was updated in database
    user = await db.users.find_one({"email": register_payload["email"]})
    assert user.get("trusted_device_id") == "device-B-67890"
    assert "device_binding_otp_hash" not in user  # OTP fields should be cleared


@pytest.mark.asyncio
async def test_teacher_login_no_device_cooldown(client: AsyncClient, db):
    """
    Test that teachers are exempt from the 5-hour device cooldown after logout.
    
    Scenario:
    1. Register and login as a teacher from Device A
    2. Logout
    3. Immediately login from Device B (different device)
    4. Should succeed without cooldown error
    """
    # 1. Register a teacher
    register_payload = {
        "name": "Teacher Cooldown Test",
        "email": "teacher_cooldown@test.com",
        "password": "password123",
        "role": "teacher",
        "college_name": "Test College",
        "employee_id": "EMP_CD001",
        "phone": "1234567890",
        "branch": "CSE",
    }
    
    with patch(
        "app.core.email.BrevoEmailService.send_verification_email",
        new_callable=AsyncMock,
    ):
        response = await client.post("/auth/register", json=register_payload)
        if response.status_code == 500 and "topology" in response.text.lower():
            pytest.skip("MongoDB not available")
    
    await db.users.update_one(
        {"email": register_payload["email"]}, {"$set": {"is_verified": True}}
    )
    
    # 2. Login from Device A
    response = await client.post(
        "/auth/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
        headers={"X-Device-ID": "device-A-12345"},
    )
    assert response.status_code == 200
    token_a = response.json()["token"]
    
    # 3. Logout
    response = await client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert response.status_code == 200
    
    # 4. Immediately login from Device B (should succeed for teachers)
    response = await client.post(
        "/auth/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
        headers={"X-Device-ID": "device-B-67890"},  # Different device
    )
    
    # Should succeed without cooldown error
    assert response.status_code == 200
    assert "DEVICE_COOLDOWN" not in response.json().get("detail", "")


@pytest.mark.asyncio
async def test_student_login_device_cooldown(client: AsyncClient, db):
    """
    Test that students are subject to the 5-hour device cooldown after logout.
    
    Scenario:
    1. Register and login as a student from Device A
    2. Logout
    3. Immediately login from Device B (different device)
    4. Should get 403 with cooldown error
    """
    # 1. Register a student
    register_payload = {
        "name": "Student Cooldown Test",
        "email": "student_cooldown@test.com",
        "password": "password123",
        "role": "student",
        "college_name": "Test College",
        "branch": "CSE",
        "roll": "CS003",
        "year": 2,
    }
    
    with patch(
        "app.core.email.BrevoEmailService.send_verification_email",
        new_callable=AsyncMock,
    ):
        response = await client.post("/auth/register", json=register_payload)
        if response.status_code == 500 and "topology" in response.text.lower():
            pytest.skip("MongoDB not available")
    
    await db.users.update_one(
        {"email": register_payload["email"]}, {"$set": {"is_verified": True}}
    )
    
    # 2. Login from Device A
    response = await client.post(
        "/auth/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
        headers={"X-Device-ID": "device-A-12345"},
    )
    assert response.status_code == 200
    token_a = response.json()["token"]
    
    # 3. Logout
    response = await client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert response.status_code == 200
    
    # 4. Immediately login from Device B (should be blocked for students)
    response = await client.post(
        "/auth/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
        headers={"X-Device-ID": "device-B-67890"},  # Different device
    )
    
    # Should get cooldown error
    assert response.status_code == 403
    assert "DEVICE_COOLDOWN" in response.json()["detail"]
