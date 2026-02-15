import numpy as np
from app.ml.face_detector import detect_faces


def test_detect_faces_empty_image():
    # Test with a blank (black) image
    img = np.zeros((300, 300, 3), dtype=np.uint8)

    # Run detection
    faces = detect_faces(img)

    # Expect no faces
    assert isinstance(faces, list)
    assert len(faces) == 0


def test_detect_faces_grayscale():
    # Test with a grayscale image (should auto-convert)
    img = np.zeros((300, 300), dtype=np.uint8)

    faces = detect_faces(img)
    assert len(faces) == 0
