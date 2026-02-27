import React, { useState } from "react";
import PropTypes from "prop-types";
import { Shield, X, Loader2 } from "lucide-react";
import api from "../api/axiosClient";
import toast from "react-hot-toast";

export default function DeviceBindingOTPModal({ isOpen, onClose, onSuccess, email }) {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  const handleSendOTP = async () => {
    setIsSendingOTP(true);
    try {
      const deviceId = localStorage.getItem("device_uuid");
      await api.post("/auth/device-binding-otp", {
        email,
        new_device_id: deviceId,
      });
      toast.success("OTP sent to your email!");
    } catch (error) {
      console.error("Failed to send OTP:", error);
      toast.error(error.response?.data?.detail || "Failed to send OTP");
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter a 6-digit OTP");
      return;
    }

    setIsLoading(true);
    try {
      const deviceId = localStorage.getItem("device_uuid");
      await api.post("/auth/verify-device-binding-otp", {
        email,
        otp,
        new_device_id: deviceId,
      });
      toast.success("Device verified successfully!");
      setOtp("");
      onSuccess();
    } catch (error) {
      console.error("Failed to verify OTP:", error);
      toast.error(error.response?.data?.detail || "Invalid or expired OTP");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-color)] max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--action-info-bg)]/10 flex items-center justify-center">
              <Shield className="text-[var(--action-info-bg)]" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-main)]">
              Verify New Device
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-body)] hover:text-[var(--text-main)] transition-colors"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-[var(--action-info-bg)]/10 border border-[var(--action-info-bg)]/30 rounded-lg p-4">
            <p className="text-sm text-[var(--text-body)] leading-relaxed">
              You are using a new device. For security reasons, please verify
              this device with an OTP sent to your registered email address.
            </p>
          </div>

          {/* Send OTP Button */}
          <button
            onClick={handleSendOTP}
            disabled={isSendingOTP}
            className="w-full px-4 py-3 rounded-lg font-medium text-sm bg-[var(--action-info-bg)] text-white hover:bg-[var(--action-info-bg)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSendingOTP ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Sending OTP...
              </>
            ) : (
              "Send OTP to Email"
            )}
          </button>

          {/* OTP Input Form */}
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-[var(--text-main)] mb-2"
              >
                Enter 6-Digit OTP
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(value);
                }}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-main)] text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--action-info-bg)] transition-all"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full px-4 py-3 rounded-lg font-medium text-sm bg-[var(--action-success-bg)] text-white hover:bg-[var(--action-success-bg)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Verifying...
                </>
              ) : (
                "Verify & Continue"
              )}
            </button>
          </form>

          <p className="text-xs text-[var(--text-body)]/70 text-center">
            OTP is valid for 10 minutes
          </p>
        </div>
      </div>
    </div>
  );
}

DeviceBindingOTPModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  email: PropTypes.string.isRequired,
};
