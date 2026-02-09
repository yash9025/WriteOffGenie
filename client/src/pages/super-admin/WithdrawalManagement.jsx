import React, { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import toast, { Toaster } from "react-hot-toast";
import { 
  Loader2, X, Search, Clock, Wallet, ShieldAlert, User, Building2
} from "../../components/Icons";

// --- REJECTION REASON MODAL ---
const RejectReasonModal = ({ onConfirm, onCancel, processing }) => {
  const [reason, setReason] = useState("");
  
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Reject Withdrawal</h3>
          <p className="text-sm text-slate-500 mt-1">Please provide a reason for rejection</p>
        </div>
        <div className="p-6">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all resize-none"
            rows={4}
            autoFocus
          />
        </div>
        <div className="px-6 py-4 bg-slate-50 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={processing}
            className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium text-sm hover:bg-white transition-all disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || processing}
            className="px-5 py-2.5 rounded-lg bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {processing && <Loader2 className="animate-spin" size={16}/>}
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
};

// --- WITHDRAWAL DETAILS MODAL (Admin Action Modal) ---
const WithdrawalModal = ({ payout, onClose, onAction }) => {
  const [partner, setPartner] = useState(null);
  const [loadingPartner, setLoadingPartner] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        if (!payout.partner_id) return;
        const docSnap = await getDoc(doc(db, "Partners", payout.partner_id));
        if (docSnap.exists()) {
          setPartner(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching partner:", error);
      } finally {
        setLoadingPartner(false);
      }
    };
    fetchPartner();
  }, [payout.partner_id]);

  const handleAction = async (decision) => {
    setProcessing(true);
    await onAction(payout.id, decision, payout.amount);
    setProcessing(false);
    if (decision !== 'approve') onClose(); 
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold">Pending</span>;
      case 'approved': return <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">Approved</span>;
      case 'paid': return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">Paid</span>;
      case 'rejected': return <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold">Rejected</span>;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden scale-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
           <h3 className="text-xl font-bold text-slate-900">Withdrawal Details</h3>
           <button 
             onClick={onClose} 
             className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors cursor-pointer"
           >
             <X size={20}/>
           </button>
        </div>

        {/* Modal Content */}
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
           
           {/* Section 1: CPA Information */}
           <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <User size={14} /> CPA Information
              </h4>
              {loadingPartner ? (
                 <div className="h-20 bg-slate-50 animate-pulse rounded-xl"></div>
              ) : (
                 <div className="grid grid-cols-2 gap-y-6">
                    <div><p className="text-xs text-slate-400 font-medium mb-1">Full name</p><p className="text-sm font-bold text-slate-900">{partner?.name || payout.partnerName}</p></div>
                    <div><p className="text-xs text-slate-400 font-medium mb-1">Email address</p><p className="text-sm font-bold text-slate-900">{partner?.email || "N/A"}</p></div>
                    <div><p className="text-xs text-slate-400 font-medium mb-1">Phone number</p><p className="text-sm font-bold text-slate-900">{partner?.phone || "N/A"}</p></div>
                    <div><p className="text-xs text-slate-400 font-medium mb-1">CPA referral code</p><p className="text-sm font-bold text-slate-900">{partner?.referralCode || "N/A"}</p></div>
                 </div>
              )}
           </div>

           <div className="h-px bg-slate-100 w-full"></div>

           {/* Section 2: Withdrawal Details */}
           <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Withdrawal Details</h4>
              <div className="grid grid-cols-3 gap-6">
                 <div><p className="text-xs text-slate-400 font-medium mb-1">Requested amount</p><p className="text-lg font-bold text-slate-900">${payout.amount.toLocaleString()}</p></div>
                 <div><p className="text-xs text-slate-400 font-medium mb-1">Request date</p><p className="text-sm font-bold text-slate-900">{formatDate(payout.requestedAt)}</p></div>
                 <div><p className="text-xs text-slate-400 font-medium mb-1">Status</p>{getStatusBadge(payout.status)}</div>
              </div>
           </div>

           <div className="h-px bg-slate-100 w-full"></div>

           {/* Section 3: Bank Details */}
           <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Building2 size={14} /> Bank details
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 <div><p className="text-xs text-slate-400 font-medium mb-1">Company Name</p><p className="text-sm font-bold text-slate-900">{payout.bankSnapshot?.companyName || "N/A"}</p></div>
                 <div><p className="text-xs text-slate-400 font-medium mb-1">Routing Number</p><p className="text-sm font-bold text-slate-900 font-mono">{payout.bankSnapshot?.routingNumber || "N/A"}</p></div>
                 <div><p className="text-xs text-slate-400 font-medium mb-1">Account Number</p><p className="text-sm font-bold text-slate-900 font-mono">{payout.bankSnapshot?.accountNumber || "N/A"}</p></div>
                 <div><p className="text-xs text-slate-400 font-medium mb-1">Account Type</p><p className="text-sm font-bold text-slate-900 capitalize">{payout.bankSnapshot?.accountType || "N/A"}</p></div>
              </div>
           </div>
        </div>

        {/* Modal Footer (Actions) */}
        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 flex gap-4 justify-end">
           {payout.status === 'pending' && (
             <>
               <button 
                 onClick={() => setShowRejectModal(true)} 
                 disabled={processing} 
                 className="px-6 py-2.5 rounded-lg border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-all disabled:opacity-50 cursor-pointer"
               >
                 Reject
               </button>
               <button 
                 onClick={() => handleAction('approve')} 
                 disabled={processing} 
                 className="px-6 py-2.5 rounded-lg bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
               >
                 {processing && <Loader2 className="animate-spin" size={16}/>} Approve
               </button>
             </>
           )}
           
           {/* Rejection Reason Modal */}
           {showRejectModal && (
             <RejectReasonModal
               processing={processing}
               onCancel={() => setShowRejectModal(false)}
               onConfirm={async (reason) => {
                 setProcessing(true);
                 await onAction(payout.id, 'reject', payout.amount, reason);
                 setProcessing(false);
                 setShowRejectModal(false);
               }}
             />
           )}
           {payout.status === 'approved' && (
             <>
               <button 
                 onClick={onClose} 
                 className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white transition-all cursor-pointer"
               >
                 Close
               </button>
               <button 
                 onClick={() => handleAction('mark_paid')} 
                 disabled={processing} 
                 className="px-6 py-2.5 rounded-lg bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
               >
                 {processing && <Loader2 className="animate-spin" size={16}/>} Mark as paid
               </button>
             </>
           )}
           {(payout.status === 'paid' || payout.status === 'rejected') && (
              <button 
                onClick={onClose} 
                className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-sm hover:bg-white bg-white shadow-sm transition-all w-full md:w-auto cursor-pointer"
              >
                Close
              </button>
           )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function WithdrawalManagement() {
  const [payouts, setPayouts] = useState([]);
  const [partners, setPartners] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'agent', 'cpa'

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const partnersSnap = await getDocs(collection(db, "Partners"));
        const partnersMap = {};
        partnersSnap.forEach(doc => {
          const data = doc.data();
          partnersMap[doc.id] = {
            name: data.displayName || data.name || "Unknown",
            role: data.role || 'cpa'
          };
        });
        setPartners(partnersMap);
      } catch (err) {
        console.error("Error fetching partners:", err);
      }
    };

    fetchPartners();

    // Real-time listener for Payouts
    const q = query(collection(db, "Payouts"), orderBy("requestedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setPayouts(snapshot.docs.map(doc => ({ 
        id: doc.id, ...doc.data(),
        requestedAt: doc.data().requestedAt?.toDate() || new Date()
      })));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  // Filter payouts by role
  const filteredPayouts = useMemo(() => {
    if (roleFilter === 'all') return payouts;
    return payouts.filter(p => {
      // Use partnerRole from payout if available, otherwise lookup from partners map
      const partnerRole = p.partnerRole || partners[p.partner_id]?.role || 'ca';
      return roleFilter === partnerRole;
    });
  }, [payouts, roleFilter, partners]);

  const stats = useMemo(() => {
    return {
        pending: filteredPayouts.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0),
        paid: filteredPayouts.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0),
        rejected: filteredPayouts.filter(p => p.status === 'rejected').reduce((acc, p) => acc + p.amount, 0),
    };
  }, [filteredPayouts]);

  const sortedPayouts = useMemo(() => {
    return [...filteredPayouts].map(p => ({
      ...p,
      partnerName: p.partnerName || partners[p.partner_id]?.name || "Unknown",
      partnerRole: p.partnerRole || partners[p.partner_id]?.role || "ca"
    })).sort((a, b) => {
        const priority = { pending: 0, approved: 1, paid: 2, rejected: 3 };
        const scoreA = priority[a.status] ?? 99;
        const scoreB = priority[b.status] ?? 99;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return b.requestedAt - a.requestedAt;
    });
  }, [filteredPayouts, partners]);

  const handlePayoutAction = async (id, decision, amount, rejectionReason = null) => {
    const loadingToast = toast.loading(
      decision === 'approve' ? 'Approving withdrawal...' : 
      decision === 'reject' ? 'Processing rejection...' : 
      'Marking as paid...',
      { style: { borderRadius: '12px', background: '#1e293b', color: '#fff', padding: '16px' } }
    );
    
    try {
        const fn = httpsCallable(getFunctions(), 'processWithdrawal');
        let payload = { payoutId: id, decision };
        
        if (decision === 'reject' && rejectionReason) {
            payload.rejectionReason = rejectionReason;
        } 
        else if (decision === 'mark_paid') {
            payload.transactionRef = "Manual-Transfer-" + Date.now(); 
        }

        await fn(payload);
        toast.dismiss(loadingToast);
        
        if (decision === 'approve') {
          toast.success('Withdrawal approved successfully!', { icon: '✅', style: { borderRadius: '12px', background: '#10b981', color: '#fff', padding: '16px', fontWeight: '500' }, duration: 4000 });
        } else if (decision === 'reject') {
          toast.success('Withdrawal rejected', { icon: '🚫', style: { borderRadius: '12px', background: '#ef4444', color: '#fff', padding: '16px', fontWeight: '500' }, duration: 4000 });
        } else if (decision === 'mark_paid') {
          toast.success('Payment marked as complete!', { icon: '💰', style: { borderRadius: '12px', background: '#10b981', color: '#fff', padding: '16px', fontWeight: '500' }, duration: 4000 });
        }
        
        setSelectedPayout(null);
    } catch (e) { 
        console.error(e);
        toast.dismiss(loadingToast);
        toast.error(e.message || 'Action failed. Please try again.', { icon: '❌', style: { borderRadius: '12px', background: '#dc2626', color: '#fff', padding: '16px', fontWeight: '500' }, duration: 5000 }); 
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
        pending: "bg-amber-50 text-amber-600 border-amber-100",
        approved: "bg-blue-50 text-blue-600 border-blue-100",
        paid: "bg-emerald-50 text-emerald-600 border-emerald-100",
        rejected: "bg-red-50 text-red-600 border-red-100",
    };
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.pending} capitalize`}>
            {status}
        </span>
    );
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#4D7CFE]" size={32}/></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-[#111111] pb-20">
      <Toaster 
        position="top-right" 
        toastOptions={{ duration: 4000, style: { borderRadius: '12px', padding: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.12)' } }}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
            <h1 className="text-2xl font-bold text-[#111111]">Withdrawals</h1>
            <p className="text-sm text-[#9499A1] mt-1">Review, approve, and track Agent & CPA withdrawal requests</p>
        </div>
      </div>

      {/* Tabs for filtering by role */}
      <div className="flex gap-2 border-b border-[#E3E6EA]">
        <button
          onClick={() => setRoleFilter('all')}
          className={`px-6 py-3 text-sm font-semibold transition-colors ${
            roleFilter === 'all'
              ? 'border-b-2 border-[#4D7CFE] text-[#4D7CFE]'
              : 'text-[#9499A1] hover:text-[#111111]'
          }`}
        >
          All Withdrawals
        </button>
        <button
          onClick={() => setRoleFilter('agent')}
          className={`px-6 py-3 text-sm font-semibold transition-colors ${
            roleFilter === 'agent'
              ? 'border-b-2 border-[#4D7CFE] text-[#4D7CFE]'
              : 'text-[#9499A1] hover:text-[#111111]'
          }`}
        >
          Agent Withdrawals
        </button>
        <button
          onClick={() => setRoleFilter('cpa')}
          className={`px-6 py-3 text-sm font-semibold transition-colors ${
            roleFilter === 'cpa'
              ? 'border-b-2 border-[#4D7CFE] text-[#4D7CFE]'
              : 'text-[#9499A1] hover:text-[#111111]'
          }`}
        >
          CPA Withdrawals
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E3E6EA] shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-[#9499A1] font-medium">Pending Amount</p>
                <div className="p-2.5 rounded-full bg-[#4D7CFE1A]"><Clock size={24} /></div>
            </div>
            <h3 className="text-3xl font-bold text-[#111111]">${stats.pending.toLocaleString()}</h3>
            <p className="text-[10px] text-[#9499A1] mt-2">Total value of withdrawals awaiting action</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#E3E6EA] shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-[#9499A1] font-medium">Paid Amount</p>
                <div className="p-2.5 rounded-full bg-[#4D7CFE1A]"><Wallet size={24} /></div>
            </div>
            <h3 className="text-3xl font-bold text-[#111111]">${stats.paid.toLocaleString()}</h3>
            <p className="text-[10px] text-[#9499A1] mt-2">Total withdrawals completed in selected period</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#E3E6EA] shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-[#9499A1] font-medium">Rejected Amount</p>
                <div className="p-2.5 rounded-full bg-[#4D7CFE1A]"><ShieldAlert size={24} /></div>
            </div>
            <h3 className="text-3xl font-bold text-[#111111]">${stats.rejected.toLocaleString()}</h3>
            <p className="text-[10px] text-[#9499A1] mt-2">Total value of rejected withdrawals</p>
        </div>
      </div>

      <div className="bg-white border border-[#E3E6EA] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="py-5 px-6 text-[11px] font-medium text-[#9499A1] uppercase tracking-wide">Date</th>
                <th className="py-5 px-6 text-[11px] font-medium text-[#9499A1] uppercase tracking-wide">Partner Name</th>
                <th className="py-5 px-6 text-[11px] font-medium text-[#9499A1] uppercase tracking-wide">Role</th>
                <th className="py-5 px-6 text-[11px] font-medium text-[#9499A1] uppercase tracking-wide">Amount</th>
                <th className="py-5 px-6 text-[11px] font-medium text-[#9499A1] uppercase tracking-wide">Bank Account</th>
                <th className="py-5 px-6 text-[11px] font-medium text-[#9499A1] uppercase tracking-wide text-center">Status</th>
                <th className="py-5 px-6 text-[11px] font-medium text-[#9499A1] uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedPayouts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-5 px-6 text-sm font-medium text-[#9499A1]">{formatDate(p.requestedAt)}</td>
                  <td className="py-5 px-6 text-sm font-medium text-[#111111]">{p.partnerName}</td>
                  <td className="py-5 px-6">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                      p.partnerRole === 'agent' 
                        ? 'bg-[#4D7CFE1A] text-[#4D7CFE]' 
                        : 'bg-[#00C8531A] text-[#00C853]'
                    }`}>
                      {p.partnerRole === 'agent' ? 'Agent' : 'CPA'}
                    </span>
                  </td>
                  <td className="py-5 px-6 text-sm font-bold text-[#111111]">${p.amount.toLocaleString()}</td>
                  <td className="py-5 px-6 text-sm text-[#9499A1] flex items-center gap-1">
                      <span className="font-medium">{p.bankSnapshot?.companyName || "Bank Account"}</span>
                      <span className="text-[#9499A1] text-xs">•••• {p.bankSnapshot?.accountNumber?.slice(-4) || "0000"}</span>
                  </td>
                  <td className="py-5 px-6 text-center">{getStatusBadge(p.status)}</td>
                  <td className="py-5 px-6 text-right">
                      <button 
                        onClick={() => setSelectedPayout(p)} 
                        className="px-4 py-1.5 border border-[#E3E6EA] rounded-lg text-xs font-bold text-[#9499A1] hover:bg-[#4D7CFE] hover:text-white hover:border-[#4D7CFE] transition-all shadow-sm cursor-pointer"
                      >
                        View Details
                      </button>
                  </td>
                </tr>
              ))}
              {sortedPayouts.length === 0 && (
                 <tr>
                    <td colSpan="7" className="py-24 text-center">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-[#4D7CFE1A] rounded-full flex items-center justify-center mb-4 text-[#4D7CFE]">
                                <Search size={24}/>
                            </div>
                            <h3 className="text-[#111111] font-bold text-lg">No Withdrawals Found</h3>
                            <p className="text-[#9499A1] text-sm mt-1">
                                {roleFilter === 'all' 
                                  ? 'No withdrawal requests yet' 
                                  : roleFilter === 'agent'
                                    ? 'No Agent withdrawal requests'
                                    : 'No CPA withdrawal requests'
                                }
                            </p>
                        </div>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPayout && <WithdrawalModal payout={selectedPayout} onClose={() => setSelectedPayout(null)} onAction={handlePayoutAction} />}
    </div>
  );
}