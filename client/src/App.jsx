import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SearchProvider } from "./context/SearchContext";

// Components
import Loader from "./components/Loader";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import ProtectedLayout from "./layouts/ProtectedLayout";

// Pages - Auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import RegisterAgent from "./pages/auth/RegisterAgent";
import ClientRegister from "./pages/customer/ClientRegister";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Pages - CPA (formerly CA)
import CaDashboard from "./pages/ca/CaDashboard";
import Performance from "./pages/ca/Performance";
import MyReferrals from "./pages/ca/MyReferrals";
import Payouts from "./pages/ca/Payouts";
import MyProfile from "./pages/ca/MyProfile";

// Pages - Agent (NEW)
import AgentDashboard from "./pages/agent/Dashboard";
import AgentCPAManagement from "./pages/agent/CPAManagement";
import AgentCPADetail from "./pages/agent/CPADetail";
import AgentEarnings from "./pages/agent/Earnings";
import AgentWallet from "./pages/agent/Wallet";
import AgentProfile from "./pages/agent/Profile";

// Pages - Super Admin (formerly Admin)
import AdminDashboard from "./pages/super-admin/AdminDashboard";
import AgentManagement from "./pages/super-admin/AgentManagement";
import AgentDetail from "./pages/super-admin/AgentDetail";
import CAManagement from "./pages/super-admin/CAManagement"; 
import PartnerDetail from "./pages/super-admin/PartnerDetail";       
import EarningsTracking from "./pages/super-admin/EarningsTrack";       
import WithdrawalManagement from "./pages/super-admin/WithdrawalManagement"; 

function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Public Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register-agent" element={<RegisterAgent />} />
              <Route path="/client-register" element={<ClientRegister />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>

            {/* CPA Protected Routes */}
            <Route element={<ProtectedLayout allowedRoles={['cpa']} />}>
              <Route path="/dashboard" element={<CaDashboard />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/my-referrals" element={<MyReferrals />} />
              <Route path="/payouts" element={<Payouts />} />
              <Route path="/profile" element={<MyProfile />} />
            </Route>

            {/* Agent Protected Routes (NEW) */}
            <Route element={<ProtectedLayout allowedRoles={['agent']} />}>
              <Route path="/agent/dashboard" element={<AgentDashboard />} />
              <Route path="/agent/cpas" element={<AgentCPAManagement />} />
              <Route path="/agent/cpas/:id" element={<AgentCPADetail />} />
              <Route path="/agent/earnings" element={<AgentEarnings />} />
              <Route path="/agent/wallet" element={<AgentWallet />} />
              <Route path="/agent/profile" element={<AgentProfile />} />
            </Route>

            {/* Super Admin Protected Routes */}
            <Route element={<ProtectedLayout allowedRoles={['super_admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/agents" element={<AgentManagement />} />
              <Route path="/admin/agents/:id" element={<AgentDetail />} />
              <Route path="/admin/cpas" element={<CAManagement />} />
              <Route path="/admin/cpas/:id" element={<PartnerDetail />} />
              <Route path="/admin/earnings" element={<EarningsTracking />} />
              <Route path="/admin/withdrawals" element={<WithdrawalManagement />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;