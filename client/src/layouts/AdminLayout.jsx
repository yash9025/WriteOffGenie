import React from "react";
import { Link, useLocation, Navigate, Outlet } from "react-router-dom";
import { 
  LayoutDashboard, Users, UserCog, Wallet, LogOut, 
  ShieldCheck, Menu, X, Bell, ChevronRight 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";

export default function AdminLayout() {
  const { user, role, loading, logout } = useAuth();
  const { pathname } = useLocation();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  // --- SECURITY CHECKS ---
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Loader />;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  const menu = [
    { icon: LayoutDashboard, label: "Overview", path: "/admin/dashboard" },
    { icon: UserCog, label: "Partner Registry", path: "/admin/cas" },
    { icon: Users, label: "User Grid", path: "/admin/users" },
    { icon: Wallet, label: "Treasury", path: "/admin/withdrawals" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white shadow-lg rounded-lg text-slate-600 border border-slate-100"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-8">
          <div className="flex items-center gap-2 text-slate-900 font-black tracking-tighter text-2xl mb-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <ShieldCheck size={18} strokeWidth={3} />
            </div>
            ADMIN
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1 mt-1">Super User Console</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menu.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={() => setIsMobileOpen(false)}
                className={`relative flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
                  isActive 
                  ? "bg-blue-50 text-blue-700 font-bold" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"} />
                    <span className="text-sm">{item.label}</span>
                </div>
                {isActive && <ChevronRight size={16} className="text-blue-600 animate-in slide-in-from-left-1" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={logout} 
            className="flex items-center gap-3 w-full px-4 py-3.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-sm"
          >
            <LogOut size={20} /> 
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 lg:ml-72 flex flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-30 px-8 flex items-center justify-end">
          <div className="flex items-center gap-6">
             <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </button>
             <div className="h-8 w-[1px] bg-slate-200"></div>
             <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                    <p className="text-xs font-bold text-slate-900">System Admin</p>
                    <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">ROOT ACCESS</p>
                </div>
                <div className="h-10 w-10 bg-slate-900 rounded-full ring-4 ring-slate-100 flex items-center justify-center text-white shadow-sm">
                    <ShieldCheck size={18} />
                </div>
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
           <div className="max-w-7xl mx-auto">
              <Outlet />
           </div>
        </div>
      </main>
    </div>
  );
}