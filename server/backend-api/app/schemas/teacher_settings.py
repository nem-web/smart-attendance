# backend/app/schemas/settings.py
from pydantic import BaseModel, EmailStr, conint
from typing import List, Optional, Literal
from datetime import datetime


class Notifications(BaseModel):
    push: bool = True
    inApp: bool = True
    sound: bool = False


class EmailPref(BaseModel):
    key: str
    enabled: bool = False


class FaceSettings(BaseModel):
    liveness: bool = True
    sensitivity: conint(ge=50, le=99) = 80
    enrolledAt: Optional[datetime] = None
    lastUpdatedVia: Optional[str] = None


class Thresholds(BaseModel):
    warningVal: conint(ge=0, le=100) = 75
    safeVal: conint(ge=0, le=100) = 85


class Profile(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    subjects: List[str] = []
    avatarUrl: Optional[str] = None


class UserSettingsCreate(BaseModel):
    # used when creating defaults (server generates user_id)
    profile: Optional[Profile] = Profile()
    theme: Optional[Literal["Light", "Dark", "Forest", "Cyber"]] = "Light"
    notifications: Optional[Notifications] = Notifications()
    emailPreferences: Optional[List[EmailPref]] = None
    thresholds: Optional[Thresholds] = Thresholds()
    faceSettings: Optional[FaceSettings] = FaceSettings()


class UserSettingsResponse(UserSettingsCreate):
    user_id: str
    createdAt: Optional[datetime]
    updatedAt: Optional[datetime]
