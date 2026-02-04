import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Search, Loader2, Download, DollarSign, PieChart, Wallet } from "lucide-react";

// --- STAT CARD COMPONENT ---
const StatCard = ({ title, value, subtitle, IconComponent, iconBgColor }) => (
  <div className="bg-white border border-[#E3E6EA] rounded-[20px] px-6 py-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <p className="text-[#9499A1] text-base font-normal">{title}</p>
      <div className={`rounded-full p-2.5 flex items-center justify-center ${iconBgColor}`}>
        <IconComponent size={20} className="text-slate-700" />
      </div>
    </div>
    <div className="flex flex-col gap-1 mt-2">
      <h3 className="text-[#111111] text-[28px] font-semibold leading-tight">{value}</h3>
      <p className="text-[#9499A1] text-[11px] font-normal">{subtitle}</p>
    </div>
  </div>
);

export default function EarningsTracking() {
  const [users, setUsers] = useState([]);
  const [partners, setPartners] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uSnap, pSnap] = await Promise.all([
          getDocs(collection(db, "Clients")),
          getDocs(query(collection(db, "Partners"), where("role", "==", "ca")))
        ]);

        const pMap = {};
        pSnap.forEach(d => {
          const data = d.data();
          pMap[d.id] = { name: data.name || "Unknown", code: data.referralCode };
        });
        setPartners(pMap);
        setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter & Sort Data
  const filteredData = useMemo(() => {
    const filtered = users.filter(u =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const isACredited = a.subscription?.status === 'active';
      const isBCredited = b.subscription?.status === 'active';
      
      // Sort: Pending first, then Credited
      if (isACredited !== isBCredited) return isACredited ? 1 : -1;
      
      // Sort: Date Descending
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });
  }, [users, searchQuery]);

  // Calculate Totals
  const stats = useMemo(() => {
    const totalRevenue = users.reduce((acc, u) => acc + (u.subscription?.amountPaid || 0), 0);
    const totalCommission = totalRevenue * 0.10;
    const netRevenue = totalRevenue - totalCommission;
    return { totalRevenue, totalCommission, netRevenue };
  }, [users]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const downloadCSV = () => {
    const headers = ['Date', 'CPA Name', 'User Name', 'User Email', 'Plan', 'Amount', 'Commission', 'Net Revenue', 'Status'];
    const rows = filteredData.map(u => {
      const amount = u.subscription?.amountPaid || 0;
      const commission = amount * 0.10;
      const net = amount - commission;
      const isCredited = u.subscription?.status === 'active';
      const caName = u.referredBy && partners[u.referredBy] ? partners[u.referredBy].name : "Direct / Organic";
      
      return [
        formatDate(u.createdAt), caName, u.name || 'N/A', u.email || 'N/A',
        u.subscription?.planType || 'Free', amount.toFixed(2), commission.toFixed(2),
        net.toFixed(2), isCredited ? 'Credited' : 'Pending'
      ];
    });

    // Add Summary Row
    rows.push([]);
    rows.push(['--- SUMMARY ---']);
    rows.push(['Total Revenue', '', '', '', '', stats.totalRevenue.toFixed(2)]);
    rows.push(['Total Commission', '', '', '', '', '', stats.totalCommission.toFixed(2)]);
    rows.push(['Net Revenue', '', '', '', '', '', '', stats.netRevenue.toFixed(2)]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `earnings_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32}/></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Earnings & Revenue</h1>
           <p className="text-sm text-slate-500 mt-1">Track platform revenue, CPA commissions, and payouts</p>
        </div>
        <button 
          onClick={downloadCSV}
          className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
            <Download size={16}/> Download report
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard title="Total Platform Revenue" value={formatCurrency(stats.totalRevenue)} subtitle="Total revenue from subscriptions" IconComponent={DollarSign} iconBgColor="bg-indigo-50"/>
        <StatCard title="Total CPA Commission" value={formatCurrency(stats.totalCommission)} subtitle="Commission payable to CPAs" IconComponent={PieChart} iconBgColor="bg-blue-50"/>
        <StatCard title="Net Platform Revenue" value={formatCurrency(stats.netRevenue)} subtitle="Revenue after commissions" IconComponent={Wallet} iconBgColor="bg-emerald-50"/>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="py-5 px-6 text-xs font-medium text-slate-400 uppercase tracking-wide">Date</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400 uppercase tracking-wide">CPA Name</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400 uppercase tracking-wide">User</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400 uppercase tracking-wide">Plan</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400 uppercase tracking-wide">Amount</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400 uppercase tracking-wide">Commission</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400 uppercase tracking-wide">Net Revenue</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400 uppercase tracking-wide text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((u) => {
                 const amount = u.subscription?.amountPaid || 0;
                 const commission = amount * 0.10;
                 const net = amount - commission;
                 const isCredited = u.subscription?.status === 'active';
                 const caName = u.referredBy && partners[u.referredBy] ? partners[u.referredBy].name : "Direct / Organic";

                 return (
                   <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="py-5 px-6 text-xs font-medium text-slate-500">{formatDate(u.createdAt)}</td>
                     <td className="py-5 px-6 text-xs font-medium text-slate-900">{caName}</td>
                     <td className="py-5 px-6 text-xs font-medium text-slate-700">{u.name}</td>
                     <td className="py-5 px-6 text-xs font-medium text-slate-500">{u.subscription?.planType || "Free"}</td>
                     <td className="py-5 px-6 text-xs font-bold text-slate-900">{formatCurrency(amount)}</td>
                     <td className="py-5 px-6 text-xs font-bold text-slate-900">{formatCurrency(commission)}</td>
                     <td className="py-5 px-6 text-xs font-bold text-slate-900">{formatCurrency(net)}</td>
                     <td className="py-5 px-6 text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold ${isCredited ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                            {isCredited ? "Credited" : "Pending"}
                        </span>
                     </td>
                   </tr>
                 );
              })}
              {filteredData.length === 0 && (
                <tr><td colSpan="8" className="py-24 text-center text-slate-500 font-medium">No earnings data found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}