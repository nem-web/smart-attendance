"""Image validation utilities for ML service"""
import base64
from io import BytesIO
from PIL import Image
from typing import Tuple, Optional

from app.core.constants import (
    MAX_BASE64_SIZE,
    MAX_IMAGE_SIZE_BYTES,
    MAX_IMAGE_DIMENSION,
    ALLOWED_IMAGE_FORMATS,
    ERROR_IMAGE_TOO_LARGE,
    ERROR_INVALID_FORMAT,
    ERROR_INVALID_DIMENSIONS,
)


def validate_and_decode_image(
    image_base64: str,
) -> Tuple[bool, Optional[bytes], Optional[Image.Image], Optional[str], Optional[str]]:
    """
    Validate and decode base64 image with size and format checks.
    
    Args:
        image_base64: Base64 encoded image string
        
    Returns:
        Tuple of (success, image_bytes, image_pil, error_message, error_code)
    """
    # 1. Validate base64 string length (before decoding to save memory)
    if len(image_base64) > MAX_BASE64_SIZE:
        return (
            False,
            None,
            None,
            f"Image too large. Maximum size is {MAX_IMAGE_SIZE_BYTES // 1024 // 1024}MB",
            ERROR_IMAGE_TOO_LARGE,
        )
    
    # 2. Decode base64 with strict validation
    try:
        image_bytes = base64.b64decode(image_base64, validate=True)
    except Exception:
        return (
            False,
            None,
            None,
            "Invalid base64 encoding",
            ERROR_INVALID_FORMAT,
        )
    
    # 3. Validate decoded image size
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        return (
            False,
            None,
            None,
            f"Image size {len(image_bytes) // 1024 // 1024}MB exceeds maximum {MAX_IMAGE_SIZE_BYTES // 1024 // 1024}MB",
            ERROR_IMAGE_TOO_LARGE,
        )
    
    # 4. Open and validate image format
    try:
        image = Image.open(BytesIO(image_bytes))
        
        # Validate format
        if image.format not in ALLOWED_IMAGE_FORMATS:
            return (
                False,
                None,
                None,
                f"Invalid image format '{image.format}'. Only JPEG and PNG are supported",
                ERROR_INVALID_FORMAT,
            )
        
        # 5. Validate dimensions
        width, height = image.size
        if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
            return (
                False,
                None,
                None,
                f"Image dimensions {width}x{height} exceed maximum {MAX_IMAGE_DIMENSION}x{MAX_IMAGE_DIMENSION}",
                ERROR_INVALID_DIMENSIONS,
            )
        
        # Force decode to catch corrupted/truncated images during validation
        image.load()
        
        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        return (True, image_bytes, image, None, None)
        
    except Exception:
        return (
            False,
            None,
            None,
            "Failed to process image",
            ERROR_INVALID_FORMAT,
        )
