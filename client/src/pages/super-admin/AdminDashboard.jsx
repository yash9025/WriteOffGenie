import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
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
      // 1. Just fetch the two main collections
      const [txnsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "Transactions")),
        getDocs(collection(db, "user"))
      ]);
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyData = months.map(m => ({ name: m, revenue: 0, agentCommission: 0, cpaCommission: 0 }));
      
      let totalRev = 0;
      let totalCpaComm = 0;
      let totalAgentComm = 0;
      const processedSubs = new Set();

      // 2. Process Transactions (Money)
      txnsSnap.docs.forEach(doc => {
        const txn = doc.data();
        if (txn.type !== "commission" || txn.status !== "completed") return;
        if (processedSubs.has(txn.subId)) return;
        processedSubs.add(txn.subId);

        const amountPaid = Number(txn.amountPaid || 0);
        totalRev += amountPaid;
        totalCpaComm += Number(txn.cpaEarnings || 0);
        totalAgentComm += Number(txn.agentEarnings || 0);

        const date = txn.createdAt?.toDate();
        if (date) {
          const monthIdx = date.getMonth();
          monthlyData[monthIdx].revenue += amountPaid;
          monthlyData[monthIdx].cpaCommission += Number(txn.cpaEarnings || 0);
          monthlyData[monthIdx].agentCommission += Number(txn.agentEarnings || 0);
        }
      });

      // 3. SIMPLE COUNT: Just check the user documents
      let activeCount = 0;
      usersSnap.docs.forEach(uDoc => {
        const userData = uDoc.data();
        // Check whichever field your app updates when a user pays
        if (userData.subscription_status === 'active') {
          activeCount++;
        }
      });

      setData({ 
        totalRev, 
        totalComm: totalCpaComm + totalAgentComm, 
        activeUsers: activeCount, 
        chartData: monthlyData, 
        agentComm: totalAgentComm, 
        cpaComm: totalCpaComm 
      });

    } catch (e) {
      console.error(e);
      toast.error("Failed to load dashboard");
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
         <p className="text-base text-[#9499A1]">Verified financial performance from ledger</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Revenue" value={formatCurrency(data.totalRev)} description="Verified gross revenue" icon={DollarSign} />
        <StatCard title="Total Commissions" value={formatCurrency(data.totalComm)} description={`Agents: ${formatCurrency(data.agentComm)} + CPAs: ${formatCurrency(data.cpaComm)}`} icon={Percent} />
        <StatCard title="Active Subscriptions" value={data.activeUsers.toLocaleString()} description="Currently active users" icon={Users} />
      </div>

      <div className="bg-white border border-[#E3E6EA] rounded-[20px] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#111111] mb-6">Revenue & Commission Trends</h2>
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