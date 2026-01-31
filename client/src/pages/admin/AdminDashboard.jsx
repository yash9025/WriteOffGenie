import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { 
  DollarSign, Users, Briefcase, TrendingUp, TrendingDown,
  ArrowUpRight, Activity, Loader2, ArrowRight, UserCheck, RefreshCw, BarChart3 
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";

// --- UTILS ---
const formatDate = (date, period) => {
  if (!date) return "";
  const d = new Date(date);
  if (period === '1y' || period === 'all') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const getDateKey = (date, period) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (period === '1y' || period === 'all') return `${year}-${month}`;
  return `${year}-${month}-${day}`;
};

// 🔥 NEW: Trend Calculation Logic
const calculateTrend = (data, dateField, period, valueField = null) => {
  const now = new Date();
  let days = 30; // Default
  if (period === '7d') days = 7;
  if (period === '1y') days = 365;
  if (period === 'all') return 0; // No trend for all-time

  const currentStart = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  const previousStart = new Date(now.getTime() - (days * 2 * 24 * 60 * 60 * 1000));

  let currentTotal = 0;
  let previousTotal = 0;

  data.forEach(item => {
    const date = item[dateField];
    if (!date) return;

    const value = valueField ? (item[valueField] || 0) : 1; // Sum value or count count

    if (date >= currentStart) {
        currentTotal += value;
    } else if (date >= previousStart && date < currentStart) {
        previousTotal += value;
    }
  });

  if (previousTotal === 0) return currentTotal > 0 ? 100 : 0; // Avoid divide by zero
  return ((currentTotal - previousTotal) / previousTotal) * 100;
};

// --- COMPONENTS ---

const FilterTab = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 border cursor-pointer ${
      active 
      ? "bg-slate-900 text-white border-slate-900 shadow-md transform scale-105" 
      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
    }`}
  >
    {label}
  </button>
);

const StatCard = ({ title, value, subtext, icon: Icon, color, trend }) => {
  const isPositive = trend >= 0;
  
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group cursor-default">
      <div className={`absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity transform translate-x-2 -translate-y-2`}>
        <Icon size={64} className={`text-${color}-600`} />
      </div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 rounded-xl ${
          color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
          color === 'blue' ? 'bg-blue-50 text-blue-600' :
          color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
        }`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
             isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
             {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10}/>} 
             {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">{value}</h3>
        {subtext && <p className="text-xs font-medium text-slate-400 mt-1">{subtext}</p>}
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label, metric }) => {
  if (active && payload && payload.length) {
    const isCurrency = metric === 'revenue';
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs z-50">
        <p className="font-bold text-slate-400 mb-1">{label}</p>
        <p className="text-lg font-black text-emerald-400">
            {isCurrency ? '₹' : ''}{payload[0].value.toLocaleString()} {isCurrency ? '' : 'Users'}
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [rawData, setRawData] = useState({ clients: [], payouts: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [period, setPeriod] = useState('30d'); 
  const [chartMetric, setChartMetric] = useState('revenue'); 

  // 🔥 Derived State for Trends
  const [trends, setTrends] = useState({ revenue: 0, commissions: 0, users: 0 });

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [clientsSnap, payoutsSnap, partnersSnap] = await Promise.all([
        getDocs(collection(db, "Clients")),
        getDocs(collection(db, "Payouts")),
        getDocs(collection(db, "Partners"))
      ]);

      const clients = clientsSnap.docs.map(d => ({
          ...d.data(), 
          // Ensure valid date objects
          createdAt: d.data().createdAt?.toDate() || new Date()
      }));
      
      const payouts = payoutsSnap.docs.map(d => ({
          ...d.data(), 
          requestedAt: d.data().requestedAt?.toDate() || new Date()
      }));
      
      // Calculate Stats
      const totalRev = clients.reduce((acc, c) => acc + (c.subscription?.amountPaid || 0), 0);
      const totalComm = totalRev * 0.10;
      const totalPending = payouts.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0);
      const activeUsers = clients.filter(c => c.subscription?.status === 'active').length;

      setRawData({ 
          clients, payouts, partnersCount: partnersSnap.size, 
          totalRev, totalComm, totalPending, 
          totalUsers: clients.length, activeUsers 
      });

    } catch (e) { console.error(e); } 
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // 🔥 Update Trends when Period Changes
  useEffect(() => {
    if(loading) return;
    setTrends({
        revenue: calculateTrend(rawData.clients, 'createdAt', period, 'subscription.amountPaid'), // Note: this uses creation date for revenue trend approximation
        users: calculateTrend(rawData.clients, 'createdAt', period),
        commissions: calculateTrend(rawData.clients, 'createdAt', period, 'subscription.amountPaid') // Assuming comm is proportional to rev
    });
  }, [period, rawData, loading]);


  const chartData = useMemo(() => {
    if (loading) return [];
    
    const now = new Date();
    now.setHours(23, 59, 59, 999); 
    let startDate = new Date(0);
    
    if (period === '7d') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    else if (period === '30d') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    else if (period === '1y') startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const grouped = {};
    rawData.clients.forEach(client => {
      if (!client.createdAt || client.createdAt < startDate) return;
      const key = getDateKey(client.createdAt, period);
      const label = formatDate(client.createdAt, period);
      
      if (!grouped[key]) grouped[key] = { name: label, value: 0, sortDate: new Date(key) };
      if (chartMetric === 'revenue') grouped[key].value += (client.subscription?.amountPaid || 0);
      else grouped[key].value += 1;
    });

    return Object.values(grouped).sort((a, b) => a.sortDate - b.sortDate);
  }, [rawData, period, chartMetric, loading]);

  const recentActivity = useMemo(() => {
     if(loading) return [];
     const combined = [
        ...rawData.clients.map(c => ({ type: 'in', msg: `New User: ${c.name}`, time: c.createdAt, amount: c.subscription?.amountPaid || 0 })),
        ...rawData.payouts.map(p => ({ type: 'out', msg: `Payout: ${p.partnerName}`, time: p.requestedAt, amount: p.amount }))
     ];
     return combined.sort((a,b) => b.time - a.time).slice(0, 6);
  }, [rawData, loading]);

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-slate-900 pb-10">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 border-b border-slate-200/60 pb-6">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial Overview</h1>
           <div className="flex items-center gap-2 mt-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-sm font-medium text-slate-500">System Live • {new Date().toLocaleDateString()}</p>
           </div>
        </div>
        <button 
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Syncing..." : "Refresh Data"}
        </button>
      </div>

      {/* --- KPI CARDS (Merged & Calculated) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total Revenue" 
            value={`₹${rawData.totalRev.toLocaleString()}`} 
            icon={DollarSign} 
            color="emerald" 
            trend={trends.revenue} 
        />
        
        {/* 🚀 MERGED SUBSCRIBER CARD */}
        <StatCard 
            title="Active Subscribers" 
            value={rawData.activeUsers} 
            icon={UserCheck} 
            color="indigo" 
            trend={trends.users}
            subtext={`${rawData.totalUsers} Total Signups (Conversion: ${rawData.totalUsers ? ((rawData.activeUsers/rawData.totalUsers)*100).toFixed(1) : 0}%)`} 
        />
        
        <StatCard 
            title="Commissions Due" 
            value={`₹${rawData.totalPending.toLocaleString()}`} 
            icon={Briefcase} 
            color="amber" 
            // No trend for pending usually
        />
        
        <StatCard 
            title="Total Commissions" 
            value={`₹${rawData.totalComm.toLocaleString()}`} 
            icon={TrendingUp} 
            color="blue" 
            trend={trends.commissions} 
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* --- MAIN CHART --- */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-8 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
            
            {/* Metric Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button 
                    onClick={() => setChartMetric('revenue')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${chartMetric === 'revenue' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <DollarSign size={14}/> Revenue
                </button>
                <button 
                    onClick={() => setChartMetric('users')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${chartMetric === 'users' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <BarChart3 size={14}/> New Users
                </button>
            </div>
            
            {/* Time Filter */}
            <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
               <FilterTab label="7D" active={period === '7d'} onClick={() => setPeriod('7d')} />
               <FilterTab label="30D" active={period === '30d'} onClick={() => setPeriod('30d')} />
               <FilterTab label="1Y" active={period === '1y'} onClick={() => setPeriod('1y')} />
               <FilterTab label="ALL" active={period === 'all'} onClick={() => setPeriod('all')} />
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartMetric === 'revenue' ? "#10b981" : "#3b82f6"} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={chartMetric === 'revenue' ? "#10b981" : "#3b82f6"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} 
                  tickFormatter={(val) => chartMetric === 'revenue' ? `₹${val/1000}k` : val}
                />
                <Tooltip content={<CustomTooltip metric={chartMetric} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={chartMetric === 'revenue' ? "#10b981" : "#3b82f6"} 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#chartGradient)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: chartMetric === 'revenue' ? "#059669" : "#2563eb" }}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- ACTIVITY FEED --- */}
        <div className="bg-white border border-slate-200 p-0 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <h3 className="font-bold text-slate-900 text-lg">Live Ledger</h3>
             <Link to="/admin/users" className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">View All</Link>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {recentActivity.map((item, idx) => (
              <div key={idx} className="flex gap-4 items-center p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                   item.type === 'in' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'
                }`}>
                   {item.type === 'in' ? <ArrowUpRight size={18} /> : <ArrowRight size={18} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700 leading-tight">{item.msg}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                    {item.time?.toLocaleDateString()} • {item.time?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                <div className={`text-xs font-black ${item.type === 'in' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {item.type === 'in' ? '+' : '-'}₹{Math.abs(item.amount).toLocaleString()}
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
                <div className="p-12 flex flex-col items-center text-center">
                    <Activity size={24} className="text-slate-300 mb-2"/>
                    <p className="text-slate-400 text-xs font-medium">No recent activity found.</p>
                </div>
            )}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100">
             <Link to="/admin/withdrawals" className="w-full py-3 bg-white border border-slate-200 hover:border-blue-400 text-slate-600 hover:text-blue-600 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer">
                Manage Treasury <ArrowRight size={14}/>
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}