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

  const apiUrl = import.meta.env.VITE_API_URL;

  // Google Login
  const googleLogin = () => {
    window.location.href = `${apiUrl}/auth/google`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try{
      const res = await fetch(`${apiUrl}/auth/login`, {
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
      console.log(data);

      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data));

      // --- FIX: Handle role case sensitivity (Teacher/Student vs teacher/student) ---
      const userRole = data.role ? data.role.toLowerCase() : "";

      if(userRole === "teacher"){
        navigate("/dashboard");
      } else if (userRole === "student"){
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4"> 
    {/* bg-gray-50 changed to bg-[var(--bg-primary)] */}
      <div className="max-w-5xl w-full bg-[var(--bg-card)] rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        {/* bg-white changed to bg-[var(--bg-card)] */}

        {/* Left Side: Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto space-y-8">
            
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-[var(--text-main)] text-center">Welcome</h1>
              <p className="text-[var(--text-body)]">Please enter your details to sign in.</p>
            </div>

            {/* Social Login Buttons */}
            <div className="flex gap-4">
              <button onClick={googleLogin} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-secondary)] transition">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                <span className="text-sm font-medium text-[var(--text-main)]">Google</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-secondary)] transition">
                <img src="https://www.svgrepo.com/show/475689/twitter-color.svg" alt="Twitter" className="w-5 h-5" />
                <span className="text-sm font-medium text-[var(--text-main)]">Twitter</span>
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--border-color)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--bg-card)] px-2 text-[var(--text-body)] font-medium">Or continue with</span>
              </div>
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-main)]">Email address</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      placeholder="Enter your email" 
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)]" />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-main)]">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--bg-card)] transition-all pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)]" />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] hover:opacity-80 focus:outline-none"
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
                     className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--primary)] focus:ring-[var(--primary)]" />
                    <span className="text-sm text-[var(--text-body)] select-none">Remember me</span>
                  </label>
                  <Link to="#" className="text-sm font-medium text-[var(--primary)] hover:opacity-90 hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <p className="text-[var(--danger)] text-sm font-medium text-center">{error}</p>
              )}

              <button className="w-full py-3 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-xl font-semibold hover:bg-[var(--primary-hover)] shadow-md transition-all active:scale-[0.98]">
                Sign in
              </button>
            </form>

            <p className="text-center text-sm text-[var(--text-body)]">
              Don't have an account yet?{" "}
              <Link to="/register" className="font-semibold text-[var(--primary)] hover:underline">
                Register for free
              </Link>
            </p>

          </div>
        </div>

        {/* Right Side: Illustration/Image */}
        <div className="hidden md:block w-1/2 bg-[var(--bg-secondary)] relative overflow-hidden">
          {/* Abstract blobs/gradient for background */}
          <div className="absolute top-0 right-0 w-full h-full opacity-10" style={{ background: "linear-gradient(135deg, var(--primary), transparent)"}}></div>
          
          <div className="absolute inset-0 flex items-center justify-center p-12">
             <div className="text-center space-y-4 relative z-10">
               {/* <div className="w-64 h-64 bg-white/30 backdrop-blur-xl rounded-full mx-auto flex items-center justify-center border border-white/50 shadow-lg mb-8 relative"> */}
               <div className="w-64 h-64 rounded-full mx-auto flex items-center justify-center shadow-lg mb-8 relative backdrop-blur-xl"style={{background: "color-mix(in srgb, var(--bg-card) 30%, transparent)",border: "1px solid color-mix(in srgb, var(--text-on-primary) 50%, transparent)",}}>
                 {/* Placeholder for the 3D illustration shown in design */}
                 {/* <div className="w-48 h-48 bg-indigo-600 rounded-full opacity-20 blur-3xl absolute"></div> */}
                 <div className="w-48 h-48 rounded-full opacity-20 blur-3xl absolute"style={{ background: "var(--primary)" }}/>
                 <span className="text-6xl">🎓</span>
               </div>
               <h2 className="text-2xl font-bold text-[var(--text-main)]">Smart Attendance System</h2>
               <p className="text-[var(--text-body)] max-w-sm mx-auto">
                 Automate your classroom attendance with face recognition. Secure, fast, and reliable.
               </p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
