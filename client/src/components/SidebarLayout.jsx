import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Users, Wallet, Settings, 
  LogOut, Menu, X, Bell, Activity, Briefcase, ChevronDown
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const SidebarItem = ({ icon: Icon, label, path, active }) => (
  <Link
    to={path}
    className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
      active 
        ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30" 
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`}
  >
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
    )}
    <Icon size={20} strokeWidth={active ? 2.5 : 2} className={active ? "" : "text-slate-400 group-hover:text-slate-600"} />
    <span className="text-sm font-semibold">{label}</span>
  </Link>
);

export default function SidebarLayout({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Activity, label: "Performance", path: "/performance" },
    { icon: Users, label: "Client Network", path: "/my-referrals" },
    { icon: Wallet, label: "Payouts", path: "/payouts" },
    // { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex overflow-hidden">
      
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-5 right-5 z-50 p-3 bg-white text-slate-900 rounded-xl shadow-lg border border-slate-100 active:scale-95 transition-transform"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static border-r border-slate-200 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        
        {/* Logo Area (Fixed Top) */}
        <div className="h-20 flex-none flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Briefcase size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900">WriteOff<span className="text-indigo-600">Genie</span></span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">CA Partner Portal</span>
            </div>
          </div>
        </div>

        {/* Navigation (Scrollable Middle) */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {menuItems.map((item) => (
            <SidebarItem 
              key={item.path} 
              {...item} 
              active={pathname === item.path} 
            />
          ))}
        </nav>

        {/* User Section (Fixed Bottom) */}
        <div className="flex-none p-4 border-t border-slate-200 bg-white">
          <button 
            onClick={() => { logout(); navigate("/login"); }}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
          >
            <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-semibold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 flex-none bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-30 px-6 lg:px-8 flex items-center justify-between">
          <div className="lg:hidden text-slate-900 font-bold text-lg">
            WO<span className="text-indigo-600">G</span>
          </div>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center gap-4">
            {/* Notifications */}
            {/* <button className="relative p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button> */}

            {/* Divider */}
            {/* <div className="h-8 w-px bg-slate-200" /> */}

            {/* User Profile */}
            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-lg px-3 py-2 transition-all group">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-slate-900">CA Partner</p>
                <p className="text-xs text-emerald-600 font-medium flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Verified
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-linear-to-br from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                CA
              </div>
              <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}