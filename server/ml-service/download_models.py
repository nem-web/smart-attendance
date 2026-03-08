#!/usr/bin/env python3
"""
Download MediaPipe models required for the ML service.

This script downloads the BlazeFace Short Range model from MediaPipe's official sources.
It should be run during Docker build or container initialization.

The model is downloaded from one of the official MediaPipe model repositories:
1. Primary: Google Cloud Storage (mediapipe-assets)
2. Fallback: GitHub releases or alternative mirrors
"""

import sys
import urllib.request
from pathlib import Path

# MediaPipe BlazeFace Short Range model URLs (in priority order)
MODEL_URLS = [
    # Official Google Storage - primary source
    "https://storage.googleapis.com/mediapipe-assets/blaze_face_short_range.tflite",
    # Alternative from mediapipe-models bucket
    "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
    # GitHub raw content (if available as fallback)
    "https://github.com/google/mediapipe/raw/master/mediapipe/modules/face_detection/face_detection_short_range.tflite",
]

MODEL_NAME = "blaze_face_short_range.tflite"
FACE_LANDMARKER_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
FACE_LANDMARKER_NAME = "face_landmarker.task"

# Determine the target directory (app/ml/)
SCRIPT_DIR = Path(__file__).parent
ML_DIR = SCRIPT_DIR / "app" / "ml"
TARGET_PATH = ML_DIR / MODEL_NAME
LANDMARKER_TARGET_PATH = ML_DIR / FACE_LANDMARKER_NAME


def download_model():
    """Download the MediaPipe BlazeFace model if it doesn't exist."""
    # Create ML directory if it doesn't exist
    ML_DIR.mkdir(parents=True, exist_ok=True)

    # Check if model already exists
    if TARGET_PATH.exists() and TARGET_PATH.stat().st_size > 0:
        print(f"✓ Model already exists at {TARGET_PATH}")
        print(f"  File size: {TARGET_PATH.stat().st_size} bytes")
    else:
        # Try each URL in order
        success = False
        for i, url in enumerate(MODEL_URLS, 1):
            if success:
                break
            print(f"\n[Attempt {i}/{len(MODEL_URLS)}] Downloading from:")
            print(f"  {url}")
            try:
                tmp_target = TARGET_PATH.with_suffix(f"{TARGET_PATH.suffix}.tmp")
                urllib.request.urlretrieve(url, tmp_target)
                if tmp_target.exists() and tmp_target.stat().st_size > 1024:
                    tmp_target.replace(TARGET_PATH)
                    print(f"✓ Successfully downloaded model to {TARGET_PATH}")
                    success = True
                else:
                    print("❌ Downloaded file is too small or missing.")
                    if tmp_target.exists():
                        tmp_target.unlink()
            except Exception as e:
                print(f"❌ Failed to download from {url}: {e}")

        if not success:
            print("❌ Failed to download BlazeFace model from any source.")
            return False

    # Check if landmarker model already exists
    if LANDMARKER_TARGET_PATH.exists() and LANDMARKER_TARGET_PATH.stat().st_size > 0:
        print(f"✓ Landmarker model already exists at {LANDMARKER_TARGET_PATH}")
    else:
        print("\nDownloading Face Landmarker from:")
        print(f"  {FACE_LANDMARKER_MODEL_URL}")
        try:
            tmp_landmarker = LANDMARKER_TARGET_PATH.with_suffix(
                f"{LANDMARKER_TARGET_PATH.suffix}.tmp"
            )
            # from urllib.request import urlretrieve # Removed redundant import
            urllib.request.urlretrieve(FACE_LANDMARKER_MODEL_URL, tmp_landmarker)
            if tmp_landmarker.exists() and tmp_landmarker.stat().st_size > 1024:
                tmp_landmarker.replace(LANDMARKER_TARGET_PATH)
                print(
                    f"✓ Successfully downloaded landmarker to {LANDMARKER_TARGET_PATH}"
                )
            else:
                print("❌ Downloaded file is empty, too small, or missing.")
                if tmp_landmarker.exists():
                    tmp_landmarker.unlink()
                return False
        except Exception as e:
            print(f"❌ Failed to download landmarker: {e}")
            return False

    return True


if __name__ == "__main__":
    success = download_model()
    sys.exit(0 if success else 1)
