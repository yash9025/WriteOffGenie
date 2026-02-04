import React, { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import toast, { Toaster } from "react-hot-toast";
import { 
  Loader2, X, Search,
  Building2, User
} from "lucide-react";


// --- CUSTOM ICONS ---
export const RevenueIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 9.5L12 7.5L15 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 12H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CommissionIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.5 10C9.32843 10 10 9.32843 10 8.5C10 7.67157 9.32843 7 8.5 7C7.67157 7 7 7.67157 7 8.5C7 9.32843 7.67157 10 8.5 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15.5 17C16.3284 17 17 16.3284 17 15.5C17 14.6716 16.3284 14 15.5 14C14.6716 14 14 14.6716 14 15.5C14 16.3284 14.6716 17 15.5 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 8L8 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const WithdrawalIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.04 13.55C17.62 13.96 17.38 14.55 17.44 15.18C17.53 16.26 18.52 17.05 19.6 17.05H21.5V18.24C21.5 20.31 19.81 22 17.74 22H6.26C4.19 22 2.5 20.31 2.5 18.24V11.51C2.5 9.44 4.19 7.75 6.26 7.75H17.74C19.81 7.75 21.5 9.44 21.5 11.51V12.95H19.48C18.92 12.95 18.41 13.17 18.04 13.55Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2.5 12.41V7.84C2.5 6.65 3.23 5.59 4.34 5.17L12.28 2.17C13.52 1.7 14.85 2.62 14.85 3.95V7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22.56 13.97V16.03C22.56 16.58 22.12 17.03 21.56 17.05H19.6C18.52 17.05 17.53 16.26 17.44 15.18C17.38 14.55 17.62 13.96 18.04 13.55C18.41 13.17 18.92 12.95 19.48 12.95H21.56C22.12 12.97 22.56 13.42 22.56 13.97Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

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
  }, [payout]);

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
           
           {/* Section 1: CA Information */}
           <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <User size={14} /> CA Information
              </h4>
              {loadingPartner ? (
                 <div className="h-20 bg-slate-50 animate-pulse rounded-xl"></div>
              ) : (
                 <div className="grid grid-cols-2 gap-y-6">
                    <div><p className="text-xs text-slate-400 font-medium mb-1">Full name</p><p className="text-sm font-bold text-slate-900">{partner?.name || payout.partnerName}</p></div>
                    <div><p className="text-xs text-slate-400 font-medium mb-1">Email address</p><p className="text-sm font-bold text-slate-900">{partner?.email || "N/A"}</p></div>
                    <div><p className="text-xs text-slate-400 font-medium mb-1">Phone number</p><p className="text-sm font-bold text-slate-900">{partner?.phone || "N/A"}</p></div>
                    <div><p className="text-xs text-slate-400 font-medium mb-1">CA registration number</p><p className="text-sm font-bold text-slate-900">{partner?.referralCode || "N/A"}</p></div>
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
              <div className="grid grid-cols-3 gap-6">
                 <div><p className="text-xs text-slate-400 font-medium mb-1">Bank name</p><p className="text-sm font-bold text-slate-900">{payout.bankSnapshot?.bankName || "N/A"}</p></div>
                 <div><p className="text-xs text-slate-400 font-medium mb-1">Account number</p><p className="text-sm font-bold text-slate-900 font-mono">{payout.bankSnapshot?.accountNo || "N/A"}</p></div>
                 <div><p className="text-xs text-slate-400 font-medium mb-1">IFSC code</p><p className="text-sm font-bold text-slate-900 font-mono">{payout.bankSnapshot?.ifsc || "N/A"}</p></div>
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
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState(null);

  useEffect(() => {
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

  const stats = useMemo(() => {
    return {
        pending: payouts.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0),
        paid: payouts.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0),
        rejected: payouts.filter(p => p.status === 'rejected').reduce((acc, p) => acc + p.amount, 0),
    };
  }, [payouts]);

  const sortedPayouts = useMemo(() => {
    return [...payouts].sort((a, b) => {
        const priority = { pending: 0, approved: 1, paid: 2, rejected: 3 };
        const scoreA = priority[a.status] ?? 99;
        const scoreB = priority[b.status] ?? 99;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return b.requestedAt - a.requestedAt;
    });
  }, [payouts]);

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

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32}/></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-slate-900 pb-20">
      <Toaster 
        position="top-right" 
        toastOptions={{ duration: 4000, style: { borderRadius: '12px', padding: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.12)' } }}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Withdrawals</h1>
            <p className="text-sm text-slate-500 mt-1">Review, approve, and track CA withdrawal requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-slate-400 font-medium">Pending Amount</p>
                <div className="p-2.5 rounded-full bg-[rgba(77,124,254,0.1)]"><RevenueIcon /></div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">${stats.pending.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 mt-2">Total value of withdrawals awaiting action</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-slate-400 font-medium">Paid Amount</p>
                <div className="p-2.5 rounded-full bg-[rgba(77,124,254,0.1)]"><WithdrawalIcon /></div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">${stats.paid.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 mt-2">Total withdrawals completed in selected period</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-slate-400 font-medium">Rejected Amount</p>
                <div className="p-2.5 rounded-full bg-[rgba(77,124,254,0.1)]"><CommissionIcon /></div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">${stats.rejected.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 mt-2">Total value of rejected withdrawals</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="py-5 px-6 text-[11px] font-medium text-slate-400 uppercase tracking-wide">Date</th>
                <th className="py-5 px-6 text-[11px] font-medium text-slate-400 uppercase tracking-wide">CA Name</th>
                <th className="py-5 px-6 text-[11px] font-medium text-slate-400 uppercase tracking-wide">Amount</th>
                <th className="py-5 px-6 text-[11px] font-medium text-slate-400 uppercase tracking-wide">Bank Account</th>
                <th className="py-5 px-6 text-[11px] font-medium text-slate-400 uppercase tracking-wide text-center">Status</th>
                <th className="py-5 px-6 text-[11px] font-medium text-slate-400 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedPayouts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-5 px-6 text-sm font-medium text-slate-600">{formatDate(p.requestedAt)}</td>
                  <td className="py-5 px-6 text-sm font-medium text-slate-900">{p.partnerName}</td>
                  <td className="py-5 px-6 text-sm font-bold text-slate-900">${p.amount.toLocaleString()}</td>
                  <td className="py-5 px-6 text-sm text-slate-600 flex items-center gap-1">
                      <span className="font-medium">{p.bankSnapshot?.bankName || "Unknown Bank"}</span>
                      <span className="text-slate-400 text-xs">•••• {p.bankSnapshot?.accountNo?.slice(-4) || "0000"}</span>
                  </td>
                  <td className="py-5 px-6 text-center">{getStatusBadge(p.status)}</td>
                  <td className="py-5 px-6 text-right">
                      <button 
                        onClick={() => setSelectedPayout(p)} 
                        className="px-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm cursor-pointer"
                      >
                        View Details
                      </button>
                  </td>
                </tr>
              ))}
              {sortedPayouts.length === 0 && (
                 <tr>
                    <td colSpan="6" className="py-24 text-center">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                <Search size={24}/>
                            </div>
                            <p className="text-slate-900 font-bold">No withdrawal requests</p>
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