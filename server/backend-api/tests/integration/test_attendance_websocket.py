import pytest
import jwt
from bson import ObjectId
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app
from app.utils.jwt_token import JWT_SECRET, JWT_ALGORITHM


def create_token(user_id, role="teacher"):
    payload = {
        "user_id": str(user_id),
        "role": role,
        "email": "test@teacher.com",
        "type": "access",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@pytest.fixture
def client():
    return TestClient(app)


def test_websocket_connect_success(client):
    user_id = ObjectId()
    token = create_token(user_id)
    session_id = "test-session"

    with patch("app.api.routes.attendance.db") as mock_db:
        mock_db.users.find_one = AsyncMock(
            return_value={"_id": user_id, "role": "teacher"}
        )

        with client.websocket_connect(f"/api/attendance/ws/{session_id}?token={token}"):
            # Just verify connection is accepted (context manager does this)
            pass


def test_websocket_process_frame(client):
    user_id = ObjectId()
    subject_id = ObjectId()
    token = create_token(user_id)
    session_id = "test-session"

    with patch("app.api.routes.attendance.db") as mock_db, \
         patch("app.api.routes.attendance.ml_client.detect_faces", new_callable=AsyncMock) as mock_detect, \
         patch("app.api.routes.attendance.ml_client.match_faces", new_callable=AsyncMock) as mock_match:

        # Setup mocks on mock_db
        mock_db.users.find_one = AsyncMock(
            return_value={"_id": user_id, "role": "teacher"}
        )

        mock_db.subjects.find_one = AsyncMock(
            return_value={
                "_id": subject_id,
                "students": [{"student_id": "std1", "verified": True}],
                "professor_ids": [user_id],  # Added to authorize teacher
            }
        )

        mock_detect.return_value = {
            "success": True,
            "faces": [
                {"embedding": [0.1] * 128, "location": {"top": 0}, "is_live": True}
            ],
        }

        # Mock cursor for students
        mock_cursor = AsyncMock()
        mock_cursor.to_list.return_value = [
            {"userId": "std1", "face_embeddings": [[0.1] * 128], "name": "Student 1"}
        ]
        mock_db.students.find.return_value = mock_cursor

        mock_match.return_value = {
            "success": True,
            "match": {"student_id": "std1", "distance": 0.1, "confidence": 0.9},
        }

        with client.websocket_connect(
            f"/api/attendance/ws/{session_id}?token={token}"
        ) as websocket:
            # Send frame
            websocket.send_json(
                {
                    "command": "process_frame",
                    "image": "base64image",
                    "subject_id": str(subject_id),
                }
            )

            # Expect messages
            # 1. processing_started
            msg1 = websocket.receive_json()
            assert msg1["type"] == "processing_started"
            assert msg1["pending"] == 1

            # 2. match_update
            msg2 = websocket.receive_json()
            assert msg2["type"] == "match_update"
            assert msg2["match"]["student"]["id"] == "std1"

            # 3. complete
            msg3 = websocket.receive_json()
            assert msg3["type"] == "complete"
