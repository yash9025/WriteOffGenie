import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import toast, { Toaster } from "react-hot-toast";
import { 
  Search, Loader2, Ban, CheckCircle2, UserPlus, X 
} from "lucide-react";

export default function CAManagement() {
  const [cas, setCas] = useState([]);
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
    const q = query(collection(db, "Partners"), where("role", "==", "ca"));
    const unsub = onSnapshot(q, (s) => {
      setCas(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
      await fn({ targetUserId: id, action: newStatus }); // Sends 'inactive' or 'active'
      toast.success(`Account marked as ${newStatus}`, { id: toastId });
    } catch (e) { 
        console.error(e);
        toast.error("Update Failed: " + e.message, { id: toastId }); 
    } finally { 
        setProcessing(null); 
    }
  };

  const goToPartnerDetail = (partnerId) => {
    navigate(`/admin/cas/${partnerId}`);
  };

  const filtered = cas.filter(ca => 
    ca.name?.toLowerCase().includes(filter) || 
    ca.email?.toLowerCase().includes(filter)
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
           <h1 className="text-2xl font-semibold leading-9 text-slate-900">CPA Management</h1>
           <p className="text-base font-normal leading-6 text-slate-400">View, manage, and control Chartered Public Accountant accounts</p>
         </div>
         <button
           onClick={() => setShowInviteModal(true)}
           className="flex items-center gap-2 px-5 py-2.5 bg-[#011C39] text-white rounded-lg text-sm font-semibold hover:bg-[#022a55] transition-colors cursor-pointer"
         >
           <UserPlus size={18} />
           Invite CPA
         </button>
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#011C39] transition-colors"
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#011C39] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={inviteForm.commissionRate}
                  onChange={(e) => setInviteForm({ ...inviteForm, commissionRate: parseInt(e.target.value) || 10 })}
                  placeholder="10"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#011C39] transition-colors"
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
                  className="flex-1 px-4 py-2.5 bg-[#011C39] text-white rounded-lg text-sm font-semibold hover:bg-[#022a55] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
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
                <th className="py-5 px-6 text-xs font-medium text-slate-400">CA Name</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400">Email</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400">Joined On</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400">Referred Users</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400">Total Earnings</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400 text-center">Status</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((ca) => {
                 const isActive = ca.status === 'active';
                 return (
                   <tr key={ca.id} className="hover:bg-slate-50/50 transition-colors group">
                     
                     {/* Name */}
                     <td className="py-5 px-6">
                        <span className="text-sm font-semibold text-slate-900">{ca.name}</span>
                     </td>

                     {/* Email */}
                     <td className="py-5 px-6">
                        <span className="text-sm text-slate-500 font-medium">{ca.email}</span>
                     </td>

                     {/* Joined Date */}
                     <td className="py-5 px-6">
                        <span className="text-sm text-slate-500">{formatDate(ca.createdAt)}</span>
                     </td>

                     {/* Referred Users */}
                     <td className="py-5 px-6">
                        <span className="text-sm font-medium text-slate-700 ml-2">{ca.stats?.totalReferred || 0}</span>
                     </td>

                     {/* Earnings */}
                     <td className="py-5 px-6">
                        <span className="text-sm font-bold text-slate-900">${(ca.stats?.totalEarnings || 0).toLocaleString()}</span>
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
                               onClick={() => toggleStatus(ca.id, ca.status)}
                               disabled={processing === ca.id}
                               className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                               title={isActive ? "Disable Account" : "Activate Account"}
                           >
                               {processing === ca.id ? <Loader2 size={16} className="animate-spin"/> : (isActive ? <Ban size={16}/> : <CheckCircle2 size={16}/>)}
                           </button>

                           <button 
                               onClick={() => goToPartnerDetail(ca.id)}
                               className="px-5 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm cursor-pointer"
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
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Search size={32} className="text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-bold text-lg">No CA accounts yet</h3>
                <p className="text-slate-500 text-sm mt-1">CA accounts will appear here once they register.</p>
            </div>
        )}
      </div>
    </div>
  );
}