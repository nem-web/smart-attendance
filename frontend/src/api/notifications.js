import api from "./axiosClient";

/**
 * ============================================
 * IN-APP NOTIFICATIONS API
 * ============================================
 */

/**
 * Get paginated notifications for current user
 * @param {number} skip - Number of notifications to skip (for pagination)
 * @param {number} limit - Maximum notifications to return (1-50)
 * @param {boolean} unreadOnly - Only fetch unread notifications
 * @returns {Promise<{notifications: Array, total: number, unread_count: number, has_more: boolean}>}
 */
export const getNotifications = async (skip = 0, limit = 20, unreadOnly = false) => {
  const response = await api.get("/in-app-notifications", {
    params: {
      skip,
      limit,
      unread_only: unreadOnly,
    },
  });
  return response.data;
};

/**
 * Get count of unread notifications
 * @returns {Promise<{count: number}>}
 */
export const getUnreadCount = async () => {
  const response = await api.get("/in-app-notifications/unread-count");
  return response.data;
};

/**
 * Mark a specific notification as read
 * @param {string} notificationId - ID of notification to mark as read
 * @returns {Promise<{message: string}>}
 */
export const markNotificationAsRead = async (notificationId) => {
  const response = await api.patch(`/in-app-notifications/mark-read/${notificationId}`);
  return response.data;
};

/**
 * Mark all notifications as read for current user
 * @returns {Promise<{marked_count: number, message: string}>}
 */
export const markAllNotificationsAsRead = async () => {
  const response = await api.patch("/in-app-notifications/mark-all-read");
  return response.data;
};

/**
 * Delete a specific notification
 * @param {string} notificationId - ID of notification to delete
 * @returns {Promise<{message: string}>}
 */
export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/in-app-notifications/${notificationId}`);
  return response.data;
};

/**
 * ============================================
 * EMAIL NOTIFICATIONS API
 * ============================================
 */

/**
 * Send absence notifications to students
 */
export const sendAbsenceNotifications = async (data) => {
  const response = await api.post("/notifications/absence", data);
  return response.data;
};

/**
 * Send low attendance warnings to students
 */
export const sendLowAttendanceWarnings = async (warnings) => {
  const response = await api.post("/notifications/low-attendance", warnings);
  return response.data;
};

/**
 * Send assignment reminders to students
 */
export const sendAssignmentReminders = async (data) => {
  const response = await api.post("/notifications/assignment", data);
  return response.data;
};

/**
 * Send exam alerts to students
 */
export const sendExamAlerts = async (data) => {
  const response = await api.post("/notifications/exam", data);
  return response.data;
};

/**
 * Send custom message to students
 */
export const sendCustomMessage = async (data) => {
  const response = await api.post("/notifications/custom", data);
  return response.data;
};

/**
 * Get email statistics
 */
export const getEmailStats = async (days = 30) => {
  const response = await api.get(`/notifications/stats?days=${days}`);
  return response.data;
};

/**
 * Check for duplicate email sends
 */
export const checkDuplicateEmail = async (notificationType, recipientEmail, withinHours = 1) => {
  const response = await api.get("/notifications/check-duplicate", {
    params: {
      notification_type: notificationType,
      recipient_email: recipientEmail,
      within_hours: withinHours,
    },
  });
  return response.data;
};
