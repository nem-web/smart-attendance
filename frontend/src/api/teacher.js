import api from "./axiosClient"

export const fetchMySubjects = async () => {
  const res = await api.get("/settings/teachers/me/subjects");
  return res.data;
};

export const fetchSubjectStudents = async (subjectId) => {
  const res = await api.get(`/settings/teachers/subjects/${subjectId}/students`);
  return res.data;
};

export const verifyStudent = (subjectId, studentId) =>
  api.post(`/settings/teachers/subjects/${subjectId}/students/${studentId}/verify`);

export const deleteStudent = (subjectId, studentId) =>
  api.delete(`/settings/teachers/subjects/${subjectId}/students/${studentId}`);

export const exportAttendanceCSV = async (subjectId, startDate, endDate) => {
  const res = await api.get(`/reports/export/csv`, {
    params: {
      subject_id: subjectId,
      start_date: startDate ? startDate.toISOString().split('T')[0] : null,
      end_date: endDate ? endDate.toISOString().split('T')[0] : null
    },
    responseType: 'blob' // Important for handling binary data
  });
  return res.data;
};
