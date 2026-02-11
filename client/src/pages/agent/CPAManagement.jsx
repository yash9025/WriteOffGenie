import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { useSearch } from "../../context/SearchContext";
import { useNavigate } from "react-router-dom";
import { Eye, UserPlus, Loader2, DollarSign, TrendingUp, Activity, Users, X } from "../../components/Icons";
import toast, { Toaster } from "react-hot-toast";
import StatCard from "../../components/common/StatCard";
import DataTable from "../../components/common/DataTable";

const CPAManagement = () => {
  const { user } = useAuth();
  const { searchQuery } = useSearch();
  const navigate = useNavigate();
  
  // Data State
  const [loading, setLoading] = useState(true);
  const [cpas, setCPAs] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCPACommission: 0,
    pendingWithdrawals: 0,
    activeSubscriptions: 0
  });

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    commissionRate: 10
  });
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchCPAs();
  }, [user?.uid]);

  // --- DATA FETCHING (OPTIMIZED WITH TRANSACTIONS) ---
  const fetchCPAs = async () => {
    try {
      // 1. Parallel Fetch: Referred CPAs and all Transactions related to this Agent
      const [cpasSnap, txnsSnap] = await Promise.all([
        getDocs(query(collection(db, "Partners"), where("referredBy", "==", user.uid), where("role", "==", "cpa"))),
        getDocs(query(collection(db, "Transactions"), where("agentId", "==", user.uid), where("type", "==", "commission")))
      ]);

      // 2. Map Transactions to CPAs
      // We use this to sum up money and count unique active clients without nested loops
      const cpaFinancials = {};
      let globalRevenue = 0;
      let globalCPAComm = 0;
      const globalActiveClients = new Set();

      txnsSnap.docs.forEach(doc => {
        const txn = doc.data();
        if (txn.status !== "completed") return;

        const cpaId = txn.cpaId;
        const rev = Number(txn.amountPaid || 0);
        const cpaEarn = Number(txn.cpaEarnings || 0);

        if (!cpaFinancials[cpaId]) {
          cpaFinancials[cpaId] = { revenue: 0, earnings: 0, clients: new Set() };
        }

        cpaFinancials[cpaId].revenue += rev;
        cpaFinancials[cpaId].earnings += cpaEarn;
        cpaFinancials[cpaId].clients.add(txn.userId);

        globalRevenue += rev;
        globalCPAComm += cpaEarn;
        globalActiveClients.add(txn.userId);
      });

      // 3. Assemble CPA Data for the Table
      const processedCPAs = cpasSnap.docs.map(doc => {
        const data = doc.data();
        const financials = cpaFinancials[doc.id] || { revenue: 0, earnings: 0, clients: new Set() };

        return {
          id: doc.id,
          ...data,
          calculatedStats: {
            totalRevenue: financials.revenue,
            totalEarnings: financials.earnings,
            activeClients: financials.clients.size
          }
        };
      });

      // Sort by newest first
      processedCPAs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      setCPAs(processedCPAs);
      setStats({
        totalRevenue: globalRevenue,
        totalCPACommission: globalCPAComm,
        pendingWithdrawals: 0, // Placeholder for withdrawal system
        activeSubscriptions: globalActiveClients.size
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching CPAs:", error);
      toast.error("Failed to load CPA data");
      setLoading(false);
    }
  };

  // --- INVITE LOGIC ---
  const handleSendInvite = async (e) => {
    e.preventDefault();
    setSendingInvite(true);
    const toastId = toast.loading("Sending invitation...");

    try {
      const fn = httpsCallable(getFunctions(), 'sendCPAInvite');
      await fn({ 
        ...inviteForm, 
        invitedBy: user.uid,
        inviteType: 'cpa'
      });
      
      toast.success("Invitation sent successfully!", { id: toastId });
      setShowInviteModal(false);
      setInviteForm({ name: "", email: "", commissionRate: 10 });
      fetchCPAs(); // Refresh list
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to send invitation", { id: toastId });
    } finally {
      setSendingInvite(false);
    }
  };

  // --- HELPERS ---
  const formatCurrency = (value) => `$${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // --- RENDER TABLE ---
  const filteredCPAs = cpas.filter(cpa => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      cpa.displayName?.toLowerCase().includes(search) ||
      cpa.email?.toLowerCase().includes(search)
    );
  });

  const columns = [
    { header: "CPA Name" },
    { header: "Email" },
    { header: "Joined Date" },
    { header: "Total Earnings" },
    { header: "Active Clients" },
    { header: "Status" },
    { header: "Actions" }
  ];

  const renderRow = (cpa, index) => (
    <tr key={index} className="border-b border-[#E3E6EA] hover:bg-[#F7F9FC] transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4D7CFE1A] flex items-center justify-center text-[#4D7CFE] font-semibold">
            {cpa.displayName?.charAt(0).toUpperCase() || "C"}
          </div>
          <span className="font-medium text-[#111111]">{cpa.displayName || "Unknown"}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-[#9499A1]">{cpa.email}</td>
      <td className="px-6 py-4 text-[#9499A1]">{formatDate(cpa.createdAt)}</td>
      <td className="px-6 py-4 font-semibold text-[#111111]">
        {formatCurrency(cpa.calculatedStats?.totalEarnings)}
      </td>
      <td className="px-6 py-4 text-center">
        <span className="inline-block px-3 py-1 bg-[#4D7CFE1A] text-[#4D7CFE] rounded-full text-sm font-medium">
          {cpa.calculatedStats?.activeClients || 0}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          cpa.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {cpa.status || 'active'}
        </span>
      </td>
      <td className="px-6 py-4">
        <button
          onClick={() => navigate(`/agent/cpas/${cpa.id}`)}
          className="p-2 text-[#4D7CFE] hover:bg-[#4D7CFE1A] rounded-lg transition-colors"
          title="View Details"
        >
          <Eye size={18} />
        </button>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#111111]">CPA Management</h1>
          <p className="text-[#9499A1] mt-1">Manage and monitor your referred CPAs</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <UserPlus size={20} />
          Invite CPA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue from CPAs"
          value={formatCurrency(stats.totalRevenue)}
          description="All revenue generated"
          icon={DollarSign}
          isLoading={loading}
        />
        <StatCard
          title="Total CPA Commission"
          value={formatCurrency(stats.totalCPACommission)}
          description="Paid to CPAs"
          icon={TrendingUp}
          isLoading={loading}
        />
        <StatCard
          title="Pending Withdrawals"
          value={formatCurrency(stats.pendingWithdrawals)}
          description="CPA withdrawal requests"
          icon={Activity}
          isLoading={loading}
        />
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions}
          description="Unique active users"
          icon={Users}
          isLoading={loading}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredCPAs}
        isLoading={loading}
        emptyMessage="No CPAs found"
        renderRow={renderRow}
      />

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowInviteModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              <X size={20} />
            </button>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Invite CPA Partner</h2>
            <p className="text-sm text-slate-500 mb-6">Send an invitation to join the partner program</p>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Enter partner's full name" className="w-full px-4 py-2.5 border border-[#E3E6EA] rounded-lg text-sm focus:outline-none focus:border-[#4D7CFE] transition-colors" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="Enter partner's email" className="w-full px-4 py-2.5 border border-[#E3E6EA] rounded-lg text-sm focus:outline-none focus:border-[#4D7CFE] transition-colors" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Commission Rate (%)</label>
                <input type="number" min="10" max="50" value={inviteForm.commissionRate} onChange={(e) => setInviteForm({ ...inviteForm, commissionRate: parseInt(e.target.value) || 10 })} className="w-full px-4 py-2.5 border border-[#E3E6EA] rounded-lg text-sm focus:outline-none focus:border-[#4D7CFE] transition-colors" required />
                <p className="mt-1 text-xs text-slate-400">Partner will earn this percentage on each referred subscription</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={sendingInvite} className="flex-1 px-4 py-2.5 bg-[#4D7CFE] text-white rounded-lg text-sm font-semibold hover:bg-[#3D6CED] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer">
                  {sendingInvite ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  {sendingInvite ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Toaster position="top-right" />
    </div>
  );
};

export default CPAManagement;