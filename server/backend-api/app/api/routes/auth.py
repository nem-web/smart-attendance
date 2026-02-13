from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from datetime import datetime, timedelta, UTC, timezone
import secrets
import os
from app.utils.jwt_token import create_jwt
from urllib.parse import quote

from ...schemas.auth import RegisterRequest, UserResponse, LoginRequest
from ...core.security import hash_password, verify_password

# from ...core.email import send_verification_email
from ...core.email import BrevoEmailService
from ...core.config import BACKEND_BASE_URL
from ...db.mongo import db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])
oauth = OAuth()


@router.post("/register", response_model=UserResponse)
async def register(payload: RegisterRequest, background_tasks: BackgroundTasks):

    if len(payload.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password too long. Please use at most 72 characters",
        )

    # Check existing user
    existing = await db.users.find_one({"email": payload.email})

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate random verification link
    verification_token = secrets.token_urlsafe(32)
    verification_expiry = datetime.now(UTC) + timedelta(hours=24)

    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "college_name": payload.college_name,
        "is_verified": False,  # Changed to False for email verification flow
        "verification_token": verification_token,  # Store the actual token
        "verification_expiry": verification_expiry,
        "created_at": datetime.now(UTC),
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
                "created_at": datetime.now(UTC),
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
                    "emailPreferences": {},
                    "thresholds": {
                        "warningVal": 75,
                        "safeVal": 85,
                    },
                    "faceSettings": {
                        "sensitivity": 80,
                        "liveness": True,
                    },
                },
                "createdAt": datetime.now(UTC),
                "updatedAt": datetime.now(UTC),
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
async def login(payload: LoginRequest):
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

    # 4. Generate JWT token
    token = create_jwt(user_id=str(user["_id"]), role=user["role"], email=user["email"])

    return {
        "user_id": str(user["_id"]),
        "email": email,
        "role": user["role"],
        "name": user["name"],
        "college_name": user.get("college_name", ""),
        "token": token,
    }


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
        if expires_at and expires_at < datetime.now(UTC):
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

    # CREATE JWT (MATCH NORMAL LOGIN)
    jwt_token = create_jwt(
        user_id=str(user["_id"]), role=user["role"], email=user["email"]
    )

    FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip(
        "/"
    )

    redirect_url = (
        f"{FRONTEND_BASE_URL}/oauth-callback"
        f"#token={quote(jwt_token)}"
        f"&user_id={quote(str(user['_id']))}"
        f"&email={quote(user['email'])}"
        f"&role={quote(user['role'])}"
        f"&name={quote(user['name'])}"
    )

    return RedirectResponse(url=redirect_url)
