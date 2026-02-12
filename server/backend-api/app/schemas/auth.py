from pydantic import BaseModel, EmailStr, constr
from typing import Optional


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    user_id: str
    email: str
    role: str
    name: str
    college_name: str
    token: str


class RegisterRequest(BaseModel):
    role: str
    name: str
    email: EmailStr
    password: constr(min_length=6, max_length=72)
    college_name: str

    # Student
    branch: Optional[str] = None
    roll: Optional[str] = None
    year: Optional[str] = None

    # Teacher
    employee_id: Optional[str] = None
    phone: Optional[str] = None

    is_verified: bool = False
