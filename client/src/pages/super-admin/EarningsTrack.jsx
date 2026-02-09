import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Loader2, Download, DollarSign, PieChart, Wallet, TrendingUp, Users } from "../../components/Icons";
import StatCard from "../../components/common/StatCard";
import toast, { Toaster } from "react-hot-toast";

export default function EarningsTracking() {
  const [users, setUsers] = useState([]);
  const [partners, setPartners] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uSnap, pSnap] = await Promise.all([
          getDocs(collection(db, "Clients")),
          getDocs(collection(db, "Partners"))
        ]);

        const pMap = {};
        pSnap.forEach(d => {
          const data = d.data();
          pMap[d.id] = { 
            name: data.displayName || data.name || "Unknown", 
            code: data.referralCode, 
            role: data.role,
            commissionRate: data.role === 'agent' ? 0.10 : ((data.commissionRate || 10) / 100),
            referredBy: data.referredBy
          };
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

  // Calculate Totals (separated by Agent and CPA tiers)
  const stats = useMemo(() => {
    let agentRevenue = 0;
    let agentCommission = 0;
    let cpaRevenue = 0;
    let cpaCommission = 0;

    users.forEach(u => {
      const amount = u.subscription?.amountPaid || 0;
      const directCPA = u.referredBy && partners[u.referredBy];
      
      if (!directCPA) return; // Skip if no referrer
      
      // CPA commission
      const cpaRate = directCPA.commissionRate;
      const cpaComm = amount * cpaRate;
      cpaRevenue += amount;
      cpaCommission += cpaComm;
      
      // Agent commission (if CPA was referred by an Agent)
      if (directCPA.referredBy && partners[directCPA.referredBy]) {
        const agent = partners[directCPA.referredBy];
        if (agent.role === 'agent') {
          const agentComm = amount * 0.10; // Agents always get 10%
          agentRevenue += amount;
          agentCommission += agentComm;
        }
      }
    });

    const totalRevenue = users.reduce((acc, u) => acc + (u.subscription?.amountPaid || 0), 0);
    const totalCommission = agentCommission + cpaCommission;
    const netRevenue = totalRevenue - totalCommission;
    const netAgentRevenue = agentRevenue - agentCommission;
    const netCPARevenue = cpaRevenue - cpaCommission;

    return { 
      totalRevenue, 
      totalCommission, 
      netRevenue,
      agentRevenue,
      agentCommission,
      netAgentRevenue,
      cpaRevenue,
      cpaCommission,
      netCPARevenue
    };
  }, [users, partners]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const downloadCSV = () => {
    const headers = ['Date', 'CPA Name', 'Agent Name', 'User Name', 'User Email', 'Plan', 'Amount', 'CPA Commission', 'Agent Commission', 'Net Revenue', 'Status'];
    const rows = users.map(u => {
      const amount = u.subscription?.amountPaid || 0;
      const directCPA = u.referredBy && partners[u.referredBy];
      const cpaName = directCPA ? directCPA.name : "Direct / Organic";
      const cpaComm = directCPA ? (amount * directCPA.commissionRate) : 0;
      
      let agentName = "N/A";
      let agentComm = 0;
      if (directCPA && directCPA.referredBy && partners[directCPA.referredBy]) {
        const agent = partners[directCPA.referredBy];
        if (agent.role === 'agent') {
          agentName = agent.name;
          agentComm = amount * 0.10;
        }
      }
      
      const net = amount - cpaComm - agentComm;
      const isCredited = u.subscription?.status === 'active';
      
      return [
        formatDate(u.createdAt), cpaName, agentName, u.displayName || u.name || 'N/A', u.email || 'N/A',
        u.subscription?.planType || 'Free', amount.toFixed(2), cpaComm.toFixed(2), agentComm.toFixed(2),
        net.toFixed(2), isCredited ? 'Credited' : 'Pending'
      ];
    });

    // Add Summary Row
    rows.push([]);
    rows.push(['--- SUMMARY ---']);
    rows.push(['Agent Revenue', '', '', '', '', '', stats.agentRevenue.toFixed(2)]);
    rows.push(['Agent Commission', '', '', '', '', '', '', stats.agentCommission.toFixed(2)]);
    rows.push(['Net Agent Revenue', '', '', '', '', '', '', '', stats.netAgentRevenue.toFixed(2)]);
    rows.push([]);
    rows.push(['CPA Revenue', '', '', '', '', '', stats.cpaRevenue.toFixed(2)]);
    rows.push(['CPA Commission', '', '', '', '', '', '', stats.cpaCommission.toFixed(2)]);
    rows.push(['Net CPA Revenue', '', '', '', '', '', '', '', stats.netCPARevenue.toFixed(2)]);
    rows.push([]);
    rows.push(['Total Revenue', '', '', '', '', '', stats.totalRevenue.toFixed(2)]);
    rows.push(['Total Commission', '', '', '', '', '', '', stats.totalCommission.toFixed(2)]);
    rows.push(['Net Platform Revenue', '', '', '', '', '', '', '', stats.netRevenue.toFixed(2)]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `earnings_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#4D7CFE]" size={32}/></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
           <h1 className="text-2xl font-bold text-[#111111]">Earnings & Revenue</h1>
           <p className="text-sm text-[#9499A1] mt-1">Track platform revenue, Agent & CPA commissions, and payouts</p>
        </div>
        <button 
          onClick={downloadCSV}
          className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
            <Download size={16}/> Download report
        </button>
      </div>

      {/* Stats Grid - 6 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard title="Total Agent Revenue" value={formatCurrency(stats.agentRevenue)} description="Revenue from Agent tier" icon={DollarSign}/>
        <StatCard title="Total Agent Commission" value={formatCurrency(stats.agentCommission)} description="Commission to Agents (10%)" icon={TrendingUp}/>
        <StatCard title="Net Agent Revenue" value={formatCurrency(stats.netAgentRevenue)} description="After agent commissions" icon={Wallet}/>
        
        <StatCard title="Total CPA Revenue" value={formatCurrency(stats.cpaRevenue)} description="Revenue from CPA tier" icon={DollarSign}/>
        <StatCard title="Total CPA Commission" value={formatCurrency(stats.cpaCommission)} description="Commission to CPAs (10-50%)" icon={TrendingUp}/>
        <StatCard title="Net CPA Revenue" value={formatCurrency(stats.netCPARevenue)} description="After CPA commissions" icon={Wallet}/>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}