import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Loader2, RevenueIcon, Percent, Users } from "../../components/Icons";
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
    // 1. Listen to Transactions (The Source of Truth)
    const qTxns = query(collection(db, "Transactions"), where("type", "==", "commission"), where("status", "==", "completed"));
    
    // 2. Listen to Users (For Active Count)
    const qUsers = query(collection(db, "user"));

    // Combine listeners
    const unsubTxns = onSnapshot(qTxns, (txnsSnap) => {
        // We nest the user listener inside or parallel, but for simple stats, let's process transactions first
        processDashboard(txnsSnap);
    }, (error) => {
        console.error("Dashboard Error:", error);
        setLoading(false);
    });

    // Helper to process data whenever snapshot updates
    const processDashboard = async (txnsSnap) => {
        try {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthlyData = months.map(m => ({ name: m, revenue: 0, agentCommission: 0, cpaCommission: 0 }));
            
            let totalRev = 0;
            let totalCpaComm = 0;
            let totalAgentComm = 0;
            
            // Set to track unique users who have PAID
            const paidUserIds = new Set();

            txnsSnap.docs.forEach(doc => {
                const txn = doc.data();
                const amountPaid = Number(txn.amountPaid || 0);
                
                totalRev += amountPaid;
                totalCpaComm += Number(txn.cpaEarnings || 0);
                totalAgentComm += Number(txn.agentEarnings || 0);
                
                // If they have a transaction, they are/were active
                if (txn.userId) paidUserIds.add(txn.userId);

                const date = txn.createdAt?.toDate();
                if (date) {
                    const monthIdx = date.getMonth();
                    monthlyData[monthIdx].revenue += amountPaid;
                    monthlyData[monthIdx].cpaCommission += Number(txn.cpaEarnings || 0);
                    monthlyData[monthIdx].agentCommission += Number(txn.agentEarnings || 0);
                }
            });

            setData({ 
                totalRev, 
                totalComm: totalCpaComm + totalAgentComm, 
                activeUsers: paidUserIds.size, // Count unique users from ledger
                chartData: monthlyData, 
                agentComm: totalAgentComm, 
                cpaComm: totalCpaComm 
            });
            setLoading(false);

        } catch (e) {
            console.error("Processing Error:", e);
        }
    };

    return () => unsubTxns();
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
        <StatCard title="Total Revenue" value={formatCurrency(data.totalRev)} description="Verified gross revenue" icon={RevenueIcon} />
        <StatCard title="Total Commissions" value={formatCurrency(data.totalComm)} description={`Agents: ${formatCurrency(data.agentComm)} + CPAs: ${formatCurrency(data.cpaComm)}`} icon={Percent} />
        <StatCard title="Active Subscriptions" value={data.activeUsers.toLocaleString()} description="Unique paying users" icon={Users} />
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