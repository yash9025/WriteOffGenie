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
      // Get all CPAs referred by this agent
      const cpasQuery = query(
        collection(db, "Partners"),
        where("referredBy", "==", user.uid),
        where("role", "==", "cpa")
      );
      
      const cpasSnapshot = await getDocs(cpasQuery);
      const cpaIds = cpasSnapshot.docs.map(doc => doc.id);
      const cpasMap = {};
      cpasSnapshot.docs.forEach(doc => {
        cpasMap[doc.id] = doc.data();
      });
      
      // Get all clients referred by these CPAs
      let allClients = [];
      if (cpaIds.length > 0) {
        const clientsQuery = query(
          collection(db, "Clients"),
          where("referredBy", "in", cpaIds)
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        allClients = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // Transform clients into transaction-like data
      const txData = allClients.map(client => {
        const amount = client.subscription?.amountPaid || 0;
        const cpaData = cpasMap[client.referredBy] || {};
        const cpaRate = (cpaData.commissionRate || 10) / 100;
        const cpaCommission = amount * cpaRate;
        const agentCommission = amount * 0.10;
        
        return {
          id: client.id,
          createdAt: client.createdAt,
          description: `Client subscription: ${client.displayName || client.name || client.email}`,
          amount,
          agentCommission,
          cpaCommission,
          cpaName: cpaData.displayName || "Unknown CPA",
          clientName: client.displayName || client.name || client.email,
          status: client.subscription?.status || 'active'
        };
      });

      // Sort by date
      txData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setTransactions(txData);

      // Calculate stats
      const totalRev = txData.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const totalAgent = txData.reduce((sum, tx) => sum + (tx.agentCommission || 0), 0);
      const totalCPA = txData.reduce((sum, tx) => sum + (tx.cpaCommission || 0), 0);

      setStats({
        totalRevenue: totalRev,
        totalAgentCommission: totalAgent,
        totalCPACommission: totalCPA
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
          description="10% of CPA revenue"
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
