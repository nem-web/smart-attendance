import React from "react";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import MarkAttendance from "./pages/MarkAttendance";
import StudentList from "./pages/StudentList";
import { useTheme } from "./theme/ThemeContext";
import Header from "./components/Header";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import ManageSchedule from "./pages/ManageSchedule"; // ← Added
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
  const user = storedUser ?  JSON.parse(storedUser) : null;
  console.log(storedUser)

  if(!user) return <Navigate to={"/login"} />

  if(user.role === "teacher") return <Navigate to={"/dashboard"} />
  if(user.role === "student") return <Navigate to={"/student-dashboard"} />

  return <Navigate to={"/login"} />
}

const studentRoutes = [
  "/student-dashboard",
  "/student-subjects",
  "/student-forecast",
  "/student-profile",
  "/login",
  "/register"
];

export default function App() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const hideNavbar = studentRoutes.includes(location.pathname);
  
  return (
    <div className="min-h-screen">
      {!hideNavbar && <Header theme={theme} setTheme={setTheme} />}

      <div className="p-6">
        <Routes>
          <Route path="/" element={<RedirectToHome/>} />
          <Route path="/dashboard" element={<Dashboard/>} />
          <Route path="/attendance" element={<MarkAttendance/>}/>
          <Route path="/students" element={<StudentList/>}/>
          <Route path="/analytics" element={<Analytics/>}/>
          <Route path="/reports" element={<Reports/>}/>
          <Route path="/manage-schedule" element={<ManageSchedule />} />
          <Route path="/settings" element={<Settings/>}/>
          <Route path="/add-students" element={<AddStudents/>}/>
          <Route path="/login" element={<Login/>}/>
          <Route path="/register" element={<Register/>}/>
          <Route path="*" element={<div>404 Not Found</div>} />

          {/* Students routes */}
          <Route path="/student-dashboard" element={<StudentDashboard/>}/>
          <Route path="/student-subjects" element={<StudentSubjects/>}/>
          <Route path="/student-forecast" element={<StudentForecast/>}/>
          <Route path="/student-profile" element={<StudentProfile/>}/>

          <Route path="/oauth-callback" element={<OAuthCallback />} />
        </Routes>
      </div>
    </div>
  );
}
