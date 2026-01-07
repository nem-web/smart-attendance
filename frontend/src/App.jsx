// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
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
import CompleteProfile from "./pages/CompleteProfile";
import StudentDashboard from "./students/pages/StudentDashboard.jsx"
import StudentSubjects from "./students/pages/StudentSubjects.jsx";
import StudentForecast from "./students/pages/StudentForecast.jsx";
import StudentProfile from "./students/pages/StudentProfile.jsx"
import { getUserProfile } from "./api/userProfile";

// Protected Route component
function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileChecked, setProfileChecked] = useState(false);
  
  useEffect(() => {
    const checkProfile = async () => {
      if (isLoaded && isSignedIn && user) {
        // Skip profile check if we're already on complete-profile page
        if (location.pathname === "/complete-profile") {
          setProfileChecked(true);
          return;
        }

        try {
          // Check if user has completed their profile
          await getUserProfile(user.id);
          setProfileChecked(true);
        } catch (error) {
          // Profile not found, redirect to complete-profile
          if (error.response?.status === 404) {
            navigate("/complete-profile", { replace: true });
          } else {
            setProfileChecked(true);
          }
        }
      }
    };

    checkProfile();
  }, [isLoaded, isSignedIn, user, navigate, location.pathname]);
  
  if (!isLoaded || !profileChecked) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function RedirectToHome() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [targetRoute, setTargetRoute] = useState(null);
  
  useEffect(() => {
    const determineRoute = async () => {
      if (!isLoaded) return;
      
      if (!isSignedIn) {
        setTargetRoute("/login");
        setLoading(false);
        return;
      }

      try {
        // Try to get user profile from backend
        const profile = await getUserProfile(user.id);
        
        // Redirect based on profile role
        if (profile.role === "teacher") {
          setTargetRoute("/dashboard");
        } else if (profile.role === "student") {
          setTargetRoute("/student-dashboard");
        } else {
          setTargetRoute("/complete-profile");
        }
      } catch (error) {
        // Profile not found, redirect to complete profile
        if (error.response?.status === 404) {
          setTargetRoute("/complete-profile");
        } else {
          // Fallback to checking Clerk metadata (only publicMetadata for security)
          const userRole = user?.publicMetadata?.role;
          if (userRole === "teacher") {
            setTargetRoute("/dashboard");
          } else if (userRole === "student") {
            setTargetRoute("/student-dashboard");
          } else {
            setTargetRoute("/complete-profile");
          }
        }
      }
      
      setLoading(false);
    };

    determineRoute();
  }, [isLoaded, isSignedIn, user]);
  
  if (!isLoaded || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return <Navigate to={targetRoute} replace />;
}

const studentRoutes = [
  "/student-dashboard",
  "/student-subjects",
  "/student-forecast",
  "/student-profile",
  "/login",
  "/register",
  "/complete-profile"
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
          <Route path="/login" element={<Login/>}/>
          <Route path="/register" element={<Register/>}/>
          <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile/></ProtectedRoute>}/>
          
          {/* Protected Teacher Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><MarkAttendance/></ProtectedRoute>}/>
          <Route path="/students" element={<ProtectedRoute><StudentList/></ProtectedRoute>}/>
          <Route path="/analytics" element={<ProtectedRoute><Analytics/></ProtectedRoute>}/>
          <Route path="/reports" element={<ProtectedRoute><Reports/></ProtectedRoute>}/>
          <Route path="/settings" element={<ProtectedRoute><Settings/></ProtectedRoute>}/>
          <Route path="/add-students" element={<ProtectedRoute><AddStudents/></ProtectedRoute>}/>
          
          {/* Protected Student Routes */}
          <Route path="/student-dashboard" element={<ProtectedRoute><StudentDashboard/></ProtectedRoute>}/>
          <Route path="/student-subjects" element={<ProtectedRoute><StudentSubjects/></ProtectedRoute>}/>
          <Route path="/student-forecast" element={<ProtectedRoute><StudentForecast/></ProtectedRoute>}/>
          <Route path="/student-profile" element={<ProtectedRoute><StudentProfile/></ProtectedRoute>}/>

          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </div>
    </div>
  );
}
