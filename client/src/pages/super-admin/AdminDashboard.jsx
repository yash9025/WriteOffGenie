import React, { useEffect, useState} from "react";
import { collection, getDocs, collectionGroup } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Loader2, DollarSign, Percent, Users } from "../../components/Icons";
import StatCard from "../../components/common/StatCard";
import toast, { Toaster } from "react-hot-toast";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#E3E6EA] rounded-xl p-4 shadow-xl z-50">
        <p className="font-bold text-[#111111] mb-2 text-sm">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[#9499A1] font-medium">{entry.name}:</span>
            <span className="font-bold text-[#111111]">
              ${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};


// 3. MAIN DASHBOARD COMPONENT

// Pricing lookup table (outside component to avoid re-creation)
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

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalRev: 0,
    totalComm: 0,
    activeUsers: 0,
    chartData: [],
    agentComm: 0,
    cpaComm: 0
  });

  const formatCurrency = (value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 3 PARALLEL QUERIES - Fast for 500+ users
        const [partnersSnap, usersSnap, allSubsSnap] = await Promise.all([
          getDocs(collection(db, "Partners")),
          getDocs(collection(db, "user")),
          getDocs(collectionGroup(db, "subscription")) // ALL subscriptions in ONE query!
        ]);
        
        // Build user map (userId -> referral_code)
        const userRefCodes = {};
        usersSnap.docs.forEach(d => {
          const data = d.data();
          userRefCodes[d.id] = data.referral_code || null;
        });
        
        // Build partner maps
        const partnerById = {};
        const partnerByCode = {};
        let totalCPACommission = 0;
        
        partnersSnap.docs.forEach(d => {
          const data = d.data();
          const role = String(data.role || '').toLowerCase().includes('agent') ? 'agent' : 'cpa';
          const partner = {
            id: d.id,
            role,
            referralCode: data.referralCode,
            referredBy: data.referredBy,
            commissionRate: (data.commissionRate || 10) / 100,
            commissionPercentage: data.commissionPercentage || 15,
            maintenanceCostPerUser: data.maintenanceCostPerUser || 6.00,
            totalEarnings: data.stats?.totalEarnings || 0
          };
          partnerById[d.id] = partner;
          if (data.referralCode) partnerByCode[data.referralCode] = partner;
          
          if (role === 'cpa') {
            totalCPACommission += partner.totalEarnings;
          }
        });

        // Process ALL subscriptions from collection group query
        const now = new Date();
        const agentData = {};
        let totalRevenue = 0;
        let activeUsersCount = 0;
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyData = months.map(m => ({ name: m, revenue: 0, commission: 0, agentCommission: 0, cpaCommission: 0 }));

        allSubsSnap.docs.forEach(subDoc => {
          const subData = subDoc.data();
          
          const price = getPlanPrice(subData.planname);
          if (price === 0) return;
          
          // Add ALL subscription revenue to total
          totalRevenue += price;
          
          // Check if active for user count and commission calcs
          const expirationDate = subData.expiration_date?.toDate?.();
          const isActive = subData.status === 'active' && expirationDate && expirationDate > now;
          if (isActive) activeUsersCount++;
          
          // Add to monthly chart
          const purchaseDate = subData.purchase_date?.toDate?.() || subData.created_Time?.toDate?.();
          if (purchaseDate) {
            const monthIndex = purchaseDate.getMonth();
            monthlyData[monthIndex].revenue += price;
          }
          
          // Get userId from doc path: user/{userId}/subscription/{subId}
          const pathParts = subDoc.ref.path.split('/');
          const userId = pathParts[1];
          const refCode = userRefCodes[userId] || subData.ref_code;
          const cpa = refCode ? partnerByCode[refCode] : null;
          
          // Track for agent commission calculation (only for active subscriptions)
          if (isActive && cpa && cpa.referredBy) {
            const agent = partnerById[cpa.referredBy];
            if (agent && agent.role === 'agent') {
              const agentId = cpa.referredBy;
              if (!agentData[agentId]) {
                agentData[agentId] = { 
                  revenue: 0, 
                  cpaCommissions: 0, 
                  activeSubscriptions: 0,
                  commissionRate: agent.commissionPercentage / 100,
                  maintenanceCost: agent.maintenanceCostPerUser
                };
              }
              const cpaComm = price * cpa.commissionRate;
              agentData[agentId].revenue += price;
              agentData[agentId].cpaCommissions += cpaComm;
              agentData[agentId].activeSubscriptions++;
            }
          }
        });
        
        // Calculate agent commissions using formula
        let totalAgentCommission = 0;
        Object.values(agentData).forEach(agent => {
          const netRevenue = agent.revenue - agent.cpaCommissions;
          const maintenanceCosts = agent.activeSubscriptions * agent.maintenanceCost;
          const netProfit = netRevenue - maintenanceCosts;
          const agentComm = Math.max(0, netProfit * agent.commissionRate);
          totalAgentCommission += agentComm;
        });
        
        const totalComm = totalAgentCommission + totalCPACommission;
        
        setData({ 
          totalRev: totalRevenue, 
          totalComm, 
          activeUsers: activeUsersCount, 
          chartData: monthlyData, 
          agentComm: totalAgentCommission, 
          cpaComm: totalCPACommission 
        });

      } catch (e) {
        console.error(e);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return (
    <div className="h-[70vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-slate-400" size={32}/>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-10">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div>
         <h1 className="text-2xl font-semibold leading-9 text-[#111111]">Dashboard</h1>
         <p className="text-base text-[#9499A1]">Overview of platform performance and revenue</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
            title="Total Revenue" 
            value={formatCurrency(data.totalRev)} 
            description="Total revenue generated from subscriptions"
            icon={DollarSign}
        />
        <StatCard 
            title="Total Commission Payable" 
            value={formatCurrency(data.totalComm)} 
            description={`Agents: ${formatCurrency(data.agentComm)} + CPAs: ${formatCurrency(data.cpaComm)}`}
            icon={Percent}
        />
        <StatCard 
            title="Active Subscriptions" 
            value={data.activeUsers.toLocaleString()} 
            description="Currently active subscriptions"
            icon={Users}
        />
      </div>

      {/* Chart */}
      <div className="bg-white border border-[#E3E6EA] rounded-[20px] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#111111] mb-6">Revenue & Commission Overview</h2>
        <div className="h-75 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#E3E6EA" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#9499A1', fontSize: 12}} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#9499A1', fontSize: 12}} 
                tickFormatter={(val) => `$${val}`}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E3E6EA', strokeWidth: 1 }} />
              
              <Line 
                type="monotone" 
                dataKey="revenue" 
                name="Total Revenue"
                stroke="#0F1728" 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#0F1728" }}
              />
              <Line 
                type="monotone" 
                dataKey="cpaCommission" 
                name="CPA Commission"
                stroke="#00D1A0" 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#00D1A0" }}
              />
              <Line 
                type="monotone" 
                dataKey="agentCommission" 
                name="Agent Commission"
                stroke="#4D7CFE" 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#4D7CFE" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}