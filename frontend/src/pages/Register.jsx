import React from "react";
import { SignUp } from "@clerk/clerk-react";


export default function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side: Clerk Sign Up */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            <SignUp 
              routing="path"
              path="/register"
              signInUrl="/login"
              afterSignUpUrl="/complete-profile"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none",
                  headerTitle: "text-3xl font-bold text-gray-900",
                  headerSubtitle: "text-gray-500",
                  socialButtonsBlockButton: "border border-gray-200 rounded-xl hover:bg-gray-50",
                  formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 rounded-xl",
                  formFieldInput: "rounded-xl border-gray-200 focus:ring-indigo-500",
                  footerActionLink: "text-indigo-600 hover:underline",
                }
              }}
            />
          </div>
        </div>

        {/* Right Side: Illustration/Image */}
        <div className="hidden md:block w-1/2 bg-indigo-50 relative overflow-hidden transition-colors duration-500">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-blue-500 to-cyan-600 opacity-10"></div>
          
          <div className="absolute inset-0 flex items-center justify-center p-12">
             <div className="text-center space-y-4 relative z-10">
               <div className="w-64 h-64 bg-white/30 backdrop-blur-xl rounded-full mx-auto flex items-center justify-center border border-white/50 shadow-lg mb-8 relative">
                  <div className="w-48 h-48 rounded-full opacity-20 blur-3xl absolute bg-blue-600"></div>
                  <span className="text-6xl">🚀</span>
               </div>
               <h2 className="text-2xl font-bold text-gray-800">
                 Smart Attendance System
               </h2>
               <p className="text-gray-600 max-w-sm mx-auto">
                 Join thousands of users managing attendance efficiently with facial recognition technology.
               </p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
