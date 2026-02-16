from fastapi.testclient import TestClient
from app.main import app
import base64
import numpy as np
import io
from PIL import Image
from app.core.config import settings
from unittest.mock import patch
import app.api.routes.face_recognition as fr_module

client = TestClient(app)
client.headers = {"X-API-KEY": settings.API_KEY}


def create_dummy_image_b64(width=100, height=100):
    # Ensure non-zero content to avoid divide-by-zero in normalization
    arr = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "service" in response.json()


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_encode_face_no_face():
    b64_img = create_dummy_image_b64()
    response = client.post("/api/ml/encode-face", json={"image_base64": b64_img})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "No face detected" in data["error"]


def test_detect_faces_empty():
    b64_img = create_dummy_image_b64()
    response = client.post("/api/ml/detect-faces", json={"image_base64": b64_img})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["faces"]) == 0


def test_match_faces():
    # Mock embeddings
    emb1 = [0.1] * 128
    emb2 = [0.1] * 128  # Same
    emb3 = [0.9] * 128  # Different

    # Normalize
    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)
    norm3 = np.linalg.norm(emb3)

    emb1 = [float(x / norm1) for x in emb1]
    emb2 = [float(x / norm2) for x in emb2]
    emb3 = [float(x / norm3) for x in emb3]

    payload = {
        "query_embedding": emb1,
        "candidate_embeddings": [
            {"student_id": "student1", "embeddings": [emb2]},
            {"student_id": "student2", "embeddings": [emb3]},
        ],
        "threshold": 0.5,
    }

    response = client.post("/api/ml/match-faces", json=payload)
    assert response.status_code == 200
    data = response.json()
    if not data["success"]:
        print(data)
    assert data["success"] is True
    assert data["match"]["student_id"] == "student1"


def test_encode_face_success():
    b64_img = create_dummy_image_b64()
    # Mock detect_faces using patch.object to ensure we hit the right module reference
    with patch.object(fr_module, "detect_faces") as mock_detect:
        # Mock must return list of (x,y,w,h) tuples
        mock_detect.return_value = [(10, 10, 50, 50)]

        response = client.post("/api/ml/encode-face", json={"image_base64": b64_img})
        assert response.status_code == 200
        data = response.json()

        if not data["success"]:
            print(f"DEBUG FAIL: {data}")

        assert data["success"] is True
        assert "embedding" in data
        assert len(data["embedding"]) > 0


def test_detect_faces_success():
    b64_img = create_dummy_image_b64()
    with patch.object(fr_module, "detect_faces") as mock_detect:
        mock_detect.return_value = [(10, 10, 50, 50)]

        response = client.post("/api/ml/detect-faces", json={"image_base64": b64_img})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["faces"]) == 1
        loc = data["faces"][0]["location"]
        assert loc["top"] == 10
        assert loc["left"] == 10
        assert loc["right"] == 60
        assert loc["bottom"] == 60
