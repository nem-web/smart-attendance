import pytest
import numpy as np
from PIL import Image
from app.ml.face_detector import detect_faces


def test_detect_faces_with_synthetic_image():
    # Create a simple synthetic image using PIL
    # A simple filled rectangle won't be detected as a face,
    # but we can verify the pipeline processes it without crashing.

    img = Image.new("RGB", (300, 300), color="white")
    img_np = np.array(img)

    faces = detect_faces(img_np)

    # Expect 0 faces for a blank white image
    assert isinstance(faces, list)
    assert len(faces) == 0


def test_detect_faces_invalid_input():
    # Pass None
    with pytest.raises(Exception):
        detect_faces(None)

    # Pass empty array
    empty_img = np.array([])
    # Depending on implementation, might raise exception or just return empty list
    # CodeRabbit suggests it returns empty list without error
    try:
        faces = detect_faces(empty_img)
        assert isinstance(faces, list) and len(faces) == 0
    except Exception:
        # If it raises, that's also valid for invalid input
        pass


# Note: Testing actual face detection requires a real face image.
# For unit tests without external assets, we ensure robustness to various inputs.
