import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { t, i18n } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const [remember, setRemeber] = useState(false);

  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_URL;

  // Google Login
  const googleLogin = () => {
    window.location.href = `${apiUrl}/auth/google`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || t('alerts.login_failed'));
      }

      const data = await res.json();

      localStorage.setItem("token", data.token)
      if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user", JSON.stringify(data));

      // --- FIX: Handle role case sensitivity (Teacher/Student vs teacher/student) ---
      const userRole = data.role ? data.role.toLowerCase() : "";

      if (userRole === "teacher") {
        navigate("/dashboard");
      } else if (userRole === "student") {
        navigate("/student-dashboard");
      } else {
        navigate("/login");
      }

    }
    catch (err) {
      console.error("Login failed:", err);
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="max-w-5xl w-full bg-[var(--bg-card)] rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row h-[600px]">

        {/* Left Side: Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto space-y-8">

            {/* Header */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-[var(--text-main)] text-center">{t('auth.signInTitle')}</h1>
                {/* Language Switcher */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => changeLanguage('en')} 
                    className={`text-sm ${i18n.language === 'en' ? 'font-bold text-blue-600' : 'text-gray-500'}`}
                  >
                    English
                  </button>
                  <span className="text-gray-300">|</span>
                  <button 
                    onClick={() => changeLanguage('hi')} 
                    className={`text-sm ${i18n.language === 'hi' ? 'font-bold text-blue-600' : 'text-gray-500'}`}
                  >
                    हिंदी
                  </button>
                </div>
              </div>
              <p className="text-[var(--text-body)]">{t('login.subtitle')}</p>
            </div>

            {/* Social Login Buttons */}
            <div className="w-full">
              <button onClick={googleLogin} className="w-full flex items-center justify-center gap-2 py-2.5 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-secondary)] transition">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                <span className="text-sm font-medium text-[var(--text-body)]">{t('login.google')}</span>
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--border-color)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--bg-card)] px-2 text-[var(--text-body)] opacity-70 font-medium">{t('login.or_continue')}</span>
              </div>
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-body)]">{t('auth.emailLabel')}</label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder={t('login.email_placeholder')}
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70" />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-body)]">{t('login.password_label')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={t('login.password_placeholder')}
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70 hover:opacity-100 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Additional Options */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemeber(e.target.checked)}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--primary)] focus:ring-[var(--primary)]" />
                    <span className="text-sm text-[var(--text-body)] select-none">{t('login.remember_me')}</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm font-medium text-[var(--primary)] opacity-80 hover:text-[var(--primary)] hover:underline">
                    {t('login.forgot_password')}
                  </Link>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <p className="text-[var(--danger)] text-sm font-medium text-center">{error}</p>
              )}

              <button className="w-full py-3 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-xl font-semibold hover:bg-[var(--primary-hover)] hover:text-[var(--text-main)] shadow-md transition-all active:scale-[0.98]">
                {t('login.submit')}
              </button>
            </form>

            <p className="text-center text-sm text-[var(--text-body)]">
              {t('login.no_account')}{" "}
              <Link to="/register" className="font-semibold text-[var(--primary)] hover:underline">
                {t('login.register_link')}
              </Link>
            </p>

          </div>
        </div>

        {/* Right Side: Illustration/Image */}
        <div className="hidden md:block w-1/2 bg-[var(--bg-secondary)] relative overflow-hidden">
          {/* Abstract blobs/gradient for background */}
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary)] opacity-10"></div>

          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="text-center space-y-4 relative z-10">
              <div className="w-64 h-64 bg-[var(--bg-card)]/30 backdrop-blur-xl rounded-full mx-auto flex items-center justify-center border border-[var(--bg-card)]/50 shadow-lg mb-8 relative">
                {/* Placeholder for the 3D illustration shown in design */}
                <div className="w-48 h-48 bg-[var(--primary)] rounded-full opacity-20 blur-3xl absolute"></div>
                <span className="text-6xl">🎓</span>
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-main)]">{t('login.hero_title')}</h2>
              <p className="text-[var(--text-body)] max-w-sm mx-auto">
                {t('login.hero_subtitle')}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
