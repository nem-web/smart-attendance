// frontend/src/App.jsx
import React from "react";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import MarkAttendance from "./pages/MarkAttendance";
import StudentList from "./pages/StudentList";
import { useTheme } from "./theme/ThemeContext";
import Header from "./components/Header";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import AddStudents from "./pages/AddStudents";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./students/pages/StudentDashboard.jsx"
import StudentSubjects from "./students/pages/StudentSubjects.jsx";
import StudentForecast from "./students/pages/StudentForecast.jsx";
import StudentProfile from "./students/pages/StudentProfile.jsx"
import OAuthCallback from "./pages/OAuthCallback.jsx";

function RedirectToHome() {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user) return <Navigate to={"/login"} />

  if (user.role === "Teacher") return <Navigate to={"/dashboard"} />
  if (user.role === "Student") return <Navigate to={"/student-dashboard"} />

  return <Navigate to={"/login"} />
}





export default function App() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();



  return (
    <div className="min-h-screen">
      <Header theme={theme} setTheme={setTheme} />

      <div className="p-6">
        <Routes>
          <Route path="/" element={<RedirectToHome />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<MarkAttendance />} />
          <Route path="/students" element={<StudentList />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/add-students" element={<AddStudents />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Students routes */}
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/student-subjects" element={<StudentSubjects />} />
          <Route path="/student-forecast" element={<StudentForecast />} />
          <Route path="/student-profile" element={<StudentProfile />} />

          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>

      </div>
    </div>
  );
}
