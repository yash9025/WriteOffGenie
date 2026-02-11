import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { useSearch } from "../../context/SearchContext";
import { Loader2, DollarSign, TrendingUp, Percent } from "../../components/Icons";
import toast, { Toaster } from "react-hot-toast";
import StatCard from "../../components/common/StatCard";
import DataTable from "../../components/common/DataTable";

const Earnings = () => {
  const { user } = useAuth();
  const { searchQuery } = useSearch();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalAgentCommission: 0,
    totalCPACommission: 0
  });

  useEffect(() => {
    if (!user) return;
    fetchEarningsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const fetchEarningsData = async () => {
    try {
      // Pricing lookup
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
      const getPlanPrice = (planname) => PLAN_PRICES[planname] || 0;

      // Get agent data for commission settings
      const agentDocSnap = await getDocs(query(collection(db, "Partners"), where("__name__", "==", user.uid)));
      const agentData = agentDocSnap.docs[0]?.data() || {};
      const agentCommissionRate = (agentData.commissionPercentage || 15) / 100;
      const maintenanceCostPerUser = agentData.maintenanceCostPerUser || 6.00;

      // Get all CPAs referred by this agent
      const cpasQuery = query(
        collection(db, "Partners"),
        where("referredBy", "==", user.uid),
        where("role", "==", "cpa")
      );
      
      const cpasSnapshot = await getDocs(cpasQuery);
      const cpasMap = {};
      cpasSnapshot.docs.forEach(doc => {
        cpasMap[doc.id] = { ...doc.data(), id: doc.id };
      });
      
      // Get all subscription data for users referred by these CPAs
      const txData = [];
      let totalAgentRevenue = 0;
      let totalCPACommissions = 0;
      let activeSubscriptionsCount = 0;
      const now = new Date();
      
      for (const cpaDoc of cpasSnapshot.docs) {
        const cpaData = cpaDoc.data();
        const cpaReferralCode = cpaData.referralCode;
        
        if (!cpaReferralCode) continue;
        
        // Get users with this CPA's referral code
        const usersQuery = query(
          collection(db, "user"),
          where("referral_code", "==", cpaReferralCode)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id;
          const userData = userDoc.data();
          
          // Fetch subscriptions for this user
          const subsSnap = await getDocs(collection(db, "user", userId, "subscription"));
          
          for (const subDoc of subsSnap.docs) {
            const subData = subDoc.data();
            const amount = getPlanPrice(subData.planname);
            
            if (amount === 0) continue;
            
            const cpaRate = (cpaData.commissionRate || 10) / 100;
            const cpaCommission = amount * cpaRate;
            
            // Track totals for formula calculation
            totalAgentRevenue += amount;
            totalCPACommissions += cpaCommission;
            
            // Check if subscription is active
            const expirationDate = subData.expiration_date?.toDate();
            if (subData.status === 'active' && expirationDate && expirationDate > now) {
              activeSubscriptionsCount++;
            }
            
            // Parse purchase date
            let purchaseDate = subData.purchase_date || subData.purchse_date || subData.created_Time;
            
            txData.push({
              id: subDoc.id,
              createdAt: purchaseDate,
              description: `Subscription: ${subData.planname?.replace('writeoffgenie-', '').replace('com.writeoffgenie.', '')}`,
              amount,
              cpaCommission,
              cpaName: cpaData.displayName || cpaData.name || "Unknown CPA",
              clientName: userData.display_name || userData.name || userData.email,
              status: subData.status || 'active'
            });
          }
        }
      }
      
      // Apply correct formula: Agent_Commission = Rate% × [(Total_Revenue - CPA_Commissions) - (Active_Subs × Maintenance_Cost)]
      const netRevenue = totalAgentRevenue - totalCPACommissions;
      const maintenanceCosts = activeSubscriptionsCount * maintenanceCostPerUser;
      const netProfit = netRevenue - maintenanceCosts;
      const calculatedAgentCommission = Math.max(0, netProfit * agentCommissionRate);
      
      // Calculate per-transaction agent commission proportionally
      const perTxAgentShare = totalAgentRevenue > 0 ? (calculatedAgentCommission / totalAgentRevenue) : 0;
      txData.forEach(tx => {
        tx.agentCommission = tx.amount * perTxAgentShare;
      });

      // Sort by date
      txData.sort((a, b) => {
        const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() / 1000 || 0;
        const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() / 1000 || 0;
        return bTime - aTime;
      });

      setTransactions(txData);

      // Use pre-calculated stats with correct formula
      setStats({
        totalRevenue: totalAgentRevenue,
        totalAgentCommission: calculatedAgentCommission,
        totalCPACommission: totalCPACommissions
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast.error("Failed to load earnings data");
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter transactions based on search
  const filteredTransactions = transactions.filter(tx => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      tx.cpaName?.toLowerCase().includes(search) ||
      tx.clientName?.toLowerCase().includes(search) ||
      tx.description?.toLowerCase().includes(search)
    );
  });

  const columns = [
    { header: "Date" },
    { header: "CPA" },
    { header: "Client" },
    { header: "Total Amount" },
    { header: "Your Commission" },
    { header: "CPA Commission" },
    { header: "Status" }
  ];

  const renderRow = (tx, index) => (
    <tr key={index} className="border-b border-[#E3E6EA] hover:bg-[#F7F9FC] transition-colors">
      <td className="px-6 py-4 text-[#9499A1] text-sm">{formatDate(tx.createdAt)}</td>
      <td className="px-6 py-4 text-[#111111]">{tx.cpaName}</td>
      <td className="px-6 py-4 text-[#111111]">{tx.clientName}</td>
      <td className="px-6 py-4 font-semibold text-[#111111]">
        {formatCurrency(tx.amount || 0)}
      </td>
      <td className="px-6 py-4 font-semibold text-[#00C853]">
        {formatCurrency(tx.agentCommission || 0)}
      </td>
      <td className="px-6 py-4 font-semibold text-[#FF6B6B]">
        {formatCurrency(tx.cpaCommission || 0)}
      </td>
      <td className="px-6 py-4">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          tx.status === 'active' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-700'
        }`}>
          {tx.status || 'active'}
        </span>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#111111]">Earnings & Revenue</h1>
        <p className="text-[#9499A1] mt-1">Track your commission earnings from CPA activities</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Revenue from CPAs"
          value={formatCurrency(stats.totalRevenue)}
          description="All revenue generated by your CPAs"
          icon={DollarSign}
          isLoading={loading}
        />
        <StatCard
          title="Your Total Commission"
          value={formatCurrency(stats.totalAgentCommission)}
          description="Comission from CPA Revenue"
          icon={TrendingUp}
          isLoading={loading}
        />
        <StatCard
          title="Total CPA Commission"
          value={formatCurrency(stats.totalCPACommission)}
          description="Commission paid to CPAs"
          icon={Percent}
          isLoading={loading}
        />
      </div>

      {/* Earnings Table */}
      <div className="bg-white border border-[#E3E6EA] rounded-[20px] overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#E3E6EA]">
          <h3 className="text-lg font-semibold text-[#111111]">Client Subscriptions & Earnings</h3>
          <p className="text-sm text-[#9499A1] mt-1">Track all revenue and commission from your CPAs' clients</p>
        </div>
        <DataTable
          columns={columns}
          data={filteredTransactions}
          isLoading={loading}
          emptyMessage="No transactions found"
          renderRow={renderRow}
        />
      </div>
      <Toaster position="top-right" />
    </div>
  );
};

export default Earnings;
