import pytest
from bson import ObjectId
from unittest.mock import AsyncMock, patch


@pytest.fixture(autouse=True)
def mock_deps():
    """Patch DB so tests need no live services."""
    with patch("app.api.routes.analytics.db") as mock_db:
        yield mock_db


subjects_collection = AsyncMock()
users_collection = AsyncMock()


@pytest.fixture
def client(mock_deps):
    """FastAPI test client with auth/analytics router."""
    from fastapi.testclient import TestClient
    from fastapi import FastAPI
    from app.api.routes.analytics import router

    # Mock verify_token logic or override dependency
    # Usually better to override get_current_user

    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_get_subject_analytics_success(client):
    """Test successful retrieval of subject analytics."""

    teacher_id = ObjectId()
    subject_id = ObjectId()
    student1_id = ObjectId()
    student2_id = ObjectId()

    # Mock Current User (Teacher)
    app = client.app
    from app.core.security import get_current_user

    app.dependency_overrides[get_current_user] = lambda: {
        "id": str(teacher_id),
        "role": "teacher",
        "email": "teacher@test.com",
    }

    # Mock Data
    subject_doc = {
        "_id": subject_id,
        "name": "Math",
        "professor_ids": [teacher_id],
        "students": [
            {
                "student_id": student1_id,
                "attendance": {"present": 18, "absent": 2},  # 90%
            },
            {
                "student_id": student2_id,
                "attendance": {"present": 5, "absent": 5},  # 50%
            },
        ],
    }

    student1_doc = {"_id": student1_id, "name": "Alice"}
    student2_doc = {"_id": student2_id, "name": "Bob"}

    # Setup Mocks
    from app.api.routes.analytics import db

    db.subjects.find_one = AsyncMock(return_value=subject_doc)

    # Mock Cursor for users
    mock_cursor = AsyncMock()
    mock_cursor.__aiter__.return_value = [student1_doc, student2_doc]
    db.users.find.return_value = mock_cursor

    response = client.get(f"/api/analytics/subject/{subject_id}")

    assert response.status_code == 200
    data = response.json()

    assert data["attendance"] == 70.0  # (90 + 50) / 2
    assert data["riskCount"] == 1  # Bob < 75%

    # Check Leaderboard
    best = data["bestPerforming"]
    assert len(best) >= 1
    assert best[0]["name"] == "Alice"
    assert best[0]["score"] == 90.0

    # Check Needs Support
    worst = data["needsSupport"]
    assert len(worst) >= 1
    assert worst[0]["name"] == "Bob"
    assert worst[0]["score"] == 50.0


def test_get_subject_analytics_forbidden(client):
    """Test access denied if teacher not owner."""
    teacher_id = ObjectId()
    other_teacher_id = ObjectId()
    subject_id = ObjectId()

    app = client.app
    from app.core.security import get_current_user

    app.dependency_overrides[get_current_user] = lambda: {
        "id": str(teacher_id),
        "role": "teacher",
    }

    subject_doc = {
        "_id": subject_id,
        "professor_ids": [other_teacher_id],  # Different owner
    }

    from app.api.routes.analytics import db

    db.subjects.find_one = AsyncMock(return_value=subject_doc)

    response = client.get(f"/api/analytics/subject/{subject_id}")
    assert response.status_code == 403
