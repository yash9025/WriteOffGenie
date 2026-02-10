import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { Loader2, TrendingUp, Users, DollarSign, Activity } from "../../components/Icons";
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

// Plan prices for revenue calculation (outside component to avoid dependency issues)
const PLAN_PRICES = {
  'writeoffgenie-premium-month': 25.00,
  'com.writeoffgenie.premium.monthly': 25.00,
  'writeoffgenie-pro-month': 15.00,
  'com.writeoffgenie.pro.monthly': 15.00,
  'writeoffgenie-premium-year': 239.99,
  'com.writeoffgenie.premium.yearly': 239.99,
  'writeoffgenie-pro-year': 143.99,
  'com.writeoffgenie.pro.yearly': 143.99,
};
const getPlanPrice = (planname) => PLAN_PRICES[planname] || 0;

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
    if (!user) return;

    // Load all data and calculate earnings using formula
    const loadData = async () => {
      try {
        // 1. Get agent data for commission settings
        const agentDocSnap = await getDocs(query(collection(db, "Partners"), where("__name__", "==", user.uid)));
        const agentData = agentDocSnap.docs[0]?.data() || {};
        const agentCommissionRate = (agentData.commissionPercentage || 15) / 100;
        const maintenanceCostPerUser = agentData.maintenanceCostPerUser || 6.00;

        // 2. Get CPAs referred by this agent
        const cpasQuery = query(
          collection(db, "Partners"),
          where("referredBy", "==", user.uid),
          where("role", "==", "cpa")
        );
        const cpasSnapshot = await getDocs(cpasQuery);
        
        // 3. Calculate revenue, CPA commissions, and active subscriptions
        let totalRevenue = 0;
        let totalCPACommissions = 0;
        let activeSubscriptionsCount = 0;
        let activeCPAsCount = 0;
        const now = new Date();

        // Monthly data for chart
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentYear = now.getFullYear();
        const currentYearData = monthNames.map((month, i) => ({
          month,
          year: currentYear,
          monthIndex: i,
          revenue: 0,
          agentCommission: 0,
          cpaCommission: 0,
        }));

        for (const cpaDoc of cpasSnapshot.docs) {
          const cpaData = cpaDoc.data();
          const cpaReferralCode = cpaData.referralCode;
          const cpaRate = (cpaData.commissionRate || 10) / 100;
          
          if (!cpaReferralCode) continue;
          
          // Get users with this CPA's referral code
          const usersQuery = query(
            collection(db, "user"),
            where("referral_code", "==", cpaReferralCode)
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          let cpaHasActiveUser = false;
          
          for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            
            // Fetch subscriptions for this user
            const subsSnap = await getDocs(collection(db, "user", userId, "subscription"));
            
            for (const subDoc of subsSnap.docs) {
              const subData = subDoc.data();
              const price = getPlanPrice(subData.planname);
              
              if (price === 0) continue;
              
              totalRevenue += price;
              const cpaComm = price * cpaRate;
              totalCPACommissions += cpaComm;
              
              // Check if active subscription
              const expirationDate = subData.expiration_date?.toDate?.() || subData.expiration_date;
              const isActive = subData.status === 'active' && expirationDate && new Date(expirationDate) > now;
              
              if (isActive) {
                activeSubscriptionsCount++;
                cpaHasActiveUser = true;
              }
              
              // Add to monthly chart data
              const purchaseDate = subData.purchase_date?.toDate?.() || subData.purchse_date?.toDate?.() || subData.created_Time?.toDate?.();
              if (purchaseDate && purchaseDate.getFullYear() === currentYear) {
                const monthIndex = purchaseDate.getMonth();
                currentYearData[monthIndex].revenue += price;
                currentYearData[monthIndex].cpaCommission += cpaComm;
              }
            }
          }
          
          if (cpaHasActiveUser) activeCPAsCount++;
        }

        // 4. Apply formula: Agent_Commission = Rate% × [(Revenue - CPA_Commissions) - (Active_Subs × Maintenance_Cost)]
        const netRevenue = totalRevenue - totalCPACommissions;
        const maintenanceCosts = activeSubscriptionsCount * maintenanceCostPerUser;
        const netProfit = netRevenue - maintenanceCosts;
        const calculatedEarnings = Math.max(0, netProfit * agentCommissionRate);

        // Update chart with agent commission
        currentYearData.forEach(month => {
          if (month.revenue > 0) {
            const monthNet = month.revenue - month.cpaCommission;
            // Proportional maintenance and commission for the month
            const monthRatio = month.revenue / (totalRevenue || 1);
            const monthMaintenance = maintenanceCosts * monthRatio;
            month.agentCommission = Math.max(0, (monthNet - monthMaintenance) * agentCommissionRate);
          }
        });

        setStats({
          totalEarnings: calculatedEarnings,
          commissionRate: agentData.commissionPercentage || 15,
          maintenanceCost: maintenanceCostPerUser,
          totalCPAs: cpasSnapshot.size,
          activeCPAs: activeCPAsCount,
          totalRevenue,
          totalCPACommission: totalCPACommissions,
          activeSubscriptions: activeSubscriptionsCount,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          description={`${stats.commissionRate}% × (Net Revenue - $${stats.maintenanceCost}/user)`}
          icon={DollarSign}
        />
        <StatCard
          title="Commission Rate"
          value={`${stats.commissionRate}%`}
          description="Your commission percentage"
          icon={TrendingUp}
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
          description={`${stats.activeSubscriptions} active subscriptions`}
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