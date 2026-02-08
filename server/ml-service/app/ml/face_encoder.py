from typing import List

import cv2
import numpy as np

MIN_FACE_AREA_RATIO = 0.05  # face must cover at least 5% of image
NUM_JITTERS = 5  # stronger embedding (1 is default)


def get_face_embedding(face_img: np.ndarray) -> List[float]:
    """Embedding from face crop. Expects RGB (e.g. from PIL/API)."""
    if face_img.ndim == 2:
        gray = face_img
    else:
        gray = cv2.cvtColor(face_img, cv2.COLOR_RGB2GRAY)
    resized = cv2.resize(gray, (96,96))
    emb = resized.flatten().astype("float32")
    emb /= np.linalg.norm(emb)
    return emb.tolist()
