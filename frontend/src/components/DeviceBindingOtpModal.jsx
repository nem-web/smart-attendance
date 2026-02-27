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
      const deviceId = getDeviceUUID();
      await api.post("/auth/device-binding-otp", {
        email: userEmail,
        new_device_id: deviceId,
      });

      setStep("otp_sent");
      setResendCountdown(60);
      toast.success("OTP sent to your registered email");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to send OTP. Please try again."
      );
      toast.error("Failed to send OTP");
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
      const deviceId = getDeviceUUID();
      await api.post("/auth/verify-device-binding-otp", {
        email: userEmail,
        otp: otp,
        new_device_id: deviceId,
      });

      toast.success("Device successfully bound! You can now mark attendance.");
      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to verify OTP.");
      toast.error("OTP verification failed");
      setStep("otp_sent");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtp("");
    setError("");
    handleSendOtp();
  };

  const handleClose = () => {
    setOtp("");
    setError("");
    setStep("initial");
    setResendCountdown(0);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Verify New Device</DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {step === "initial" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="warning" sx={{ mb: 1 }}>
              <Typography variant="body2">
                A new device has been detected. For security, please verify this
                device with an OTP sent to your email.
              </Typography>
            </Alert>

            <Typography variant="body2" color="text.secondary">
              An OTP (One-Time Password) will be sent to your registered email
              address. Use it to verify and bind this device to your account.
            </Typography>
          </Box>
        )}

        {step === "otp_sent" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="info">
              <Typography variant="body2">
                We&apos;ve sent a 6-digit OTP to your email. Please enter it below.
              </Typography>
            </Alert>

            <TextField
              label="Enter OTP"
              type="text"
              value={otp}
              onChange={(e) => {
                const val = e.target.value;
                // Only allow digits, max 6
                if (/^\d{0,6}$/.test(val)) {
                  setOtp(val);
                }
              }}
              placeholder="000000"
              slotProps={{
                htmlInput: {
                  maxLength: 6,
                  pattern: "[0-9]*",
                  inputMode: "numeric",
                  style: { textAlign: "center", letterSpacing: "0.5em" },
                }
              }}
              fullWidth
              disabled={loading}
              autoFocus
            />

            {resendCountdown > 0 && (
              <Typography variant="caption" color="text.secondary">
                Resend OTP in {resendCountdown} seconds
              </Typography>
            )}

            {resendCountdown === 0 && (
              <Button
                variant="text"
                size="small"
                onClick={handleResendOtp}
                disabled={loading}
              >
                Resend OTP
              </Button>
            )}
          </Box>
        )}

        {step === "verifying" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="info">
              <Typography variant="body2">
                Verifying your OTP...
              </Typography>
            </Alert>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>

        {step === "initial" && (
          <Button
            onClick={handleSendOtp}
            variant="contained"
            disabled={loading}
            sx={{
              minWidth: 150,
            }}
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
