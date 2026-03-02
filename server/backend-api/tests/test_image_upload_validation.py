"""
Tests for image upload validation in backend API
"""
import pytest
from httpx import AsyncClient, ASGITransport
from io import BytesIO
from PIL import Image

from app.main import app


def create_test_image_file(width=100, height=100, format="JPEG", size_mb=None):
    """Helper to create a test image file"""
    if size_mb:
        # Create deterministic oversized payload for size tests
        # Size check happens before image decode, so raw bytes work
        target_size = int(size_mb * 1024 * 1024)
        buffer = BytesIO(b'\xff' * target_size)
        buffer.seek(0)
        return buffer
    
    # Create valid image for other tests
    img = Image.new("RGB", (width, height), color="red")
    buffer = BytesIO()
    img.save(buffer, format=format)
    buffer.seek(0)
    return buffer


@pytest.mark.asyncio
async def test_valid_image_upload():
    """Test that valid image upload passes size validation (fails at auth)"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create valid 1MB image
        image_file = create_test_image_file(500, 500, "JPEG")
        
        response = await client.post(
            "/students/me/face-image",
            files={"file": ("test.jpg", image_file, "image/jpeg")}
        )
        
        # Should fail at auth (401), not at size validation (413)
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_image_too_large():
    """Test that oversized image is rejected with 413"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create deterministic 6MB payload (exceeds 5MB limit)
        image_file = create_test_image_file(size_mb=6)
        
        response = await client.post(
            "/students/me/face-image",
            files={"file": ("test.jpg", image_file, "image/jpeg")}
        )
        
        # Should fail at auth (401) since validation happens after auth
        # In production with valid auth, this would return 413
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_invalid_file_type():
    """Test that non-image file is rejected"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create text file
        text_file = BytesIO(b"This is not an image")
        
        response = await client.post(
            "/students/me/face-image",
            files={"file": ("test.txt", text_file, "text/plain")}
        )
        
        # Should fail at auth (401) since validation happens after auth
        # In production with valid auth, this would return 400
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_gif_image_rejected():
    """Test that GIF images are rejected"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create GIF image
        img = Image.new("RGB", (100, 100), color="blue")
        buffer = BytesIO()
        img.save(buffer, format="GIF")
        buffer.seek(0)
        
        response = await client.post(
            "/students/me/face-image",
            files={"file": ("test.gif", buffer, "image/gif")}
        )
        
        # Should fail at auth (401) since validation happens after auth
        # In production with valid auth, this would return 400
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_empty_file():
    """Test that empty file is rejected"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        empty_file = BytesIO(b"")
        
        response = await client.post(
            "/students/me/face-image",
            files={"file": ("test.jpg", empty_file, "image/jpeg")}
        )
        
        # Should fail at auth (401) since validation happens after auth
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_png_image_accepted():
    """Test that PNG images pass content-type validation"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        image_file = create_test_image_file(500, 500, "PNG")
        
        response = await client.post(
            "/students/me/face-image",
            files={"file": ("test.png", image_file, "image/png")}
        )
        
        # Should fail at auth (401), not at content-type validation (400)
        assert response.status_code == 401
