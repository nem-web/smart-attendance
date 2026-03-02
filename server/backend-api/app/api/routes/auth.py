import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from datetime import datetime, timedelta, timezone
import secrets
import os
import jwt
from bson import ObjectId
from app.utils.jwt_token import (
    create_access_token,
    create_refresh_token,
    decode_jwt,
    generate_session_id,
    hash_session_id,
)
from urllib.parse import quote

from ...schemas.auth import (
    RegisterRequest,
    UserResponse,
    LoginRequest,
    RefreshTokenRequest,
    RegisterResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from ...schemas.device_binding import (
    SendDeviceBindingOtpRequest,
    SendDeviceBindingOtpResponse,
    VerifyDeviceBindingOtpRequest,
    VerifyDeviceBindingOtpResponse,
)
from ...core.security import hash_password, verify_password

# from ...core.email import send_verification_email
from ...core.email import BrevoEmailService
from ...core.config import BACKEND_BASE_URL
from ...db.mongo import db
from ...core.limiter import limiter
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])
oauth = OAuth()

# NOTE: Rate limiter uses slowapi's get_remote_address() which extracts IP from request.client
# For production deployments behind reverse proxies (nginx, load balancer), ensure the proxy
# forwards the real client IP via X-Forwarded-For header and configure trusted proxy middleware
# in main.py to parse it correctly. Otherwise, all requests will be rate-limited by proxy IP.
# See: https://slowapi.readthedocs.io/en/latest/#using-x-forwarded-for


@router.post("/register", response_model=RegisterResponse)
@limiter.limit("5/hour")
async def register(
    request: Request, payload: RegisterRequest, background_tasks: BackgroundTasks
):
    # Check existing user
    existing = await db.users.find_one({"email": payload.email})

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate random verification link
    verification_token = secrets.token_urlsafe(32)
    verification_expiry = datetime.now(timezone.utc) + timedelta(hours=24)

    if len(payload.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password too long. Please use at most 72 characters",
        )

    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "college_name": payload.college_name,
        "is_verified": os.getenv("ENVIRONMENT") == "development",
        "verification_token": verification_token,
        "verification_expiry": verification_expiry,
        "created_at": datetime.now(timezone.utc),
        "trusted_device_id": None,
    }
    # Insert into users collection
    try:
        result = await db.users.insert_one(user_doc)
        created_user_id = result.inserted_id
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create user") from e

    # Insert into role specific collections
    try:
        if payload.role == "student":
            student_doc = {
                "userId": created_user_id,
                "name": payload.name,
                "email": payload.email,
                "college_name": payload.college_name,
                "branch": payload.branch,
                "roll": payload.roll,
                "year": payload.year,
                "created_at": datetime.now(timezone.utc),
            }
            await db.students.insert_one(student_doc)

        elif payload.role == "teacher":
            if not payload.employee_id:
                raise HTTPException(status_code=400, detail="Employee ID required")
            if not payload.phone:
                raise HTTPException(status_code=400, detail="Phone number required")

            teacher_doc = {
                "userId": created_user_id,
                "employee_id": payload.employee_id,
                "college_name": payload.college_name,
                "phone": payload.phone,
                "branch": payload.branch,
                "subjects": [],
                "avatarUrl": None,
                "department": None,
                "settings": {
                    "theme": "Light",
                    "notifications": {
                        "push": True,
                        "inApp": True,
                        "sound": False,
                    },
                    "emailPreferences": [],
                    "thresholds": {
                        "warningVal": 75,
                        "safeVal": 85,
                    },
                    "faceSettings": {
                        "sensitivity": 80,
                        "liveness": True,
                    },
                },
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
            }

            await db.teachers.insert_one(teacher_doc)

    except HTTPException:
        await db.users.delete_one({"_id": created_user_id})
        raise
    except Exception as e:
        await db.users.delete_one({"_id": created_user_id})
        raise HTTPException(
            status_code=500, detail=f"Failed to create role-specific record: {str(e)}"
        )

    # Build Verification link
    verify_link = f"{BACKEND_BASE_URL}/auth/verify-email?token={verification_token}"

    # send_verification_email(
    #     to_email=payload.email,
    #     verification_link=verify_link,
    # )
    background_tasks.add_task(
        BrevoEmailService.send_verification_email,
        payload.email,
        payload.name,
        verify_link,
    )

    logger.info(f"User registered successfully: {payload.email}")

    return {
        "user_id": str(result.inserted_id),
        "email": payload.email,
        "role": payload.role,
        "name": payload.name,
        "college_name": payload.college_name,
    }


