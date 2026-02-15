import React, { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCheck, Loader2, AlertCircle, Check, Info } from "lucide-react";
import { 
  getNotifications, 
  getUnreadCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from "../api/notifications";
import { useTranslation } from "react-i18next";

/**
 * NotificationDropdown Component
 * 
 * A reusable notification dropdown with:
 * - Unread badge counter
 * - Click-outside detection
 * - Keyboard accessibility (ESC to close)
 * - Smooth animations
 * - Loading and empty states
 * - Mark as read functionality
 * - Responsive design
 */
export default function NotificationDropdown() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Fetch unread count on mount and every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard accessibility (ESC to close)
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  /**
   * Fetch unread count from API
   */
  const fetchUnreadCount = async () => {
    try {
      const data = await getUnreadCount();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications(0, 20, false);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      setHasMore(data.has_more || false);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mark a single notification as read (optimistic update)
   */
  const handleMarkAsRead = async (notificationId) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      // Revert on error
      fetchNotifications();
    }
  };

  /**
   * Mark all notifications as read
   */
  const handleMarkAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      // Revert on error
      fetchNotifications();
    }
  };

  /**
   * Toggle dropdown open/close
   */
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  /**
   * Get icon based on notification type
   */
  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return <Check size={16} className="text-[var(--success)]" />;
      case "warning":
        return <AlertCircle size={16} className="text-[var(--warning)]" />;
      case "error":
        return <X size={16} className="text-[var(--danger)]" />;
      default:
        return <Info size={16} className="text-[var(--primary)]" />;
    }
  };

  /**
   * Format timestamp to relative time
   */
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("notifications.just_now", "Just now");
    if (diffMins < 60) return t("notifications.mins_ago", { count: diffMins, defaultValue: `${diffMins}m ago` });
    if (diffHours < 24) return t("notifications.hours_ago", { count: diffHours, defaultValue: `${diffHours}h ago` });
    if (diffDays < 7) return t("notifications.days_ago", { count: diffDays, defaultValue: `${diffDays}d ago` });
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        aria-label={t("notifications.aria_label", "Notifications")}
        aria-expanded={isOpen}
        className="relative p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
      >
        <Bell size={20} className="text-[var(--text-body)]" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[var(--danger)] text-[var(--text-on-primary)] text-[10px] font-bold rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          role="menu"
          aria-label={t("notifications.menu_label", "Notifications menu")}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
            <h3 className="font-bold text-[var(--text-main)]">
              {t("notifications.title", "Notifications")}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline font-medium"
                aria-label={t("notifications.mark_all_read", "Mark all as read")}
              >
                <CheckCheck size={14} />
                {t("notifications.mark_all_read", "Mark all as read")}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              /* Loading State */
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 size={32} className="text-[var(--primary)] animate-spin mb-2" />
                <p className="text-sm text-[var(--text-body)]">
                  {t("notifications.loading", "Loading notifications...")}
                </p>
              </div>
            ) : notifications.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-4">
                  <Bell size={24} className="text-[var(--text-body)] opacity-50" />
                </div>
                <p className="text-sm font-medium text-[var(--text-main)] mb-1">
                  {t("notifications.no_notifications", "No notifications")}
                </p>
                <p className="text-xs text-[var(--text-body)]">
                  {t("notifications.empty_subtitle", "You're all caught up!")}
                </p>
              </div>
            ) : (
              /* Notifications */
              <div className="divide-y divide-[var(--border-color)]">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer ${
                      !notification.is_read ? "bg-[var(--primary)]/5" : ""
                    }`}
                    onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                    role="menuitem"
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-main)] break-words">
                          {notification.message}
                        </p>
                        <p className="text-xs text-[var(--text-body)] mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-[var(--primary)] rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer (Show More) */}
          {hasMore && !loading && (
            <div className="p-3 border-t border-[var(--border-color)] text-center">
              <button className="text-xs text-[var(--primary)] hover:underline font-medium">
                {t("notifications.view_all", "View all notifications")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
