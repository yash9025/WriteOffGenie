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
    chartData: []
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
        
        // Build a map of partner commissionRate by id
        const partnerRates = {};
        partnersSnap.docs.forEach(d => {
          partnerRates[d.id] = (d.data().commissionRate || 10) / 100;
        });

        // KPIs
        const totalRev = clients.reduce((acc, c) => acc + (c.subscription?.amountPaid || 0), 0);
        
        // Calculate total commission using each partner's specific rate
        const totalComm = clients.reduce((acc, c) => {
          if (c.subscription?.amountPaid && c.referredBy && partnerRates[c.referredBy]) {
            return acc + (c.subscription.amountPaid * partnerRates[c.referredBy]);
          } else if (c.subscription?.amountPaid && c.referredBy) {
            return acc + (c.subscription.amountPaid * 0.10); // Default 10%
          }
          return acc;
        }, 0);
        
        const totalPending = payouts.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0);
        const activeUsers = clients.filter(c => c.subscription?.status === 'active').length;

        // Chart Data (Monthly)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyData = months.map(m => ({ name: m, revenue: 0, commission: 0 }));

        clients.forEach(client => {
          if (!client.createdAt) return;
          const monthIndex = client.createdAt.getMonth();
          const amt = client.subscription?.amountPaid || 0;
          monthlyData[monthIndex].revenue += amt;
          
          // Use partner-specific commission rate for chart
          const partnerRate = client.referredBy && partnerRates[client.referredBy] 
            ? partnerRates[client.referredBy] 
            : 0.10;
          monthlyData[monthIndex].commission += (amt * partnerRate);
        });

        setData({ totalRev, totalComm, totalPending, activeUsers, chartData: monthlyData });

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
        <h2 className="text-xl font-semibold text-[#111111] mb-6">Commission Overview</h2>
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
                name="Platform Revenue"
                stroke="#0F1728" 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#0F1728" }}
              />
              <Line 
                type="monotone" 
                dataKey="commission" 
                name="CPA Commission"
                stroke="#00D1A0" 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#00D1A0" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}