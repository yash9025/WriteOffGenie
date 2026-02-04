import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { functions, auth } from "../../services/firebase"; 

function Register() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    caRegNumber: "",
  });

  // Invite-only state
  const [inviteValid, setInviteValid] = useState(null); // null = loading, true = valid, false = invalid
  const [inviteData, setInviteData] = useState(null);
  const [inviteError, setInviteError] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Verify invite token on mount
  useEffect(() => {
    const token = searchParams.get("token");
    
    if (!token) {
      setInviteValid(false);
      setInviteError("This page is invite-only. Please contact an administrator to receive an invitation.");
      return;
    }

    const verifyToken = async () => {
      try {
        const verifyFn = httpsCallable(functions, "verifyInvite");
        const result = await verifyFn({ token });
        
        if (result.data.valid) {
          setInviteData({
            name: result.data.name,
            email: result.data.email,
            commissionRate: result.data.commissionRate,
            token: token
          });
          setForm(prev => ({
            ...prev,
            name: result.data.name,
            email: result.data.email
          }));
          setInviteValid(true);
        } else {
          setInviteValid(false);
          setInviteError("Invalid or expired invitation.");
        }
      } catch (err) {
        console.error("Verify Error:", err);
        setInviteValid(false);
        setInviteError(err.message.includes("expired") 
          ? "This invitation has expired. Please request a new one from the administrator."
          : err.message.includes("not found") 
            ? "This invitation has already been used or is no longer valid."
            : "Invalid invitation. Please contact an administrator.");
      }
    };

    verifyToken();
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const registerFn = httpsCallable(functions, "registerCA");
      await registerFn({
        ...form,
        commissionRate: inviteData?.commissionRate || 10,
        inviteToken: inviteData?.token
      });
      await signInWithEmailAndPassword(auth, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace("Error ", ""));
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      <div className="relative z-10 flex items-center justify-between w-full max-w-[1600px] px-20 lg:px-32 xl:px-48">
        
        {/* LEFT SIDE - Image */}
        <div className="hidden lg:block flex-shrink-0">
          <img 
            src="/LoginImage.png" 
            alt="Register Visual" 
            className="object-cover rounded-[32px]"
            style={{ width: '420px', height: '580px' }}
          />
        </div>

        {/* RIGHT SIDE - Form Section */}
        <div className="flex flex-col items-center w-full max-w-[440px]">
          
          {/* Logo Section */}
          <div className="flex items-center gap-2.5 mb-6">
            <img 
              src="/logo_writeoffgenie.png" 
              alt="WriteOffGenie Logo" 
              className="w-10 h-12"
            />
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold tracking-tight text-[#011C39] leading-tight">
                WriteOffGenie
              </h1>
              <p className="text-xs font-medium text-[#011C39]/80">
                Never miss a potential write-off.
              </p>
            </div>
          </div>

          {/* Invite Validation Loading State */}
          {inviteValid === null && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="animate-spin text-[#011C39] mb-4" size={32} />
              <p className="text-sm text-slate-500">Verifying your invitation...</p>
            </div>
          )}

          {/* Invite Invalid State */}
          {inviteValid === false && (
            <div className="flex flex-col items-center w-full">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert size={32} className="text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-[#111111] mb-2 text-center">
                Invitation Required
              </h2>
              <p className="text-sm text-slate-500 text-center mb-6 max-w-sm">
                {inviteError}
              </p>
              <Link 
                to="/login"
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#011C39] rounded-lg hover:bg-[#022a55] transition-colors text-center"
              >
                Go to Login
              </Link>
            </div>
          )}

          {/* Form Card - Only show if invite is valid */}
          {inviteValid === true && (
            <div className="flex flex-col items-center w-full">
            
            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold text-[#111111] mb-0.5">
                Become a Partner
              </h2>
              <p className="text-xs text-[#9499A1]">
                Sign up to start earning commissions today
              </p>
              {inviteData?.commissionRate && (
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  Your commission rate: {inviteData.commissionRate}%
                </p>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col w-full gap-2.5">
              {error && (
                <div className="w-full p-2.5 text-sm rounded-lg text-center font-medium bg-red-50 border border-red-200 text-red-500">
                  {error}
                </div>
              )}

              {/* Full Name Field */}
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-medium text-[#111111]">Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  placeholder="Enter your full name" 
                  className={`w-full px-3 py-2 text-sm text-[#111111] border border-[#E3E6EA] rounded-lg outline-none transition-colors ${inviteData ? 'bg-slate-50 cursor-not-allowed' : 'bg-white focus:border-[#011C39]'}`}
                  value={form.name}
                  onChange={handleChange}
                  readOnly={!!inviteData}
                  required
                />
              </div>

              {/* Email Field */}
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-medium text-[#111111]">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  placeholder="Enter your work email" 
                  className={`w-full px-3 py-2 text-sm text-[#111111] border border-[#E3E6EA] rounded-lg outline-none transition-colors ${inviteData ? 'bg-slate-50 cursor-not-allowed' : 'bg-white focus:border-[#011C39]'}`}
                  value={form.email}
                  onChange={handleChange}
                  readOnly={!!inviteData}
                  required
                />
              </div>

              {/* Phone Field */}
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-medium text-[#111111]">Phone Number</label>
                <input 
                  type="tel" 
                  name="phone"
                  placeholder="Enter your phone number" 
                  className="w-full px-3 py-2 text-sm text-[#111111] bg-white border border-[#E3E6EA] rounded-lg outline-none focus:border-[#011C39] transition-colors"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* CA Registration Number Field */}
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-medium text-[#111111]">
                  CA Reg Number <span className="text-[#9499A1]">(Optional)</span>
                </label>
                <input 
                  type="text" 
                  name="caRegNumber"
                  placeholder="Enter your CA registration number" 
                  className="w-full px-3 py-2 text-sm text-[#111111] bg-white border border-[#E3E6EA] rounded-lg outline-none focus:border-[#011C39] transition-colors"
                  value={form.caRegNumber}
                  onChange={handleChange}
                />
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-medium text-[#111111]">Password</label>
                <input 
                  type="password" 
                  name="password"
                  placeholder="Create a password (min 8 characters)" 
                  className="w-full px-3 py-2 text-sm text-[#111111] bg-white border border-[#E3E6EA] rounded-lg outline-none focus:border-[#011C39] transition-colors"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
              </div>

              {/* Register Button */}
              <button 
                disabled={loading} 
                type="submit"
                className="w-full py-2.5 mt-2 text-sm font-semibold text-white bg-[#011C39] rounded-lg hover:bg-[#022a55] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Create Account"}
              </button>
            </form>

            {/* Sign In Section */}
            <div className="flex flex-col items-center w-full mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-[#9499A1] mb-1.5">
                Already have an account?
              </p>
              <Link 
                to="/login"
                className="w-full py-2 text-sm font-semibold text-[#011C39] bg-transparent border-2 border-[#011C39] rounded-lg hover:bg-[#011C39] hover:text-white transition-colors text-center"
              >
                Sign In
              </Link>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Register;