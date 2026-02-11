import React, { useEffect, useState } from "react";
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

  const formatCurrency = (value) => `$${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partnersSnap, usersSnap, allSubsSnap] = await Promise.all([
          getDocs(collection(db, "Partners")),
          getDocs(collection(db, "user")),
          getDocs(collectionGroup(db, "subscription"))
        ]);
        
        // 1. Map Users (Normalize codes to lowercase)
        const userRefCodes = {};
        usersSnap.docs.forEach(d => {
          const uData = d.data();
          if (uData.referral_code) {
            userRefCodes[d.id] = String(uData.referral_code).toLowerCase().trim();
          }
        });
        
        // 2. Map Partners & Get DB Lifetime Totals
        const partnerById = {};
        const partnerByCode = {};
        let lifetimeCpaEarnings = 0;
        let lifetimeAgentEarnings = 0;
        let lifetimeTotalRevenue = 0;

        partnersSnap.docs.forEach(d => {
          const pData = d.data();
          const role = String(pData.role || '').toLowerCase().includes('agent') ? 'agent' : 'cpa';
          const partner = {
            id: d.id,
            role,
            referralCode: pData.referralCode ? String(pData.referralCode).toLowerCase().trim() : null,
            referredBy: pData.referredBy,
            commissionRate: (pData.commissionRate || 10) / 100,
            commissionPercentage: pData.commissionPercentage || 15,
            maintenanceCostPerUser: pData.maintenanceCostPerUser || 6.00,
            totalEarnings: Number(pData.stats?.totalEarnings || 0),
            totalRevenue: Number(pData.stats?.totalRevenue || 0)
          };
          
          partnerById[d.id] = partner;
          if (partner.referralCode) partnerByCode[partner.referralCode] = partner;
          
          if (role === 'cpa') {
            lifetimeCpaEarnings += partner.totalEarnings;
            lifetimeTotalRevenue += partner.totalRevenue;
          } else {
            lifetimeAgentEarnings += partner.totalEarnings;
          }
        });

        // 3. Process Subscriptions for Graph & Active Counts
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyData = months.map(m => ({ name: m, revenue: 0, agentCommission: 0, cpaCommission: 0 }));
        
        let activeUsersCount = 0;
        const agentCalcBuckets = {};

        allSubsSnap.docs.forEach(subDoc => {
          const subData = subDoc.data();
          const price = getPlanPrice(subData.planname);
          if (price === 0) return;
          
          // Determine Month
          const purchaseDate = subData.purchase_date?.toDate?.() || subData.created_Time?.toDate?.();
          const monthIdx = purchaseDate ? purchaseDate.getMonth() : null;

          // Check Status
          const expirationDate = subData.expiration_date?.toDate?.();
          const isActive = subData.status === 'active' && expirationDate && expirationDate > now;
          if (isActive) activeUsersCount++;

          if (monthIdx !== null) monthlyData[monthIdx].revenue += price;

          // Identify Partners
          const userId = subDoc.ref.path.split('/')[1];
          const refCode = userRefCodes[userId] || (subData.ref_code ? String(subData.ref_code).toLowerCase().trim() : null);
          const cpa = refCode ? partnerByCode[refCode] : null;

          if (cpa) {
            const currentCpaComm = price * cpa.commissionRate;
            if (monthIdx !== null) monthlyData[monthIdx].cpaCommission += currentCpaComm;

            // Agent Logic
            if (cpa.referredBy) {
              const agent = partnerById[cpa.referredBy];
              if (agent && agent.role === 'agent') {
                if (!agentCalcBuckets[agent.id]) {
                  agentCalcBuckets[agent.id] = { rev: 0, cpaComm: 0, active: 0, agentRate: agent.commissionPercentage/100, maint: agent.maintenanceCostPerUser, mIdx: monthIdx };
                }
                agentCalcBuckets[agent.id].rev += price;
                agentCalcBuckets[agent.id].cpaComm += currentCpaComm;
                if (isActive) agentCalcBuckets[agent.id].active++;
              }
            }
          }
        });

        // Calculate Agent Graph Data
        Object.values(agentCalcBuckets).forEach(b => {
          const netProfit = (b.rev - b.cpaComm) - (b.active * b.maint);
          const comm = Math.max(0, netProfit * b.agentRate);
          if (b.mIdx !== null) monthlyData[b.mIdx].agentCommission += comm;
        });

        setData({ 
          totalRev: lifetimeTotalRevenue, 
          totalComm: lifetimeAgentEarnings + lifetimeCpaEarnings, 
          activeUsers: activeUsersCount, 
          chartData: monthlyData, 
          agentComm: lifetimeAgentEarnings, 
          cpaComm: lifetimeCpaEarnings 
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
      
      <div>
         <h1 className="text-2xl font-semibold leading-9 text-[#111111]">Dashboard</h1>
         <p className="text-base text-[#9499A1]">Lifetime performance and revenue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Revenue" value={formatCurrency(data.totalRev)} description="Lifetime gross revenue" icon={DollarSign} />
        <StatCard title="Total Commissions" value={formatCurrency(data.totalComm)} description={`Agents: ${formatCurrency(data.agentComm)} + CPAs: ${formatCurrency(data.cpaComm)}`} icon={Percent} />
        <StatCard title="Active Subscriptions" value={data.activeUsers.toLocaleString()} description="Currently active users" icon={Users} />
      </div>

      <div className="bg-white border border-[#E3E6EA] rounded-[20px] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#111111] mb-6">Revenue & Commission Overview</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#E3E6EA" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9499A1', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9499A1', fontSize: 12}} tickFormatter={(val) => `$${val}`} width={60}/>
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E3E6EA', strokeWidth: 1 }} />
              <Line type="monotone" dataKey="revenue" name="Total Revenue" stroke="#0F1728" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: "#0F1728" }} />
              <Line type="monotone" dataKey="cpaCommission" name="CPA Commission" stroke="#00D1A0" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: "#00D1A0" }} />
              <Line type="monotone" dataKey="agentCommission" name="Agent Commission" stroke="#4D7CFE" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: "#4D7CFE" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}