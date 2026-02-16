import api from "./axiosClient";

export const fetchMyStudentProfile = async () => {
  const res = await api.get("/students/me/profile");
  // console.log(res);
  return res.data;
};

export const fetchCurrentUser = async () => {
  try {
    const res = await api.get("/auth/me");
    // console.log("id ", res.data)
    return res.data;
  } catch {
    try {
      const profile = await fetchMyStudentProfile();
      return { ...profile.student, profileType: "student" };
    } catch {
      return null;
    }
  }
};

export const forgotPassword = async (email) => {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
};

export const resetPassword = async (email, otp, newPassword) => {
  const res = await api.post("/auth/reset-password", {
    email,
    otp,
    new_password: newPassword,
  });
  return res.data;
};
