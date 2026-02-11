import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { useSearch } from "../../context/SearchContext";
import { Loader2, DollarSign, TrendingUp, Percent, RevenueIcon } from "../../components/Icons";
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
  }, [user?.uid]);

  const fetchEarningsData = async () => {
    try {
      // 1. Fetch Agent's Partner Doc and their specific Transactions in parallel
      const [agentDocSnap, txnsSnap, partnersSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, "Partners"), where("__name__", "==", user.uid))),
        getDocs(query(collection(db, "Transactions"), where("agentId", "==", user.uid), where("type", "==", "commission"))),
        getDocs(collection(db, "Partners")),
        getDocs(collection(db, "user"))
      ]);

      // Maps for quick UI resolution (Names/Emails)
      const partnerMap = {};
      partnersSnap.docs.forEach(d => partnerMap[d.id] = d.data());
      
      const userMap = {};
      usersSnap.docs.forEach(d => userMap[d.id] = d.data());

      let totalRevenue = 0;
      let totalAgentComm = 0;
      let totalCpaComm = 0;

      // 2. Process Ledger Entries
      // We no longer calculate math here; we trust the backend's recorded 'agentEarnings'
      const txData = txnsSnap.docs.map(doc => {
        const txn = doc.data();
        const rev = Number(txn.amountPaid || 0);
        const aEarn = Number(txn.agentEarnings || 0);
        const cEarn = Number(txn.cpaEarnings || 0);

        totalRevenue += rev;
        totalAgentComm += aEarn;
        totalCpaComm += cEarn;

        const cpa = partnerMap[txn.cpaId];
        const client = userMap[txn.userId];

        return {
          id: doc.id,
          createdAt: txn.createdAt,
          description: `Subscription: ${txn.plan?.replace('writeoffgenie-', '').replace('com.writeoffgenie.', '')}`,
          amount: rev,
          agentCommission: aEarn,
          cpaCommission: cEarn,
          cpaName: cpa ? (cpa.displayName || cpa.name) : "Unknown CPA",
          clientName: client ? (client.display_name || client.name || client.email) : "Unknown User",
          status: txn.status || 'completed'
        };
      });

      // Sort by date newest first
      txData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setTransactions(txData);
      setStats({
        totalRevenue,
        totalAgentCommission: totalAgentComm,
        totalCPACommission: totalCpaComm
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast.error("Failed to load earnings ledger");
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `$${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

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
        {formatCurrency(tx.amount)}
      </td>
      <td className="px-6 py-4 font-semibold text-[#00C853]">
        {formatCurrency(tx.agentCommission)}
      </td>
      <td className="px-6 py-4 font-semibold text-[#FF6B6B]">
        {formatCurrency(tx.cpaCommission)}
      </td>
      <td className="px-6 py-4">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          tx.status === 'completed' || tx.status === 'active' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-700'
        }`}>
          {tx.status}
        </span>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#111111]">Earnings & Revenue</h1>
        <p className="text-[#9499A1] mt-1">Track verified commission earnings from the transaction ledger</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Revenue from CPAs"
          value={formatCurrency(stats.totalRevenue)}
          description="Verified gross revenue generated"
          icon={RevenueIcon}
          isLoading={loading}
        />
        <StatCard
          title="Your Total Commission"
          value={formatCurrency(stats.totalAgentCommission)}
          description="Net commission earned"
          icon={TrendingUp}
          isLoading={loading}
        />
        <StatCard
          title="Total CPA Commission"
          value={formatCurrency(stats.totalCPACommission)}
          description="Revenue paid to your CPAs"
          icon={Percent}
          isLoading={loading}
        />
      </div>

      <div className="bg-white border border-[#E3E6EA] rounded-[20px] overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#E3E6EA]">
          <h3 className="text-lg font-semibold text-[#111111]">Verified Transaction Ledger</h3>
          <p className="text-sm text-[#9499A1] mt-1">Audit-ready list of all commissions earned</p>
        </div>
        <DataTable
          columns={columns}
          data={filteredTransactions}
          isLoading={loading}
          emptyMessage="No ledger entries found"
          renderRow={renderRow}
        />
      </div>
      <Toaster position="top-right" />
    </div>
  );
};

export default Earnings;