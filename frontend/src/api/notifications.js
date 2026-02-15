import api from "./axiosClient";

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
