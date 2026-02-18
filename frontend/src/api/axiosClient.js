import axios from "axios";
import { getOrCreateDeviceUUID } from "../utils/deviceBinding";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add device UUID to all requests
  const deviceUUID = getOrCreateDeviceUUID();
  config.headers["X-Device-ID"] = deviceUUID;

  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check for device binding error (403 New Device Detected)
    if (error.response?.status === 403 && 
        error.response?.data?.detail?.includes("New device detected")) {
      // Store device binding state for modal to use
      sessionStorage.setItem(
        "deviceBindingRequired",
        JSON.stringify({
          error: error.response.data.detail,
          timestamp: Date.now(),
        })
      );

      // Import toast dynamically to avoid circular dependencies
      const { toast } = await import("react-hot-toast");
      toast.error("New device detected. Please verify with OTP.", {
        duration: 5000,
        position: "top-center",
      });

      return Promise.reject(error);
    }

    // Check for session conflict error
    if (
      error.response?.status === 401 &&
      error.response?.data?.detail?.includes("SESSION_CONFLICT")
    ) {
      // Import toast dynamically to avoid circular dependencies
      const { toast } = await import("react-hot-toast");

      // Clear all session data
      localStorage.clear();
      sessionStorage.clear();

      // Show user-friendly notification
      toast.error(
        "You have been logged out because this account was logged in on another device",
        {
          duration: 5000,
          position: "top-center",
        }
      );

      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);

      return Promise.reject(error);
    }

    // Handle token refresh for other 401 errors
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
