import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Loader from "../components/Loader";

const AdminLayout = () => {
  const { user, role, loading } = useAuth();

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;

  // 1. If role is still loading/null, stay on Loader.
  if (!role) return <Loader />;

  // 2. Only redirect if we are CERTAIN they belong in CA Dashboard
  if (role === "ca") return <Navigate to="/dashboard" replace />;

  // 3. Final security check
  if (role !== "admin") return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} role={role} /> 
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 mt-20">
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 text-red-600">Admin Area</h2>
            <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;