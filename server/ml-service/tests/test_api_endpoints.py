from fastapi.testclient import TestClient
from app.main import app
import base64
import numpy as np
import io
from PIL import Image

client = TestClient(app)


def create_dummy_image_b64(width=100, height=100):
    img = Image.fromarray(np.zeros((height, width, 3), dtype=np.uint8))
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
