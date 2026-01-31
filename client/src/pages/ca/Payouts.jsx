import React, { useState, useEffect, useMemo } from "react";
import { doc, onSnapshot, collection, query, where, getDoc, setDoc } from "firebase/firestore"; 
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import toast, { Toaster } from "react-hot-toast"; 
import { 
  Wallet, Loader2, Building2, CreditCard, ArrowDownToLine,
  History, AlertCircle, CheckCircle2, Clock, XCircle, Shield
} from "lucide-react";

export default function Payouts() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankInfo, setBankInfo] = useState({ accountNo: "", ifsc: "", bankName: "" });

  // --- 1. REAL-TIME DATA LISTENERS ---
  useEffect(() => {
    if (!user) return;
    
    // Listen to Profile (For Wallet Balance)
    const unsubProfile = onSnapshot(doc(db, "Partners", user.uid), (s) => {
      if (s.exists()) setProfile(s.data());
    });

    // Check Bank Details
    const checkBank = async () => {
      try {
        const bankDoc = await getDoc(doc(db, "Partners", user.uid, "Sensitive", "BankDetails"));
        if (bankDoc.exists()) {
          setHasBankDetails(true);
          setBankInfo(bankDoc.data());
        }
      } catch (e) { console.error("Bank fetch error", e); }
    };
    checkBank();

    // Listen to Payout History
    const q = query(
      collection(db, "Payouts"), 
      where("partner_id", "==", user.uid)
    );
    
    const unsubHistory = onSnapshot(q, (s) => {
      const rawDocs = s.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side to avoid index issues
      const sortedDocs = rawDocs.sort((a, b) => {
        const dateA = a.requestedAt?.toDate ? a.requestedAt.toDate() : new Date(0);
        const dateB = b.requestedAt?.toDate ? b.requestedAt.toDate() : new Date(0);
        return dateB - dateA; // Newest first
      });
      setHistory(sortedDocs);
      setLoading(false);
    });

    return () => { unsubProfile(); unsubHistory(); };
  }, [user]);

  // --- 2. CALCULATIONS (Real-Time) ---
  const currentBalance = profile?.walletBalance || 0;

  // Calculate stats directly from history to ensure accuracy
  const stats = useMemo(() => {
    return history.reduce((acc, curr) => {
      if (curr.status === 'paid') {
        acc.totalWithdrawn += (curr.amount || 0);
        acc.completedCount += 1;
      } else if (curr.status === 'pending') {
        acc.pendingCount += 1;
      }
      return acc;
    }, { totalWithdrawn: 0, completedCount: 0, pendingCount: 0 });
  }, [history]);

  // --- 3. ACTIONS ---
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!hasBankDetails) return toast.error("Please link your bank account first");
    if (isNaN(amount) || amount < 500) return toast.error("Minimum withdrawal is ₹500");
    if (amount > currentBalance) return toast.error("Insufficient wallet balance");

    setIsRequesting(true);
    const toastId = toast.loading("Processing withdrawal...");

    try {
      const functions = getFunctions();
      const requestWithdrawalFn = httpsCallable(functions, 'requestWithdrawal');
      const result = await requestWithdrawalFn({ amount });
      
      if (result.data.success) {
        toast.success(`Withdrawal of ₹${amount} initiated successfully`, { id: toastId });
        setWithdrawAmount("");
      }
    } catch (error) {
      console.error("Payout Error:", error);
      toast.error(error.message || "Failed to process withdrawal", { id: toastId });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleBankSync = async (e) => {
    e.preventDefault();
    if(!bankInfo.accountNo || !bankInfo.ifsc) return toast.error("Please fill all required fields");

    setIsSyncing(true);
    const toastId = toast.loading("Saving bank details...");

    try {
      await setDoc(doc(db, "Partners", user.uid, "Sensitive", "BankDetails"), bankInfo);
      setHasBankDetails(true);
      toast.success("Bank details updated successfully", { id: toastId });
    } catch (error) {
      toast.error("Failed to save bank details", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusConfig = (status) => {
    switch(status) {
      case 'pending': return { icon: Clock, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
      case 'paid': return { icon: CheckCircle2, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
      case 'rejected': return { icon: XCircle, color: 'red', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
      default: return { icon: AlertCircle, color: 'slate', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={48} strokeWidth={2.5} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      <Toaster position="top-right" toastOptions={{
          style: { background: '#0f172a', color: '#fff', borderRadius: '12px', fontSize: '14px', fontWeight: '600', padding: '16px 20px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { style: { background: '#fff', color: '#ef4444', border: '1px solid #fee2e2' }, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-8 bg-indigo-600 rounded-full" />
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Financial Management</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Payouts & Withdrawals</h1>
        <p className="text-slate-600">Lifetime Earnings: <span className="font-bold text-slate-900">₹{(currentBalance + stats.totalWithdrawn).toLocaleString()}</span></p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Card 1: Available Balance */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
              <Wallet size={24} strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold bg-white/10 px-3 py-1 rounded-lg">Wallet</span>
          </div>
          <p className="text-sm text-indigo-100 mb-1">Available to Withdraw</p>
          <p className="text-3xl font-bold">₹{currentBalance.toLocaleString()}</p>
        </div>

        {/* Card 2: Total Withdrawn (Calculated from History) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={24} strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Paid Out</span>
          </div>
          <p className="text-sm text-slate-600 mb-1">Total Withdrawn</p>
          <p className="text-2xl font-bold text-slate-900">
            ₹{stats.totalWithdrawn.toLocaleString()}
          </p>
        </div>

        {/* Card 3: Pending Requests */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock size={24} strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Processing</span>
          </div>
          <p className="text-sm text-slate-600 mb-1">Pending Requests</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats.pendingCount}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        
        {/* Withdrawal Form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <ArrowDownToLine size={24} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Request Withdrawal</h3>
                <p className="text-sm text-slate-600">Minimum amount: ₹500</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Withdrawal Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                  <input 
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-10 pr-24 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-lg font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                  />
                  <button 
                    onClick={() => setWithdrawAmount(currentBalance.toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    Max
                  </button>
                </div>
              </div>

              {!hasBankDetails && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Bank account required</p>
                    <p className="text-sm text-amber-700 mt-0.5">Please add your bank details to process withdrawals</p>
                  </div>
                </div>
              )}

              <button 
                onClick={handleWithdraw} 
                disabled={isRequesting || currentBalance < 500 || !hasBankDetails || !withdrawAmount} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:shadow-none"
              >
                {isRequesting ? <><Loader2 className="animate-spin" size={20} /> Processing...</> : <><ArrowDownToLine size={20} /> Request Withdrawal</>}
              </button>
            </div>
          </div>
        </div>

        {/* Bank Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`relative h-48 rounded-2xl p-6 text-white overflow-hidden shadow-xl transition-all ${hasBankDetails ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-slate-300'}`}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
            <div className="relative h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <Building2 size={32} className={hasBankDetails ? "text-white" : "text-slate-400"} />
                {hasBankDetails && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-lg">
                    <Shield size={12} /> <span className="text-xs font-semibold">Verified</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-white/60 mb-1">Account Number</p>
                  <p className="text-lg font-mono font-semibold tracking-wider">
                    {hasBankDetails ? `•••• ${bankInfo.accountNo.slice(-4)}` : '•••• •••• •••• ••••'}
                  </p>
                </div>
                <div className="flex justify-between">
                  <div><p className="text-xs text-white/60 mb-0.5">Bank</p><p className="text-sm font-semibold">{bankInfo.bankName || 'Not Set'}</p></div>
                  <div className="text-right"><p className="text-xs text-white/60 mb-0.5">IFSC</p><p className="text-sm font-mono font-semibold">{bankInfo.ifsc || '---'}</p></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-indigo-600" /> Bank Account Details
            </h4>
            <form onSubmit={handleBankSync} className="space-y-3">
              <input type="text" placeholder="Bank Name" value={bankInfo.bankName} onChange={e => setBankInfo({...bankInfo, bankName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
              <input type="text" placeholder="Account Number" value={bankInfo.accountNo} onChange={e => setBankInfo({...bankInfo, accountNo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
              <input type="text" placeholder="IFSC Code" value={bankInfo.ifsc} onChange={e => setBankInfo({...bankInfo, ifsc: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
              <button type="submit" disabled={isSyncing} className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-lg disabled:opacity-70 flex items-center justify-center gap-2">
                {isSyncing ? <><Loader2 size={18} className="animate-spin"/> Saving...</> : <><CreditCard size={18} /> Update Details</>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><History size={20} strokeWidth={2} /></div>
            <div><h3 className="text-lg font-bold text-slate-900">Transaction History</h3><p className="text-sm text-slate-600">All your withdrawal requests</p></div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Transaction ID</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr><td colSpan="4" className="px-8 py-16 text-center"><History size={48} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-600 font-medium">No transactions yet</p></td></tr>
              ) : (
                history.map((p) => {
                  const statusConfig = getStatusConfig(p.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5"><span className="font-mono text-sm font-medium text-slate-600">{p.referenceId || p.id.slice(0, 12).toUpperCase()}</span></td>
                      <td className="px-8 py-5"><span className="text-lg font-bold text-slate-900">₹{p.amount?.toLocaleString()}</span></td>
                      <td className="px-8 py-5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                          <StatusIcon size={14} /><span className="text-xs font-semibold capitalize">{p.status}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right"><span className="text-sm text-slate-600">{p.requestedAt?.toDate ? p.requestedAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}