import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { Menu, X, LogOut, Sparkles } from "lucide-react";
import { auth } from "../services/firebase";

function Navbar({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    setIsOpen(false);
    navigate("/login");
  };

  return (
    // UPDATED: Absolute positioning + Transparent + No Border
    // This allows the Home gradient to show through behind the logo
    <nav className="absolute top-0 left-0 w-full z-50 bg-transparent border-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-24 items-center">
          
          {/* Logo Section - Keeping White text because it sits on the dark top part of gradient */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Sparkles className="text-white h-7 w-7" strokeWidth={1.5} />
            <span className="text-2xl font-bold text-white tracking-tight">
              WriteOffGenie
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">

            {user ? (
              <div className="flex items-center gap-6">
                <Link to="/dashboard" className="text-white font-medium hover:text-blue-200 transition">
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="text-slate-300 hover:text-white transition"
                  title="Sign Out"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                 <Link to="/login" className="text-white font-medium hover:text-blue-200 transition text-sm">
                  CA Login
                </Link>
                {/* White Button */}
                <Link 
                  to="/register" 
                  className="bg-white text-[#0e2b4a] px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-100 transition shadow-lg"
                >
                  Become a Partner
                </Link>
                 <Link 
                  to="/client-register" 
                  className="bg-white text-[#0e2b4a] px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-100 transition shadow-lg"
                >
                  Client Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-white p-2 hover:bg-white/10 rounded-lg transition"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu (Dark background for readability) */}
      {isOpen && (
        <div className="md:hidden absolute w-full bg-[#0e2b4a] shadow-xl animate-in slide-in-from-top-5 rounded-b-2xl">
          <div className="px-4 py-6 space-y-4">
            <Link to="/features" className="block text-slate-300 hover:text-white font-medium">Features</Link>
            <Link to="/support" className="block text-slate-300 hover:text-white font-medium">Support</Link>
            <div className="border-t border-white/10 my-2"></div>
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className="block text-white font-bold">Dashboard</Link>
                <button onClick={handleLogout} className="block text-slate-300">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block text-white font-medium">CPA Login</Link>
                <Link to="/register" className="block bg-white text-[#0e2b4a] text-center py-3 rounded-lg font-bold">Download App</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;