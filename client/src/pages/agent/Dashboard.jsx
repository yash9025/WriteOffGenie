import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { Loader2, TrendingUp, Users, DollarSign, Activity, X, RevenueIcon } from "../../components/Icons";
import toast, { Toaster } from "react-hot-toast";
import StatCard from "../../components/common/StatCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// --- CUSTOM TOOLTIP ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#E3E6EA] p-4 rounded-xl shadow-lg min-w-[200px]">
        <p className="text-[#9499A1] text-xs font-medium mb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.stroke }}
                />
                <span className="text-[#111111] text-sm font-medium">
                  {entry.name}
                </span>
              </div>
              <span className="text-[#111111] text-sm font-bold">
                ${entry.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { user, partnerData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    commissionRate: 15,
    maintenanceCost: 6.00,
    totalCPAs: 0,
    activeCPAs: 0,
    totalRevenue: 0,
    totalCPACommission: 0,
    activeSubscriptions: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    commissionRate: 10,
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const loadDashboardData = async () => {
      try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // 1. Parallel Fetch: Settings, CPA network, and unique Ledger Transactions
        const [agentSnap, cpasSnap, txnsSnap] = await Promise.all([
          getDoc(doc(db, "Partners", user.uid)),
          getDocs(query(collection(db, "Partners"), where("referredBy", "==", user.uid), where("role", "==", "cpa"))),
          getDocs(query(collection(db, "Transactions"), where("agentId", "==", user.uid), where("status", "==", "completed")))
        ]);

        const agentProfile = agentSnap.data() || {};
        
        // 2. Initialize Ledger Totals & Sets for Unique Counts
        let totalRevenue = 0;
        let totalCpaComm = 0;
        let totalAgentEarn = 0;
        const activeUsersSet = new Set();
        const activeCpaSet = new Set();

        const monthlyMap = monthNames.map((month, i) => ({
          month,
          revenue: 0,
          agentCommission: 0,
          cpaCommission: 0,
        }));

        // 3. Process Ledger (Deduplicates via unique transaction documents)
        txnsSnap.docs.forEach(doc => {
          const txn = doc.data();
          const amount = Number(txn.amountPaid || 0);
          const aEarn = Number(txn.agentEarnings || 0);
          const cEarn = Number(txn.cpaEarnings || 0);

          totalRevenue += amount;
          totalAgentEarn += aEarn;
          totalCpaComm += cEarn;

          // Track unique IDs for accurate active counts
          activeUsersSet.add(txn.userId);
          activeCpaSet.add(txn.cpaId);

          // Map to Chart months
          const createdAt = txn.createdAt?.toDate?.();
          if (createdAt && createdAt.getFullYear() === currentYear) {
            const mIdx = createdAt.getMonth();
            monthlyMap[mIdx].revenue += amount;
            monthlyMap[mIdx].agentCommission += aEarn;
            monthlyMap[mIdx].cpaCommission += cEarn;
          }
        });

        // 4. Update Stats State
        setStats({
          totalEarnings: totalAgentEarn,
          commissionRate: agentProfile.commissionPercentage || 15,
          maintenanceCost: agentProfile.maintenanceCostPerUser || 6.00,
          totalCPAs: cpasSnap.size,
          activeCPAs: activeCpaSet.size,
          totalRevenue: totalRevenue,
          totalCPACommission: totalCpaComm,
          activeSubscriptions: activeUsersSet.size,
        });

        setChartData(monthlyMap);
        setLoading(false);
      } catch (error) {
        console.error("Dashboard Load Error:", error);
        toast.error("Failed to load real-time ledger data");
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.uid]);

  const handleSendInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (inviteForm.commissionRate < 10 || inviteForm.commissionRate > 50) {
      toast.error("Commission rate must be between 10% and 50%");
      return;
    }

    setSending(true);
    try {
      const functions = getFunctions();
      const sendInvite = httpsCallable(functions, "sendCPAInvite");
      await sendInvite({
        name: inviteForm.name,
        email: inviteForm.email,
        commissionRate: inviteForm.commissionRate,
        invitedBy: user.uid,
        inviteType: "cpa",
      });

      toast.success(`Invite sent to ${inviteForm.email} successfully!`);
      setInviteForm({ name: "", email: "", commissionRate: 10 });
    } catch (error) {
      toast.error(error.message || "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (value) =>
    `$${(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[#4D7CFE]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <Toaster position="top-right" />
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#111111]">Agent Dashboard</h1>
        <p className="text-[#9499A1] mt-1">
          Welcome back, {partnerData?.displayName || "Agent"}!
        </p>
      </div>

      {/* --- TOP STATS CARDS (Gross Revenue is now 2nd) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Earnings"
          value={formatCurrency(stats.totalEarnings)}
          description={`${stats.commissionRate}% of Net Profit`}
          icon={RevenueIcon}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          description="Gross CPA platform sales"
          icon={Activity}
        />
        <StatCard
          title="Commission Rate"
          value={`${stats.commissionRate}%`}
          description="Your active payout rate"
          icon={TrendingUp}
        />
        <StatCard
          title="Total CPAs"
          value={stats.totalCPAs}
          description="Partners in your network"
          icon={Users}
        />
      </div>

      {/* --- INVITE CPA SECTION (Restored Exact Layout) --- */}
      <div className="bg-white border border-[#E3E6EA] rounded-[20px] shadow-sm">
        <div className="px-6 py-4 border-b border-[#E3E6EA]">
          <h3 className="text-lg font-semibold text-[#111111]">Invite New CPA</h3>
          <p className="text-sm text-[#9499A1] mt-1">Send an invitation to onboard a new CPA partner</p>
        </div>
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-5 items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-[#111111] mb-2">
                CPA Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={inviteForm.name} 
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} 
                placeholder="Enter full name" 
                className="w-full px-4 py-2.5 border border-[#E3E6EA] rounded-xl text-[#111111] placeholder:text-[#9499A1] focus:outline-none focus:ring-2 focus:ring-[#4D7CFE] focus:border-transparent transition-all" 
              />
            </div>

            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-[#111111] mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input 
                type="email" 
                value={inviteForm.email} 
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} 
                placeholder="email@example.com" 
                className="w-full px-4 py-2.5 border border-[#E3E6EA] rounded-xl text-[#111111] placeholder:text-[#9499A1] focus:outline-none focus:ring-2 focus:ring-[#4D7CFE] focus:border-transparent transition-all" 
              />
            </div>

            <div className="w-full lg:w-40">
              <label className="block text-sm font-medium text-[#111111] mb-2">
                Commission Rate <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={inviteForm.commissionRate} 
                  onChange={(e) => setInviteForm({ ...inviteForm, commissionRate: parseInt(e.target.value) || 10 })} 
                  min="10" 
                  max="50" 
                  className="w-full px-4 py-2.5 pr-10 border border-[#E3E6EA] rounded-xl text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#4D7CFE] focus:border-transparent transition-all" 
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9499A1] font-medium">%</span>
              </div>
            </div>

            <button 
              onClick={handleSendInvite} 
              disabled={sending} 
              className="px-8 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-40"
            >
              {sending ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Sending...
                </>
              ) : (
                "Send Invite"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --- REVENUE TRENDS CHART --- */}
      <div className="bg-white border border-[#E3E6EA] rounded-[20px] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#111111] mb-6">Revenue & Commission Overview ({new Date().getFullYear()})</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#E3E6EA" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#9499A1", fontSize: 12 }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#9499A1", fontSize: 12 }} 
                tickFormatter={(val) => `$${val}`} 
                width={60} 
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E3E6EA", strokeWidth: 1 }} />
              
              <Line 
                type="monotone" 
                dataKey="revenue" 
                name="Platform Revenue" 
                stroke="#0F1728" 
                strokeWidth={3} 
                dot={false} 
                activeDot={{ r: 6, strokeWidth: 0, fill: "#0F1728" }} 
              />
              <Line 
                type="monotone" 
                dataKey="agentCommission" 
                name="Your Earnings" 
                stroke="#00D1A0" 
                strokeWidth={3} 
                dot={false} 
                activeDot={{ r: 6, strokeWidth: 0, fill: "#00D1A0" }} 
              />
              <Line 
                type="monotone" 
                dataKey="cpaCommission" 
                name="CPA Share" 
                stroke="#7F56D9" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 6, strokeWidth: 0, fill: "#7F56D9" }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;