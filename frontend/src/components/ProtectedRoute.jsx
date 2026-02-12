import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  // const storedUser = localStorage.getItem("user");
  // const user = storedUser ? JSON.parse(storedUser) : null;
  const location = useLocation();

  // 1. If no token or user, redirect to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;