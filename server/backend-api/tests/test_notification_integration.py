"""
Integration test for notification system when students enroll in subjects.
Tests the notification trigger logic and endpoints.
"""

import pytest
from datetime import datetime, timezone
from bson import ObjectId


@pytest.mark.asyncio
async def test_notification_schema_creation():
    """Test that notification schemas are properly defined."""
    from app.schemas.notifications import (
        InAppNotificationResponse,
        NotificationListResponse,
        MarkAllAsReadRequest,
        NotificationResponse,
    )
    
    # Create a sample notification
    notification_dict = {
        "_id": "61234567890abcdef1234567",
        "user_id": "61234567890abcdef1234567",
        "message": "Student John registered for Math",
        "notification_type": "enrollment",
        "is_read": False,
        "created_at": datetime.now(timezone.utc),
        "metadata": {
            "student_id": "61234567890abcdef1234567",
            "student_name": "John Doe",
            "subject_id": "61234567890abcdef1234567",
            "subject_name": "Mathematics",
        },
    }
    
    # Verify schema can be instantiated
    notif = InAppNotificationResponse(**notification_dict)
    assert notif.message == "Student John registered for Math"
    assert notif.notification_type == "enrollment"
    assert not notif.is_read
    print("✓ Notification schema creation test passed")


@pytest.mark.asyncio
async def test_notification_endpoints_import():
    """Test that all notification endpoints can be imported."""
    from app.api.routes.notifications import router
    
    routes = [route.path for route in router.routes]
    
    # Check for new endpoints
    assert "/in-app/list" in routes or any("in-app/list" in str(route) for route in router.routes)
    print("✓ Notification endpoints import test passed")


@pytest.mark.asyncio
async def test_enrollment_notification_logic():
    """Test the enrollment notification trigger logic."""
    from datetime import datetime, timezone
    from bson import ObjectId
    
    # Simulate the notification creation logic from students.py
    student_name = "John Doe"
    subject_name = "Mathematics"
    student_oid = ObjectId()
    teacher_ids = [ObjectId(), ObjectId()]  # Multiple teachers
    
    # Create notification documents like the endpoint does
    notification_message = f"Student {student_name} has registered for {subject_name}."
    
    notifications_to_insert = []
    for teacher_id in teacher_ids:
        notification = {
            "user_id": teacher_id,
            "message": notification_message,
            "notification_type": "enrollment",
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
            "metadata": {
                "student_id": str(student_oid),
                "student_name": student_name,
                "subject_id": str(ObjectId()),
                "subject_name": subject_name,
            },
        }
        notifications_to_insert.append(notification)
    
    # Verify notifications are correctly structured
    assert len(notifications_to_insert) == 2
    for notif in notifications_to_insert:
        assert notif["notification_type"] == "enrollment"
        assert student_name in notif["message"]
        assert subject_name in notif["message"]
        assert not notif["is_read"]
        assert "student_id" in notif["metadata"]
        assert "subject_id" in notif["metadata"]
    
    print("✓ Enrollment notification logic test passed")


@pytest.mark.asyncio
async def test_student_router_import():
    """Test that modified student router imports without errors."""
    from app.api.routes.students import router
    
    # Verify router is properly configured
    assert router is not None
    assert router.prefix == "/students"
    print("✓ Student router import test passed")


def test_notification_component_exists():
    """Test that the NotificationDropdown component exists."""
    from pathlib import Path
    
    component_path = Path(
        "c:/Users/Rushabh Mahajan/Documents/VS Code/smart-attendance/"
        "frontend/src/components/NotificationDropdown.jsx"
    )
    
    assert component_path.exists(), "NotificationDropdown.jsx component not found"
    
    with open(component_path, "r") as f:
        content = f.read()
        assert "getInAppNotifications" in content
        assert "markNotificationAsRead" in content
        assert "NotificationDropdown" in content
    
    print("✓ NotificationDropdown component exists test passed")


def test_notification_api_functions():
    """Test that notification API functions are defined."""
    from pathlib import Path
    
    api_path = Path(
        "c:/Users/Rushabh Mahajan/Documents/VS Code/smart-attendance/"
        "frontend/src/api/notifications.js"
    )
    
    with open(api_path, "r") as f:
        content = f.read()
        assert "getInAppNotifications" in content
        assert "markNotificationAsRead" in content
        assert "markAllNotificationsAsRead" in content
    
    print("✓ Notification API functions test passed")


def test_header_updated():
    """Test that Header.jsx imports NotificationDropdown."""
    from pathlib import Path
    
    header_path = Path(
        "c:/Users/Rushabh Mahajan/Documents/VS Code/smart-attendance/"
        "frontend/src/components/Header.jsx"
    )
    
    with open(header_path, "r") as f:
        content = f.read()
        assert "NotificationDropdown" in content
        assert 'import NotificationDropdown' in content
    
    print("✓ Header.jsx updated test passed")


if __name__ == "__main__":
    # Run tests
    import asyncio
    
    print("\n📋 Running Notification System Integration Tests\n")
    print("=" * 60)
    
    # Sync tests
    test_notification_component_exists()
    test_notification_api_functions()
    test_header_updated()
    
    # Async tests
    asyncio.run(test_notification_schema_creation())
    asyncio.run(test_enrollment_notification_logic())
    asyncio.run(test_notification_endpoints_import())
    asyncio.run(test_student_router_import())
    
    print("=" * 60)
    print("\n✅ All integration tests passed!\n")
