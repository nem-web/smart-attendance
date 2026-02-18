from pydantic import BaseModel, EmailStr, constr


class SendDeviceBindingOtpRequest(BaseModel):
    """Request body for POST /auth/device-binding-otp."""

    email: EmailStr
    new_device_id: str


class SendDeviceBindingOtpResponse(BaseModel):
    """Response for sending device binding OTP."""

    message: str = "OTP has been sent to your registered email. Please verify within 10 minutes."


class VerifyDeviceBindingOtpRequest(BaseModel):
    """Request body for POST /auth/verify-device-binding-otp."""

    email: EmailStr
    otp: constr(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_device_id: str


class VerifyDeviceBindingOtpResponse(BaseModel):
    """Response for verifying device binding OTP."""

    message: str = "Device has been successfully bound to your account."
