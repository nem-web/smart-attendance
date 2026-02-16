import api from "./axiosClient";

export const fetchSubjectAnalytics = async (subjectId) => {
    const res = await api.get(`/analytics/subject/${subjectId}`);
    return res.data;
};
