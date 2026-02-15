import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh-token`, {
            refresh_token: refreshToken,
          });

          if (res.status === 200) {
            localStorage.setItem("token", res.data.token);
            if (res.data.refresh_token) {
              localStorage.setItem("refresh_token", res.data.refresh_token);
            }
            api.defaults.headers.common["Authorization"] =
              "Bearer " + res.data.token;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error("Refresh token failed", refreshError);
          // Clear storage and redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
