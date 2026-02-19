import React, { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getInAppNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../api/notifications";

export default function NotificationDropdown() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getInAppNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Periodic refresh of notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(
        notifications.map((notif) =>
          notif._id === notificationId
            ? { ...notif, is_read: true }
            : notif
        )
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      // Update local state
      setNotifications(
        notifications.map((notif) => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-[var(--primary)] p-1.5 rounded-full hover:opacity-90 transition-opacity"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-white" />

        {/* Red Dot for Unread Notifications */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}

        {/* Badge for number of unread */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-card)] rounded-lg shadow-lg border border-[var(--border-color)] z-50 max-h-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
            <h3 className="text-lg font-semibold text-[var(--text-main)]">
              {t("notifications.title", "Notifications")}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-[var(--bg-secondary)] rounded transition-colors"
              aria-label={t("notifications.close", "Close notifications")}
            >
              <X size={18} className="text-[var(--text-body)]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && !notifications.length ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--primary)] border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell size={32} className="text-[var(--border-color)] mb-2" />
                <p className="text-[var(--text-body)]">
                  {t("notifications.empty", "No new notifications")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() =>
                      !notification.is_read &&
                      handleNotificationClick(notification._id)
                    }
                    className={`p-4 cursor-pointer transition-colors ${
                      notification.is_read
                        ? "bg-[var(--bg-card)]"
                        : "bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-[var(--text-main)] font-medium">
                          {notification.message}
                        </p>
                        <p className="text-xs text-[var(--text-body)] mt-1">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>

                      {/* Unread Indicator */}
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-[var(--primary)] rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && unreadCount > 0 && (
            <div className="p-4 border-t border-[var(--border-color)]">
              <button
                onClick={handleMarkAllAsRead}
                className="w-full px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t("notifications.markAllRead", "Mark all as read")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
