"""
Unit tests for forgot-password flow (Issue #196, #226).

Covers hashed OTP storage, brute-force limit 
(5 attempts), generic 400
for enumeration protection, and BrevoEmailService usage.
"""
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture(autouse=True)
def mock_deps():
    """Patch DB and Brevo so tests need no live services."""
    with patch("app.api.routes.auth.db") as mock_db:
        with patch("app.api.routes.auth.BrevoEmailService") as mock_brevo:
            yield mock_db, mock_brevo


@pytest.fixture
def client(mock_deps):
    """FastAPI test client with auth router only."""
    import sys
    from fastapi.testclient import TestClient
    from fastapi import FastAPI
    from app.api.routes.auth import router

    sys.modules["app.db.mongo"] = MagicMock()
    sys.modules["app.db.mongo"].db = mock_deps[0]
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_forgot_password_user_not_found_returns_200(client, mock_deps):
    """When user does not exist, return 200 with generic message (no enumeration)."""
    mock_db, _ = mock_deps
    mock_db.users.find_one = AsyncMock(return_value=None)

    response = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})

    assert response.status_code == 200
    assert "message" in response.json()
    mock_db.users.update_one.assert_not_called()


def test_forgot_password_user_exists_stores_hashed_otp(client, mock_deps):
    """When user exists, set reset_otp_hash (hashed),
    otp_expiry, otp_failed_attempts=0."""
    mock_db, mock_brevo = mock_deps
    mock_db.users.find_one = AsyncMock(return_value={"_id": "user123", "email": "u@x.com", "name": "User"})
    mock_db.users.update_one = AsyncMock()

    response = client.post("/auth/forgot-password", json={"email": "u@x.com"})

    assert response.status_code == 200
    mock_db.users.update_one.assert_called_once()
    call = mock_db.users.update_one.call_args
    set_doc = call[0][1]["$set"]
    assert "reset_otp_hash" in set_doc
    assert set_doc.get("otp_failed_attempts") == 0
    assert "otp_expiry" in set_doc
    # OTP sent to email is plaintext; stored value must be hash (not 6-digit)
    assert len(set_doc["reset_otp_hash"]) > 6


