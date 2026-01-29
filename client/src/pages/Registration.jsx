import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Lock, Phone, Briefcase, Loader2, ArrowRight } from "lucide-react";
import { functions, auth } from "../services/firebase";
import InputGroup from "../components/InputGroup";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    caRegNumber: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const registerFn = httpsCallable(functions, "registerCA");
      await registerFn(form);
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
    // Applied matching gradient background so transparent Navbar is visible
    <div className="min-h-screen flex items-center justify-center p-4 pt-24 bg-linear-to-b from-[#0e2b4a] via-[#1c4066] to-slate-50">
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
        <div className="px-8 pt-8 pb-4 text-center">
          <h2 className="text-2xl font-bold text-[#0e2b4a]">
            Become a Partner
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            Start earning commissions today.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4 pt-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center font-medium">
              {error}
            </div>
          )}

          <InputGroup
            icon={User}
            name="name"
            placeholder="Full Name"
            onChange={handleChange}
          />
          <InputGroup
            icon={Mail}
            name="email"
            type="email"
            placeholder="Email Address"
            onChange={handleChange}
          />
          <InputGroup
            icon={Phone}
            name="phone"
            placeholder="Phone Number"
            onChange={handleChange}
          />
          <InputGroup
            icon={Briefcase}
            name="caRegNumber"
            placeholder="CA Reg Number (Optional)"
            onChange={handleChange}
            required={false}
          />
          <InputGroup
            icon={Lock}
            name="password"
            type="password"
            placeholder="Password (Min 8 chars)"
            onChange={handleChange}
          />

          <button
            disabled={loading}
            className="w-full bg-[#0e2b4a] hover:bg-[#1a3d61] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 mt-4"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Create Account <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="bg-slate-50 px-8 py-5 text-center border-t border-slate-100">
          <p className="text-sm text-slate-600">
            Already registered?{" "}
            <Link
              to="/login"
              className="text-[#0e2b4a] font-bold hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;