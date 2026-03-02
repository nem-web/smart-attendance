import { useState, useCallback, useEffect } from "react";

/**
 * Custom hook for managing device binding OTP modal state.
 * Opens OTP modal ONLY when backend signals device binding is required.
 */
export const useDeviceBinding = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  /**
   * Listen for backend-triggered device binding requirement
   * (set by axios interceptor on 403 DEVICE_BINDING error)
   */
  useEffect(() => {
    const checkDeviceBinding = () => {
      const stored = sessionStorage.getItem("deviceBindingRequired");
      if (!stored) return;

      try {
        // Get logged-in user email
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        if (user?.email) {
          setUserEmail(user.email);
          setIsModalOpen(true);
        }
      } catch (err) {
        console.error("Failed to read device binding state", err);
      } finally {
        // Clean up flag so modal doesn't reopen
        sessionStorage.removeItem("deviceBindingRequired");
      }
    };

    // Run immediately on mount
    checkDeviceBinding();

    // Also poll in case axios interceptor runs after mount
    const intervalId = window.setInterval(checkDeviceBinding, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  /**
   * Manually open modal (optional, rarely needed)
   */
  const openModal = useCallback((email) => {
    if (!email) return;
    setUserEmail(email);
    setIsModalOpen(true);
  }, []);

  /**
   * Close modal without success
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setUserEmail("");
  }, []);

  /**
   * Close modal after successful OTP verification
   */
  const handleSuccess = useCallback(() => {
    setIsModalOpen(false);
    setUserEmail("");
  }, []);

  return {
    isModalOpen,
    openModal,
    closeModal,
    userEmail,
    handleSuccess,
  };
};
