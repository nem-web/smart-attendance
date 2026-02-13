import React from "react";

const ForgotPassword = () => {
  return (
    <div className="forgot-password-container">
      <h2>Forgot Password</h2>
      <p>Enter your email to reset your password</p>

      <form>
        <input
          type="email"
          placeholder="Enter your email"
          required
        />
        <button type="submit">Send Reset Link</button>
      </form>
    </div>
  );
};

export default ForgotPassword;
