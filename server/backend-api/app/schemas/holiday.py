"""
Pydantic schemas for Holiday management.
Used by the holidays API routes for request/response validation.

Holidays are stored in a dedicated `holidays` collection (per issue #315),
decoupled from the teacher document.
"""

from pydantic import BaseModel, Field
from typing import List
from datetime import date


class HolidayCreate(BaseModel):
    """Schema for creating a new holiday."""
    date: date = Field(..., description="The date of the holiday (YYYY-MM-DD)")
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the holiday, e.g. 'Diwali'",
    )


class HolidayResponse(BaseModel):
    """Schema for a holiday returned from the API."""
    id: str = Field(..., description="Unique identifier for the holiday")
    date: date = Field(..., description="The date of the holiday (YYYY-MM-DD)")
    name: str = Field(..., description="Name of the holiday")


class HolidayListResponse(BaseModel):
    """Schema for the list of holidays returned from the API."""
    holidays: List[HolidayResponse] = Field(default_factory=list)


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str