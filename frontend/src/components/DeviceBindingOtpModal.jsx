import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import toast from "react-hot-toast";
import api from "../api/axiosClient";
import { getDeviceUUID } from "../utils/deviceBinding";

const DeviceBindingOtpModal = ({ isOpen, onClose, userEmail, onSuccess }) => {
  const [step, setStep] = useState("initial"); // "initial", "otp_sent", "verifying"
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  // Handle countdown for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(
        () => setResendCountdown(resendCountdown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleSendOtp = async () => {
    if (!userEmail) {
      setError("Email not found. Please log in again.");
      return;
    }

    setLoading(true);
    setError("");

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
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    if (!userEmail) {
      setError("Email not found. Please log in again.");
      return;
    }

    setLoading(true);
    setError("");
    setStep("verifying");

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
      setLoading(false);
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
            {loading ? <CircularProgress size={24} /> : "Send OTP"}
          </Button>
        )}

        {step === "otp_sent" && (
          <Button
            onClick={handleVerifyOtp}
            variant="contained"
            disabled={loading || otp.length !== 6}
            sx={{
              minWidth: 150,
            }}
          >
            {loading ? <CircularProgress size={24} /> : "Verify & Bind Device"}
          </Button>
        )}

        {step === "verifying" && (
          <Button
            variant="contained"
            disabled={true}
            sx={{
              minWidth: 150,
            }}
          >
            <CircularProgress size={24} />
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DeviceBindingOtpModal;
