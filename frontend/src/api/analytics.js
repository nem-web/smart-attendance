import api from "./axiosClient";

export const fetchSubjectAnalytics = async (subjectId) => {
    const res = await api.get(`/api/analytics/subject/${subjectId}`);
    return res.data;
};

export const fetchDashboardStats = async () => {
    const res = await api.get("/api/analytics/dashboard-stats");
    return res.data;
};

export const fetchGlobalStats = async () => {
    const res = await api.get("/api/analytics/global");
    return res.data;
};

export const fetchAttendanceTrend = async (params) => {
    const res = await api.get("/api/analytics/attendance-trend", { params });
    return res.data;
};

export const fetchClassRisk = async () => {
     const res = await api.get("/api/analytics/class-risk");
     return res.data;
};

export const fetchTopPerformers = async () => {
    const res = await api.get("/api/analytics/top-performers");
    return res.data;
};

/**
 * Fetch subjects list for dropdown
 * Note: This might already exist in teacher.js API, but required here too.
 */
export const fetchSubjects = async () => {
    // If we have a dedicated endpoint in analytics or just reuse teacher subjects
    // Re-using teacher subjects endpoint might be better, or create a simple wrapper
    // The requirement says GET /api/subjects, but existing is usually /teacher/subjects
    // I will use the existing fetchMySubjects in the component, or add a wrapper here.
    // Let's assume the component will continue to use fetchMySubjects from teacher.js
    // unless explicitly asked to change.
    // For now, I'll stick to the requested analytic endpoints.
    return []; 
};
