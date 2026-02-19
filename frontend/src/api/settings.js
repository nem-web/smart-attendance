import api from "./axiosClient";

export const getSettings = async () => {
  const res = await api.get("/settings");
  return res.data;
};

export const patchSettings = async (payload) => {
  const res = await api.patch("/settings", payload);
  return res.data;
};

export const uploadAvatar = async (file) => {
  const form = new FormData();
  form.append("file", file);

  const res = await api.post("/settings/upload-avatar", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const addSubject = async (payload) => {
  const res = await api.post("/settings/add-subject", payload);
  return res.data;
};

export const sendLowAttendanceNotice = async () => {
  const res = await api.post("/settings/send-low-attendance-notice");
  return res.data;
};
