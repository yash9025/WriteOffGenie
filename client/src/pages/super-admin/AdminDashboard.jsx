import React, { useEffect, useState} from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Loader2, DollarSign, Percent, Wallet, Users } from "../../components/Icons";
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

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalRev: 0,
    totalComm: 0,
    totalPending: 0,
    activeUsers: 0,
    chartData: [],
    agentComm: 0,
    cpaComm: 0
  });

  const formatCurrency = (value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsSnap, payoutsSnap, partnersSnap] = await Promise.all([
          getDocs(collection(db, "Clients")),
          getDocs(collection(db, "Payouts")),
          getDocs(collection(db, "Partners")),
        ]);

        const clients = clientsSnap.docs.map(d => ({ ...d.data(), createdAt: d.data().createdAt?.toDate() }));
        const payouts = payoutsSnap.docs.map(d => d.data());
        
        console.log(`📊 Loaded ${clients.length} clients, ${partnersSnap.docs.length} partners`);
        console.log('Clients with subscriptions:', clients.filter(c => c.subscription?.amountPaid).length);
        
        // Build a map of partner commissionRate and role by id
        const partnerInfo = {};
        partnersSnap.docs.forEach(d => {
          const data = d.data();
          // Handle different possible role field names and values
          let role = 'cpa'; // default
          
          // Check all possible role fields
          const roleValue = data.role || data.userType || data.partnerRole || data.type || '';
          const roleStr = String(roleValue).toLowerCase().trim();
          
          // Check if it contains 'agent' anywhere
          if (roleStr.includes('agent')) {
            role = 'agent';
          } else if (roleStr.includes('cpa') || roleStr.includes('ca')) {
            role = 'cpa';
          }
          
          partnerInfo[d.id] = {
            rate: (data.commissionRate || 10) / 100,
            role: role,
            name: data.name || data.displayName || 'Unknown',
            rawRole: roleValue, // Keep original for debugging
            totalEarnings: data.stats?.totalEarnings || 0, // Use actual earnings from Partner stats
            totalRevenue: data.stats?.totalRevenue || 0
          };
        });

        console.log('✅ Partner Info Map:', partnerInfo); // Debug log

        // KPIs
        const totalRev = clients.reduce((acc, c) => acc + (c.subscription?.amountPaid || 0), 0);
        
        // Calculate total commission from Partner stats (more accurate)
        let agentComm = 0;
        let cpaComm = 0;
        
        Object.values(partnerInfo).forEach(partner => {
          if (partner.role === 'agent') {
            agentComm += partner.totalEarnings;
            console.log(`✅ Agent ${partner.name}: $${partner.totalEarnings}`);
          } else {
            cpaComm += partner.totalEarnings;
            console.log(`✅ CPA ${partner.name}: $${partner.totalEarnings}`);
          }
        });
        
        const totalComm = agentComm + cpaComm;
        
        const totalPending = payouts.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0);
        const activeUsers = clients.filter(c => c.subscription?.status === 'active').length;

        console.log('📊 FINAL TOTALS:');
        console.log('  Agent Commission:', agentComm);
        console.log('  CPA Commission:', cpaComm);
        console.log('  Total Commission:', totalComm);

        // Chart Data (Monthly) - Use client subscription dates for revenue, partner data for commissions
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyData = months.map(m => ({ name: m, revenue: 0, commission: 0, agentCommission: 0, cpaCommission: 0 }));

        // Add revenue from clients
        clients.forEach(client => {
          if (!client.createdAt) return;
          const monthIndex = client.createdAt.getMonth();
          const amt = client.subscription?.amountPaid || 0;
          monthlyData[monthIndex].revenue += amt;
        });

        // Add commission from partners based on their totalRevenue
        partnersSnap.docs.forEach(d => {
          const data = d.data();
          const createdAt = data.createdAt?.toDate?.();
          if (!createdAt) return;
          
          const monthIndex = createdAt.getMonth();
          const earnings = data.stats?.totalEarnings || 0;
          
          const roleValue = data.role || data.userType || '';
          const role = String(roleValue).toLowerCase().includes('agent') ? 'agent' : 'cpa';
          
          monthlyData[monthIndex].commission += earnings;
          
          if (role === 'agent') {
            monthlyData[monthIndex].agentCommission += earnings;
            console.log(`📅 ${months[monthIndex]}: Agent commission +$${earnings.toFixed(2)}`);
          } else {
            monthlyData[monthIndex].cpaCommission += earnings;
            console.log(`📅 ${months[monthIndex]}: CPA commission +$${earnings.toFixed(2)}`);
          }
        });

        console.log('📈 Monthly Chart Data:', monthlyData);

        setData({ totalRev, totalComm, totalPending, activeUsers, chartData: monthlyData, agentComm, cpaComm });

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
         <p className="text-base text-[#9499A1]">Overview of platform performance, revenue, and payouts</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
            title="Total Revenue Generated" 
            value={formatCurrency(data.totalRev)} 
            description="Total revenue generated from subscriptions"
            icon={DollarSign}
        />
        <StatCard 
            title="Total Commission" 
            value={formatCurrency(data.totalComm)} 
            description="Commission payable to all partners"
            icon={Percent}
        />
        <StatCard 
            title="Pending Withdrawals" 
            value={formatCurrency(data.totalPending)} 
            description="Withdrawal requests awaiting approval"
            icon={Wallet}
        />
        <StatCard 
            title="Active Subscriptions" 
            value={data.activeUsers.toLocaleString()} 
            description="Subscriptions currently active via CPA"
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