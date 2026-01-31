import React, { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom"; // 🚀 Import Link
import { 
  Copy, Check, Users, Wallet, TrendingUp, Target, 
  DollarSign, Award, ArrowUpRight, Loader2, ExternalLink,
  CheckCircle2, Clock, AlertCircle
} from "lucide-react";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

// Enhanced Stat Card with better visual hierarchy
const MetricCard = ({ title, value, icon: Icon, trend, trendValue, color = "indigo", isLoading }) => {
  const colorClasses = {
    indigo: "from-indigo-600 to-indigo-500 shadow-indigo-500/20",
    emerald: "from-emerald-600 to-emerald-500 shadow-emerald-500/20",
    amber: "from-amber-600 to-amber-500 shadow-amber-500/20",
    violet: "from-violet-600 to-violet-500 shadow-violet-500/20",
  };

  const bgClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${bgClasses[color]} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={24} strokeWidth={2} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
            <TrendingUp size={14} />
            <span className="text-xs font-semibold">{trendValue}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded" />
          ) : (
            value
          )}
        </h3>
      </div>
    </div>
  );
};

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [copied, setCopied] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Target Logic
  const [monthlyTarget, setMonthlyTarget] = useState(() => 
    Number(localStorage.getItem("ca_monthly_target")) || 50000
  );

  useEffect(() => {
    if (authLoading || !user) return;

    const unsubProfile = onSnapshot(doc(db, "Partners", user.uid), (docSnap) => {
      if (docSnap.exists()) setProfile(docSnap.data());
      setDataLoading(false);
    });

    const fetchReferrals = async () => {
      try {
        const q = query(collection(db, "Clients"), where("referredBy", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const clients = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        clients.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setReferrals(clients);
      } catch (err) { console.error(err); }
    };
    fetchReferrals();
    return () => unsubProfile();
  }, [user, authLoading]);

  const currentMonthEarnings = referrals.reduce((acc, client) => {
    const date = client.createdAt?.toDate();
    const now = new Date();
    if (date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      return acc + (client.subscription?.amountPaid || 0) * 0.1;
    }
    return acc;
  }, 0);

  const activeSubs = referrals.filter((c) => c.subscription?.status === "active").length;
  const targetPercent = Math.min(Math.round((currentMonthEarnings / monthlyTarget) * 100), 100);
  const conversionRate = referrals.length ? Math.round((activeSubs / referrals.length) * 100) : 0;

  const copyLink = () => {
    if (!profile?.referralCode) return;
    const link = `https://writeoffgenie.ai/join?ref=${profile.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (authLoading || dataLoading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} strokeWidth={2.5} />
      <p className="text-sm font-medium text-slate-500">Loading dashboard...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1 w-8 bg-indigo-600 rounded-full" />
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Partner Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            Welcome back, <span className="text-indigo-600">{profile?.name || "Partner"}</span>
          </h1>
          <p className="text-slate-600">Here's what's happening with your referral network today.</p>
        </div>

        {/* Referral Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/30 max-w-md">
          <p className="text-indigo-100 text-xs font-medium mb-2 uppercase tracking-wide">Your Referral Link</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
              <p className="font-mono text-sm font-semibold truncate">{profile?.referralCode || "LOADING..."}</p>
            </div>
            <button
              onClick={copyLink}
              className={`px-5 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                copied 
                  ? "bg-emerald-500 hover:bg-emerald-600" 
                  : "bg-white text-indigo-600 hover:bg-indigo-50"
              }`}
            >
              {copied ? (
                <>
                  <Check size={18} strokeWidth={2.5} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Lifetime Earnings" 
          value={`₹${(profile?.stats?.totalEarnings || 0).toLocaleString()}`} 
          icon={DollarSign}
          color="indigo"
          isLoading={dataLoading}
        />
        <MetricCard 
          title="This Month" 
          value={`₹${currentMonthEarnings.toLocaleString()}`} 
          icon={TrendingUp}
          trend={true}
          trendValue={`${targetPercent}%`}
          color="emerald"
          isLoading={dataLoading}
        />
        <MetricCard 
          title="Wallet Balance" 
          value={`₹${(profile?.walletBalance || 0).toLocaleString()}`} 
          icon={Wallet}
          color="amber"
          isLoading={dataLoading}
        />
        <MetricCard 
          title="Active Clients" 
          value={activeSubs} 
          icon={Users}
          trend={true}
          trendValue={`${conversionRate}%`}
          color="violet"
          isLoading={dataLoading}
        />
      </div>

      {/* Progress & Insights Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Monthly Goal Progress */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Target className="text-indigo-600" size={20} />
                Monthly Revenue Goal
              </h3>
              <p className="text-sm text-slate-600 mt-1">Track your progress against your monthly target</p>
            </div>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
              Edit <ArrowUpRight size={16} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold text-indigo-600">{targetPercent}%</p>
                <p className="text-sm text-slate-600 mt-1">of monthly goal achieved</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Current / Target</p>
                <p className="text-lg font-bold text-slate-900">
                  ₹{currentMonthEarnings.toLocaleString()} / ₹{monthlyTarget.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative">
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${targetPercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>₹0</span>
                <span>₹{(monthlyTarget / 2).toLocaleString()}</span>
                <span>₹{monthlyTarget.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full -ml-12 -mb-12" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <Award className="text-amber-400" size={24} />
              <h3 className="text-lg font-bold">Performance</h3>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="text-slate-300 text-sm">Total Leads</span>
                <span className="text-2xl font-bold">{referrals.length}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="text-slate-300 text-sm">Conversions</span>
                <span className="text-2xl font-bold text-emerald-400">{activeSubs}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">Success Rate</span>
                <span className="text-3xl font-bold text-amber-400">{conversionRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
            <p className="text-sm text-slate-600 mt-0.5">Your latest client acquisitions</p>
          </div>
          
          {/* 🚀 UPDATED LINK */}
          <Link 
            to="/my-referrals" 
            className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            View All <ExternalLink size={14} />
          </Link>

        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Commission</th>
                <th className="px-8 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {referrals.slice(0, 5).map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-semibold shadow-lg shadow-indigo-500/20">
                        {client.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      {client.subscription?.status === "active" ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-600">Active</span>
                        </>
                      ) : client.subscription?.status === "expired" ? (
                        <>
                          <AlertCircle size={16} className="text-amber-600" />
                          <span className="text-sm font-medium text-amber-600">Expired</span>
                        </>
                      ) : (
                        <>
                          <Clock size={16} className="text-slate-400" />
                          <span className="text-sm font-medium text-slate-500">Pending</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="text-sm font-semibold text-slate-900">
                      ₹{((client.subscription?.amountPaid || 0) * 0.1).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-sm text-slate-600">
                      {client.createdAt?.toDate().toLocaleDateString("en-IN", { 
                        day: "2-digit", 
                        month: "short",
                        year: "numeric"
                      })}
                    </span>
                  </td>
                </tr>
              ))}
              {referrals.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={48} className="text-slate-300" />
                      <p className="text-slate-600 font-medium">No clients yet</p>
                      <p className="text-sm text-slate-500">Start sharing your referral link to grow your network</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;