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

export const fetchTeacherProfile = async () => {
  const res = await api.get("/settings");
  return res.data;
}