import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { X, Menu, LogOut, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSearch } from "../../context/SearchContext";
import logo from "../../assets/logo_writeoffgenie.svg";

/**
 * Universal Sidebar Component
 * Adapts menu items based on user role (super_admin, agent, cpa)
 * Maintains consistent Figma design across all portals
 */

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

const Sidebar = ({ children, menuItems }) => {
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

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Get search placeholder based on current page
  const getSearchPlaceholder = () => {
    if (pathname.includes("cas") || pathname.includes("cpas") || pathname.includes("agents")) {
      return "Search by name or email...";
    }
    if (pathname.includes("referrals") || pathname.includes("clients")) {
      return "Search referrals...";
    }
    if (pathname.includes("earnings") || pathname.includes("performance")) {
      return "Search transactions...";
    }
    if (pathname.includes("withdrawals") || pathname.includes("wallet") || pathname.includes("payouts")) {
      return "Search withdrawals...";
    }
    return "Search...";
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

      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-5 left-5 z-50 p-3 bg-white text-[#111111] rounded-xl shadow-lg border border-[#E3E6EA] active:scale-95 transition-transform"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-75 bg-white flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static border-r border-[#E3E6EA] ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        
        {/* Logo Area */}
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
          
          {/* Close button - mobile only */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 text-[#111111] hover:bg-[#F7F9FC] rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item, index) => (
            <SidebarItem
              key={index}
              icon={item.icon}
              label={item.label}
              path={item.path}
              active={pathname === item.path || (item.activePaths && item.activePaths.some(p => pathname.startsWith(p)))}
              onClick={() => setIsOpen(false)}
            />
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-[#E3E6EA]">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-[#111111] opacity-50 hover:opacity-100 hover:bg-[#F7F9FC] transition-all duration-200 w-full"
          >
            <LogOut size={24} strokeWidth={1.5} />
            <span className="text-base font-normal">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Bar with Search */}
        <header className="bg-white border-b border-[#E3E6EA] px-6 py-4">
          <div className="max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9499A1]" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getSearchPlaceholder()}
                className="w-full pl-10 pr-4 py-2.5 border border-[#E3E6EA] rounded-xl text-[#111111] placeholder:text-[#9499A1] focus:outline-none focus:ring-2 focus:ring-[#4D7CFE] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </header>

        {/* Page Content with Scroll */}
        <main className="flex-1 overflow-y-auto bg-[#F7F9FC]">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          />
          <div className="relative bg-white rounded-[20px] border border-[#E3E6EA] shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-[#111111] mb-2">Confirm Logout</h3>
            <p className="text-[#9499A1] mb-6">Are you sure you want to logout from your account?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 border border-[#E3E6EA] rounded-xl text-[#111111] font-medium hover:bg-[#F7F9FC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 bg-[#4D7CFE] hover:bg-[#3D6CED] text-white rounded-xl font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
