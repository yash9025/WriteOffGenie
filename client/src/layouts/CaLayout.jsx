import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Loader from "../components/Loader";
import SidebarLayout from "../components/SidebarLayout";

const CaLayout = () => {
  const { user, role, loading } = useAuth();

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;

  // 1. If role is still loading/null, stay on Loader. Do NOT redirect yet.
  if (!role) return <Loader />;

  // 2. Only redirect if we are CERTAIN they belong in Admin
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;

  // 3. If they are a CA, show the layout. Otherwise, kick to login.
  if (role !== "ca") return <Navigate to="/login" replace />;

  return (
    <>
    <SidebarLayout>
      <Outlet />
    </SidebarLayout>
      
    </>
  );
};

export default CaLayout;