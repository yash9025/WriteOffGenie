import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import toast, { Toaster } from "react-hot-toast";
import { 
  Check, X, Loader2, Building2, CreditCard, Wallet, 
  Clock, AlertCircle, FileText, CheckCircle2, XCircle, Copy
} from "lucide-react";

export default function WithdrawalManagement() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'history'
  
  // Bank Modal State
  const [selectedBank, setSelectedBank] = useState(null);
  const [bankLoading, setBankLoading] = useState(false);

  // 1. Live Listen to ALL Payouts
  useEffect(() => {
    // 🚀 Index Requirement: If this fails, create index: Payouts (requestedAt DESC)
    const q = query(collection(db, "Payouts"), orderBy("requestedAt", "desc"));
    
    const unsub = onSnapshot(q, (s) => {
      setPayouts(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
        console.error("Index missing or permission denied:", error);
        setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Filter Data based on Tab
  const filteredPayouts = payouts.filter(p => 
    activeTab === "pending" ? p.status === "pending" : p.status !== "pending"
  );

  // 3. View Bank Details (Secure Fetch from Subcollection)
  const viewBankDetails = async (partnerId, partnerName) => {
    setBankLoading(partnerId);
    try {
      const docRef = doc(db, "Partners", partnerId, "Sensitive", "BankDetails");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSelectedBank({ ...docSnap.data(), partnerName });
      } else {
        toast.error("No bank details found for this partner.");
      }
    } catch (error) { 
        console.error(error); 
        toast.error("Access Denied: You cannot view sensitive data."); 
    } finally { 
        setBankLoading(false); 
    }
  };

  // 4. Handle Approve (Triggers Cloud Function)
  const handleApprove = async (id, amount) => {
    // 🛑 Admin must input the Bank Transaction Ref (UTR)
    const txnRef = window.prompt(`⚠️ CONFIRM PAYMENT\n\nHave you transferred ₹${amount}?\nEnter the Bank Transaction ID / UTR Number:`);
    
    if (!txnRef) return; // Cancelled

    setProcessing(id);
    const toastId = toast.loading("Verifying transaction...");

    try {
      const fn = httpsCallable(getFunctions(), 'processWithdrawal');
      await fn({ payoutId: id, decision: 'approve', transactionRef: txnRef });
      toast.success("Payout Approved & Logged!", { id: toastId });
    } catch (e) { 
        toast.error(e.message, { id: toastId }); 
    } finally { 
        setProcessing(null); 
    }
  };

  // 5. Handle Reject (Triggers Cloud Function)
  const handleReject = async (id) => {
    const reason = window.prompt("Enter rejection reason (Partner will be refunded):");
    if (!reason) return; 

    setProcessing(id);
    const toastId = toast.loading("Processing refund...");

    try {
      const fn = httpsCallable(getFunctions(), 'processWithdrawal');
      await fn({ payoutId: id, decision: 'reject', rejectionReason: reason });
      toast.success("Request Rejected & Refunded.", { id: toastId });
    } catch (e) { 
        toast.error(e.message, { id: toastId }); 
    } finally { 
        setProcessing(null); 
    }
  };

  if (loading) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-slate-900 pb-20">
      <Toaster position="bottom-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-6">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Treasury Manager</h1>
           <p className="text-slate-500 font-medium mt-1">Review requests and settle payouts.</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
                onClick={() => setActiveTab("pending")}
                className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                Pending ({payouts.filter(p => p.status === 'pending').length})
            </button>
            <button 
                onClick={() => setActiveTab("history")}
                className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                History
            </button>
        </div>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredPayouts.length === 0 && (
            <div className="text-center py-24 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300 mx-auto">
                    {activeTab === 'pending' ? <CheckCircle2 size={32} /> : <FileText size={32} />}
                </div>
                <p className="text-slate-900 font-bold">All caught up!</p>
                <p className="text-slate-500 text-sm">No {activeTab} payouts found.</p>
            </div>
        )}

        {filteredPayouts.map(req => (
          <div key={req.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center justify-between gap-6 group">
            
            {/* Left: Info */}
            <div className="flex gap-5 items-center w-full md:w-auto">
               <div className={`p-4 rounded-2xl ${
                   req.status === 'pending' ? 'bg-amber-50 text-amber-600' : 
                   req.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
               }`}>
                   <Wallet size={24} strokeWidth={2.5}/>
               </div>
               <div>
                 <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-black text-slate-900 tabular-nums">₹{req.amount.toLocaleString()}</h3>
                    {req.status === 'pending' && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase tracking-wider">Pending</span>}
                    {req.status === 'paid' && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-wider">Paid</span>}
                    {req.status === 'rejected' && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase tracking-wider">Rejected</span>}
                 </div>
                 <p className="text-sm font-bold text-slate-600">{req.partnerName}</p>
                 <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-medium">
                    <Clock size={12}/> Requested: {req.requestedAt?.toDate().toLocaleDateString()}
                    {req.transactionRef && <span className="text-slate-300">|</span>}
                    {req.transactionRef && <span className="font-mono text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded">Ref: {req.transactionRef}</span>}
                 </div>
               </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto">
               {/* View Bank Button */}
               <button 
                 onClick={() => viewBankDetails(req.partner_id, req.partnerName)}
                 disabled={bankLoading === req.partner_id}
                 className="px-4 py-3 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs hover:bg-slate-100 hover:text-blue-600 border border-slate-200 transition-all flex items-center gap-2"
               >
                 {bankLoading === req.partner_id ? <Loader2 className="animate-spin" size={14}/> : <Building2 size={14}/>}
                 {activeTab === 'pending' ? 'View Bank' : 'Details'}
               </button>

               {/* Actions (Only for Pending) */}
               {activeTab === 'pending' && (
                 <>
                    <button 
                      disabled={processing === req.id}
                      onClick={() => handleReject(req.id)}
                      className="px-4 py-3 rounded-xl bg-white text-red-500 font-bold text-xs hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all"
                    >
                      Reject
                    </button>
                    <button 
                      disabled={processing === req.id}
                      onClick={() => handleApprove(req.id, req.amount)}
                      className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 shadow-md"
                    >
                      {processing === req.id ? <Loader2 className="animate-spin" size={14}/> : <Check size={14}/>} 
                      Approve & Pay
                    </button>
                 </>
               )}
            </div>
          </div>
        ))}
      </div>

      {/* 🏦 BANK DETAILS MODAL */}
      {selectedBank && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-0 max-w-sm w-full shadow-2xl overflow-hidden scale-100">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-start">
               <div>
                  <h3 className="text-lg font-black text-slate-900">Transfer Details</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{selectedBank.partnerName}</p>
               </div>
               <button onClick={() => setSelectedBank(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X size={18}/></button>
            </div>
            
            <div className="p-6 space-y-5">
               <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-3 items-start">
                  <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0"/>
                  <p className="text-[11px] font-bold text-amber-800 leading-tight">
                    Manually transfer funds using these details. 
                    <br/>You will need to enter the UTR number to approve.
                  </p>
               </div>

               <div className="space-y-4">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100"><Building2 size={20}/></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Bank Name</p><p className="text-sm font-bold text-slate-900">{selectedBank.bankName}</p></div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><CreditCard size={20}/></div>
                      <div className="flex-1"><p className="text-[10px] font-bold text-slate-400 uppercase">Account Number</p><p className="text-lg font-mono font-bold text-slate-900 select-all">{selectedBank.accountNo}</p></div>
                      <button onClick={() => {navigator.clipboard.writeText(selectedBank.accountNo); toast.success("Copied!")}} className="text-slate-300 hover:text-blue-600"><Copy size={18}/></button>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100"><Wallet size={20}/></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">IFSC Code</p><p className="text-sm font-mono font-bold text-slate-900 select-all">{selectedBank.ifsc}</p></div>
                      <button onClick={() => {navigator.clipboard.writeText(selectedBank.ifsc); toast.success("Copied!")}} className="text-slate-300 hover:text-blue-600"><Copy size={18}/></button>
                   </div>
               </div>
            </div>
            
            <div className="p-6 pt-0">
               <button onClick={() => setSelectedBank(null)} className="w-full py-3.5 font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 rounded-2xl shadow-lg transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}