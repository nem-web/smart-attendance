from app.core.security import hash_password, verify_password


def test_password_hashing():
    password = "secret_password"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_password_hashing_empty():
    password = ""
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True
