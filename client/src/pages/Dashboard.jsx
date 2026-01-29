import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Copy, Check, TrendingUp, Users, Wallet, Share2, Loader2, UserCheck } from "lucide-react";
import { auth, db } from "../services/firebase";
import { ReferralsList } from "../components/ReferralsList";

;

function StatCard({ icon: Icon, title, value }) {
  return (
    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-white/20 shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">{title}</h3>
        <div className="p-2.5 bg-blue-50 text-[#0e2b4a] rounded-xl">
          <Icon size={22} />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-[#0e2b4a]">{value}</p>
    </div>
  );
}

function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return navigate("/login");

      try {
        const uid = auth.currentUser.uid;

        // Fetch CA Profile
        const docSnap = await getDoc(doc(db, "CAs", uid));
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }

        // Fetch Referred Clients
        const q = query(
          collection(db, "Clients"), 
          where("referredBy", "==", uid)
        );
        const querySnapshot = await getDocs(q);
        const clientsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by newest
        clientsList.sort((a, b) => b.createdAt - a.createdAt);
        setReferrals(clientsList);

      } catch (error) {
        console.error("Error fetching dashboard:", error);
      }
    };

    fetchData();
  }, [navigate]);


  const copyLink = () => {
    const link = `https://writeoffgenie.ai/join?ref=${profile?.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!profile) return (
    <div className="min-h-screen bg-[#0e2b4a] flex items-center justify-center">
        <div className="flex flex-col items-center">
            <Loader2 className="animate-spin h-10 w-10 text-white mb-4" />
            <p className="text-blue-200 font-medium">Loading Dashboard...</p>
        </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-linear-to-b from-[#0e2b4a] via-[#1c4066] to-slate-100 pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-blue-200 mt-1">Welcome back, {profile.name}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-sm font-medium text-white shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]"></div>
            Partner Active
          </div>
        </div>

        {/* Hero / Referral Section */}
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl transition-all hover:shadow-blue-900/20">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
           
           <div className="relative z-10 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
             <div className="max-w-xl text-center md:text-left space-y-4">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 text-[#0e2b4a] text-xs font-bold uppercase tracking-wide">
                 <Share2 size={14} /> Referral Program
               </div>
               <h2 className="text-3xl font-bold text-slate-900">Grow your revenue</h2>
               <p className="text-slate-600 text-lg leading-relaxed">
                 Share your unique link. You earn recurring commissions automatically when your clients subscribe.
               </p>
             </div>

             <div className="w-full md:w-auto bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="px-4 py-3 text-slate-600 font-mono text-sm flex items-center justify-center bg-white border border-slate-200 rounded-xl min-w-[240px]">
                    writeoffgenie.ai/join?ref={profile.referralCode}
                  </div>
                  <button 
                    onClick={copyLink} 
                    className="bg-[#0e2b4a] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1a3d61] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-900/30"
                  >
                    {copied ? <Check size={18} className="text-emerald-400"/> : <Copy size={18} />} 
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
             </div>
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={Wallet} 
            title="Total Earnings" 
            value={`₹${(profile.stats?.totalEarnings || 0).toLocaleString()}`} 
          />
          <StatCard 
            icon={TrendingUp} 
            title="Wallet Balance" 
            value={`₹${(profile.stats?.walletBalance || 0).toLocaleString()}`} 
          />
          <StatCard 
            icon={Users} 
            title="Total Referred" 
            value={profile.stats?.totalReferred || 0} 
          />
          <StatCard 
            icon={UserCheck} 
            title="Active Subscribers" 
            value={profile.stats?.totalSubscribed || 0} 
          />
        </div>

        {/* Referrals Table */}
        <ReferralsList referrals={referrals} />

      </div>
    </main>
  );
}

export default Dashboard;