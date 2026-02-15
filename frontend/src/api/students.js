// frontend/src/api/students.js
import api from "./axiosClient"; // earlier file, axios instance

export const fetchStudentProfile = async (studentId) => {
  const res = await api.get(`/students/${studentId}/profile`);
  return res.data;
};

export const fetchMyStudentProfile = async () => {
  const res = await api.get("/students/me/profile");
  return res.data;
}

export const fetchMySubjects = async () => {
  const res = await api.get("/students/me/subjects");
  return res.data;
};

export const uploadFaceImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post(
    "/students/me/face-image",
    formData,
    {headers: {"Content-Type": "multipart/form-data"}}
  );

  return res.data;
}

export const fetchAvailableSubjects = async () => {
  const res = await api.get("/students/me/available-subjects");
  return res.data;
};

export const addSubjectToStudent = async (subjectid) => {
  await api.post("/students/me/subjects", null, {
    params: {subject_id: subjectid}
  });
};

export async function removeSubjectFromStudent (subjectId) {
  const res = await api.delete(`/students/me/remove-subject/${subjectId}`);
  return res.data;
};

// Get all students (for teachers - messaging feature)
export const getStudents = async () => {
  const res = await api.get("/settings/teachers/students");
  return res.data;
};