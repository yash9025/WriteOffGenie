import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { TrendingUp, Loader2, Award, Target, Calendar, DollarSign, ChevronDown, Medal } from "lucide-react";

// --- HELPERS ---
const getDateRange = (range) => {
  const now = new Date();
  const start = new Date();
  if (range === 'day') start.setHours(0,0,0,0);
  if (range === '7d') start.setDate(now.getDate() - 7);
  if (range === '30d') start.setDate(now.getDate() - 30);
  if (range === 'month') start.setDate(1); // Start of this month
  if (range === 'year') start.setFullYear(now.getFullYear() - 1);
  return start;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-900 text-white border border-slate-800 rounded-xl shadow-xl p-3 text-xs">
      <p className="font-bold text-slate-400 mb-1">{label}</p>
      <p className="text-base font-black text-white">₹{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

export default function Performance() {
  const { user } = useAuth();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('year'); // day, 7d, 30d, month, year

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "Clients"), where("referredBy", "==", user.uid));
        const snap = await getDocs(q);
        
        // Store raw transactions with valid dates
        const transactions = snap.docs.map(d => {
            const data = d.data();
            return {
                amount: (data.subscription?.amountPaid || 0) * 0.10, // 10% Commission
                date: data.createdAt?.toDate() || new Date()
            };
        });
        setRawData(transactions);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  // --- 1. FILTER & GROUP DATA ---
  const chartData = useMemo(() => {
    const startDate = getDateRange(timeRange);
    const filtered = rawData.filter(t => t.date >= startDate);
    
    // Dynamic Grouping
    const grouped = {};
    filtered.forEach(t => {
        let key;
        if (timeRange === 'day') {
            key = t.date.toLocaleTimeString([], { hour: '2-digit', hour12: true }); // "2 PM"
        } else if (timeRange === '7d' || timeRange === '30d' || timeRange === 'month') {
            key = t.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }); // "24 Jan"
        } else {
            key = t.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); // "Jan 24"
        }
        
        grouped[key] = (grouped[key] || 0) + t.amount;
    });

    // Convert to Array & Sort chronologically if needed (Keys are usually sorted by insertion in JS object for simple strings, but explicit sort is safer)
    return Object.entries(grouped).map(([name, amount]) => ({ name, amount }));
  }, [rawData, timeRange]);

  // --- 2. CALCULATE STATS ---
  const stats = useMemo(() => {
    const total = rawData.reduce((sum, t) => sum + t.amount, 0);
    const bestMonthVal = Math.max(...chartData.map(d => d.amount), 0);
    const avg = chartData.length ? total / chartData.length : 0;
    
    // Growth Logic (Last period vs Previous)
    let growth = 0;
    if (chartData.length >= 2) {
        const curr = chartData[chartData.length - 1].amount;
        const prev = chartData[chartData.length - 2].amount;
        growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    }

    return { total, best: bestMonthVal, avg, growth };
  }, [rawData, chartData]);

  // --- 3. TOP MONTHS LOGIC (Always calculate from ALL data for global ranking) ---
  const topMonths = useMemo(() => {
    const groupedAll = {};
    rawData.forEach(t => {
        const key = t.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        groupedAll[key] = (groupedAll[key] || 0) + t.amount;
    });
    return Object.entries(groupedAll)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
  }, [rawData]);


  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="text-sm font-medium text-slate-500">Crunching numbers...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1 w-8 bg-indigo-600 rounded-full" />
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Analytics</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Performance Overview</h1>
          <p className="text-slate-600">Track your referral revenue and growth metrics</p>
        </div>

        <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex overflow-x-auto">
          {['day', '7d', '30d', 'month', 'year'].map((key) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                timeRange === key 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {key === 'day' ? 'Today' : key === 'year' ? 'Year' : key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform"><DollarSign size={24} /></div>
            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold uppercase">All Time</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">₹{stats.total.toLocaleString()}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Total Revenue</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"><Award size={24} /></div>
            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Peak</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600">₹{stats.best.toLocaleString()}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Best Period</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-xl group-hover:scale-110 transition-transform"><Calendar size={24} /></div>
            <span className="bg-violet-50 text-violet-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Avg</span>
          </div>
          <p className="text-3xl font-bold text-violet-600">₹{Math.round(stats.avg).toLocaleString()}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Daily Average</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform"><TrendingUp size={24} /></div>
            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${stats.growth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.growth >= 0 ? 'Growing' : 'Downtrend'}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Vs Previous</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="text-indigo-600" size={20} /> Revenue Trend
              </h3>
              <p className="text-sm text-slate-500 mt-1">Earnings over the selected period</p>
            </div>
          </div>
          
          <div className="h-80 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} 
                    tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    activeDot={{r: 6, strokeWidth: 0, fill: '#312e81'}}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                <p>No data for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Top Months (Leaderboard Style) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-0 overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Medal className="text-amber-500" size={20} /> Monthly Hall of Fame
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {topMonths.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No records yet</div>
            ) : (
              topMonths.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-default">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-xs font-bold shadow-sm transition-transform group-hover:scale-105 ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' : 
                      idx === 1 ? 'bg-slate-200 text-slate-700' : 
                      idx === 2 ? 'bg-orange-100 text-orange-700' : 
                      'bg-slate-50 text-slate-500'
                    }`}>
                      <span className="text-[10px] opacity-60 uppercase">Rank</span>
                      <span className="text-base leading-none">#{idx + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.name}</p>
                      <div className="h-1.5 w-16 bg-slate-100 rounded-full mt-1 overflow-hidden">
                         <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(item.amount / topMonths[0].amount) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">₹{item.amount.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
             <p className="text-xs text-slate-400 font-medium">Rankings based on all-time data</p>
          </div>
        </div>

      </div>
    </div>
  );
}