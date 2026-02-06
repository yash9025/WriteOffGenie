import React, { useState, useEffect } from "react";
import { Outlet, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Users, Wallet, 
  LogOut, Menu, X, Activity, User, Search
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SearchProvider, useSearch } from "../context/SearchContext";
import Loader from "../components/Loader";
import logo from "../assets/logo_writeoffgenie.svg";

// --- SIDEBAR ITEM COMPONENT ---
const SidebarItem = ({ icon: Icon, label, path, active, onClick }) => (
  <Link
    to={path}
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-200 w-full ${
      active 
        ? "bg-[#F7F9FC] text-[#111111]" 
        : "text-[#111111] opacity-50 hover:opacity-100 hover:bg-[#F7F9FC]"
    }`}
  >
    <Icon size={24} strokeWidth={1.5} />
    <span className="text-base font-normal">{label}</span>
  </Link>
);

// --- CA SIDEBAR LAYOUT ---
function CaSidebarLayout({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery, clearSearch } = useSearch();

  // Clear search when route changes
  useEffect(() => {
    clearSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Get placeholder text based on current page
  const getSearchPlaceholder = () => {
    if (pathname.includes("referrals")) return "Search referrals by name or email...";
    if (pathname.includes("performance")) return "Search by user or plan...";
    if (pathname.includes("payouts")) return "Search withdrawals...";
    if (pathname.includes("profile")) return "Search settings...";
    return "Search here...";
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Referred Users", path: "/my-referrals" },
    { icon: Activity, label: "Earnings & Commission", path: "/performance" },
    { icon: Wallet, label: "Wallet & Withdrawals", path: "/payouts" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Toggle - LEFT SIDE */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-5 left-5 z-50 p-3 bg-white text-[#111111] rounded-xl shadow-lg border border-[#E3E6EA] active:scale-95 transition-transform"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-75 bg-white flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static border-r border-[#E3E6EA] ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        
        {/* Logo Area with Close Button on Mobile */}
        <div className="flex items-center justify-between py-6 px-4">
          <div className="flex items-center gap-1.5">
            <img 
              src={logo} 
              alt="WriteOffGenie Logo" 
              className="w-10 h-12"
            />
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-[#011C39] tracking-tight leading-tight">WriteOffGenie</span>
              <span className="text-xs font-medium text-[#011C39]">Never miss a potential write-off.</span>
            </div>
          </div>
          {/* Close button - only visible on mobile */}
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 text-[#9499A1] hover:text-[#111111] hover:bg-[#F7F9FC] rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-4">
          {menuItems.map((item) => (
            <SidebarItem 
              key={item.path} 
              {...item} 
              active={pathname === item.path}
              onClick={() => setIsOpen(false)}
            />
          ))}
        </nav>

        {/* Logout Button (Triggers Modal) */}
        <div className="p-4">
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2 px-5 py-3 w-full text-[#111111] opacity-50 hover:opacity-100 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={24} strokeWidth={1.5} />
            <span className="text-base font-normal">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-[#E3E6EA] px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
          {/* Search Bar - with left margin on mobile for hamburger menu */}
          <div className="flex items-center gap-2.5 px-4 py-3 border border-[#E2E6EA] rounded-full flex-1 max-w-[440px] ml-14 lg:ml-0">
            <Search size={20} className="text-[#9D9D9D] shrink-0" />
            <input 
              type="text" 
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-base text-[#111111] placeholder:text-[#9D9D9D] outline-none bg-transparent min-w-0"
            />
            {searchQuery && (
              <button 
                onClick={clearSearch}
                className="text-[#9D9D9D] hover:text-[#111111] transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 bg-[#F7F9FC] px-3 py-1.5 rounded-full cursor-pointer hover:bg-[#E3E6EA] transition-all shrink-0 ml-4">
            <div className="h-10 w-10 rounded-full bg-[#011C39] flex items-center justify-center text-white font-bold text-sm">
              {user?.displayName?.[0]?.toUpperCase() || 'CA'}
            </div>
            <span className="text-base text-[#111111] pr-2 hidden sm:block">
              {user?.displayName || 'CA Partner'}
            </span>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-6 h-full">
            {children}
          </div>
        </div>
      </main>

      {/* --- LOGOUT CONFIRMATION MODAL --- */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] p-8 w-full max-w-100 shadow-2xl animate-in fade-in zoom-in duration-200 relative">
            
            {/* Close Icon */}
            <button 
              onClick={() => setShowLogoutModal(false)}
              className="absolute top-4 right-4 text-black bg-black/10 rounded-full p-1 hover:bg-black/20 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-bold text-[#111111] mb-2">Log out</h2>
              <p className="text-[#9499A1] text-base font-normal mb-8">
                Are you sure you want to log out of your account?
              </p>

              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 border border-[#E3E6EA] rounded-xl text-[#111111] font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex-1 py-3 bg-[#EF4444] rounded-xl text-white font-semibold hover:bg-[#DC2626] transition-colors"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- MAIN CA LAYOUT ---
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
    <SearchProvider>
      <CaSidebarLayout>
        <Outlet />
      </CaSidebarLayout>
    </SearchProvider>
  );
};

export default CaLayout;