def test_verify_otp_user_not_found_400_generic(client, mock_deps):
    """verify-otp returns 400 'Invalid or expired OTP'
    for unknown email (no enumeration)."""
    mock_db, _ = mock_deps
    mock_db.users.find_one = AsyncMock(return_value=None)

    response = client.post(
        "/auth/verify-otp",
        json={"email": "nobody@example.com", "otp": "123456"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired OTP"


def test_verify_otp_expired_400_generic_and_increments_attempts(client, mock_deps):
    """verify-otp returns 400 and increments otp_failed_attempts 
    when OTP is expired."""
    mock_db, _ = mock_deps
    past = datetime.now(timezone.utc) - timedelta(minutes=15)
    mock_db.users.find_one = AsyncMock(return_value={
        "_id": "user123",
        "email": "u@x.com",
        "reset_otp_hash": "hashed",
        "otp_expiry": past,
        "otp_failed_attempts": 0,
    })
    mock_db.users.update_one = AsyncMock()

    response = client.post(
        "/auth/verify-otp",
        json={"email": "u@x.com", "otp": "123456"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired OTP"
    mock_db.users.update_one.assert_called()
    # Should have incremented otp_failed_attempts
    inc_calls = [c for c in mock_db.users.update_one.call_args_list if c[0][1].get("$inc")]
    assert len(inc_calls) >= 1


def test_verify_otp_invalid_otp_400_generic(client, mock_deps):
    """verify-otp returns 400 'Invalid or expired OTP' 
    when OTP does not match (hashed check)."""
    mock_db, _ = mock_deps
    future = datetime.now(timezone.utc) + timedelta(minutes=5)
    mock_db.users.find_one = AsyncMock(return_value={
        "_id": "user123",
        "email": "u@x.com",
        "reset_otp_hash": "stored_hash",
        "otp_expiry": future,
        "otp_failed_attempts": 0,
    })
    mock_db.users.update_one = AsyncMock()

    with patch("app.api.routes.auth.verify_password", return_value=False):
        response = client.post(
            "/auth/verify-otp",
            json={"email": "u@x.com", "otp": "123456"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired OTP"


def test_verify_otp_success_200(client, mock_deps):
    """verify-otp returns 200 when OTP is valid 
    (verify_password returns True)."""
    mock_db, _ = mock_deps
    future = datetime.now(timezone.utc) + timedelta(minutes=5)
    mock_db.users.find_one = AsyncMock(return_value={
        "_id": "user123",
        "email": "u@x.com",
        "reset_otp_hash": "stored_hash",
        "otp_expiry": future,
        "otp_failed_attempts": 0,
    })

    with patch("app.api.routes.auth.verify_password", return_value=True):
        response = client.post(
            "/auth/verify-otp",
            json={"email": "u@x.com", "otp": "123456"},
        )

    assert response.status_code == 200
    assert "message" in response.json()


def test_verify_otp_five_failures_clears_otp(client, mock_deps):
    """After 5 failed verify-otp attempts, OTP fields
    are cleared."""
    mock_db, _ = mock_deps
    future = datetime.now(timezone.utc) + timedelta(minutes=5)
    mock_db.users.find_one = AsyncMock(return_value={
        "_id": "user123",
        "email": "u@x.com",
        "reset_otp_hash": "stored_hash",
        "otp_expiry": future,
        "otp_failed_attempts": 4,
    })
    mock_db.users.update_one = AsyncMock()

    with patch("app.api.routes.auth.verify_password", return_value=False):
        response = client.post(
            "/auth/verify-otp",
            json={"email": "u@x.com", "otp": "000000"},
        )

    assert response.status_code == 400
    # Should have incremented to 5 and then cleared OTP (unset)
    unset_calls = [c for c in mock_db.users.update_one.call_args_list if c[0][1].get("$unset")]
    assert len(unset_calls) >= 1
    assert "reset_otp_hash" in unset_calls[0][0][1]["$unset"]


def test_reset_password_user_not_found_400_generic(client, mock_deps):
    """reset-password returns 400 'Invalid or expired OTP'
    for unknown email."""
    mock_db, _ = mock_deps
    mock_db.users.find_one = AsyncMock(return_value=None)

    response = client.post(
        "/auth/reset-password",
        json={"email": "nobody@example.com", "otp": "123456", "new_password": "newPass123"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired OTP"


def test_reset_password_invalid_otp_400_generic(client, mock_deps):
    """reset-password returns 400 when verify_password fails."""
    mock_db, _ = mock_deps
    future = datetime.now(timezone.utc) + timedelta(minutes=5)
    mock_db.users.find_one = AsyncMock(return_value={
        "_id": "user123",
        "email": "u@x.com",
        "reset_otp_hash": "stored_hash",
        "otp_expiry": future,
    })
    mock_db.users.update_one = AsyncMock()

    with patch("app.api.routes.auth.verify_password", return_value=False):
        response = client.post(
            "/auth/reset-password",
            json={"email": "u@x.com", "otp": "123456", "new_password": "newPass123"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired OTP"
    mock_db.users.update_one.assert_not_called()


def test_reset_password_success_200_and_clears_otp(client, mock_deps):
    """reset-password updates password and unsets all OTP 
    fields."""
    mock_db, _ = mock_deps
    future = datetime.now(timezone.utc) + timedelta(minutes=5)
    mock_db.users.find_one = AsyncMock(return_value={
        "_id": "user123",
        "email": "u@x.com",
        "reset_otp_hash": "stored_hash",
        "otp_expiry": future,
    })
    mock_db.users.update_one = AsyncMock()

    with patch("app.api.routes.auth.verify_password", return_value=True):
        with patch("app.api.routes.auth.hash_password", return_value="new_hash"):
            response = client.post(
                "/auth/reset-password",
                json={"email": "u@x.com", "otp": "123456", "new_password": "newPass123"},
            )

    assert response.status_code == 200
    assert "message" in response.json()
    mock_db.users.update_one.assert_called_once()
    call = mock_db.users.update_one.call_args
    assert call[0][1]["$set"]["password_hash"] == "new_hash"
    assert "reset_otp_hash" in call[0][1]["$unset"]
    assert "otp_expiry" in call[0][1]["$unset"]
    assert "otp_failed_attempts" in call[0][1]["$unset"]
