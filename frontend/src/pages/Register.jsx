import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Briefcase,
  GraduationCap,
  Phone,
  Hash,
  BookOpen,
  ArrowLeft,
  TrendingUp
} from "lucide-react";

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null); // 'student' or 'teacher'
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    collegeName: "",
    password: "",
    branch: "",
    employee_id: "",
    phone: "",
    roll: "",
    year: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        role,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        college_name: formData.collegeName,
        branch: formData.branch,
        employee_id: role === "teacher" ? formData.employee_id : undefined,
        phone: role === "teacher" ? formData.phone : undefined,
        year: role === "student" ? formData.year : undefined,
        roll: role === "student" ? formData.roll : undefined,

      };

      const res = await fetch(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || t('register.alerts.failed'));
      }

      alert(t('register.alerts.account_created'));
      navigate("/login");
    }
    catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="max-w-5xl w-full bg-[var(--bg-card)] rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

        {/* Left Side: Form Area */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative">

          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="absolute top-8 left-8 text-[var(--text-body)] opacity-70 hover:text-[var(--text-main)] hover:opacity-100 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft size={16} /> {t('register.back')}
            </button>
          )}

          <div className="w-full max-w-md mx-auto space-y-8">

            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-[var(--text-main)]">{t('register.title')}</h1>
              <p className="text-[var(--text-body)] opacity-80">
                {step === 1 ? t('register.subtitle_start') : t('register.subtitle_role', { role })}
              </p>
            </div>

            {/* STEP 1: Role Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <button
                  onClick={() => handleRoleSelect('student')}
                  className="w-full p-4 border border-[var(--border-color)] rounded-2xl hover:border-[var(--primary)] hover:bg-[var(--bg-secondary)] transition-all group flex items-center gap-4 text-left"
                >
                  <div className="w-12 h-12 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-[var(--text-on-primary)] transition-colors">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-main)]">{t('register.role_student')}</h3>
                    <p className="text-sm text-[var(--text-body)] opacity-80">{t('register.role_student_desc')}</p>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect('teacher')}
                  className="w-full p-4 border border-[var(--border-color)] rounded-2xl hover:border-[var(--primary)] hover:bg-[var(--bg-secondary)] transition-all group flex items-center gap-4 text-left"
                >
                  <div className="w-12 h-12 bg-[var(--action-info-bg)]/10 text-[var(--action-info-bg)] rounded-full flex items-center justify-center group-hover:bg-[var(--action-info-bg)] group-hover:text-[var(--text-on-primary)] transition-colors">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-main)]">{t('register.role_teacher')}</h3>
                    <p className="text-sm text-[var(--text-body)] opacity-80">{t('register.role_teacher_desc')}</p>
                  </div>
                </button>
              </div>
            )}

            {/* STEP 2: Registration Form */}
            {step === 2 && (
              <form
                onSubmit={handleSubmit}
                className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">

                {/* Common: Full Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-main)]">{t('register.full_name')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10"
                    />
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70" />
                  </div>
                </div>

                {/* Common: Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-main)]">{t('auth.emailLabel')}</label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@university.edu"
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10"
                    />
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70" />
                  </div>
                </div>
                {/* Common: College Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-main)]">{t('register.college_name')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="collegeName"
                      value={formData.collegeName}
                      onChange={handleChange}
                      placeholder={t('register.college_name')}
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10"
                    />
                    <GraduationCap size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70" />
                  </div>
                </div>
                {/* -------- Branch -------- */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-main)]">{t('register.branch')}</label>
                  <div className="relative">
                    <select
                      name="branch"
                      value={formData.branch}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10 appearance-none text-[var(--text-main)]"
                    >
                      <option value="" disabled>{t('register.select_branch')}</option>
                      <option value="cse">Computer Science (CSE)</option>
                      <option value="ece">Electronics (ECE)</option>
                      <option value="me">Mechanical (ME)</option>
                      <option value="ee">Electrical (EE)</option>
                      <option value="ce">Civil (CE)</option>
                    </select>
                    <BookOpen
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70"
                    />
                  </div>
                </div>
                {/* ROLE SPECIFIC FIELDS */}

                {role === "student" && (
                  <div className="space-y-4">

                    {/* -------- Year -------- */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[var(--text-main)]">{t('register.year')}</label>
                      <div className="relative">
                        <select
                          name="year"
                          value={formData.year}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10 appearance-none text-[var(--text-body)]"
                        >
                          <option value="" disabled>{t('register.select_year')}</option>
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                          <option value="5">5th Year</option>
                        </select>
                        <TrendingUp
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70"
                        />
                      </div>
                    </div>

                    {/* -------- Roll Number -------- */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[var(--text-main)]">{t('register.roll_number')}</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="roll"
                          value={formData.roll}
                          onChange={handleChange}
                          placeholder={t('register.roll_number')}
                          className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10 text-[var(--text-body)]"
                        />
                        <User
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {role === 'teacher' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[var(--text-main)]">{t('register.employee_id')}</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="employee_id"
                          value={formData.employee_id}
                          onChange={handleChange}
                          placeholder="EMP-12345"
                          className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10"
                        />
                        <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[var(--text-main)]">{t('register.phone_number')}</label>
                      <div className="relative">
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+91 98765 43210"
                          className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10"
                        />
                        <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70" />
                      </div>
                    </div>
                  </>
                )}

                {/* Common: Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-main)]">{t('register.password_label')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={t('register.create_password')}
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10 pr-10"
                    />
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70 hover:opacity-100 hover:text-[var(--text-main)] focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-xl font-semibold hover:bg-[var(--primary-hover)] shadow-md transition-all active:scale-[0.98] mt-2">
                  {loading ? t('register.submitting') : t('register.submit')}
                </button>

                {error && (
                  <p className="text-sm text-[var(--danger)] text-center mt-1">{error}</p>
                )}

              </form>
            )}

            <p className="text-center text-sm text-[var(--text-body)]">
              {t('register.already_have_account')}{" "}
              <Link to="/login" className="font-semibold text-[var(--primary)] hover:underline">
                {t('register.sign_in')}
              </Link>
            </p>

          </div>
        </div>

        {/* Right Side: Illustration/Image (Dynamic based on role) */}
        <div className="hidden md:block w-1/2 bg-[var(--bg-secondary)] relative overflow-hidden transition-colors duration-500">
          <div className="absolute top-0 right-0 w-full h-full opacity-10"
          style={{ background: role === "teacher"
          ? `linear-gradient(to bottom right, var(--action-info-bg), var(--primary))`
          : `linear-gradient(to bottom right, var(--primary), var(--action-info-bg))` }}>
          </div>

          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="text-center space-y-4 relative z-10">
              <div className="w-64 h-64 bg-[var(--bg-card)]/30 backdrop-blur-xl rounded-full mx-auto flex items-center justify-center border border-[var(--border-color)]/50 shadow-lg mb-8 relative">
                <div className="w-48 h-48 rounded-full opacity-20 blur-3xl absolute" style={{ backgroundColor: role === "teacher"
                  ? "var(--action-info-bg)"
                  : "var(--primary)" }}>
                </div>
                <span className="text-6xl">
                  {role === 'teacher' ? '👨‍🏫' : role === 'student' ? '👨‍🎓' : '🚀'}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-main)]">
                {role === 'teacher' ? 'Empower your Classroom' : role === 'student' ? 'Track your Progress' : 'Smart Attendance System'}
              </h2>
              <p className="text-[var(--text-body)] max-w-sm mx-auto">
                {role === 'teacher'
                  ? "Manage attendance, view analytics, and streamline your teaching workflow."
                  : role === 'student'
                    ? "Stay on top of your attendance records and never miss a critical update."
                    : "Join thousands of users managing attendance efficiently."}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
