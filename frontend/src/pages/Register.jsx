import React, { useState } from "react";
import { Link } from "react-router-dom";
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
  ArrowLeft
} from "lucide-react";

export default function Register() {
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
    password: "",
    branch: "",
    employeeId: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const {name, value} = e.target;
    setFormData((prev) => ({...prev, [name]: value}));
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
        branch: role === "student" ? formData.branch : undefined,
        employeeId: role === "teacher" ? formData.employeeId : undefined,
        phone: role === "teacher" ? formData.phone : undefined,
      };

      const res = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: {"Content-Type" : "application/json"},
        body: JSON.stringify(payload)
      });

      if(!res.ok){
        const data = await res.json();
        throw new Error(data.detail || "Registration Failed");
      }

      alert("Account created, please login");
    }
    catch (err){
      setError(err.message);
    } finally{
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side: Form Area */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative">
          
          {step === 2 && (
            <button 
              onClick={() => setStep(1)}
              className="absolute top-8 left-8 text-gray-400 hover:text-gray-600 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}

          <div className="w-full max-w-md mx-auto space-y-8">
            
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">Create account</h1>
              <p className="text-gray-500">
                {step === 1 ? "Choose your role to get started." : `Sign up as a ${role}.`}
              </p>
            </div>

            {/* STEP 1: Role Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <button 
                  onClick={() => handleRoleSelect('student')}
                  className="w-full p-4 border border-gray-200 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all group flex items-center gap-4 text-left"
                >
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">I am a Student</h3>
                    <p className="text-sm text-gray-500">Track attendance & view analytics</p>
                  </div>
                </button>

                <button 
                  onClick={() => handleRoleSelect('teacher')}
                  className="w-full p-4 border border-gray-200 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all group flex items-center gap-4 text-left"
                >
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">I am a Teacher</h3>
                    <p className="text-sm text-gray-500">Manage classes & reports</p>
                  </div>
                </button>
              </div>
            )}

            {/* STEP 2: Registration Form */}
            {step === 2 && (
              <form
               onClick={handleSubmit}
               className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                
                {/* Common: Full Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Full Name</label>
                  <div className="relative">
                    <input 
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pl-10"
                    />
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Common: Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Email Address</label>
                  <div className="relative">
                    <input 
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange} 
                      placeholder="john@university.edu" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pl-10"
                    />
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* ROLE SPECIFIC FIELDS */}
                
                {role === 'student' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Branch</label>
                    <div className="relative">
                      <select
                        name="branch"
                        value={formData.branch}
                        onChange={handleChange}
                       className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pl-10 appearance-none text-gray-600">
                        <option value="">Select Branch</option>
                        <option value="cse">Computer Science (CSE)</option>
                        <option value="ece">Electronics (ECE)</option>
                        <option value="mech">Mechanical (ME)</option>
                      </select>
                      <BookOpen size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                )}

                {role === 'teacher' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Employee ID</label>
                      <div className="relative">
                        <input 
                          type="text"
                          name="employeeId"
                          value={formData.employeeId}
                          onChange={handleChange} 
                          placeholder="EMP-12345" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pl-10"
                        />
                        <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                      <div className="relative">
                        <input 
                          type="tel" 
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+91 98765 43210" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pl-10"
                        />
                        <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                  </>
                )}

                {/* Common: Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create a password" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pl-10 pr-10"
                    />
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                 type="submit"
                 disabled={loading}
                 className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md transition-all active:scale-[0.98] mt-2">
                  {loading ? "Creating..." : "Create Account"}
                </button>
                
                {error && (
                  <p className="text-sm text-red-500 text-center mt-1">{error}</p>
                )}

              </form>
            )}

            <p className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
                Sign in
              </Link>
            </p>

          </div>
        </div>

        {/* Right Side: Illustration/Image (Dynamic based on role) */}
        <div className="hidden md:block w-1/2 bg-indigo-50 relative overflow-hidden transition-colors duration-500">
          <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-br opacity-10 ${role === 'teacher' ? 'from-purple-500 to-indigo-600' : 'from-blue-500 to-cyan-600'}`}></div>
          
          <div className="absolute inset-0 flex items-center justify-center p-12">
             <div className="text-center space-y-4 relative z-10">
               <div className="w-64 h-64 bg-white/30 backdrop-blur-xl rounded-full mx-auto flex items-center justify-center border border-white/50 shadow-lg mb-8 relative">
                  <div className={`w-48 h-48 rounded-full opacity-20 blur-3xl absolute ${role === 'teacher' ? 'bg-purple-600' : 'bg-blue-600'}`}></div>
                  <span className="text-6xl">
                    {role === 'teacher' ? '👨‍🏫' : role === 'student' ? '👨‍🎓' : '🚀'}
                  </span>
               </div>
               <h2 className="text-2xl font-bold text-gray-800">
                 {role === 'teacher' ? 'Empower your Classroom' : role === 'student' ? 'Track your Progress' : 'Smart Attendance System'}
               </h2>
               <p className="text-gray-600 max-w-sm mx-auto">
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