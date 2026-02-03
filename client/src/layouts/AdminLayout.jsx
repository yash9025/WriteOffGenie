import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminSidebar from "../components/AdminSidebar";
import Loader from "../components/Loader";

export default function AdminLayout() {
  const { user, role, loading } = useAuth();

  // --- SECURITY CHECKS ---
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Loader />;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <AdminSidebar>
      <Outlet />
    </AdminSidebar>
  );
}