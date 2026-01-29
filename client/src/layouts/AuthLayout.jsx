import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import Navbar from "../components/Navbar";

const AuthLayout = () => {
  const { user, role, loading } = useAuth();

  // 1. Wait for Auth to finish loading
  if (loading) return <Loader />;

  // 2. Redirect Logic: If already logged in, kick them to the right dashboard
  if (user) {
    if (role === "admin") {
        return <Navigate to="/admin/dashboard" replace />;
    }
    
    // Default everyone else (CAs, Clients, etc.) to the main Dashboard.
    // The CaLayout will handle permission denials if they aren't supposed to be there.
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