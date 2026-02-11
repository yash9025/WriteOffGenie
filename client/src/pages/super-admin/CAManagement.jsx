import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import toast, { Toaster } from "react-hot-toast";
import { 
  Search, Loader2, Ban, CheckCircle2, UserPlus, X, DollarSign, TrendingUp, Wallet 
} from "lucide-react";
import StatCard from "../../components/common/StatCard";

export default function CAManagement() {
  const [cpas, setCPAs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [filter, setFilter] = useState("");
  
  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    commissionRate: 10
  });
  const [sendingInvite, setSendingInvite] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Listen to CPAs list in real-time
    const q = query(collection(db, "Partners"), where("role", "==", "cpa"));
    
    const unsub = onSnapshot(q, async (snapshot) => {
      try {
        // 2. Fetch Transactions (Ledger) for financial accuracy
        // We fetch all commission transactions to aggregate revenue per CPA
        const txnsQuery = query(collection(db, "Transactions"), where("type", "==", "commission"), where("status", "==", "completed"));
        const [txnsSnap, allPartnersSnap] = await Promise.all([
            getDocs(txnsQuery),
            getDocs(collection(db, "Partners")) // To resolve Referrer Names
        ]);

        // Create a map for quick partner lookup (Referrer Name)
        const partnerMap = {};
        allPartnersSnap.docs.forEach(doc => partnerMap[doc.id] = doc.data());

        // 3. Aggregate Ledger Data per CPA
        const cpaStats = {}; 
        // Structure: { cpaId: { revenue: 0, earnings: 0, activeClients: Set() } }

        txnsSnap.docs.forEach(doc => {
            const txn = doc.data();
            const cpaId = txn.cpaId;
            if (!cpaId) return;

            if (!cpaStats[cpaId]) {
                cpaStats[cpaId] = { revenue: 0, earnings: 0, activeClients: new Set() };
            }

            const amount = Number(txn.amountPaid || 0);
            const earnings = Number(txn.cpaEarnings || 0);

            cpaStats[cpaId].revenue += amount;
            cpaStats[cpaId].earnings += earnings;
            cpaStats[cpaId].activeClients.add(txn.userId);
        });

        // 4. Merge CPA Profile with Ledger Stats
        const cpaData = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const stats = cpaStats[docSnap.id] || { revenue: 0, earnings: 0, activeClients: new Set() };
            
            // Resolve Referrer Name
            let referrerName = "Direct";
            let referrerRole = null;
            if (data.referredBy && partnerMap[data.referredBy]) {
                const ref = partnerMap[data.referredBy];
                referrerName = ref.displayName || ref.name || "Unknown";
                referrerRole = ref.role;
            }

            return {
                id: docSnap.id,
                ...data,
                referrerName,
                referrerRole,
                calculatedStats: {
                    totalRevenue: stats.revenue,
                    totalEarnings: stats.earnings,
                    activeClients: stats.activeClients.size
                }
            };
        });

        // Sort by joined date (newest first)
        cpaData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        setCPAs(cpaData);
        setLoading(false);

      } catch (err) {
        console.error("Error loading CPA ledger data:", err);
        toast.error("Failed to load CPA data");
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Global Stats for Top Cards
  const globalStats = useMemo(() => {
    const totalRevenue = cpas.reduce((sum, cpa) => sum + (cpa.calculatedStats?.totalRevenue || 0), 0);
    const totalCommission = cpas.reduce((sum, cpa) => sum + (cpa.calculatedStats?.totalEarnings || 0), 0);
    return {
        totalRevenue,
        totalCommission,
        netRevenue: totalRevenue - totalCommission
    };
  }, [cpas]);

  // Handle sending CPA invite
  const handleSendInvite = async (e) => {
    e.preventDefault();
    setSendingInvite(true);
    const toastId = toast.loading("Sending invitation...");

    try {
      const fn = httpsCallable(getFunctions(), 'sendCPAInvite');
      await fn(inviteForm);
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

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    if (!window.confirm(`Are you sure you want to mark this account as ${newStatus}?`)) return;
    
    setProcessing(id);
    const toastId = toast.loading(`Updating status to ${newStatus}...`);

    try {
      const fn = httpsCallable(getFunctions(), 'toggleCAStatus');
      await fn({ targetUserId: id, action: newStatus }); 
      toast.success(`Account marked as ${newStatus}`, { id: toastId });
    } catch (e) { 
        console.error(e);
        toast.error("Update Failed: " + e.message, { id: toastId }); 
    } finally { 
        setProcessing(null); 
    }
  };

  const goToPartnerDetail = (partnerId) => {
    navigate(`/admin/cpas/${partnerId}`);
  };

  const formatCurrency = (value) => `$${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const filtered = cpas.filter(cpa => 
    cpa.displayName?.toLowerCase().includes(filter.toLowerCase()) || 
    cpa.email?.toLowerCase().includes(filter.toLowerCase()) ||
    cpa.referrerName?.toLowerCase().includes(filter.toLowerCase())
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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
           <h1 className="text-2xl font-semibold leading-9 text-[#111111]">CPA Management</h1>
           <p className="text-base font-normal leading-6 text-[#9499A1]">View and manage all CPAs platform-wide</p>
         </div>
         <button
           onClick={() => setShowInviteModal(true)}
           className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
         >
           <UserPlus size={18} />
           Invite CPA
         </button>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard 
          title="Total Revenue from CPAs" 
          value={formatCurrency(globalStats.totalRevenue)} 
          description="Revenue generated from all CPAs" 
          icon={DollarSign} 
        />
        <StatCard 
          title="Total Commissions" 
          value={formatCurrency(globalStats.totalCommission)} 
          description="Total commission paid to CPAs" 
          icon={TrendingUp} 
        />
        <StatCard 
          title="Net Revenue" 
          value={formatCurrency(globalStats.netRevenue)} 
          description="After CPA commissions" 
          icon={Wallet} 
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

      {/* --- TABLE CONTAINER --- */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        
        {/* Search Bar (Optional addition for UX) */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <Search className="text-slate-400" size={20} />
            <input 
                type="text" 
                placeholder="Search CPAs..." 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full outline-none text-sm text-slate-700 placeholder:text-slate-400"
            />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1]">CPA Name</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1]">Email</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1]">Referred By</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1]">Joined On</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1]">Active Clients</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1]">Total Earnings</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1] text-center">Status</th>
                <th className="py-5 px-6 text-xs font-medium text-[#9499A1] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((cpa) => {
                 const isActive = cpa.status === 'active';
                 return (
                   <tr key={cpa.id} className="hover:bg-slate-50/50 transition-colors group">
                     
                     {/* Name */}
                     <td className="py-5 px-6">
                        <span className="text-sm font-semibold text-[#111111]">{cpa.displayName || cpa.name || "Unknown"}</span>
                     </td>

                     {/* Email */}
                     <td className="py-5 px-6">
                        <span className="text-sm text-[#9499A1] font-medium">{cpa.email}</span>
                     </td>

                     {/* Referred By */}
                     <td className="py-5 px-6">
                        <span className={`text-sm font-medium ${cpa.referrerRole === 'agent' ? 'text-[#4D7CFE]' : 'text-[#9499A1]'}`}>
                          {cpa.referrerName}
                        </span>
                     </td>

                     {/* Joined Date */}
                     <td className="py-5 px-6">
                        <span className="text-sm text-[#9499A1]">{formatDate(cpa.createdAt)}</span>
                     </td>

                     {/* Active Clients (From Ledger) */}
                     <td className="py-5 px-6">
                        <span className="text-sm font-medium text-[#111111] ml-2">
                            {cpa.calculatedStats?.activeClients || 0}
                        </span>
                     </td>

                     {/* Earnings (From Ledger) */}
                     <td className="py-5 px-6">
                        <span className="text-sm font-bold text-[#111111]">{formatCurrency(cpa.calculatedStats?.totalEarnings)}</span>
                     </td>

                     {/* Status Badge */}
                     <td className="py-5 px-6 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                           isActive 
                           ? "bg-emerald-50 text-emerald-600" 
                           : "bg-red-50 text-red-600"
                        }`}>
                           {isActive ? "Active" : "Inactive"}
                        </span>
                     </td>

                     {/* Actions */}
                     <td className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                           <button 
                               onClick={() => toggleStatus(cpa.id, cpa.status)}
                               disabled={processing === cpa.id}
                               className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                               title={isActive ? "Disable Account" : "Activate Account"}
                           >
                               {processing === cpa.id ? <Loader2 size={16} className="animate-spin"/> : (isActive ? <Ban size={16}/> : <CheckCircle2 size={16}/>)}
                           </button>

                           <button 
                               onClick={() => goToPartnerDetail(cpa.id)}
                               className="px-5 py-2 border border-[#E3E6EA] rounded-lg text-xs font-bold text-[#9499A1] hover:bg-[#4D7CFE] hover:text-white hover:border-[#4D7CFE] transition-all shadow-sm cursor-pointer"
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
        
        {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 bg-white">
                <div className="w-20 h-20 bg-[#4D7CFE1A] rounded-full flex items-center justify-center mb-4">
                    <Search size={32} className="text-[#4D7CFE]" />
                </div>
                <h3 className="text-[#111111] font-bold text-lg">No CPA accounts found</h3>
                <p className="text-sm text-[#9499A1] mt-1">Try adjusting your search filters.</p>
            </div>
        )}
      </div>
    </div>
  );
}