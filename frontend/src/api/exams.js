import api from "./axiosClient";

/**
 * Fetch all exams for the authenticated teacher.
 * @returns {Promise<{exams: Array}>}
 */
export const getExams = async () => {
  const res = await api.get("/schedule/exams");
  return res.data;
};

/**
 * Add a new exam.
 * @param {{ date: string, name: string }} data
 * @returns {Promise<{id: string, date: string, name: string}>}
 */
export const addExam = async (data) => {
  const res = await api.post("/schedule/exams", data);
  return res.data;
};

/**
 * Update an existing exam.
 * @param {string} id - The exam's MongoDB _id
 * @param {{ date: string, name: string }} data
 * @returns {Promise<{id: string, date: string, name: string}>}
 */
export const updateExam = async (id, data) => {
  const res = await api.put(`/schedule/exams/${id}`, data);
  return res.data;
};

/**
 * Delete an exam by ID.
 * @param {string} id - The exam's MongoDB _id
 * @returns {Promise<{message: string}>}
 */
export const deleteExam = async (id) => {
  const res = await api.delete(`/schedule/exams/${id}`);
  return res.data;
};
