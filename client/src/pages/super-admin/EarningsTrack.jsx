import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, collectionGroup } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Loader2, Download, DollarSign, Wallet, TrendingUp } from "../../components/Icons";
import StatCard from "../../components/common/StatCard";
import { Toaster } from "react-hot-toast";

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

export default function EarningsTracking() {
  const [usersWithSubs, setUsersWithSubs] = useState([]);
  const [partners, setPartners] = useState({});
  const [partnersByCode, setPartnersByCode] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 3 PARALLEL QUERIES - Fast for 500+ users
        const [pSnap, uSnap, allSubsSnap] = await Promise.all([
          getDocs(collection(db, "Partners")),
          getDocs(collection(db, "user")),
          getDocs(collectionGroup(db, "subscription")) // ALL subscriptions in ONE query!
        ]);
        
        // Build user map
        const userMap = {};
        uSnap.docs.forEach(d => {
          userMap[d.id] = { id: d.id, ...d.data() };
        });
        
        const pMap = {};
        const pByCode = {};
        pSnap.forEach(d => {
          const data = d.data();
          const partner = { 
            id: d.id,
            name: data.displayName || data.name || "Unknown", 
            code: data.referralCode, 
            role: data.role,
            commissionRate: data.role === 'agent' ? 0.10 : ((data.commissionRate || 10) / 100),
            commissionPercentage: data.commissionPercentage || 15,
            maintenanceCostPerUser: data.maintenanceCostPerUser || 6.00,
            referredBy: data.referredBy
          };
          pMap[d.id] = partner;
          if (data.referralCode) {
            pByCode[data.referralCode] = partner;
          }
        });
        setPartners(pMap);
        setPartnersByCode(pByCode);

        // Process ALL subscriptions from collection group query
        const usersData = [];
        
        allSubsSnap.docs.forEach(subDoc => {
          const subData = { id: subDoc.id, ...subDoc.data() };
          
          // Get userId from doc path: user/{userId}/subscription/{subId}
          const pathParts = subDoc.ref.path.split('/');
          const userId = pathParts[1];
          const userData = userMap[userId] || { id: userId };
          
          const planPrice = PLAN_PRICES[subData.planname] || 0;
          usersData.push({
            ...userData,
            subscription: {
              ...subData,
              amountPaid: planPrice,
              planType: subData.planname
            },
            referralCode: userData.referral_code || subData.ref_code
          });
        });

        setUsersWithSubs(usersData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate Totals (separated by Agent and CPA tiers) - ONLY ACTIVE SUBSCRIPTIONS
  const stats = useMemo(() => {
    let cpaRevenue = 0;
    let cpaCommission = 0;
    
    // Group subscriptions by agent for proper commission calculation
    const agentStats = {}; // agentId -> { revenue, cpaCommissions, activeSubscriptions }
    const now = new Date();
    
    usersWithSubs.forEach(u => {
      // Only count ACTIVE subscriptions
      const expirationDate = u.subscription?.expiration_date?.toDate?.() || u.subscription?.expiration_date;
      const isActive = u.subscription?.status === 'active' && expirationDate && new Date(expirationDate) > now;
      
      if (!isActive) return; // Skip inactive subscriptions
      
      const amount = u.subscription?.amountPaid || 0;
      const refCode = u.referralCode;
      const directCPA = refCode ? partnersByCode[refCode] : null;
      
      if (!directCPA) return; // Skip if no referrer
      
      // CPA commission
      const cpaRate = directCPA.commissionRate;
      const cpaComm = amount * cpaRate;
      cpaRevenue += amount;
      cpaCommission += cpaComm;
      
      // Track per-agent stats (if CPA was referred by an Agent)
      if (directCPA.referredBy && partners[directCPA.referredBy]) {
        const agent = partners[directCPA.referredBy];
        if (agent.role === 'agent') {
          const agentId = directCPA.referredBy;
          if (!agentStats[agentId]) {
            agentStats[agentId] = { 
              revenue: 0, 
              cpaCommissions: 0, 
              activeSubscriptions: 0,
              commissionRate: (agent.commissionPercentage || 15) / 100,
              maintenanceCost: agent.maintenanceCostPerUser || 6.00
            };
          }
          agentStats[agentId].revenue += amount;
          agentStats[agentId].cpaCommissions += cpaComm;
          agentStats[agentId].activeSubscriptions++;
        }
      }
    });
    
    // Calculate agent commission using the correct formula per agent
    let agentRevenue = 0;
    let agentCommission = 0;
    
    Object.values(agentStats).forEach(agent => {
      agentRevenue += agent.revenue;
      // Formula: Rate% × [(Revenue - CPA Commissions) - (Active Subs × Maintenance Cost)]
      const netRevenue = agent.revenue - agent.cpaCommissions;
      const maintenanceCosts = agent.activeSubscriptions * agent.maintenanceCost;
      const netProfit = netRevenue - maintenanceCosts;
      const agentComm = Math.max(0, netProfit * agent.commissionRate);
      agentCommission += agentComm;
    });

    // Count only active subscriptions for total revenue
    const activeUsers = usersWithSubs.filter(u => {
      const expirationDate = u.subscription?.expiration_date?.toDate?.() || u.subscription?.expiration_date;
      return u.subscription?.status === 'active' && expirationDate && new Date(expirationDate) > now;
    });
    const totalRevenue = activeUsers.reduce((acc, u) => acc + (u.subscription?.amountPaid || 0), 0);
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
  }, [usersWithSubs, partners, partnersByCode]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const downloadCSV = () => {
    const headers = ['Date', 'CPA Name', 'Agent Name', 'User Name', 'User Email', 'Plan', 'Amount', 'CPA Commission', 'Agent Commission', 'Net Revenue', 'Status'];
    const rows = usersWithSubs.map(u => {
      const amount = u.subscription?.amountPaid || 0;
      const refCode = u.referralCode;
      const directCPA = refCode ? partnersByCode[refCode] : null;
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
        formatDate(u.created_time || u.createdAt), cpaName, agentName, u.display_name || u.displayName || u.name || 'N/A', u.email || 'N/A',
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
        <StatCard title="Active Agent Revenue" value={formatCurrency(stats.agentRevenue)} description="Active subscriptions via Agent CPAs" icon={DollarSign}/>
        <StatCard title="Agent Commission Payable" value={formatCurrency(stats.agentCommission)} description="Rate% × (Net Profit - Maintenance)" icon={TrendingUp}/>
        <StatCard title="Net Agent Revenue" value={formatCurrency(stats.netAgentRevenue)} description="Platform keeps after agent comm" icon={Wallet}/>
        
        <StatCard title="Active CPA Revenue" value={formatCurrency(stats.cpaRevenue)} description="Active subscriptions via CPAs" icon={DollarSign}/>
        <StatCard title="CPA Commission Payable" value={formatCurrency(stats.cpaCommission)} description="Sum of all CPA commissions" icon={TrendingUp}/>
        <StatCard title="Net CPA Revenue" value={formatCurrency(stats.netCPARevenue)} description="Platform keeps after CPA comm" icon={Wallet}/>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}