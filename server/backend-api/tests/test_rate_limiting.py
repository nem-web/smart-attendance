"""
Test rate limiting on OTP endpoints to prevent brute force attacks.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_verify_otp_rate_limiting():
    """Test that verify-otp endpoint is rate limited to 3 requests per minute."""
    # Use unique IP for this test to avoid interference
    transport = ASGITransport(app=app, client=("192.168.1.1", 12345))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Make 3 requests (should succeed or return 400 for invalid OTP)
        for i in range(3):
            response = await client.post(
                "/auth/verify-otp",
                json={"email": "test@example.com", "otp": "123456"},
            )
            # Should get 400 (invalid OTP) not 429 (rate limited)
            assert response.status_code in [400, 200]

        # 4th request should be rate limited
        response = await client.post(
            "/auth/verify-otp",
            json={"email": "test@example.com", "otp": "123456"},
        )
        assert response.status_code == 429
        assert "rate limit" in response.text.lower()
        # Verify Retry-After header is present
        assert "Retry-After" in response.headers
        assert int(response.headers["Retry-After"]) > 0


@pytest.mark.asyncio
async def test_reset_password_rate_limiting():
    """Test that reset-password endpoint is rate limited to 3 requests per minute."""
    # Use unique IP for this test
    transport = ASGITransport(app=app, client=("192.168.1.2", 12345))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Make 3 requests
        for i in range(3):
            response = await client.post(
                "/auth/reset-password",
                json={
                    "email": "test@example.com",
                    "otp": "123456",
                    "new_password": "NewPassword123!",
                },
            )
            assert response.status_code in [400, 200]

        # 4th request should be rate limited
        response = await client.post(
            "/auth/reset-password",
            json={
                "email": "test@example.com",
                "otp": "123456",
                "new_password": "NewPassword123!",
            },
        )
        assert response.status_code == 429
        # Verify Retry-After header
        assert "Retry-After" in response.headers
        assert int(response.headers["Retry-After"]) > 0


@pytest.mark.asyncio
async def test_verify_device_binding_otp_rate_limiting():
    """Test that verify-device-binding-otp endpoint is rate limited."""
    # Use unique IP for this test
    transport = ASGITransport(app=app, client=("192.168.1.3", 12345))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Make 3 requests
        for i in range(3):
            response = await client.post(
                "/auth/verify-device-binding-otp",
                json={
                    "email": "test@example.com",
                    "otp": "123456",
                    "new_device_id": "test-device-id",
                },
            )
            assert response.status_code in [400, 200]

        # 4th request should be rate limited
        response = await client.post(
            "/auth/verify-device-binding-otp",
            json={
                "email": "test@example.com",
                "otp": "123456",
                "new_device_id": "test-device-id",
            },
        )
        assert response.status_code == 429
        # Verify Retry-After header
        assert "Retry-After" in response.headers
        assert int(response.headers["Retry-After"]) > 0


@pytest.mark.asyncio
async def test_forgot_password_rate_limiting():
    """Test that forgot-password endpoint is rate limited to 5 requests per minute."""
    # Use unique IP for this test
    transport = ASGITransport(app=app, client=("192.168.1.4", 12345))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Make 5 requests (should succeed)
        for i in range(5):
            response = await client.post(
                "/auth/forgot-password",
                json={"email": "test@example.com"},
            )
            assert response.status_code in [200, 202]

        # 6th request should be rate limited
        response = await client.post(
            "/auth/forgot-password",
            json={"email": "test@example.com"},
        )
        assert response.status_code == 429
        # Verify Retry-After header
        assert "Retry-After" in response.headers
        assert int(response.headers["Retry-After"]) > 0


@pytest.mark.asyncio
async def test_rate_limit_per_ip():
    """Test that rate limits are applied per IP address independently."""
    # Create two clients with different IPs
    transport_ip1 = ASGITransport(app=app, client=("192.168.1.10", 12345))
    transport_ip2 = ASGITransport(app=app, client=("192.168.1.11", 12345))
    
    async with AsyncClient(transport=transport_ip1, base_url="http://test") as client1:
        # Exhaust rate limit for IP1
        for i in range(3):
            response = await client1.post(
                "/auth/verify-otp",
                json={"email": f"user{i}@example.com", "otp": "123456"},
            )
            assert response.status_code in [400, 200]

        # 4th request from IP1 should be rate limited
        response = await client1.post(
            "/auth/verify-otp",
            json={"email": "another@example.com", "otp": "123456"},
        )
        assert response.status_code == 429

    # IP2 should still be able to make requests
    async with AsyncClient(transport=transport_ip2, base_url="http://test") as client2:
        response = await client2.post(
            "/auth/verify-otp",
            json={"email": "different@example.com", "otp": "123456"},
        )
        # Should not be rate limited (different IP)
        assert response.status_code in [400, 200]
        assert response.status_code != 429
