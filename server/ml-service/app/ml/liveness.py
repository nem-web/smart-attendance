import os
import cv2
import numpy as np
import mediapipe as mp
import logging
from app.core.config import settings

# Configure logger
logger = logging.getLogger(__name__)

# Liveness Configuration
ML_LIVENESS_CHECK = settings.ML_LIVENESS_CHECK
# Adjusted Defaults for Real-World Webcam Usage
# Lowered to catch only severe flat colors
LIVENESS_BLUR_THRESHOLD = int(os.getenv("LIVENESS_BLUR_THRESHOLD", "10"))
# Reject high-freq noise (screen moiré)
LIVENESS_BLUR_MAX_THRESHOLD = int(os.getenv("LIVENESS_BLUR_MAX_THRESHOLD", "800"))
# Lowered for low-light scenarios
LIVENESS_COLOR_MIN_STD = float(os.getenv("LIVENESS_COLOR_MIN_STD", "5.0"))
LIVENESS_FAIL_OPEN = os.getenv("LIVENESS_FAIL_OPEN", "false").lower() == "true"

mp_face_mesh = mp.solutions.face_mesh


def is_live(face_crop: np.ndarray) -> bool:
    """
    Check if the provided face crop represents a live person.

    This function performs multiple checks to determine liveness:
    1. **Face Mesh Validation**: Uses MediaPipe Face Mesh to ensure a valid 3D face
       structure exists.
    2. **Laplacian Variance**: Analyzes image sharpness to detect:
       - Blurriness/Flatness (Variance too low -> likely a photo/screen)
       - Excessive Noise/Moiré patterns (Variance too high -> likely a screen capture)
    3. **Color Standard Deviation**: Checks for sufficient color diversity to filter
       out low-quality spoofs or flat masks.

    Args:
        face_crop (np.ndarray): The cropped face image in BGR format (OpenCV default).

    Returns:
        bool: True if the face passes checks or checks are disabled/fail-open.
              False if a potential spoof is detected.
    """
    if not ML_LIVENESS_CHECK:
        return True

    if face_crop is None or face_crop.size == 0:
        return False

    # Ensure image is in RGB for MediaPipe
    rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)

    # --- Quality Checks ---
    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()

    # Range check on Variance:
    # - Too low (<10): Likely solid color, extremely blurry, or flat mask.
    # - Too high (>800): Likely screen moiré, printed halftone, or excessive noise.
    if variance < LIVENESS_BLUR_THRESHOLD:
        logger.warning(
            f"Spoof detected: Variance TOO LOW. "
            f"Score={variance:.2f} < {LIVENESS_BLUR_THRESHOLD}"
        )
        return False

    if variance > LIVENESS_BLUR_MAX_THRESHOLD:
        logger.warning(
            f"Spoof detected: Variance TOO HIGH (Screen Artifacts?). "
            f"Score={variance:.2f} > {LIVENESS_BLUR_MAX_THRESHOLD}"
        )
        return False

    # Color Diversity Check
    (mean, std) = cv2.meanStdDev(face_crop)
    avg_std = np.mean(std)

    if avg_std < LIVENESS_COLOR_MIN_STD:
        logger.warning(
            f"Spoof detected: Low color diversity (Flat/Low Light). "
            f"StdDev={avg_std:.2f} < {LIVENESS_COLOR_MIN_STD}"
        )
        return False

    # Log passing values for debugging
    logger.info(
        f"Liveness Checks Passed: Variance={variance:.2f}, StdDev={avg_std:.2f}"
    )
    try:
        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        ) as face_mesh:
            results = face_mesh.process(rgb)

            # If no landmarks detected, likely a spoof or bad crop
            if not results.multi_face_landmarks:
                logger.warning("Spoof detected: No face mesh constructed.")
                return False

            # --- Future enhancements ---
            # 3. Z-Depth Variance (Mesh flatness check)
            # 4. Blink Integration (requires multi-frame)

            return True

    except Exception as e:
        logger.error(f"Liveness check failed: {e}")
        return True if LIVENESS_FAIL_OPEN else False