@router.post("/login", response_model=UserResponse)
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginRequest):
    logger.info(f"Login request received for email: {payload.email}")
    email = payload.email

    user = await db.users.find_one({"email": payload.email})

    # 1. Find user with this email
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # 2. Verify the password of the user
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong Password")

    # 3. Check if user is verified or not
    if not user.get("is_verified", False):
        raise HTTPException(status_code=403, detail="Please verify your email first..")

    # 4. DEVICE IDENTIFICATION & GENERATION
    device_id = request.headers.get("X-Device-ID")
    
    # If the frontend didn't send a device ID, generate one now.
    if not device_id:
        device_id = str(uuid.uuid4())
        logger.info(f"No device ID provided. Generated new device ID: {device_id}")

    update_trusted_device = False

    # 5. DEVICE BINDING WITH 1-HOUR COOLDOWN CHECK - ONLY FOR STUDENTS
    if user["role"] == "student":
        trusted_device_id = user.get("trusted_device_id")

        if not trusted_device_id:
            # Condition 1: First login ever -> Allow & Bind
            update_trusted_device = True
            
        elif trusted_device_id != device_id:
            # Condition 3: Mismatch! Check the 1-hour cooldown
            last_logout_time = user.get("last_logout_time")
            
            if last_logout_time:
                # Ensure timezone awareness for comparison
                if last_logout_time.tzinfo is None:
                    last_logout_time = last_logout_time.replace(tzinfo=timezone.utc)
                
                time_since_logout = datetime.now(timezone.utc) - last_logout_time
                
                # If they logged out less than 1 hour ago -> Trigger OTP Modal
                if time_since_logout < timedelta(hours=1):
                    # We pass the newly generated/provided device_id in the error detail 
                    # so the frontend knows which device ID to request the OTP for.
                    raise HTTPException(
                        status_code=403,
                        detail={
                            "message": "DEVICE_BINDING_REQUIRED",
                            "device_id": device_id 
                        }
                    )
            
            # If we get here: They logged out > 1 hour ago or never logged out.
            # Bypass OTP and mark the new device to be updated.
            update_trusted_device = True

    # 6. Generate session ID and tokens
    session_id = generate_session_id()
    access_token = create_access_token(
        user_id=str(user["_id"]),
        role=user["role"],
        email=user["email"],
        session_id=session_id,
    )
    refresh_token = create_refresh_token(
        user_id=str(user["_id"]), session_id=session_id
    )

    # 7. Store hashed session ID in database
    update_data = {
        "current_active_session": hash_session_id(session_id),
        "session_created_at": datetime.now(timezone.utc),
    }

    if user["role"] == "student" and update_trusted_device:
        update_data["trusted_device_id"] = device_id

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": update_data},
    )

    logger.info(f"New session created for user: {payload.email}")

    # Return the device_id so the frontend can store it
    return {
        "user_id": str(user["_id"]),
        "email": email,
        "role": user["role"],
        "name": user["name"],
        "college_name": user.get("college_name", ""),
        "token": access_token,
        "refresh_token": refresh_token,
        "device_id": device_id,  # <-- NEW: Send back the device ID
    }

@router.post("/refresh-token", response_model=UserResponse)
@limiter.limit("5/minute")
async def refresh_token(request: Request, payload: RefreshTokenRequest):
    try:
        decoded = decode_jwt(payload.refresh_token)
        if decoded.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        user_id = decoded.get("user_id")
        session_id = decoded.get("session_id")

        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Validate session is still active
        if session_id:
            stored_session_hash = user.get("current_active_session")
            if not stored_session_hash or stored_session_hash != hash_session_id(
                session_id
            ):
                raise HTTPException(
                    status_code=401,
                    detail=(
                        "SESSION_CONFLICT: You have been logged out because "
                        "this account was logged in on another device"
                    ),
                )

        # Generate new tokens with the same session ID to maintain session continuity
        access_token = create_access_token(
            user_id=str(user["_id"]),
            role=user["role"],
            email=user["email"],
            session_id=session_id,
        )
        new_refresh_token = create_refresh_token(
            user_id=str(user["_id"]), session_id=session_id
        )

        return {
            "user_id": str(user["_id"]),
            "email": user["email"],
            "role": user["role"],
            "name": user["name"],
            "college_name": user.get("college_name", ""),
            "token": access_token,
            "refresh_token": new_refresh_token,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Refresh token error: %s: %s", type(e).__name__, e)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")


