import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { useSearch } from "../../context/SearchContext";
import { useNavigate } from "react-router-dom";
import { Eye, UserPlus, Loader2, DollarSign, TrendingUp, Activity, Users, X } from "lucide-react";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // --- DATA FETCHING ---
  const fetchCPAs = async () => {
    try {
      const cpasQuery = query(
        collection(db, "Partners"),
        where("referredBy", "==", user.uid),
        where("role", "==", "cpa")
      );
      
      const snapshot = await getDocs(cpasQuery);
      const cpasData = [];
      
      // Fetch clients for each CPA to calculate stats
      for (const doc of snapshot.docs) {
        const cpaData = { id: doc.id, ...doc.data() };
        
        const clientsQuery = query(
          collection(db, "Clients"),
          where("referredBy", "==", doc.id)
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        const clients = clientsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const totalRevenue = clients.reduce((sum, client) => 
          sum + (client.subscription?.amountPaid || 0), 0
        );
        const cpaRate = (cpaData.commissionRate || 10) / 100;
        const totalEarnings = totalRevenue * cpaRate;
        const activeClients = clients.filter(c => c.subscription?.status === 'active').length;
        
        cpaData.calculatedStats = {
          totalRevenue,
          totalEarnings,
          activeClients,
          totalClients: clients.length
        };
        
        cpasData.push(cpaData);
      }

      cpasData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setCPAs(cpasData);

      // Overall Stats Calculation
      const cpaIds = cpasData.map(cpa => cpa.id);
      const totalRevenue = cpasData.reduce((sum, cpa) => sum + (cpa.calculatedStats?.totalRevenue || 0), 0);
      const totalCPACommission = cpasData.reduce((sum, cpa) => sum + (cpa.calculatedStats?.totalEarnings || 0), 0);
      const activeSubscriptions = cpasData.reduce((sum, cpa) => sum + (cpa.calculatedStats?.activeClients || 0), 0);
      
      let pendingAmount = 0;
      if (cpaIds.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < cpaIds.length; i += batchSize) {
          const batchIds = cpaIds.slice(i, i + batchSize);
          const payoutsQuery = query(
            collection(db, "Payouts"),
            where("partner_id", "in", batchIds),
            where("status", "==", "pending")
          );
          const payoutsSnapshot = await getDocs(payoutsQuery);
          pendingAmount += payoutsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        }
      }
      
      setStats({
        totalRevenue,
        totalCPACommission,
        pendingWithdrawals: pendingAmount,
        activeSubscriptions
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching CPAs:", error);
      toast.error("Failed to load CPAs");
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
      // Pass 'invitedBy' so the system knows this Agent invited the CPA
      await fn({ 
        ...inviteForm, 
        invitedBy: user.uid,
        inviteType: 'cpa' // Explicitly stating type
      });
      
      toast.success("Invitation sent successfully!", { id: toastId });
      setShowInviteModal(false);
      setInviteForm({ name: "", email: "", commissionRate: 10 });
    } catch (e) {
      console.error(e);
      const errorMsg = e.message.includes("already exists") 
        ? "A partner with this email already exists." 
        : "Failed to send invitation. Please try again.";
      toast.error(errorMsg, { id: toastId });
    } finally {
      setSendingInvite(false);
    }
  };

  // --- HELPERS ---
  const formatCurrency = (value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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
          <div className="w-10 h-10 rounded-full bg-[#4D7CFE1A] flex items-center justify-center">
            <span className="text-[#4D7CFE] font-semibold">
              {cpa.displayName?.charAt(0).toUpperCase() || "C"}
            </span>
          </div>
          <span className="font-medium text-[#111111]">{cpa.displayName || "Unknown"}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-[#9499A1]">{cpa.email}</td>
      <td className="px-6 py-4 text-[#9499A1]">{formatDate(cpa.createdAt)}</td>
      <td className="px-6 py-4 font-semibold text-[#111111]">
        {formatCurrency(cpa.calculatedStats?.totalEarnings || 0)}
      </td>
      <td className="px-6 py-4 text-center">
        <span className="inline-block px-3 py-1 bg-[#4D7CFE1A] text-[#4D7CFE] rounded-full text-sm font-medium">
          {cpa.calculatedStats?.activeClients || 0}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          cpa.status === 'active' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-700'
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
      {/* Header */}
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

      {/* Stats Cards */}
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
          description="From all CPAs"
          icon={Users}
          isLoading={loading}
        />
      </div>

      {/* CPAs Table */}
      <DataTable
        columns={columns}
        data={filteredCPAs}
        isLoading={loading}
        emptyMessage="No CPAs found"
        renderRow={renderRow}
      />

      {/* --- INVITE MODAL (Exact Copy) --- */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-1">Invite CPA Partner</h2>
            <p className="text-sm text-slate-500 mb-6">Send an invitation to join the partner program</p>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="Enter partner's full name"
                  className="w-full px-4 py-2.5 border border-[#E3E6EA] rounded-lg text-sm focus:outline-none focus:border-[#4D7CFE] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="Enter partner's email"
                  className="w-full px-4 py-2.5 border border-[#E3E6EA] rounded-lg text-sm focus:outline-none focus:border-[#4D7CFE] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  min="10"
                  max="50"
                  value={inviteForm.commissionRate}
                  onChange={(e) => setInviteForm({ ...inviteForm, commissionRate: parseInt(e.target.value) || 10 })}
                  placeholder="10"
                  className="w-full px-4 py-2.5 border border-[#E3E6EA] rounded-lg text-sm focus:outline-none focus:border-[#4D7CFE] transition-colors"
                  required
                />
                <p className="mt-1 text-xs text-slate-400">Partner will earn this percentage on each referred subscription</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="flex-1 px-4 py-2.5 bg-[#4D7CFE] text-white rounded-lg text-sm font-semibold hover:bg-[#3D6CED] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
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