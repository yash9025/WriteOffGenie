import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import Navbar from "../components/Navbar";

const AuthLayout = () => {
  const { user, role, loading } = useAuth();

  // 1. Wait for Auth to finish loading
  if (loading) return <Loader />;

  // 2. Redirect Logic: If already logged in, redirect to appropriate dashboard
  if (user) {
    if (role === "super_admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (role === "agent") {
      return <Navigate to="/agent/dashboard" replace />;
    }
    if (role === "cpa") {
      return <Navigate to="/dashboard" replace />;
    }
    
    // Fallback for unknown roles
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Render Login/Register pages with the "Guest" Navbar
  return (
    <>
      <Navbar user={null} role={null} />
      <Outlet />
    </>
  );
};

export default AuthLayout;