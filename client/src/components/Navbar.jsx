import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { Menu, X, LogOut, Sparkles } from "lucide-react";
import { auth } from "../services/firebase";

function Navbar({ user, role }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    setIsOpen(false);
    navigate("/login");
  };

  // Determine navbar style based on role: Solid for Admin (white pages), Transparent for others (gradient pages)
  const isSolidNavbar = user && role === "admin";
  const navClasses = isSolidNavbar
    ? "bg-[#0e2b4a] shadow-md relative" 
    : "absolute top-0 left-0 w-full bg-transparent border-none";

  return (
    <nav className={`${navClasses} z-50 transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-24 items-center">

          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <div className="flex items-center gap-6">
                {role === "admin" ? (
                   <Link 
                     to="/admin/dashboard" 
                     className="text-red-300 font-bold hover:text-red-100 transition px-3 py-2 rounded-md hover:bg-white/10"
                   >
                     Admin Panel
                   </Link>
                ) : (
                   <Link 
                     to="/dashboard" 
                     className="text-white font-medium hover:text-blue-200 transition px-3 py-2"
                   >
                     Dashboard
                   </Link>
                )}

                <button 
                  onClick={handleLogout} 
                  className="text-slate-300 hover:text-white transition flex items-center gap-2"
                  title="Sign Out"
                >
                  <span className="text-sm">Sign Out</span>
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                 <Link 
                   to="/client-register" 
                   className="bg-white/10 text-white border border-white/20 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-white/20 transition backdrop-blur-sm"
                 >
                   Client Register
                 </Link>
              </div>
            )}
          </div>

          <div className="flex items-center md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white p-2 hover:bg-white/10 rounded-lg transition">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden absolute w-full bg-[#0e2b4a] shadow-xl animate-in slide-in-from-top-5 rounded-b-2xl border-t border-white/10">
          <div className="px-4 py-6 space-y-4">
            {user ? (
              <>
                 {role === "admin" ? (
                   <Link to="/admin/dashboard" onClick={() => setIsOpen(false)} className="block text-red-300 font-bold text-lg">Admin Panel</Link>
                ) : (
                   <Link to="/dashboard" onClick={() => setIsOpen(false)} className="block text-white font-bold text-lg">Dashboard</Link>
                )}
                <div className="border-t border-white/10 my-2"></div>
                <button onClick={handleLogout} className="block text-slate-300 w-full text-left">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/client-register" onClick={() => setIsOpen(false)} className="block border border-white/20 text-white text-center py-3 rounded-lg font-bold">Client Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;