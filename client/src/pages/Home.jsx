import { Link } from "react-router-dom";
import { ArrowRight, Zap, ShieldCheck, Coins } from "lucide-react";

/**
 * Reusable Feature Card Component
 */
function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="group p-8 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-6 group-hover:bg-[#0e2b4a] transition-colors">
        <Icon className="h-6 w-6 text-[#0e2b4a] group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-xl font-bold text-[#0e2b4a]">{title}</h3>
      <p className="mt-3 text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function Home() {
  return (
    <div className="bg-white min-h-screen font-sans">
      
      <div className="relative bg-linear-to-b from-[#0e2b4a] via-[#1c4066] to-slate-50 pt-36 pb-16 lg:pt-48 lg:pb-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto max-w-4xl text-center">
            
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl mb-8 drop-shadow-lg">
              Empower Your Practice. <br className="hidden sm:block" />
              <span className="text-blue-200">Earn While You Scale.</span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-blue-100 max-w-2xl mx-auto font-medium">
              Join the elite network of Chartered Accountants driving digital
              transformation. Refer your clients to AI-powered tax tracking and
              unlock a recurring revenue stream for your firm.
            </p>
          </div>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto rounded-lg bg-white px-8 py-4 text-sm font-bold text-[#0e2b4a] shadow-xl hover:bg-blue-50 transition-all duration-200"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto rounded-lg px-8 py-4 text-sm font-bold text-white border border-white/30 hover:bg-white/10 transition-all"
            >
              Partner Login
            </Link>
            
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-slate-50 py-16 sm:py-22">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-base font-bold text-[#0e2b4a] uppercase tracking-wide">
              For Accountants
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Power up your practice
            </p>
          </div>

          <div className="grid max-w-xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
            <Feature
              icon={Coins}
              title="Recurring Revenue"
              desc="Earn industry-leading commissions for every client who subscribes to the Genie platform."
            />
            <Feature
              icon={Zap}
              title="Automated Workflow"
              desc="Our AI handles the categorization and receipt scanning. You get clean data, instantly."
            />
            <Feature
              icon={ShieldCheck}
              title="Audit Proof"
              desc="Every expense is backed by AI-verified documentation, keeping your clients safe and compliant."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
