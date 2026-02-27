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


def _get_detector():
    global _detector
    if _detector is None:
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

        faces.append((y1, x2, y2, x1))

    return faces
