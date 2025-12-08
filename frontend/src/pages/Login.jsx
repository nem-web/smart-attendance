import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [remember, setRemeber] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try{
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-type" : "application/json",
        },
        body: JSON.stringify({email, password}),
      });

      if(!res.ok){
        const data = await res.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await res.json();

      if(remember) localStorage.setItem("user", JSON.stringify(data));

      if(data.role === "Teacher"){
        navigate("/dashboard");
      } else if (data.role === "Student"){
        navigate("/student-dashboard");
      } else {
        navigate("/login");
      }
    }
    catch (err){
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        
        {/* Left Side: Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto space-y-8">
            
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900 text-center">Welcome</h1>
              <p className="text-gray-500">Please enter your details to sign in.</p>
            </div>

            {/* Social Login Buttons */}
            <div className="flex gap-4">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                <span className="text-sm font-medium text-gray-700">Google</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                <img src="https://www.svgrepo.com/show/475689/twitter-color.svg" alt="Twitter" className="w-5 h-5" />
                <span className="text-sm font-medium text-gray-700">Twitter</span>
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400 font-medium">Or continue with</span>
              </div>
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Email address</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      placeholder="Enter your email" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                {/* Additional Options */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                     checked = {remember}
                     onChange={(e) => setRemeber(e.target.checked)}
                     className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm text-gray-500 select-none">Remember me</span>
                  </label>
                  <Link to="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <p className="text-red-500 text-sm font-medium text-center">{error}</p>
              )}

              <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md transition-all active:scale-[0.98]">
                Sign in
              </button>
            </form>

            <p className="text-center text-sm text-gray-500">
              Don't have an account yet?{" "}
              <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
                Register for free
              </Link>
            </p>

          </div>
        </div>

        {/* Right Side: Illustration/Image */}
        <div className="hidden md:block w-1/2 bg-indigo-50 relative overflow-hidden">
          {/* Abstract blobs/gradient for background */}
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10"></div>
          
          <div className="absolute inset-0 flex items-center justify-center p-12">
             <div className="text-center space-y-4 relative z-10">
               <div className="w-64 h-64 bg-white/30 backdrop-blur-xl rounded-full mx-auto flex items-center justify-center border border-white/50 shadow-lg mb-8 relative">
                  {/* Placeholder for the 3D illustration shown in design */}
                  <div className="w-48 h-48 bg-indigo-600 rounded-full opacity-20 blur-3xl absolute"></div>
                  <span className="text-6xl">🎓</span>
               </div>
               <h2 className="text-2xl font-bold text-gray-800">Smart Attendance System</h2>
               <p className="text-gray-600 max-w-sm mx-auto">
                 Automate your classroom attendance with face recognition. Secure, fast, and reliable.
               </p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
