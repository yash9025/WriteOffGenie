import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";
import { Loader2 } from "../../components/Icons";
import { auth } from "../../services/firebase";
import toast, { Toaster } from "react-hot-toast";
import LoginImage from "../../assets/LoginImage.webp";
import logo from "../../assets/logo_writeoffgenie.svg";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("input"); // 'input' or 'success'
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      setView("success"); // Switch to "Check your email" view
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError("No account found with this email.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email.");
      } else {
        setError("Failed to send link. Please try again.");
      }
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    setResendMessage("");
    try {
      await sendPasswordResetEmail(auth, email);
      setResendMessage("Email resent successfully!");
    } catch (err) {
      setError("Failed to resend. Please try again later.");
    }
    setLoading(false);
  };

  return (
    <div className="relative flex items-center justify-center w-full h-screen overflow-hidden bg-white">
      
      {/* Background Blurred Gradient Shapes (Same as Login) */}
      <div 
        className="absolute pointer-events-none"
        style={{
          width: '900px', height: '900px', left: '-400px', bottom: '-300px',
          filter: 'blur(120px)', zIndex: 0
        }}
      >
        <div className="absolute rounded-full" style={{ width: '700px', height: '700px', left: '150px', top: '0px', background: '#011C39' }} />
        <div className="absolute rounded-full" style={{ width: '700px', height: '700px', left: '80px', top: '150px', background: '#00D1A0' }} />
        <div className="absolute rounded-full" style={{ width: '700px', height: '700px', left: '0px', top: '120px', background: '#F7F9FC' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-[1600px] px-20 lg:px-32 xl:px-48">
        
        {/* LEFT SIDE - Image */}
        <div className="hidden lg:block flex-shrink-0">
          <img 
            src={LoginImage} 
            alt="Visual" 
            className="object-cover rounded-[32px]"
            style={{ width: '420px', height: '580px' }}
          />
        </div>

        {/* RIGHT SIDE - Form Section */}
        <div className="flex flex-col items-center w-full max-w-[440px]">
          
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

          <div className="flex flex-col items-center w-full text-center">
            
            {/* VIEW 1: INPUT FORM */}
            {view === "input" && (
              <>
                <h2 className="text-3xl font-bold text-[#111] mb-3">
                  Forgot password?
                </h2>
                <p className="text-[#666] text-[15px] leading-relaxed mb-8 max-w-[400px]">
                  Enter your registered email address and we’ll send you a password reset link.
                </p>

                <form onSubmit={handleReset} className="w-full flex flex-col gap-6">
                  <div className="flex flex-col items-start gap-2 text-left">
                    <label className="text-sm font-semibold text-[#111]">
                      Email Address
                    </label>
                    <input 
                      type="email" 
                      placeholder="Enter your work email" 
                      className="w-full px-4 py-3.5 text-[#111] bg-white border border-[#E3E6EA] rounded-xl outline-none focus:border-[#011C39] transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    {error && <span className="text-sm text-red-500 font-medium">{error}</span>}
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3.5 text-[15px] font-semibold text-white bg-[#011C39] rounded-xl hover:bg-[#022a55] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : "Send reset link"}
                  </button>
                </form>
              </>
            )}

            {/* VIEW 2: SUCCESS / CHECK EMAIL */}
            {view === "success" && (
              <>
                <h2 className="text-3xl font-bold text-[#111] mb-3">
                  Check your email
                </h2>
                <p className="text-[#666] text-[15px] leading-relaxed mb-8 max-w-[400px]">
                  We’ve sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
                </p>

                <div className="w-full flex flex-col gap-4">
                  <button 
                    onClick={handleResend}
                    disabled={loading}
                    className="w-full py-3.5 text-[15px] font-semibold text-white bg-[#011C39] rounded-xl hover:bg-[#022a55] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                     {loading ? <Loader2 className="animate-spin" size={20} /> : "Resend email"}
                  </button>
                  
                  {resendMessage && (
                    <span className="text-sm text-green-600 font-medium">{resendMessage}</span>
                  )}
                </div>
              </>
            )}

            {/* "Back to log in" Link (Common for both views) */}
            <div className="mt-8">
              <Link 
                to="/login" 
                className="text-[#00D1A0] font-semibold text-[15px] hover:underline hover:text-[#00b88d] transition-colors"
              >
                Back to log in
              </Link>
            </div>

          </div>
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default ForgotPassword;