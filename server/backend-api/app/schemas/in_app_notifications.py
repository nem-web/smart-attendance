"""
Pydantic schemas for in-app notifications.
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    """Schema for notification response."""

    id: str
    message: str
    type: Literal["info", "success", "warning", "error"] = "info"
    is_read: bool = False
    created_at: str
    metadata: dict = Field(default_factory=dict)


class NotificationListResponse(BaseModel):
    """Schema for paginated notification list."""

    notifications: List[NotificationResponse]
    total: int
    unread_count: int
    has_more: bool


class MarkAsReadRequest(BaseModel):
    """Request to mark notification as read."""

    notification_id: str


class MarkAllAsReadResponse(BaseModel):
    """Response for mark all as read."""

    marked_count: int
    message: str
