import api from "./axiosClient";

export const createUserProfile = async (profileData) => {
  const res = await api.post("/user-profiles/", profileData);
  return res.data;
};

export const getUserProfile = async (clerkUserId) => {
  const res = await api.get(`/user-profiles/${clerkUserId}`);
  return res.data;
};

export const updateUserProfile = async (clerkUserId, profileData) => {
  const res = await api.put(`/user-profiles/${clerkUserId}`, profileData);
  return res.data;
};
