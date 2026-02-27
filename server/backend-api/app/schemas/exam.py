"""
Pydantic schemas for Exam Days management.
Used by the exams API routes for request/response validation.

Exams are stored in a dedicated `exams` collection.
"""

from pydantic import BaseModel, Field
from typing import List
import datetime
from bson import ObjectId


class ExamCreate(BaseModel):
    """Schema for creating a new exam."""

    date: datetime.date = Field(..., description="The date of the exam (YYYY-MM-DD)")
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the exam, e.g. 'Physics Mid-term'",
    )


class ExamUpdate(BaseModel):
    """Schema for updating an existing exam."""

    date: datetime.date = Field(..., description="The date of the exam (YYYY-MM-DD)")
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the exam, e.g. 'Physics Mid-term'",
    )


class ExamResponse(BaseModel):
    """Schema for an exam returned from the API."""

    id: str = Field(..., description="Unique identifier for the exam")
    date: datetime.date = Field(..., description="The date of the exam (YYYY-MM-DD)")
    name: str = Field(..., description="Name of the exam")
    createdAt: datetime.datetime = Field(..., description="Creation timestamp")
    updatedAt: datetime.datetime = Field(..., description="Last update timestamp")


class ExamListResponse(BaseModel):
    """Schema for the list of exams returned from the API."""

    exams: List[ExamResponse] = Field(default_factory=list)
