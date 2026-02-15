import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const processedRef = useRef(false); // prevents double-processing (StrictMode/dev reloads)

  useEffect(() => {
    if (processedRef.current) return; // already handled
    processedRef.current = true;

    const rawHash = window.location.hash || "";
    const cleanHash = rawHash.replace(/^#/, ""); // remove leading '#'
    const hashParams = new URLSearchParams(cleanHash);

    const queryParams = new URLSearchParams(window.location.search);

    const token =
      hashParams.get("token") || queryParams.get("token") || null;
    const refreshToken =
      hashParams.get("refresh_token") || queryParams.get("refresh_token") || null;
    const email =
      hashParams.get("email") || queryParams.get("email") || null;
    const role =
      hashParams.get("role") || queryParams.get("role") || null;
    const userId =
      hashParams.get("userId") || queryParams.get("userId") || null;
    const name =
      hashParams.get("name") || queryParams.get("name") || null;

    // console.log(token,email,userId,name,role);

    if (!token || !role) {
        // Nothing to do — go back to login (or show error)
      navigate("/login");
      return;
    }

   // Save as your normal login flow does
    try {
      localStorage.setItem("token", token);
      if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
      localStorage.setItem("user", JSON.stringify({ email, role , name, userId}));
      // optionally set global auth header for axios/fetch here
      // axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (err) {
      console.error("Failed to save OAuth token to localStorage", err);
    }

    // Remove token from URL so re-loads/mounts don't see it again
    // We replace the current history entry with same path but no hash/search
    const cleanUrl =
      window.location.origin + window.location.pathname + window.location.search;
    window.history.replaceState({}, document.title, cleanUrl);

    // Navigate to role-based dashboard
    if (role === "teacher") navigate("/dashboard");
    else navigate("/student-dashboard");
  }, [navigate]);

  return <div>Signing you in…</div>;
}
