import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import Sidebar from "../components/navigation/Sidebar";
import { 
  LayoutDashboard, Users, DollarSign,
  User, UserPlus, TrendingUp, Activity, FileText
} from "lucide-react";

/**
 * Universal Protected Layout
 * Adapts sidebar menu based on user role (super_admin, agent, cpa)
 */
const ProtectedLayout = ({ allowedRoles }) => {
  const { user, role, loading } = useAuth();

  // Security Checks
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Loader />;
  
  // Role-Based Access Control
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = {
      'super_admin': '/admin/dashboard',
      'agent': '/agent/dashboard',
      'cpa': '/dashboard'
    }[role] || '/login';
    
    return <Navigate to={redirectPath} replace />;
  }

  // Menu Items Based on Role
  const getMenuItems = () => {
    switch (role) {
      case 'super_admin':
        return [
          { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
          { icon: UserPlus, label: "Agent Management", path: "/admin/agents", activePaths: ["/admin/agents"] },
          { icon: Users, label: "CPA Management", path: "/admin/cpas", activePaths: ["/admin/cpas"] },
          { icon: TrendingUp, label: "Earnings & Revenue", path: "/admin/earnings" },
        ];
      
      case 'agent':
        return [
          { icon: LayoutDashboard, label: "Dashboard", path: "/agent/dashboard" },
          { icon: Users, label: "CPA Management", path: "/agent/cpas", activePaths: ["/agent/cpas"] },
          { icon: TrendingUp, label: "Earnings", path: "/agent/earnings" },
          { icon: User, label: "Profile", path: "/agent/profile" },
        ];
      
      case 'cpa':
      default:
        return [
          { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
          { icon: Users, label: "My Clients", path: "/my-referrals" },
          { icon: Activity, label: "Earnings & Commission", path: "/performance" },
          { icon: User, label: "Profile", path: "/profile" },
        ];
    }
  };

  return (
    <Sidebar menuItems={getMenuItems()}>
      <Outlet />
    </Sidebar>
  );
};

export default ProtectedLayout;
