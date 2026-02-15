from pydantic import BaseModel, EmailStr, constr
from typing import Optional


# ----- Forgot Password flow (Issue #196) -----


class ForgotPasswordRequest(BaseModel):
    """Request body for POST /auth/forgot-password."""

    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """Response for forgot-password (generic success to avoid email enumeration)."""

    message: str = (
        "If an account exists with this email, you will receive an OTP shortly."
    )


class VerifyOtpRequest(BaseModel):
    """Request body for POST /auth/verify-otp."""

    email: EmailStr
    otp: constr(min_length=6, max_length=6, pattern=r"^\d{6}$")


class VerifyOtpResponse(BaseModel):
    """Response for verify-otp."""

    message: str = "OTP verified successfully."


class ResetPasswordRequest(BaseModel):
    """Request body for POST /auth/reset-password."""

    email: EmailStr
    otp: constr(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: constr(min_length=6, max_length=128)


class ResetPasswordResponse(BaseModel):
    """Response for reset-password."""

    message: str = "Password has been reset successfully. You can now log in."


# ----- Auth -----


class LoginRequest(BaseModel):
    email: str
    password: constr(max_length=72)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    user_id: str
    email: str
    role: str
    name: str
    college_name: str
    token: str
    refresh_token: str | None = None


class RegisterResponse(BaseModel):
    user_id: str
    email: str
    role: str
    name: str
    college_name: str


class RegisterRequest(BaseModel):
    role: str
    name: str
    email: EmailStr
    password: constr(min_length=6, max_length=128)
    college_name: str

    # Student
    branch: Optional[str] = None
    roll: Optional[str] = None
    year: Optional[str] = None

    # Teacher
    employee_id: Optional[str] = None
    phone: Optional[str] = None

    is_verified: bool = False
