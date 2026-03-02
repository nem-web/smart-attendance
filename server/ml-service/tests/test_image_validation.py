"""
Tests for image validation in ML service
"""
import pytest
import base64
from io import BytesIO
from PIL import Image
import numpy as np

from app.utils.image_validation import validate_and_decode_image
from app.core.constants import (
    ERROR_IMAGE_TOO_LARGE,
    ERROR_INVALID_FORMAT,
    ERROR_INVALID_DIMENSIONS,
)


def create_test_image(width=100, height=100, format="JPEG"):
    """Helper to create a test image"""
    img = Image.new("RGB", (width, height), color="red")
    buffer = BytesIO()
    img.save(buffer, format=format)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def test_valid_jpeg_image():
    """Test that valid JPEG image passes validation"""
    image_base64 = create_test_image(500, 500, "JPEG")
    success, image_bytes, image, error_msg, error_code = validate_and_decode_image(
        image_base64
    )
    
    assert success is True
    assert image_bytes is not None
    assert image is not None
    assert error_msg is None
    assert error_code is None
    assert image.format == "JPEG"


def test_valid_png_image():
    """Test that valid PNG image passes validation"""
    image_base64 = create_test_image(500, 500, "PNG")
    success, image_bytes, image, error_msg, error_code = validate_and_decode_image(
        image_base64
    )
    
    assert success is True
    assert image is not None
    assert image.format == "PNG"


def test_image_too_large_base64():
    """Test that oversized base64 string is rejected"""
    # Create a string larger than MAX_BASE64_SIZE
    large_base64 = "A" * 8_000_000  # 8MB base64 string
    
    success, image_bytes, image, error_msg, error_code = validate_and_decode_image(
        large_base64
    )
    
    assert success is False
    assert error_code == ERROR_IMAGE_TOO_LARGE
    assert "too large" in error_msg.lower()


def test_invalid_base64():
    """Test that invalid base64 string is rejected"""
    invalid_base64 = "not-valid-base64!@#$%"
    
    success, image_bytes, image, error_msg, error_code = validate_and_decode_image(
        invalid_base64
    )
    
    assert success is False
    assert error_code == ERROR_INVALID_FORMAT
    assert "invalid base64" in error_msg.lower()


def test_invalid_image_format():
    """Test that non-JPEG/PNG formats are rejected"""
    # Create a GIF image
    img = Image.new("RGB", (100, 100), color="blue")
    buffer = BytesIO()
    img.save(buffer, format="GIF")
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode("utf-8")
    
    success, image_bytes, image, error_msg, error_code = validate_and_decode_image(
        image_base64
    )
    
    assert success is False
    assert error_code == ERROR_INVALID_FORMAT
    assert "invalid image format" in error_msg.lower()


def test_image_dimensions_too_large():
    """Test that images with dimensions exceeding limit are rejected"""
    # Create image larger than MAX_IMAGE_DIMENSION (4096)
    image_base64 = create_test_image(5000, 5000, "JPEG")
    
    success, image_bytes, image, error_msg, error_code = validate_and_decode_image(
        image_base64
    )
    
    assert success is False
    assert error_code == ERROR_INVALID_DIMENSIONS
    assert "dimensions" in error_msg.lower()


def test_image_at_max_dimensions():
    """Test that image at exactly max dimensions is accepted"""
    image_base64 = create_test_image(4096, 4096, "JPEG")
    
    success, image_bytes, image, error_msg, error_code = validate_and_decode_image(
        image_base64
    )
    
    assert success is True
    assert image is not None


def test_corrupted_image_data():
    """Test that corrupted image data is rejected"""
    # Create valid base64 but invalid image data
    corrupted_base64 = base64.b64encode(b"not an image").decode("utf-8")
    
    success, image_bytes, image, error_msg, error_code = validate_and_decode_image(
        corrupted_base64
    )
    
    assert success is False
    assert error_code == ERROR_INVALID_FORMAT


def test_empty_base64():
    """Test that empty base64 string is rejected"""
    success, image_bytes, image, error_msg, error_code = validate_and_decode_image("")
    
    assert success is False
    assert error_code == ERROR_INVALID_FORMAT


def test_rgb_conversion():
    """Test that non-RGB images are converted to RGB"""
    # Create RGBA image
    img = Image.new("RGBA", (100, 100), color=(255, 0, 0, 128))
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode("utf-8")
    
    success, image_bytes, image, error_msg, error_code = validate_and_decode_image(
        image_base64
    )
    
    assert success is True
    assert image.mode == "RGB"
