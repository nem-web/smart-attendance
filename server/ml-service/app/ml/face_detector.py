import cv2
import mediapipe as mp
import numpy as np

MIN_FACE_AREA_RATIO = 0.04
NUM_JITTERS = 3

mp_face = mp.solutions.face_detection
_detector = mp_face.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.6,
)

def detect_faces(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Detect faces in image. Expects RGB (e.g. from PIL Image.convert('RGB'))."""
    # API sends RGB from PIL; MediaPipe expects RGB — use as-is.
    if image.ndim == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    result = _detector.process(image)
    
    if not result.detections:
      return []
    
    h, w, _ = image.shape
    faces = []

    for det in result.detections:
      box = det.location_data.relative_bounding_box
      x1 = int(box.xmin * w)
      y1 = int(box.ymin * h)
      x2 = x1 + int(box.width * w)
      y2 = y1 + int(box.height * h)
      
      faces.append((y1,x2,y2,x1))
      
    return faces