"""
In-app notification service for managing user notifications.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict
from bson import ObjectId
import logging

from ..db.mongodb import get_database

logger = logging.getLogger(__name__)


class InAppNotificationService:
    """Service for managing in-app notifications."""

    @staticmethod
    async def create_notification(
        user_id: str,
        message: str,
        notification_type: str = "info",
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Create a new notification for a user.

        Args:
            user_id: User ID to notify
            message: Notification message
            notification_type: Type of notification (info, success, warning, error)
            metadata: Additional metadata (optional)

        Returns:
            Created notification ID
        """
        db = await get_database()

        notification = {
            "user_id": user_id,
            "message": message,
            "type": notification_type,
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
            "metadata": metadata or {},
        }

        result = await db.notifications.insert_one(notification)
        logger.info(f"Created notification {result.inserted_id} for user {user_id}")

        return str(result.inserted_id)

    @staticmethod
    async def get_user_notifications(
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        unread_only: bool = False,
    ) -> List[Dict]:
        """
        Get notifications for a user with pagination.

        Args:
            user_id: User ID
            skip: Number of notifications to skip
            limit: Maximum number of notifications to return
            unread_only: Only return unread notifications

        Returns:
            List of notifications
        """
        db = await get_database()

        query = {"user_id": user_id}
        if unread_only:
            query["is_read"] = False

        # Sort by newest first
        cursor = (
            db.notifications.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

        notifications = []
        async for notif in cursor:
            notifications.append(
                {
                    "id": str(notif["_id"]),
                    "message": notif["message"],
                    "type": notif.get("type", "info"),
                    "is_read": notif.get("is_read", False),
                    "created_at": notif["created_at"].isoformat(),
                    "metadata": notif.get("metadata", {}),
                }
            )

        return notifications

    @staticmethod
    async def get_unread_count(user_id: str) -> int:
        """
        Get count of unread notifications for a user.

        Args:
            user_id: User ID

        Returns:
            Count of unread notifications
        """
        db = await get_database()

        count = await db.notifications.count_documents(
            {"user_id": user_id, "is_read": False}
        )

        return count

    @staticmethod
    async def mark_as_read(notification_id: str, user_id: str) -> bool:
        """
        Mark a notification as read.

        Args:
            notification_id: Notification ID
            user_id: User ID (for security verification)

        Returns:
            True if successful, False otherwise
        """
        db = await get_database()

        result = await db.notifications.update_one(
            {
                "_id": ObjectId(notification_id),
                "user_id": user_id,  # Ensure user owns the notification
            },
            {"$set": {"is_read": True}},
        )

        return result.modified_count > 0

    @staticmethod
    async def mark_all_as_read(user_id: str) -> int:
        """
        Mark all notifications as read for a user.

        Args:
            user_id: User ID

        Returns:
            Number of notifications marked as read
        """
        db = await get_database()

        result = await db.notifications.update_many(
            {"user_id": user_id, "is_read": False}, {"$set": {"is_read": True}}
        )

        logger.info(f"Marked {result.modified_count} notifications as read for user {user_id}")

        return result.modified_count

    @staticmethod
    async def delete_notification(notification_id: str, user_id: str) -> bool:
        """
        Delete a notification.

        Args:
            notification_id: Notification ID
            user_id: User ID (for security verification)

        Returns:
            True if successful, False otherwise
        """
        db = await get_database()

        result = await db.notifications.delete_one(
            {"_id": ObjectId(notification_id), "user_id": user_id}
        )

        return result.deleted_count > 0

    @staticmethod
    async def ensure_indexes():
        """Create indexes for notifications collection."""
        db = await get_database()

        # Index for user_id and created_at (for efficient querying)
        await db.notifications.create_index([("user_id", 1), ("created_at", -1)])

        # Index for unread notifications
        await db.notifications.create_index([("user_id", 1), ("is_read", 1)])

        logger.info("Notification indexes ensured")
