import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { 
  User, Mail, Lock, Phone, Ticket, Loader2, ArrowRight, CheckCircle, CreditCard 
} from "lucide-react";
import { functions } from "../../services/firebase"; // Ensure this matches your project path
import InputGroup from "../../components/InputGroup"; // Ensure this component exists

function ClientRegister() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    referralCode: "",
  });
  
  // New State for Subscription Toggle
  const [subscribeNow, setSubscribeNow] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Auto-fill Referral Code from URL
  useEffect(() => {
    const codeFromUrl = searchParams.get("ref");
    if (codeFromUrl) {
      setForm((prev) => ({ ...prev, referralCode: codeFromUrl }));
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const registerFn = httpsCallable(functions, "registerClient");
      
      // Sending 'paymentSuccess' based on the checkbox state
      await registerFn({ 
        ...form, 
        paymentSuccess: subscribeNow 
      });
      
      setSuccess(true);
      setForm((prev) => ({ ...prev, password: "", name: "", email: "", phone: "" }));
    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase: ", "").replace("Error ", ""));
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-24 bg-linear-to-b from-[#0e2b4a] via-[#1c4066] to-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
        
        <div className="px-8 pt-8 pb-4 text-center">
          <h2 className="text-2xl font-bold text-[#0e2b4a]">Create Client Account</h2>
          <p className="text-slate-500 text-sm mt-2">Get your taxes sorted with WriteOffGenie.</p>
        </div>

        <div className="px-8 pb-6">
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col items-center animate-in fade-in slide-in-from-top-4">
              <CheckCircle className="text-green-600 mb-2" size={32} />
              <h3 className="text-green-800 font-bold text-lg">Account Created!</h3>
              <p className="text-green-600 text-sm text-center">Your account is ready. You can now login.</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center font-medium">
              {error}
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <InputGroup 
                icon={User} 
                name="name" 
                placeholder="Full Name" 
                value={form.name} 
                onChange={handleChange} 
              />
              <InputGroup 
                icon={Mail} 
                name="email" 
                type="email" 
                placeholder="Email Address" 
                value={form.email} 
                onChange={handleChange} 
              />
              <InputGroup 
                icon={Phone} 
                name="phone" 
                placeholder="Phone Number" 
                value={form.phone} 
                onChange={handleChange} 
              />
              <InputGroup 
                icon={Ticket} 
                name="referralCode" 
                placeholder="Referral Code (Optional)" 
                value={form.referralCode} 
                onChange={handleChange} 
              />
              <InputGroup 
                icon={Lock} 
                name="password" 
                type="password" 
                placeholder="Password (Min 8 chars)" 
                value={form.password} 
                onChange={handleChange} 
              />

              {/* TEST SUBSCRIPTION TOGGLE */}
              <div 
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  subscribeNow 
                    ? "bg-indigo-50 border-indigo-600" 
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
                onClick={() => setSubscribeNow(!subscribeNow)}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                  subscribeNow ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300"
                }`}>
                  {subscribeNow && <CheckCircle size={14} strokeWidth={3} />}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${subscribeNow ? "text-indigo-900" : "text-slate-700"}`}>
                    Subscribe to Standard Plan
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Pay ₹1000 now for full access. (Simulated Payment)
                  </p>
                </div>
                <CreditCard className={`ml-auto ${subscribeNow ? "text-indigo-600" : "text-slate-400"}`} size={20} />
              </div>

              <button
                disabled={loading}
                className="w-full bg-[#0e2b4a] hover:bg-[#1a3d61] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <>Sign Up Now <ArrowRight size={18} /></>}
              </button>
            </form>
          )}
        </div>

        <div className="bg-slate-50 px-8 py-5 text-center border-t border-slate-100">
          <p className="text-sm text-slate-600">
            Are you a CA?{" "}
            <Link to="/register" className="text-[#0e2b4a] font-bold hover:underline">
              Partner Sign Up
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default ClientRegister;