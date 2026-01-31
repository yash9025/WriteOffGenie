import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Components
import Loader from "./components/Loader";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import CaLayout from "./layouts/CaLayout";
import AdminLayout from "./layouts/AdminLayout";

// Pages - Auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ClientRegister from "./pages/customer/ClientRegister";

// Pages - CA
import CaDashboard from "./pages/ca/CaDashboard";
import Performance from "./pages/ca/Performance";
import MyReferrals from "./pages/ca/MyReferrals";
import Payouts from "./pages/ca/Payouts";

// Pages - Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import CAManagement from "./pages/admin/CAManagement";        
import UserTracking from "./pages/admin/UserTracking";       
import WithdrawalManagement from "./pages/admin/WithdrawalManagement"; 

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) return <Loader />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/client-register" element={<ClientRegister />} />
        </Route>

        {/* CA Protected Routes */}
        <Route element={<CaLayout />}>
          <Route path="/dashboard" element={<CaDashboard />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/my-referrals" element={<MyReferrals />} />
          <Route path="/payouts" element={<Payouts />} />
        </Route>

        {/* Admin Protected Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="cas" element={<CAManagement />} />        {/* 2.1 Route */}
          <Route path="users" element={<UserTracking />} />      {/* 2.2 Route */}
          <Route path="withdrawals" element={<WithdrawalManagement />} /> 2.4 Route
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;