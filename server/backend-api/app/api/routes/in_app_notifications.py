"""
API routes for in-app notifications.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
import logging

from ...schemas.in_app_notifications import (
    NotificationResponse,
    NotificationListResponse,
    MarkAsReadRequest,
    MarkAllAsReadResponse,
)
from ...services.in_app_notification import InAppNotificationService
from ...core.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/in-app-notifications", tags=["In-App Notifications"])


@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    unread_only: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
    """
    Get paginated notifications for the current user.

    Args:
        skip: Number of notifications to skip (for pagination)
        limit: Maximum number of notifications to return (1-50)
        unread_only: If True, only return unread notifications

    Returns:
        NotificationListResponse with notifications and metadata
    """
    user_id = str(current_user["id"])

    # Get notifications
    notifications = await InAppNotificationService.get_user_notifications(
        user_id=user_id,
        skip=skip,
        limit=limit,
        unread_only=unread_only,
    )

    # Get unread count
    unread_count = await InAppNotificationService.get_unread_count(user_id)

    # Calculate total count based on filter
    from ...db.mongodb import get_database

    db = await get_database()
    query = {"user_id": user_id}
    if unread_only:
        query["is_read"] = False
    total = await db.notifications.count_documents(query)

    return NotificationListResponse(
        notifications=notifications,
        total=total,
        unread_count=unread_count,
        has_more=(skip + len(notifications)) < total,
    )


@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
):
    """
    Get count of unread notifications for the current user.

    Returns:
        {"count": int}
    """
    user_id = str(current_user["id"])

    count = await InAppNotificationService.get_unread_count(user_id)

    return {"count": count}


@router.patch("/mark-read/{notification_id}")
async def mark_notification_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Mark a specific notification as read.

    Args:
        notification_id: ID of the notification to mark as read

    Returns:
        Success message
    """
    user_id = str(current_user["id"])

    success = await InAppNotificationService.mark_as_read(
        notification_id=notification_id,
        user_id=user_id,
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Notification not found or unauthorized",
        )

    return {"message": "Notification marked as read"}


@router.patch("/mark-all-read", response_model=MarkAllAsReadResponse)
async def mark_all_as_read(
    current_user: dict = Depends(get_current_user),
):
    """
    Mark all notifications as read for the current user.

    Returns:
        Number of notifications marked as read
    """
    user_id = str(current_user["id"])

    marked_count = await InAppNotificationService.mark_all_as_read(user_id)

    return MarkAllAsReadResponse(
        marked_count=marked_count,
        message=f"Marked {marked_count} notification(s) as read",
    )


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a specific notification.

    Args:
        notification_id: ID of the notification to delete

    Returns:
        Success message
    """
    user_id = str(current_user["id"])

    success = await InAppNotificationService.delete_notification(
        notification_id=notification_id,
        user_id=user_id,
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Notification not found or unauthorized",
        )

    return {"message": "Notification deleted"}
