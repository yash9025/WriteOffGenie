import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { Loader2 } from "../../components/Icons";
import { auth } from "../../services/firebase";
import toast, { Toaster } from "react-hot-toast";
import LoginImage from "../../assets/LoginImage.webp";
import logo from "../../assets/logo_writeoffgenie.svg";

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
    <div className="relative flex items-center justify-center w-full h-screen overflow-hidden bg-white">
      {/* Background Blurred Gradient Shapes */}
      <div 
        className="absolute pointer-events-none"
        style={{
          width: '900px',
          height: '900px',
          left: '-400px',
          bottom: '-300px',
          filter: 'blur(120px)',
          zIndex: 0
        }}
      >
        <div 
          className="absolute rounded-full"
          style={{ width: '700px', height: '700px', left: '150px', top: '0px', background: '#011C39' }}
        />
        <div 
          className="absolute rounded-full"
          style={{ width: '700px', height: '700px', left: '80px', top: '150px', background: '#00D1A0' }}
        />
        <div 
          className="absolute rounded-full"
          style={{ width: '700px', height: '700px', left: '0px', top: '120px', background: '#F7F9FC' }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-400 px-20 lg:px-32 xl:px-48">
        
        {/* LEFT SIDE - Image */}
        <div className="hidden lg:block shrink-0">
          <img 
            src={LoginImage} 
            alt="Login Visual" 
            className="object-cover rounded-4xl"
            style={{ width: '420px', height: '580px' }}
          />
        </div>

        {/* RIGHT SIDE - Form Section */}
        <div className="flex flex-col items-center w-full max-w-110">
          
          {/* Logo Section */}
          <div className="flex items-center gap-2.5 mb-12">
            <img 
              src={logo} 
              alt="WriteOffGenie Logo" 
              className="w-12 h-14"
            />
            <div className="flex flex-col">
              <h1 className="text-[28px] font-bold tracking-tight text-[#011C39] leading-tight">
                WriteOffGenie
              </h1>
              <p className="text-sm font-medium text-[#011C39]/80">
                Never miss a potential write-off.
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="flex flex-col items-center w-full">
            
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-[#111111] mb-1">
                Welcome back
              </h2>
              <p className="text-sm text-[#9499A1]">
                Log in to manage your referrals and earnings
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="flex flex-col w-full gap-5">
              {error && (
                <div className="w-full p-2.5 text-sm rounded-lg text-center font-medium bg-red-50 border border-red-200 text-red-500">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#111111]">
                  Email Address
                </label>
                <input 
                  type="email" 
                  placeholder="Enter your work email" 
                  className="w-full px-4 py-3 text-sm text-[#111111] bg-white border border-[#E3E6EA] rounded-xl outline-none focus:border-[#011C39] transition-colors"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  required
                />
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#111111]">
                  Password
                </label>
                <input 
                  type="password" 
                  placeholder="Enter your password" 
                  className="w-full px-4 py-3 text-sm text-[#111111] bg-white border border-[#E3E6EA] rounded-xl outline-none focus:border-[#011C39] transition-colors"
                  value={form.password}
                  onChange={(e) => setForm({...form, password: e.target.value})}
                  required
                />
                <Link 
                  to="/forgot-password" 
                  className="self-end text-sm font-medium text-[#EF4444] hover:underline mt-1"
                >
                  Forgot your password?
                </Link>
              </div>

              {/* Login Button */}
              <button 
                disabled={loading} 
                type="submit"
                className="w-full py-3 mt-2 text-sm font-semibold text-white bg-[#011C39] rounded-xl hover:bg-[#022a55] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Log in"}
              </button>
            </form>

            {/* Sign Up Section */}
            <div className="flex flex-col items-center w-full mt-6 pt-5 border-t border-gray-100">
              <p className="text-sm text-[#9499A1] mb-3">
                New to WriteOffGenie?
              </p>
              <Link 
                to="/register"
                className="w-full py-3 text-sm font-semibold text-[#011C39] bg-transparent border-2 border-[#011C39] rounded-xl hover:bg-[#011C39] hover:text-white transition-colors text-center"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default Login;