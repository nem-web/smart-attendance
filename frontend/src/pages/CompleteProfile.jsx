import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { createUserProfile } from "../api/userProfile";

export default function CompleteProfile() {
  const { user } = useUser();
  const navigate = useNavigate();
  
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Student fields
  const [admissionYear, setAdmissionYear] = useState("");
  const [classSemester, setClassSemester] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  
  // Teacher fields
  const [designation, setDesignation] = useState("");
  const [assignedClasses, setAssignedClasses] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate required fields
      if (!role || !branch) {
        setError("Please select a role and enter your branch/department");
        setLoading(false);
        return;
      }

      // Prepare profile data
      const profileData = {
        clerk_user_id: user.id,
        role,
        branch,
      };

      // Add role-specific fields
      if (role === "student") {
        if (!admissionYear || !classSemester || !rollNumber) {
          setError("Please fill in all student fields");
          setLoading(false);
          return;
        }
        profileData.admission_year = parseInt(admissionYear, 10);
        profileData.class_semester = classSemester;
        profileData.roll_number = rollNumber;
      } else if (role === "teacher") {
        if (!designation || !assignedClasses) {
          setError("Please fill in all teacher fields");
          setLoading(false);
          return;
        }
        profileData.designation = designation;
        profileData.assigned_classes = assignedClasses 
          ? assignedClasses.split(",").map(c => c.trim()).filter(c => c) 
          : [];
      }

      // Create user profile
      await createUserProfile(profileData);

      // Update Clerk metadata with role
      await user.update({
        publicMetadata: { role }
      });

      // Redirect based on role
      if (role === "student") {
        navigate("/student-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Profile creation error:", err);
      setError(err.response?.data?.detail || "Failed to complete profile. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8 md:p-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Please provide additional information to continue</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I am a <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  role === "student"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-3xl mb-2">🎓</div>
                <div className="font-semibold">Student</div>
              </button>
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  role === "teacher"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-3xl mb-2">👨‍🏫</div>
                <div className="font-semibold">Teacher</div>
              </button>
            </div>
          </div>

          {/* Branch/Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch / Department <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="e.g., Computer Science, Electronics, etc."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              required
            />
          </div>

          {/* Student-specific fields */}
          {role === "student" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admission Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={admissionYear}
                  onChange={(e) => setAdmissionYear(e.target.value)}
                  placeholder="e.g., 2020"
                  min="2000"
                  max="2099"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class / Semester <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={classSemester}
                  onChange={(e) => setClassSemester(e.target.value)}
                  placeholder="e.g., Semester 5, Year 3, etc."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roll Number / Registration ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g., 2020CS001"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  required
                />
              </div>
            </>
          )}

          {/* Teacher-specific fields */}
          {role === "teacher" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g., Assistant Professor, Lecturer, etc."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Classes / Subjects <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={assignedClasses}
                  onChange={(e) => setAssignedClasses(e.target.value)}
                  placeholder="e.g., Data Structures, Algorithms (comma-separated)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Separate multiple subjects with commas</p>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || !role}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