# ----- Forgot Password flow (Issue #196, #226) -----

OTP_FAILED_ATTEMPTS_MAX = 5
"""Maximum failed OTP verification attempts before the
OTP is cleared (brute-force protection)."""

GENERIC_OTP_ERROR = "Invalid or expired OTP"
"""Generic error message for OTP failures to prevent email enumeration."""


def _generate_otp() -> str:
    """
    Generate a secure 6-digit numeric OTP.

    Returns:
        A zero-padded 6-character string of digits (e.g. "042731").
    """
    return f"{secrets.randbelow(10**6):06d}"


def _get_otp_expiry() -> datetime:
    """
    Return the datetime at which the current OTP will expire.

    Returns:
        A timezone-aware UTC datetime 10 minutes from now.
    """
    return datetime.now(timezone.utc) + timedelta(minutes=10)


def _normalize_expiry(dt: datetime | None) -> datetime | None:
    """
    Ensure expiry datetime is timezone-aware for comparison with UTC now.

    Args:
        dt: The expiry datetime from the database (may be naive).

    Returns:
        The same datetime with UTC tzinfo if it was naive; None if dt is None.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _clear_otp_fields() -> dict:
    """
    Build the $unset document to remove all OTP-related fields from a user.

    Includes legacy reset_otp so any plaintext OTP from older code is removed.
    """
    return {
        "$unset": {
            "reset_otp": 1,
            "reset_otp_hash": 1,
            "otp_expiry": 1,
            "otp_failed_attempts": 1,
        }
    }


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
@limiter.limit("5/minute")  # Per IP: 5 OTP requests per minute
@limiter.limit("10/hour")   # Per IP: 10 OTP requests per hour
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
) -> dict:
    """
    Request a password reset by sending a 6-digit OTP to the user's email.

    Generates a secure OTP, hashes it before storing, and enqueues an email via
    Brevo. Returns the same message whether the email exists or not to avoid
    email enumeration.
    
    Rate Limits:
    - 5 OTP requests per minute per IP
    - 10 OTP requests per hour per IP
    """
    user = await db.users.find_one({"email": payload.email})
    if not user:
        return ForgotPasswordResponse()

    otp = _generate_otp()
    otp_hash = hash_password(otp)
    otp_expiry = _get_otp_expiry()

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "reset_otp_hash": otp_hash,
                "otp_expiry": otp_expiry,
                "otp_failed_attempts": 0,
            }
        },
    )

    background_tasks.add_task(
        BrevoEmailService.send_otp_email,
        payload.email,
        user.get("name", "User"),
        otp,
    )

    logger.info("Password reset OTP sent for email: %s", payload.email)
    return ForgotPasswordResponse()


@router.post("/verify-otp", response_model=VerifyOtpResponse)
@limiter.limit("3/minute")  # Per IP: 3 attempts per minute
@limiter.limit("10/hour")   # Per IP: 10 attempts per hour
async def verify_otp(request: Request, payload: VerifyOtpRequest) -> dict:
    """
    Verify the OTP sent to the user's email.

    Returns a generic 400 error for invalid/expired OTP or unknown email to
    prevent enumeration. After 5 failed attempts, the OTP is cleared.
    
    Rate Limits:
    - 3 attempts per minute per IP
    - 10 attempts per hour per IP
    """
    user = await db.users.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=400, detail=GENERIC_OTP_ERROR)

    stored_otp_hash = user.get("reset_otp_hash")
    expiry = _normalize_expiry(user.get("otp_expiry"))
    failed_attempts = user.get("otp_failed_attempts", 0)

    if failed_attempts >= OTP_FAILED_ATTEMPTS_MAX:
        await db.users.update_one({"_id": user["_id"]}, _clear_otp_fields())
        raise HTTPException(status_code=400, detail=GENERIC_OTP_ERROR)

    if expiry is None or expiry < datetime.now(timezone.utc):
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"otp_failed_attempts": 1}},
        )
        new_attempts = failed_attempts + 1
        if new_attempts >= OTP_FAILED_ATTEMPTS_MAX:
            await db.users.update_one({"_id": user["_id"]}, _clear_otp_fields())
        raise HTTPException(status_code=400, detail=GENERIC_OTP_ERROR)

    if not stored_otp_hash or not verify_password(payload.otp, stored_otp_hash):
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"otp_failed_attempts": 1}},
        )
        new_attempts = failed_attempts + 1
        if new_attempts >= OTP_FAILED_ATTEMPTS_MAX:
            await db.users.update_one({"_id": user["_id"]}, _clear_otp_fields())
        raise HTTPException(status_code=400, detail=GENERIC_OTP_ERROR)

    return VerifyOtpResponse()


@router.post("/reset-password", response_model=ResetPasswordResponse)
@limiter.limit("3/minute")  # Per IP: 3 attempts per minute
@limiter.limit("10/hour")   # Per IP: 10 attempts per hour
async def reset_password(request: Request, payload: ResetPasswordRequest) -> dict:
    """
    Set a new password after OTP verification.

    Validates the OTP again (hashed comparison), then updates the password
    and clears all OTP-related fields. Returns a generic 400 for any
    validation failure to prevent email enumeration.
    
    Rate Limits:
    - 3 attempts per minute per IP
    - 10 attempts per hour per IP
    """
    user = await db.users.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=400, detail=GENERIC_OTP_ERROR)

    stored_otp_hash = user.get("reset_otp_hash")
    expiry = _normalize_expiry(user.get("otp_expiry"))
    failed_attempts = user.get("otp_failed_attempts", 0)

    if failed_attempts >= OTP_FAILED_ATTEMPTS_MAX:
        await db.users.update_one({"_id": user["_id"]}, _clear_otp_fields())
        raise HTTPException(status_code=400, detail=GENERIC_OTP_ERROR)

    if expiry is None or expiry < datetime.now(timezone.utc):
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"otp_failed_attempts": 1}},
        )
        new_attempts = failed_attempts + 1
        if new_attempts >= OTP_FAILED_ATTEMPTS_MAX:
            await db.users.update_one({"_id": user["_id"]}, _clear_otp_fields())
        raise HTTPException(status_code=400, detail=GENERIC_OTP_ERROR)

    if not stored_otp_hash or not verify_password(payload.otp, stored_otp_hash):
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"otp_failed_attempts": 1}},
        )
        new_attempts = failed_attempts + 1
        if new_attempts >= OTP_FAILED_ATTEMPTS_MAX:
            await db.users.update_one({"_id": user["_id"]}, _clear_otp_fields())
        raise HTTPException(status_code=400, detail=GENERIC_OTP_ERROR)

    new_hash = hash_password(payload.new_password)

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password_hash": new_hash},
            **_clear_otp_fields(),
        },
    )

    logger.info("Password reset completed for email: %s", payload.email)
    return ResetPasswordResponse()


# Verify email route
@router.get("/verify-email")
async def verify_email(token: str = Query(...)):
    user = await db.users.find_one({"verification_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    # Check expiry
    expires_at = user.get("verification_expiry")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at and expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Verification link expired")

    # await db.users.update_one(
    #     {"_id": user["_id"]},
    #     {
    #         "$set": {"is_verified": True},
    #         "$unset": {"verification_token": "", "verification_expiry": ""},  # nosec
    #     },
    # )

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"is_verified": True},
            "$unset": {  # nosec B105 - MongoDB unset operator, not a password
                "verification_token": 1,
                "verification_expiry": 1,
            },
        },
    )

    FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip(
        "/"
    )
    return RedirectResponse(url=f"{FRONTEND_BASE_URL}/login?verified=true")


oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/google")
async def google_login(request: Request):
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    logger.info(f"Initiating Google Login. Redirect URI: {redirect_uri}")
    if not redirect_uri:
        logger.error("GOOGLE_REDIRECT_URI is not set in environment!")
    return await oauth.google.authorize_redirect(request, redirect_uri)


# Login via google
@router.get("/google/callback")
async def google_callback(request: Request):
    logger.info("Received Google Callback")
    try:
        token = await oauth.google.authorize_access_token(request)
        logger.info("Google Access Token retrieved")
    except Exception as e:
        logger.error(f"Failed to retrieve Google Access Token: {e}")
        raise HTTPException(status_code=400, detail=f"Google Auth Failed: {e}")

    resp = await oauth.google.get(
        "https://www.googleapis.com/oauth2/v3/userinfo", token=token
    )
    google_user = resp.json()
    logger.info(f"Google User Info retrieved for: {google_user.get('email')}")

    email = google_user.get("email")
    if not email:
        raise HTTPException(
            status_code=400, detail="Unable to read email from Google account"
        )

    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=400,
            detail="No account associated with this Google email. Please sign up first.",  # noqa: E501
        )

    if not user.get("is_verified", False):
        # Auto-verify user if logging in via Google
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"is_verified": True},
                "$unset": {  # nosec B105 - MongoDB unset operator, not a password
                    "verification_token": 1,
                    "verification_expiry": 1,
                },
            },
        )
        logger.info(f"User auto-verified via Google Login: {email}")
        user["is_verified"] = True

    # Generate session ID and tokens (same as normal login)
    session_id = generate_session_id()
    access_token = create_access_token(
        user_id=str(user["_id"]),
        role=user["role"],
        email=user["email"],
        session_id=session_id,
    )
    refresh_token = create_refresh_token(
        user_id=str(user["_id"]), session_id=session_id
    )

    # Store hashed session ID in database (invalidates previous sessions)
    try:
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "current_active_session": hash_session_id(session_id),
                    "session_created_at": datetime.now(timezone.utc),
                }
            },
        )
    except Exception as exc:
        logger.error(
            "Failed to update session for OAuth user %s: %s",
            email,
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail="Could not create session, please try again.",
        )

    logger.info(f"New session created for OAuth user: {email}")

    FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip(
        "/"
    )

    redirect_url = (
        f"{FRONTEND_BASE_URL}/oauth-callback"
        f"#token={quote(access_token)}"
        f"&refresh_token={quote(refresh_token)}"
        f"&user_id={quote(str(user['_id']))}"
        f"&email={quote(user['email'])}"
        f"&role={quote(user['role'])}"
        f"&name={quote(user['name'])}"
    )

    return RedirectResponse(url=redirect_url)


# ----- Device Binding with OTP flow -----


@router.post("/device-binding-otp", response_model=SendDeviceBindingOtpResponse)
@limiter.limit("5/hour")
async def send_device_binding_otp(
    request: Request,
    payload: SendDeviceBindingOtpRequest,
    background_tasks: BackgroundTasks,
):
    """
    Request a device binding OTP when a new device is detected.

    Generates a secure 6-digit OTP, hashes it before storing, and sends it
    via email. Returns the same message whether the email exists or not to
    avoid email enumeration.
    """
    user = await db.users.find_one({"email": payload.email})
    if not user:
        return SendDeviceBindingOtpResponse()

    otp = _generate_otp()
    otp_hash = hash_password(otp)
    otp_expiry = _get_otp_expiry()

    # Store OTP for device binding with device_id info
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "device_binding_otp_hash": otp_hash,
                "device_binding_otp_expiry": otp_expiry,
                "device_binding_new_device_id": payload.new_device_id,
                "device_binding_otp_failed_attempts": 0,
            }
        },
    )

    background_tasks.add_task(
        BrevoEmailService.send_device_binding_otp_email,
        payload.email,
        user.get("name", "User"),
        otp,
    )

    logger.info(
        "Device binding OTP sent for email: %s, device: %s",
        payload.email,
        payload.new_device_id,
    )
    return SendDeviceBindingOtpResponse()


@router.post(
    "/verify-device-binding-otp", response_model=VerifyDeviceBindingOtpResponse
)
@limiter.limit("3/minute")  # Per IP: 3 attempts per minute
@limiter.limit("10/hour")   # Per IP: 10 attempts per hour
async def verify_device_binding_otp(
    request: Request,
    payload: VerifyDeviceBindingOtpRequest,
) -> dict:
    """
    Verify the OTP sent for device binding and bind the new device.

    Returns a generic 400 error for invalid/expired OTP or unknown email to
    prevent enumeration. After 5 failed attempts, the OTP is cleared.
    
    Rate Limits:
    - 3 attempts per minute per IP
    - 10 attempts per hour per IP
    """
    user = await db.users.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=400, detail=GENERIC_OTP_ERROR)

    stored_otp_hash = user.get("device_binding_otp_hash")
    expiry = _normalize_expiry(user.get("device_binding_otp_expiry"))
    failed_attempts = user.get("device_binding_otp_failed_attempts", 0)
    stored_device_id = user.get("device_binding_new_device_id")

    if failed_attempts >= OTP_FAILED_ATTEMPTS_MAX:
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$unset": {  # nosec B105 - MongoDB unset operator, not a password
                    "device_binding_otp_hash": 1,
                    "device_binding_otp_expiry": 1,
                    "device_binding_new_device_id": 1,
                    "device_binding_otp_failed_attempts": 1,
                }
            },
        )
        raise HTTPException(status_code=400, detail=GENERIC_OTP_ERROR)

    if expiry is None or expiry < datetime.now(timezone.utc):
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"device_binding_otp_failed_attempts": 1}},
        )
        new_attempts = failed_attempts + 1
        if new_attempts >= OTP_FAILED_ATTEMPTS_MAX:
            await db.users.update_one(
                {"_id": user["_id"]},
                {
                    "$unset": {  # nosec B105 - MongoDB unset operator, not a password
                        "device_binding_otp_hash": 1,
                        "device_binding_otp_expiry": 1,
                        "device_binding_new_device_id": 1,
                        "device_binding_otp_failed_attempts": 1,
                    }
                },
            )
        raise HTTPException(status_code=400, detail=GENERIC_OTP_ERROR)

    reason = None
    if not stored_otp_hash:
        reason = "missing_otp_hash"
    elif not verify_password(payload.otp, stored_otp_hash):
        reason = "invalid_otp"
    elif stored_device_id != payload.new_device_id:
        reason = "device_id_mismatch"

    if reason is not None:
        logger.warning(
            "Device binding OTP verification failed for user %s: %s",
            payload.email,
            reason,
        )
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"device_binding_otp_failed_attempts": 1}},
        )
        new_attempts = failed_attempts + 1
        if new_attempts >= OTP_FAILED_ATTEMPTS_MAX:
            await db.users.update_one(
                {"_id": user["_id"]},
                {
                    "$unset": {  # nosec B105 - MongoDB unset operator, not a password
                        "device_binding_otp_hash": 1,
                        "device_binding_otp_expiry": 1,
                        "device_binding_new_device_id": 1,
                        "device_binding_otp_failed_attempts": 1,
                    }
                },
            )
        raise HTTPException(status_code=400, detail=GENERIC_OTP_ERROR)

    # Update trusted device ID and clear OTP fields
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "trusted_device_id": payload.new_device_id,
            },
            "$unset": {  # nosec B105 - MongoDB unset operator, not a password
                "device_binding_otp_hash": 1,
                "device_binding_otp_expiry": 1,
                "device_binding_new_device_id": 1,
                "device_binding_otp_failed_attempts": 1,
            },
        },
    )

    logger.info(
        "Device successfully bound for user: %s, device: %s",
        payload.email,
        payload.new_device_id,
    )
    return VerifyDeviceBindingOtpResponse()


# ----- Logout endpoint -----


@router.post("/logout")
async def logout(request: Request):
    """
    Unified logout endpoint for all roles.
    
    - Clears the active session for everyone.
    - Tracks logout time specifically for students (for device binding cooldown).
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")

    try:
        token = auth_header.split(" ")[1]
        decoded = decode_jwt(token)
        user_id = decoded.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload: missing user_id")
            
        try:
            obj_id = ObjectId(user_id)
        except InvalidId:
            raise HTTPException(status_code=401, detail="Invalid user ID format")

    except (jwt.DecodeError, jwt.ExpiredSignatureError) as e:
        raise HTTPException(
            status_code=401, detail=f"Invalid or expired token: {type(e).__name__}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error during token decode: %s", e)
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        # 1. Fetch the user to determine their role
        user = await db.users.find_one({"_id": obj_id}, {"role": 1})
        
        if not user:
            logger.warning("Logout attempted for non-existent user: %s", user_id)
            raise HTTPException(status_code=404, detail="User not found")

        # 2. Build the base update query (always remove active session)
        update_query = {
            "$unset": {  # nosec B105
                "current_active_session": 1,
            }
        }

        # 3. Conditionally add the last_logout_time if the role is 'student'
        if user.get("role") == "student":
            update_query["$set"] = {
                "last_logout_time": datetime.now(timezone.utc),
            }

        # 4. Execute the update
        await db.users.update_one({"_id": obj_id}, update_query)

        logger.info("User logged out: %s (Role: %s)", user_id, user.get("role"))
        return {"message": "Logged out successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Database error during logout for user %s: %s", user_id, e)
        raise HTTPException(status_code=500, detail="Internal server error during logout")

