import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, doc, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { useSearch } from "../../context/SearchContext"; // Keeping context search if used globally
import { useNavigate } from "react-router-dom";
import { 
  Search, Loader2, Ban, CheckCircle2, UserPlus, X, DollarSign, TrendingUp, Wallet, Users, Eye, Activity
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import StatCard from "../../components/common/StatCard";

export default function AgentManagement() {
  const { user } = useAuth();
  const { searchQuery } = useSearch(); // Use global search or local filter
  const navigate = useNavigate();
  
  // Data States
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  
  // Stats State
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalAgentCommission: 0,
    pendingWithdrawals: 0,
    activeSubscriptions: 0
  });

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "" });
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const fetchAgents = async () => {
    try {
      const agentsQuery = query(
        collection(db, "Partners"),
        where("role", "==", "agent")
      );
      
      const snapshot = await getDocs(agentsQuery);
      const agentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by created date
      agentsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      // Calculate derived stats for each agent
      let totalActiveClients = 0;
      
      // Note: For a real production app with thousands of agents, 
      // these sub-queries should be replaced with aggregated counters in Firestore.
      for (const agent of agentsData) {
        const cpasQuery = query(
          collection(db, "Partners"),
          where("referredBy", "==", agent.id),
          where("role", "==", "cpa")
        );
        const cpasSnapshot = await getDocs(cpasQuery);
        agent.cpaCount = cpasSnapshot.size;

        let agentClientCount = 0;
        for (const cpaDoc of cpasSnapshot.docs) {
          const clientsQuery = query(
            collection(db, "Clients"),
            where("referredBy", "==", cpaDoc.id),
            where("subscription.status", "==", "active")
          );
          const clientsSnapshot = await getDocs(clientsQuery);
          agentClientCount += clientsSnapshot.size;
        }
        agent.activeClients = agentClientCount;
        totalActiveClients += agentClientCount;
      }

      setAgents(agentsData);

      // Calculate overall stats
      const totalRev = agentsData.reduce((sum, agent) => sum + (agent.stats?.totalRevenue || 0), 0);
      const totalComm = agentsData.reduce((sum, agent) => sum + (agent.stats?.totalEarnings || 0), 0);
      
      // Get pending withdrawals
      const withdrawalsQuery = query(
        collection(db, "Payouts"),
        where("partnerRole", "==", "agent"),
        where("status", "==", "pending")
      );
      const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
      const pendingAmount = withdrawalsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

      setStats({
        totalRevenue: totalRev,
        totalAgentCommission: totalComm,
        pendingWithdrawals: pendingAmount,
        activeSubscriptions: totalActiveClients
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast.error("Failed to load agents");
      setLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email) {
      toast.error("Please fill in all fields");
      return;
    }

    setSendingInvite(true);
    const toastId = toast.loading("Sending invitation...");

    try {
      const functions = getFunctions();
      const sendAgentInvite = httpsCallable(functions, 'sendAgentInvite');
      await sendAgentInvite({
        name: inviteForm.name,
        email: inviteForm.email
      });
      
      toast.success("Agent invitation sent!", { id: toastId });
      setShowInviteModal(false);
      setInviteForm({ name: "", email: "" });
      fetchAgents(); // Refresh list
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error(error.message || "Failed to send invite", { id: toastId });
    } finally {
      setSendingInvite(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    if (!window.confirm(`Are you sure you want to mark this account as ${newStatus}?`)) return;
    
    setProcessing(id);
    const toastId = toast.loading(`Updating status...`);

    try {
      const fn = httpsCallable(getFunctions(), 'toggleCAStatus');
      await fn({ targetUserId: id, action: newStatus });
      
      // Optimistic Update
      setAgents(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      toast.success(`Account marked as ${newStatus}`, { id: toastId });
    } catch (e) { 
        console.error(e);
        toast.error("Update Failed: " + e.message, { id: toastId }); 
    } finally { 
        setProcessing(null); 
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

  // Filter Logic
  const filteredAgents = agents.filter(agent => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      agent.displayName?.toLowerCase().includes(search) ||
      agent.email?.toLowerCase().includes(search)
    );
  });

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-slate-400" size={32}/>
    </div>
  );

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-10">
      <Toaster position="top-right" />
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl font-semibold leading-9 text-[#111111]">Agent Management</h1>
           <p className="text-base font-normal leading-6 text-[#9499A1]">View and manage all platform agents</p>
         </div>
         <button
           onClick={() => setShowInviteModal(true)}
           className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
         >
           <UserPlus size={18} />
           Invite Agent
         </button>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Revenue by Agents" 
          value={formatCurrency(stats.totalRevenue)} 
          subtitle="Total from all agents" 
          IconComponent={DollarSign} 
          iconBgColor="bg-[#00C853]"
        />
        <StatCard 
          title="Agent Commissions" 
          value={formatCurrency(stats.totalAgentCommission)} 
          subtitle="Total paid to agents" 
          IconComponent={TrendingUp} 
          iconBgColor="bg-[#00C853]"
        />
        <StatCard 
          title="Pending Withdrawals" 
          value={formatCurrency(stats.pendingWithdrawals)} 
          subtitle="Awaiting approval" 
          IconComponent={Wallet} 
          iconBgColor="bg-[#00C853]"
        />
        <StatCard 
          title="Active Subscriptions" 
          value={stats.activeSubscriptions} 
          subtitle="Via agents" 
          IconComponent={Users} 
          iconBgColor="bg-[#00C853]"
        />
      </div>

      {/* --- INVITE MODAL --- */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-1">Invite Agent</h2>
            <p className="text-sm text-slate-500 mb-6">Send an invitation to join as an Agent</p>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="Enter agent's full name"
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
                  placeholder="Enter agent's email"
                  className="w-full px-4 py-2.5 border border-[#E3E6EA] rounded-lg text-sm focus:outline-none focus:border-[#4D7CFE] transition-colors"
                  required
                />
              </div>

              <div className="bg-[#F7F9FC] p-4 rounded-xl border border-[#E3E6EA]">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#4D7CFE1A] rounded-lg">
                    <TrendingUp className="text-[#4D7CFE]" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#111111] font-semibold mb-1">Fixed Commission</p>
                    <p className="text-xs text-[#9499A1]">
                      Agents earn a fixed <span className="font-bold text-[#4D7CFE]">10% commission</span> on all revenue generated by their referred CPAs.
                    </p>
                  </div>
                </div>
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

      {/* --- TABLE CONTAINER --- */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1]">Agent Name</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1]">Email</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1]">Joined Date</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1]">CPAs Referred</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1]">Active Clients</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1]">Total Earnings</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1] text-center">Status</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAgents.map((agent) => {
                 const isActive = agent.status === 'active';
                 return (
                   <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors group">
                     
                     <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#4D7CFE1A] flex items-center justify-center">
                            <span className="text-[#4D7CFE] text-xs font-semibold">
                              {agent.displayName?.charAt(0).toUpperCase() || "A"}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-[#111111]">{agent.displayName || "Unknown"}</span>
                        </div>
                     </td>

                     <td className="py-5 px-6">
                       <span className="text-sm text-[#9499A1] font-medium">{agent.email}</span>
                     </td>

                     <td className="py-5 px-6">
                       <span className="text-sm text-[#9499A1]">{formatDate(agent.createdAt)}</span>
                     </td>

                     <td className="py-5 px-6 text-center">
                       <span className="inline-block px-3 py-1 bg-[#4D7CFE1A] text-[#4D7CFE] rounded-full text-xs font-bold">
                         {agent.cpaCount || 0}
                       </span>
                     </td>

                     <td className="py-5 px-6 text-center">
                       <span className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">
                         {agent.activeClients || 0}
                       </span>
                     </td>

                     <td className="py-5 px-6">
                       <span className="text-sm font-bold text-[#111111]">{formatCurrency(agent.stats?.totalEarnings || 0)}</span>
                     </td>

                     <td className="py-5 px-6 text-center">
                       <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          isActive 
                          ? "bg-emerald-50 text-emerald-600" 
                          : "bg-red-50 text-red-600"
                       }`}>
                          {isActive ? "Active" : "Inactive"}
                       </span>
                     </td>

                     <td className="py-5 px-6 text-right">
                       <div className="flex items-center justify-end gap-3">
                          <button 
                             onClick={() => toggleStatus(agent.id, agent.status)}
                             disabled={processing === agent.id}
                             className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                             title={isActive ? "Disable Account" : "Activate Account"}
                          >
                             {processing === agent.id ? <Loader2 size={16} className="animate-spin"/> : (isActive ? <Ban size={16}/> : <CheckCircle2 size={16}/>)}
                          </button>

                          <button 
                             onClick={() => navigate(`/admin/agents/${agent.id}`)}
                             className="px-4 py-1.5 border border-[#E3E6EA] rounded-lg text-xs font-bold text-[#9499A1] hover:bg-[#4D7CFE] hover:text-white hover:border-[#4D7CFE] transition-all shadow-sm cursor-pointer"
                          >
                             View
                          </button>
                       </div>
                     </td>
                   </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredAgents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 bg-white">
                <div className="w-20 h-20 bg-[#4D7CFE1A] rounded-full flex items-center justify-center mb-4">
                    <Search size={32} className="text-[#4D7CFE]" />
                </div>
                <h3 className="text-[#111111] font-bold text-lg">No agents found</h3>
                <p className="text-[#9499A1] text-sm mt-1">Invited agents will appear here once they register.</p>
            </div>
        )}
      </div>
    </div>
  );
}