import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { Loader2, TrendingUp, Wallet, Users, DollarSign } from "../../components/Icons";
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
                ${entry.value?.toLocaleString()}
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
    availableBalance: 0,
    totalCPAs: 0,
    activeCPAs: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    commissionRate: 10,
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;

    // 1. Listen to real-time agent stats
    const unsubscribe = onSnapshot(doc(db, "Partners", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats((prev) => ({
          ...prev,
          totalEarnings: data.stats?.totalEarnings || 0,
          availableBalance: data.walletBalance || 0,
        }));
      }
    });

    // 2. Load Chart Data & CPAs
    const loadData = async () => {
      try {
        // A. Get CPAs referred by this agent
        const cpasQuery = query(
          collection(db, "Partners"),
          where("referredBy", "==", user.uid),
          where("role", "==", "cpa")
        );

        const cpasSnapshot = await getDocs(cpasQuery);
        const cpaIds = cpasSnapshot.docs.map((doc) => doc.id);

        // B. Count active CPAs
        let activeCPAsCount = 0;
        if (cpaIds.length > 0) {
          for (const cpaId of cpaIds) {
            const cpaDocSnap = await getDocs(
              query(collection(db, "Partners"), where("__name__", "==", cpaId))
            );
            const cpaData = cpaDocSnap.docs[0]?.data();
            if ((cpaData?.stats?.totalSubscribed || 0) > 0) {
              activeCPAsCount++;
            }
          }
        }

        setStats((prev) => ({
          ...prev,
          totalCPAs: cpaIds.length,
          activeCPAs: activeCPAsCount,
        }));

        // C. Fetch transactions
        const transactionsQuery = query(
          collection(db, "Transactions"),
          where("agentId", "==", user.uid)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const transactions = transactionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // D. CURRENT YEAR LOGIC (Jan - Dec)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentYearData = [];
        const now = new Date();
        const currentYear = now.getFullYear();

        // Initialize all 12 months for current year
        for (let i = 0; i < 12; i++) {
          currentYearData.push({
            month: monthNames[i],
            year: currentYear,
            monthIndex: i,
            revenue: 0,
            agentCommission: 0,
            cpaCommission: 0,
          });
        }

        // Aggregate transactions
        transactions.forEach((transaction) => {
          if (transaction.createdAt) {
            const txDate = transaction.createdAt.toDate
              ? transaction.createdAt.toDate()
              : new Date(transaction.createdAt);
            
            // Only add if it belongs to this year
            if (txDate.getFullYear() === currentYear) {
               const monthIndex = txDate.getMonth(); // 0 = Jan, 11 = Dec
               if (currentYearData[monthIndex]) {
                  currentYearData[monthIndex].revenue += transaction.amount || 0;
                  currentYearData[monthIndex].agentCommission += transaction.agentCommission || 0;
                  currentYearData[monthIndex].cpaCommission += transaction.cpaCommission || 0;
               }
            }
          }
        });

        setChartData(currentYearData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load dashboard data");
        setLoading(false);
      }
    };

    loadData();
    return () => unsubscribe();
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
      console.error("Error sending invite:", error);
      toast.error(error.message || "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (value) =>
    `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[#4D7CFE]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#111111]">Agent Dashboard</h1>
        <p className="text-[#9499A1] mt-1">
          Welcome back, {partnerData?.displayName || "Agent"}!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Earnings"
          value={formatCurrency(stats.totalEarnings)}
          description="All-time commission earned"
          icon={DollarSign}
        />
        <StatCard
          title="Available Balance"
          value={formatCurrency(stats.availableBalance)}
          description="Ready for withdrawal"
          icon={Wallet}
        />
        <StatCard
          title="Total CPAs"
          value={stats.totalCPAs}
          description="CPAs you've referred"
          icon={Users}
        />
        <StatCard
          title="Active CPAs"
          value={stats.activeCPAs}
          description="With active subscriptions"
          icon={TrendingUp}
        />
      </div>

      {/* Invite CPA Section */}
      <div className="bg-white border border-[#E3E6EA] rounded-[20px] shadow-sm">
        <div className="px-6 py-4 border-b border-[#E3E6EA]">
          <h3 className="text-lg font-semibold text-[#111111]">
            Invite New CPA
          </h3>
          <p className="text-sm text-[#9499A1] mt-1">
            Send an invitation to onboard a new CPA partner
          </p>
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
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, name: e.target.value })
                }
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
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
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
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      commissionRate: parseInt(e.target.value) || 10,
                    })
                  }
                  min="10"
                  max="50"
                  className="w-full px-4 py-2.5 pr-10 border border-[#E3E6EA] rounded-xl text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#4D7CFE] focus:border-transparent transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9499A1] font-medium">
                  %
                </span>
              </div>
            </div>

            <button
              onClick={handleSendInvite}
              disabled={sending}
              className="px-8 py-2.5 bg-black cursor-pointer hover:bg-gray-800 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-40"
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

      {/* Revenue Chart */}
      <div className="bg-white border border-[#E3E6EA] rounded-[20px] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#111111] mb-6">
          Revenue & Commission Overview ({new Date().getFullYear()})
        </h2>
        
        <div className="h-80 w-full"> 
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={true}
                stroke="#E3E6EA"
              />

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

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "#E3E6EA", strokeWidth: 1 }}
              />

              {/* Line 1: Total Revenue (Dark Blue/Black) */}
              <Line
                type="monotone"
                dataKey="revenue"
                name="Platform Revenue"
                stroke="#0F1728"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#0F1728" }}
              />

              {/* Line 2: Agent Commission (Green) */}
              <Line
                type="monotone"
                dataKey="agentCommission"
                name="Your Commission"
                stroke="#00D1A0"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#00D1A0" }}
              />

              {/* Line 3: CPA Commission (Purple) */}
              <Line
                type="monotone"
                dataKey="cpaCommission"
                name="CPA Commission"
                stroke="#7F56D9"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#7F56D9" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Toaster position="top-right" />
    </div>
  );
};

export default Dashboard;