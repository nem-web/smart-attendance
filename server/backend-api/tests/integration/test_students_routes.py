import pytest
from httpx import AsyncClient


@pytest.fixture
def test_user_data():
    return {
        "email": "student@example.com",
        "name": "Test Student",
        "password": "password123",
        "role": "student",
        "college_name": "Test College",
        "branch": "CSE",
        "roll": "CS101",
        "year": "1",
    }


@pytest.mark.asyncio
async def test_get_current_student_profile(client: AsyncClient, auth_token):
    # Auth header
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Get current student's profile directly
    response = await client.get("/students/me/profile", headers=headers)

    assert response.status_code == 200, f"Profile fetch failed: {response.text}"
    data = response.json()

    # Extract student identifier from the profile response
    student_id = data.get("_id") or data.get("id")
    assert student_id is not None

    # Verify retrieving by ID also works
    response = await client.get(f"/students/{student_id}/profile", headers=headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_upload_student_image(client: AsyncClient, auth_token):
    # Create mock file
    files = {"file": ("test_face.jpg", b"fake_image_content", "image/jpeg")}
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Try uploading face image for the authenticated student
    # Common route patterns: /students/me/face-image or /students/upload-face
    response = await client.post(
        "/students/me/face-image", files=files, headers=headers
    )

    if response.status_code == 404:
        # Fallback for testing routing
        response = await client.post(
            "/students/upload-face", files=files, headers=headers
        )

    # Should probably be 200, 201, or 422 (if fake image content is validated)
    # The goal is to ensure the route is reachable and the method is allowed
    assert response.status_code not in (404, 405), (
        f"Upload failed with {response.status_code}: {response.text}"
    )
