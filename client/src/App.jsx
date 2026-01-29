import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Components
import Loader from "./components/Loader";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import CaLayout from "./layouts/CaLayout";
import AdminLayout from "./layouts/AdminLayout";

// Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import CaDashboard from "./pages/ca/CaDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ClientRegister from "./pages/customer/ClientRegister";

// This component can safely use useAuth() because it's wrapped by AuthProvider below
function AppRoutes() {
  const { loading } = useAuth();

  // This prevents the "White Flash" by showing your branded loader
  if (loading) return <Loader />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Default Redirect */}
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
        </Route>

        {/* Admin Protected Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>

        {/* Fallback */}
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