from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class StudentBase(BaseModel):
    name: str
    roll: Optional[str] = None
    email: Optional[EmailStr] = None
    image_url: Optional[str] = None
    class_id: Optional[str] = None
    year: Optional[int] = None
    branch: Optional[str] = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    roll: Optional[str] = None
    email: Optional[EmailStr] = None
    image_url: Optional[str] = None
    class_id: Optional[str] = None
    year: Optional[int] = None
    branch: Optional[str] = None


class StudentOut(StudentBase):
    id: str = Field(..., alias="_id")
    enrolled_on: Optional[datetime] = None

    model_config = {"populate_by_name": True, "from_attributes": True}
