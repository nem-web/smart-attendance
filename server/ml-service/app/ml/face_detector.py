import os
import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

MIN_FACE_AREA_RATIO = 0.04
NUM_JITTERS = 3

# Use absolute path resolution to ensure it works in Docker and all environments
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "blaze_face_short_range.tflite")

# Lazy-initialized detector — created on first use to avoid import-time crash
# if the model file has not yet been downloaded.
_detector = None


def _check_model_exists():
    """Check if the model file exists before attempting to load it."""
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model file not found: {model_path}. "
            "Please ensure the model file has been downloaded. "
            "Run 'python download_models.py' or check Docker volume mounts."
        )


def _get_detector():
    global _detector
    if _detector is None:
        # Check if model file exists before loading
        _check_model_exists()
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceDetectorOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            min_detection_confidence=0.6,
        )
        _detector = vision.FaceDetector.create_from_options(options)
    return _detector


def detect_faces(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Detect faces in image. Expects RGB (e.g. from PIL Image.convert('RGB'))."""
    # API sends RGB from PIL; MediaPipe expects RGB — use as-is.
    if image.ndim == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)

    # Create MediaPipe Image
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)

    # Detect faces
    result = _get_detector().detect(mp_image)

    if not result.detections:
        return []

    faces = []

    # Parse results - FaceDetector returns bounding box in pixels
    for detection in result.detections:
        bbox = detection.bounding_box
        x1 = bbox.origin_x
        y1 = bbox.origin_y
        w_box = bbox.width
        h_box = bbox.height

        x2 = x1 + w_box
        y2 = y1 + h_box

        # Ensure coordinates are within image bounds
        h, w = image.shape[:2]
        x1 = max(0, min(x1, w))
        y1 = max(0, min(y1, h))
        x2 = max(0, min(x2, w))
        y2 = max(0, min(y2, h))

        faces.append((y1, x2, y2, x1))

    return faces
