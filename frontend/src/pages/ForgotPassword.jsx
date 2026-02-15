import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  Send,
} from "lucide-react";

// Regex Patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const OTP_REGEX = /^\d{6}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function ForgotPassword() {
  // Form State
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify & Reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI/Loading State
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Validations
  const normalizedEmail = email.trim().toLowerCase();
  const isEmailValid = useMemo(
    () => EMAIL_REGEX.test(normalizedEmail),
    [normalizedEmail]
  );
  const isOtpValid = useMemo(() => OTP_REGEX.test(otp.trim()), [otp]);
  const isPasswordValid = useMemo(
    () => PASSWORD_REGEX.test(newPassword),
    [newPassword]
  );
  const isPasswordMatch = useMemo(
    () => confirmPassword.length > 0 && newPassword === confirmPassword,
    [newPassword, confirmPassword]
  );

  // Timer for Resend Cooldown
  useEffect(() => {
    if (resendCooldown === 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const clearMessages = () => {
    if (error) setError("");
    if (success) setSuccess("");
  };

  // --- Handlers ---

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    clearMessages();

    if (!isEmailValid) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    // Simulate API call to send OTP
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
    setLoading(false);

    setStep(2);
    setResendCooldown(30);
    setSuccess(`Verification code sent to ${email}`);
  };

  // Step 2: Resend OTP (Only updates timer/message, stays on step 2)
  const handleResend = async () => {
    clearMessages();
    setLoading(true); // Reuse loading state or create specific one
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    setLoading(false);
    setResendCooldown(30);
    setSuccess("A new code has been sent.");
  };

  // Step 3: Final Reset
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    clearMessages();

    if (!isOtpValid) {
      setError("Please enter the 6-digit code.");
      return;
    }
    if (!isPasswordValid) {
      setError("Password must be 8+ chars with at least 1 number.");
      return;
    }
    if (!isPasswordMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    // Simulate API call to reset password
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    setLoading(false);

    setSuccess("Password reset successfully! Redirecting...");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    // Here you would typically redirect to login
  };

  // Master Submit Handler (Handles Enter Key)
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (step === 1) {
      handleSendOtp();
    } else {
      handleResetPassword();
    }
  };

  // Styles
  const getStepColor = (targetStep) => {
    if (step === targetStep) {
      return "bg-[var(--primary)] text-[var(--text-on-primary)] border-[var(--primary)]";
    }
    if (step > targetStep) {
      // Completed steps
      return "bg-green-500 text-white border-green-500";
    }
    return "bg-transparent text-[var(--text-body)] border-[var(--border-color)]";
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm sm:p-8">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--primary)]">
            <Sparkles size={18} />
          </span>
          <p className="text-[22px] font-semibold text-[var(--text-main)]">
            Smart Attendance
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-main)]">
            {step === 1 ? "Reset your password" : "Verify & Reset"}
          </h1>
          <p className="text-base text-[var(--text-body)]">
            {step === 1
              ? "Enter your email to receive a verification code."
              : "Enter the code sent to your email and set a new password."}
          </p>
        </div>

        {/* Step Indicators */}
        <div className="mt-6 flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${getStepColor(
                1
              )}`}
            >
              {step > 1 ? <CircleCheck size={14} /> : "1"}
            </span>
            <span
              className={
                step >= 1 ? "text-[var(--text-main)]" : "text-[var(--text-body)]"
              }
            >
              Email
            </span>
          </div>
          <div className="h-px w-8 bg-[var(--border-color)]"></div>
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${getStepColor(
                2
              )}`}
            >
              2
            </span>
            <span
              className={
                step === 2 ? "text-[var(--text-main)]" : "text-[var(--text-body)]"
              }
            >
              Reset
            </span>
          </div>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-5" onSubmit={handleFormSubmit} noValidate>
          
          {/* --- EMAIL FIELD (Step 1 & 2) --- */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-[var(--text-main)]"
            >
              Email address
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)]"
              />
              <input
                id="email"
                type="email"
                value={email}
                disabled={step === 2} // Lock email in step 2
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearMessages();
                }}
                placeholder="Enter your registered email"
                autoComplete="email"
                className={`w-full rounded-2xl border bg-[var(--bg-primary)] py-3 pl-10 pr-14 text-base text-[var(--text-main)] placeholder:text-[var(--text-body)] placeholder:opacity-80 outline-none transition focus:ring-2 focus:ring-[var(--primary)] ${
                  step === 2
                    ? "border-[var(--border-color)] opacity-70 cursor-not-allowed"
                    : "border-[var(--border-color)]"
                }`}
              />

              {/* ACTION BUTTON INSIDE EMAIL INPUT */}
              {step === 1 && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={!isEmailValid || loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-[var(--primary)] p-2 text-[var(--text-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--bg-secondary)] disabled:text-[var(--text-body)]"
                  title="Send verification code"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </button>
              )}

              {/* Change Email Button (Step 2 Only) */}
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                    clearMessages();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--primary)] hover:underline"
                >
                  Change
                </button>
              )}
            </div>
            {step === 1 && (
              <p className="text-xs text-[var(--text-body)]">
                Press <strong>Enter</strong> or click the arrow to send code.
              </p>
            )}
          </div>

          {/* --- OTP & PASSWORD FIELDS (Step 2 Only) --- */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-5">
              
              {/* OTP Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="otp"
                    className="text-sm font-semibold text-[var(--text-main)]"
                  >
                    Verification code
                  </label>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    className="text-sm font-semibold text-[var(--primary)] transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend code"}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)]"
                  />
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      const next = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      setOtp(next);
                      clearMessages();
                    }}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] py-3 pl-10 pr-4 text-base text-[var(--text-main)] outline-none transition focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="newPassword"
                    className="text-sm font-semibold text-[var(--text-main)]"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)]"
                    />
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        clearMessages();
                      }}
                      placeholder="Min 8 chars"
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] py-3 pl-10 pr-4 text-base text-[var(--text-main)] outline-none transition focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-semibold text-[var(--text-main)]"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)]"
                    />
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearMessages();
                      }}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] py-3 pl-10 pr-4 text-base text-[var(--text-main)] outline-none transition focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400"
            >
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-600 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-400"
            >
              <CircleCheck size={16} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-color)] px-5 py-3 text-base font-semibold text-[var(--text-main)] transition hover:bg-[var(--bg-secondary)]"
            >
              <ArrowLeft size={18} />
              Back
            </Link>

            {/* Main Submit Button (Visible only in Step 2) */}
            {step === 2 && (
              <button
                type="submit"
                disabled={
                  loading || !isOtpValid || !isPasswordValid || !isPasswordMatch
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 py-3 text-base font-semibold text-[var(--text-on-primary)] shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Reset Password
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-body)]">
          Remembered your password?{" "}
          <Link
            to="/login"
            className="font-semibold text-[var(--primary)] hover:underline"
          >
            Log in instead
          </Link>
        </p>
      </div>
    </div>
  );
}
