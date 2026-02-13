import React, { useState } from 'react';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Handle email submission and OTP request
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Call backend API to send OTP
      const response = await fetch('/api/auth/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        setStep('otp');
        setSuccessMessage('OTP sent to your email. Please check your inbox.');
      } else {
        setOtpError('Failed to send OTP. Please try again.');
      }
    } catch (error) {
      setOtpError('An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification with proper error handling
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError(''); // Clear previous errors
    setLoading(true);

    // Validate OTP format
    if (!otp || otp.trim().length === 0) {
      setOtpError('Please enter the OTP.');
      setLoading(false);
      return;
    }

    if (otp.length < 6) {
      setOtpError('OTP must be at least 6 digits.');
      setLoading(false);
      return;
    }

    try {
      // Call backend API to verify OTP
      const response = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      if (response.ok) {
        // OTP verification successful
        setSuccessMessage('OTP verified successfully! Redirecting to password reset...');
        // Redirect to password reset page
        setTimeout(() => {
          window.location.href = '/reset-password?token=' + otp;
        }, 1500);
      } else if (response.status === 400) {
        // Invalid or expired OTP
        setOtpError('Invalid or expired OTP. Please try again or request a new one.');
        setOtp(''); // Clear the input field
      } else if (response.status === 401) {
        // Unauthorized - email not found
        setOtpError('Email not found. Please go back and enter a valid email.');
      } else {
        setOtpError('Verification failed. Please try again.');
      }
    } catch (error) {
      // Network error or server error
      setOtpError('An error occurred while verifying OTP. Please check your connection and try again.');
      console.error('OTP Verification Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <h2>Forgot Password</h2>
      
      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit}>
          <p>Enter your email to reset your password</p>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Sending OTP...' : 'Send Reset Link'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit}>
          <p>Enter the OTP sent to {email}</p>
          
          {/* OTP Input Field with Error State */}
          <div className={`otp-field ${otpError ? 'error' : ''}`}>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                setOtpError(''); // Clear error when user starts typing
              }}
              maxLength="6"
              disabled={loading}
              className={otpError ? 'input-error' : ''}
              autoFocus
            />
          </div>
          
          {/* Error Message Display */}
          {otpError && (
            <div className="error-message" role="alert">
              <span className="error-icon">⚠️</span>
              {otpError}
            </div>
          )}
          
          {/* Success Message Display */}
          {successMessage && (
            <div className="success-message" role="status">
              ✓ {successMessage}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="button-group">
            <button type="submit" disabled={loading || !otp}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setStep('email');
                setOtp('');
                setOtpError('');
              }}
              className="secondary-button"
              disabled={loading}
            >
              Back to Email
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ForgotPassword;
