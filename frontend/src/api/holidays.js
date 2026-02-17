import api from "./axiosClient";

/**
 * Fetch all holidays for the current teacher.
 * @returns {Promise<{holidays: Array}>}
 */
export const getHolidays = async () => {
  const res = await api.get("/schedule/holidays");
  return res.data;
};

/**
 * Add a new holiday.
 * @param {{ date: string, name: string }} data
 * @returns {Promise<{id: string, date: string, name: string}>}
 */
export const addHoliday = async (data) => {
  const res = await api.post("/schedule/holidays", data);
  return res.data;
};

/**
 * Delete a holiday by its ID.
 * @param {string} id
 * @returns {Promise<{message: string}>}
 */
export const deleteHoliday = async (id) => {
  const res = await api.delete(`/schedule/holidays/${id}`);
  return res.data;
};