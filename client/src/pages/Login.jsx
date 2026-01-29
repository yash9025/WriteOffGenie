import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { auth } from "../services/firebase";
import InputGroup from "../components/InputGroup";

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password.");
    }
    setLoading(false);
  };

  return (
    // Applied matching gradient background so transparent Navbar is visible
    <div className="min-h-screen flex items-center justify-center p-4 pt-20 bg-linear-to-b from-[#0e2b4a] via-[#1c4066] to-slate-50">
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
        <div className="px-8 pt-8 pb-4 text-center">
          <h2 className="text-2xl font-bold text-[#0e2b4a]">Partner Login</h2>
          <p className="text-slate-500 text-sm mt-2">Access your referral dashboard.</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-4 pt-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center font-medium">
              {error}
            </div>
          )}
          
          <InputGroup 
            icon={Mail} 
            type="email" 
            placeholder="Email Address" 
            onChange={(e) => setForm({...form, email: e.target.value})} 
          />
          <InputGroup 
            icon={Lock} 
            type="password" 
            placeholder="Password" 
            onChange={(e) => setForm({...form, password: e.target.value})} 
          />
          
          <button 
            disabled={loading} 
            className="w-full bg-[#0e2b4a] hover:bg-[#1a3d61] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="bg-slate-50 px-8 py-5 text-center border-t border-slate-100">
          <p className="text-sm text-slate-600">
            Don't have an account? <Link to="/register" className="text-[#0e2b4a] font-bold hover:underline">Register Now</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;