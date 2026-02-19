import React, { lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useTheme } from "./theme/ThemeContext";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import DeviceBindingOtpModal from "./components/DeviceBindingOtpModal";
import { useDeviceBinding } from "./hooks/useDeviceBinding";
import { LoadingFallback } from "./components/Skeleton";

// Lazy load all page components for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MarkAttendance = lazy(() => import("./pages/MarkAttendance"));
const StudentList = lazy(() => import("./pages/StudentList"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Reports = lazy(() => import("./pages/Reports"));
const ManageSchedule = lazy(() => import("./pages/ManageSchedule"));
const Settings = lazy(() => import("./pages/Settings"));
const AddStudents = lazy(() => import("./pages/AddStudents"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Messaging = lazy(() => import("./pages/Messaging"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));

// Student pages
const StudentDashboard = lazy(() => import("./students/pages/StudentDashboard"));
const StudentSubjects = lazy(() => import("./students/pages/StudentSubjects"));
const StudentForecast = lazy(() => import("./students/pages/StudentForecast"));
const StudentProfile = lazy(() => import("./students/pages/StudentProfile"));
const MarkWithQR = lazy(() => import("./students/pages/MarkWithQR"));

/**
 * Redirects the user to the appropriate home page based on their role.
 *
 * @returns {React.ReactElement} A Navigate element to the correct route.
 */
function RedirectToHome() {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  console.log(storedUser);

  if (!user) return <Navigate to={"/login"} />;

  if (user.role === "teacher") return <Navigate to={"/dashboard"} />;
  if (user.role === "student") return <Navigate to={"/student-dashboard"} />;

  return <Navigate to={"/login"} />;
}

const hideNavbarRoutes = [
  "/student-dashboard",
  "/student-subjects",
  "/student-forecast",
  "/student-profile",
  "/student-mark-qr",
  "/login",
  "/register",
  "/forgot-password",
];

/**
 * Root application component that manages routing and theme.
 *
 * @returns {React.ReactElement} The rendered application.
 */
export default function App() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const { isModalOpen, closeModal, userEmail, handleSuccess } =
    useDeviceBinding();

  const hideNavbar = hideNavbarRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Toaster position="top-right" />
      {!hideNavbar && <Header theme={theme} setTheme={setTheme} />}

      {/* Device Binding OTP Modal */}
      <DeviceBindingOtpModal
        isOpen={isModalOpen}
        onClose={closeModal}
        userEmail={userEmail}
        onSuccess={handleSuccess}
      />

      <main id="main-content">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<RedirectToHome />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attendance" element={<MarkAttendance />} />
            <Route path="/students" element={<StudentList />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
            <Route
              path="/manage-schedule"
              element={
                <ProtectedRoute>
                  <ManageSchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messaging"
              element={
                <ProtectedRoute>
                  <Messaging />
                </ProtectedRoute>
              }
            />
            <Route path="/settings" element={<Settings />} />
            <Route path="/add-students" element={<AddStudents />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<div>404 Not Found</div>} />

            {/* Students routes */}
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/student-subjects" element={<StudentSubjects />} />
            <Route path="/student-forecast" element={<StudentForecast />} />
            <Route path="/student-profile" element={<StudentProfile />} />
            <Route path="/student-mark-qr" element={<MarkWithQR />} />
            <Route path="/oauth-callback" element={<OAuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
