from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class Student(BaseModel):
    roll: str
    name: str
    attendance: int


# Clerk-based User Profile schemas
class UserProfileCreate(BaseModel):
    clerk_user_id: str
    role: str  # "student" or "teacher"
    branch: str
    # Student fields
    admission_year: Optional[int] = None
    class_semester: Optional[str] = None
    roll_number: Optional[str] = None
    # Teacher fields
    designation: Optional[str] = None
    assigned_classes: Optional[List[str]] = None


class UserProfileUpdate(BaseModel):
    role: Optional[str] = None
    branch: Optional[str] = None
    admission_year: Optional[int] = None
    class_semester: Optional[str] = None
    roll_number: Optional[str] = None
    designation: Optional[str] = None
    assigned_classes: Optional[List[str]] = None


class UserProfileResponse(BaseModel):
    clerk_user_id: str
    role: str
    branch: str
    admission_year: Optional[int] = None
    class_semester: Optional[str] = None
    roll_number: Optional[str] = None
    designation: Optional[str] = None
    assigned_classes: Optional[List[str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
