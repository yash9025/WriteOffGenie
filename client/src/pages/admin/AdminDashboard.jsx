import React, { useEffect, useState} from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Loader2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";


// 1. ICONS (Admin Specific)

const RevenueIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#011C39" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
    <path d="M12 16.5V7.5" />
    <path d="M9 9.5L12 7.5L15 9.5" />
    <path d="M9 12H15" />
  </svg>
);

const CommissionIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#011C39" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
    <path d="M8.5 10C9.32843 10 10 9.32843 10 8.5C10 7.67157 9.32843 7 8.5 7C7.67157 7 7 7.67157 7 8.5C7 9.32843 7.67157 10 8.5 10Z" />
    <path d="M15.5 17C16.3284 17 17 16.3284 17 15.5C17 14.6716 16.3284 14 15.5 14C14.6716 14 14 14.6716 14 15.5C14 16.3284 14.6716 17 15.5 17Z" />
    <path d="M16 8L8 16" />
  </svg>
);

const WithdrawalIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#011C39" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.04 13.55C17.62 13.96 17.38 14.55 17.44 15.18C17.53 16.26 18.52 17.05 19.6 17.05H21.5V18.24C21.5 20.31 19.81 22 17.74 22H6.26C4.19 22 2.5 20.31 2.5 18.24V11.51C2.5 9.44 4.19 7.75 6.26 7.75H17.74C19.81 7.75 21.5 9.44 21.5 11.51V12.95H19.48C18.92 12.95 18.41 13.17 18.04 13.55Z" />
    <path d="M2.5 12.41V7.84C2.5 6.65 3.23 5.59 4.34 5.17L12.28 2.17C13.52 1.7 14.85 2.62 14.85 3.95V7.75" />
    <path d="M22.56 13.97V16.03C22.56 16.58 22.12 17.03 21.56 17.05H19.6C18.52 17.05 17.53 16.26 17.44 15.18C17.38 14.55 17.62 13.96 18.04 13.55C18.41 13.17 18.92 12.95 19.48 12.95H21.56C22.12 12.97 22.56 13.42 22.56 13.97Z" />
    <path d="M7 12H14" />
  </svg>
);

const SubscriptionIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#011C39" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.7 18.98H7.30002C6.88002 18.98 6.41002 18.65 6.27002 18.25L2.13002 6.66999C1.54002 5.00999 2.23002 4.49999 3.65002 5.51999L7.55002 8.30999C8.20002 8.75999 8.94002 8.52999 9.22002 7.79999L10.98 3.10999C11.54 1.60999 12.47 1.60999 13.03 3.10999L14.79 7.79999C15.07 8.52999 15.81 8.75999 16.45 8.30999L20.11 5.69999C21.67 4.57999 22.42 5.14999 21.78 6.95999L17.74 18.27C17.59 18.65 17.12 18.98 16.7 18.98Z" />
    <path d="M6.5 22H17.5" />
    <path d="M9.5 14H14.5" />
  </svg>
);


// 2. HELPER COMPONENTS

const StatCard = ({ title, value, subtext, Icon }) => (
  <div className="bg-white border border-[#E3E6EA] rounded-[20px] px-6 py-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <p className="text-[#9499A1] text-base font-normal">{title}</p>
      <div className="rounded-full p-2.5 flex items-center justify-center bg-[#4D7CFE1A]">
        <Icon />
      </div>
    </div>
    <div className="flex flex-col gap-1 mt-2">
      <h3 className="text-[#111111] text-[32px] font-semibold leading-[1.2]">{value}</h3>
      <p className="text-[#9499A1] text-[11px] font-normal">{subtext}</p>
    </div>
  </div>
);

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
        const [clientsSnap, payoutsSnap] = await Promise.all([
          getDocs(collection(db, "Clients")),
          getDocs(collection(db, "Payouts")),
        ]);

        const clients = clientsSnap.docs.map(d => ({ ...d.data(), createdAt: d.data().createdAt?.toDate() }));
        const payouts = payoutsSnap.docs.map(d => d.data());

        // KPIs
        const totalRev = clients.reduce((acc, c) => acc + (c.subscription?.amountPaid || 0), 0);
        const totalComm = totalRev * 0.10;
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
          monthlyData[monthIndex].commission += (amt * 0.1);
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
            title="Revenue from CPA" 
            value={formatCurrency(data.totalRev)} 
            subtext="Total revenue generated from subscriptions"
            Icon={RevenueIcon}
        />
        <StatCard 
            title="Total CPA Commission" 
            value={formatCurrency(data.totalComm)} 
            subtext="Commission payable to all CPAs"
            Icon={CommissionIcon}
        />
        <StatCard 
            title="Pending Withdrawals" 
            value={formatCurrency(data.totalPending)} 
            subtext="Withdrawal requests awaiting approval"
            Icon={WithdrawalIcon}
        />
        <StatCard 
            title="Active Subscriptions" 
            value={data.activeUsers.toLocaleString()} 
            subtext="Subscriptions currently active via CPA"
            Icon={SubscriptionIcon}
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