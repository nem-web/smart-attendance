import axios from "axios";
import { getOrCreateDeviceUUID } from "../utils/deviceBinding"; // Update path if needed

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Ensure every request has the Device ID attached
  config.headers["X-Device-ID"] = getOrCreateDeviceUUID();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Safely extract detail (it might be a string or an object depending on the error)
    const detail = error.response?.data?.detail;

    /* ===============================
       1. DEVICE BINDING → OTP FLOW
       =============================== */
    // Check if detail is an object (new backend format) or string
    const isDeviceBindingError = 
      typeof detail === "object" 
        ? detail?.message === "DEVICE_BINDING_REQUIRED"
        : detail === "DEVICE_BINDING_REQUIRED";

    if (error.response?.status === 403 && isDeviceBindingError) {
      
      // CRITICAL FIX: If the backend generated a new device ID, save it immediately!
      if (typeof detail === "object" && detail?.device_id) {
        localStorage.setItem("device_uuid", detail.device_id);
      }

      let email = "";
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) email = JSON.parse(userStr).email;
      } catch (e) {
        console.error("Failed to parse user", e);
      }

      sessionStorage.setItem(
        "deviceBindingRequired",
        JSON.stringify({
          email: email,
          timestamp: Date.now(),
        })
      );

      const { toast } = await import("react-hot-toast");
      toast.error("New device detected. Please verify with OTP.", {
        duration: 5000,
        position: "top-center",
      });

      return Promise.reject(error);
    }

    /* ===============================
       2. SESSION CONFLICT
       =============================== */
    if (
      error.response?.status === 401 &&
      typeof detail === "string" &&
      detail.includes("SESSION_CONFLICT")
    ) {
      const { toast } = await import("react-hot-toast");

      // CRITICAL FIX: Preserve device UUID before clearing storage
      const currentDeviceId = localStorage.getItem("device_uuid");
      localStorage.clear();
      sessionStorage.clear();
      if (currentDeviceId) {
        localStorage.setItem("device_uuid", currentDeviceId);
      }

      toast.error(
        "You have been logged out because this account was logged in on another device",
        { duration: 5000, position: "top-center" }
      );

      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);

      return Promise.reject(error);
    }

    /* ===============================
       3. TOKEN REFRESH
       =============================== */
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          const res = await axios.post("/api/auth/refresh-token", {
            refresh_token: refreshToken,
          });

          localStorage.setItem("token", res.data.token);
          if (res.data.refresh_token) {
            localStorage.setItem("refresh_token", res.data.refresh_token);
          }

          api.defaults.headers.common.Authorization = "Bearer " + res.data.token;
          return api(originalRequest);
        } catch {
          // CRITICAL FIX: Preserve device UUID before clearing storage on refresh failure
          const currentDeviceId = localStorage.getItem("device_uuid");
          localStorage.clear();
          if (currentDeviceId) {
            localStorage.setItem("device_uuid", currentDeviceId);
          }
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;