import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  doc, onSnapshot, collection, query, where, getDocs 
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import toast, { Toaster } from "react-hot-toast";
import { 
  Loader2, User, ChevronDown, ChevronUp, CreditCard, 
  Building2, Wallet, Clock, CheckCircle2, XCircle, AlertCircle,
  AlertTriangle, ShieldCheck, Ban
} from "lucide-react";

// --- SUB-COMPONENT: REFERRAL ACCORDION ITEM ---
const ReferralItem = ({ client }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Format dates
  const joinedDate = client.createdAt?.toDate ? client.createdAt.toDate() : new Date();
  const subDate = client.subscription?.activatedAt?.toDate ? client.subscription.activatedAt.toDate() : null;
  
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 hover:bg-slate-50 transition-colors px-2 rounded-lg cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold group-hover:bg-indigo-100 transition-colors">
            {client.name?.charAt(0)}
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900">{client.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">#{client.id.slice(0, 6)}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
      </button>

      {/* Timeline Content */}
      {isOpen && (
        <div className="pl-6 pb-4 relative animate-in slide-in-from-top-2 duration-200">
          <div className="absolute left-[1.65rem] top-2 bottom-4 w-px bg-slate-200"></div>

          <div className="space-y-4">
            <div className="relative flex items-start gap-4 ml-6">
              <div className="absolute -left-[1.6rem] w-2 h-2 rounded-full bg-slate-300 ring-4 ring-white"></div>
              <div>
                <p className="text-xs font-bold text-slate-700">App downloaded</p>
                <p className="text-[10px] text-slate-400">{joinedDate.toLocaleDateString()} • {joinedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>

            <div className="relative flex items-start gap-4 ml-6">
              <div className="absolute -left-[1.6rem] w-2 h-2 rounded-full bg-slate-300 ring-4 ring-white"></div>
              <div>
                <p className="text-xs font-bold text-slate-700">Account created</p>
                <p className="text-[10px] text-slate-400">{joinedDate.toLocaleDateString()} • {joinedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>

            {subDate ? (
               <div className="relative flex items-start gap-4 ml-6">
                 <div className="absolute -left-[1.6rem] w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white"></div>
                 <div>
                   <p className="text-xs font-bold text-emerald-600">Subscription purchased</p>
                   <p className="text-[10px] text-slate-400">{subDate.toLocaleDateString()} • {subDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                 </div>
               </div>
            ) : (
              <div className="relative flex items-start gap-4 ml-6 opacity-50">
                 <div className="absolute -left-[1.6rem] w-2 h-2 rounded-full bg-slate-200 ring-4 ring-white"></div>
                 <div>
                   <p className="text-xs font-bold text-slate-400">Subscription pending</p>
                 </div>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN PAGE ---
export default function PartnerDetail() {
  const { id: partnerId } = useParams(); 
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [clients, setClients] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Processing States
  const [processing, setProcessing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // Commission Rate Edit State
  const [editingCommission, setEditingCommission] = useState(false);
  const [newCommissionRate, setNewCommissionRate] = useState(10);

  useEffect(() => {
    if (!partnerId) return;

    // 1. Partner Profile
    const unsubPartner = onSnapshot(doc(db, "Partners", partnerId), (docSnap) => {
        if (docSnap.exists()) {
            setData({ id: docSnap.id, ...docSnap.data() });
        } else {
            navigate("/admin/cas");
        }
        setLoading(false);
    });

    // 2. Bank Accounts
    const bankQuery = query(collection(db, "Partners", partnerId, "BankAccounts"));
    const unsubBanks = onSnapshot(bankQuery, (snapshot) => {
        const banks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBankAccounts(banks);
    });

    // 3. Payouts
    const payoutsQuery = query(collection(db, "Payouts"), where("partner_id", "==", partnerId));
    const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
        const payoutList = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            requestedAt: doc.data().requestedAt?.toDate() || new Date(),
            processedAt: doc.data().processedAt?.toDate() || null
        }));
        payoutList.sort((a, b) => b.requestedAt - a.requestedAt);
        setPayouts(payoutList);
    });

    // 4. Clients
    const fetchClients = async () => {
        const clientsQ = query(collection(db, "Clients"), where("referredBy", "==", partnerId));
        const clientsSnap = await getDocs(clientsQ);
        setClients(clientsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchClients();

    return () => {
        unsubPartner();
        unsubBanks();
        unsubPayouts();
    };
  }, [partnerId, navigate]);

  // Confirm Status Change
  const confirmToggleStatus = async () => {
     setProcessing(true);
     const action = data.status === 'active' ? 'suspend' : 'activate';
     const fn = httpsCallable(getFunctions(), 'toggleCAStatus');

     toast.promise(fn({ targetUserId: partnerId, action }), {
        loading: 'Updating account status...',
        success: `Account ${action === 'activate' ? 'Activated' : 'Suspended'} successfully!`,
        error: (err) => `Failed: ${err.message}`
     }).finally(() => {
        setProcessing(false);
        setShowStatusModal(false);
     });
  };

  // Update Commission Rate
  const handleUpdateCommission = async () => {
    if (newCommissionRate < 1 || newCommissionRate > 100) {
      toast.error('Commission rate must be between 1 and 100');
      return;
    }

    setProcessing(true);
    const fn = httpsCallable(getFunctions(), 'updateCommissionRate');

    toast.promise(fn({ partnerId, commissionRate: newCommissionRate }), {
      loading: 'Updating commission rate...',
      success: 'Commission rate updated successfully!',
      error: (err) => `Failed: ${err.message}`
    }).finally(() => {
      setProcessing(false);
      setEditingCommission(false);
    });
  };

  const formatDate = (date) => {
    return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32}/></div>;

  const isActive = data?.status === 'active';
  const subscribedCount = clients.filter(c => c.subscription?.status === 'active').length;
  const lastWithdrawalDate = payouts.length > 0 ? formatDate(payouts[0].requestedAt) : "No withdrawals yet";

  return (
    <div className="animate-in fade-in duration-300 pb-10 relative">
      <Toaster position="top-right" />
      
      {/* --- TOP BAR --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/cas" className="hover:text-slate-900 transition-colors">CA Management</Link>
          <span>{'>'}</span>
          <span className="font-bold text-slate-900">{data?.name}</span>
        </div>
        
        <button 
          onClick={() => setShowStatusModal(true)}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2 ${
            isActive ? "bg-slate-900 hover:bg-slate-800" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {isActive ? "Disable CA" : "Activate CA"}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* --- LEFT COLUMN --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            
            {/* Header Info */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                    <User size={32} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900">{data?.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      <span className={`text-xs font-bold uppercase tracking-wide ${isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {data?.status || 'Inactive'}
                      </span>
                    </div>
                 </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid md:grid-cols-3 gap-8 pb-8 border-b border-slate-50">
               <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Email Address</p>
                  <p className="text-sm font-bold text-slate-900 break-all">{data?.email}</p>
               </div>
               <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Phone Number</p>
                  <p className="text-sm font-bold text-slate-900">{data?.phone || "N/A"}</p>
               </div>
               <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">CA Registration</p>
                  <p className="text-sm font-bold text-slate-900 font-mono">#{data?.referralCode || "N/A"}</p>
               </div>
            </div>

            {/* Commission Rate Section */}
            <div className="mt-8 pb-8 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Commission Rate</p>
                  {editingCommission ? (
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newCommissionRate}
                        onChange={(e) => setNewCommissionRate(parseInt(e.target.value) || 10)}
                        className="w-20 px-3 py-2 text-sm font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-[#011C39]"
                      />
                      <span className="text-sm font-bold text-slate-500">%</span>
                      <button
                        onClick={handleUpdateCommission}
                        disabled={processing}
                        className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {processing ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingCommission(false);
                          setNewCommissionRate(data?.commissionRate || 10);
                        }}
                        className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-black text-emerald-600">{data?.commissionRate || 10}%</p>
                      <button
                        onClick={() => {
                          setNewCommissionRate(data?.commissionRate || 10);
                          setEditingCommission(true);
                        }}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">This partner earns {data?.commissionRate || 10}% commission on each referred subscription</p>
            </div>

            {/* Earnings Summary */}
            <div className="mt-8">
              <p className="text-sm font-bold text-slate-400 mb-4">Earnings Summary</p>
              <div className="grid md:grid-cols-3 gap-4">
                 <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 border-b-4 border-b-emerald-400 hover:bg-slate-50 transition-colors">
                    <p className="text-xs text-slate-400 font-bold mb-2">Total Commission</p>
                    <p className="text-xl font-black text-slate-900">₹{(data?.stats?.totalEarnings || 0).toLocaleString()}</p>
                 </div>
                 <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 border-b-4 border-b-amber-400 hover:bg-slate-50 transition-colors">
                    <p className="text-xs text-slate-400 font-bold mb-2">Pending Balance</p>
                    <p className="text-xl font-black text-slate-900">₹{(data?.walletBalance || 0).toLocaleString()}</p>
                 </div>
                 <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 border-b-4 border-b-rose-400 hover:bg-slate-50 transition-colors">
                    <p className="text-xs text-slate-400 font-bold mb-2">Total Withdrawn</p>
                    <p className="text-xl font-black text-slate-900">₹{(data?.stats?.totalWithdrawn || 0).toLocaleString()}</p>
                 </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                 <p className="text-sm font-bold text-slate-400">Bank Details</p>
                 {bankAccounts.length > 1 && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold">{bankAccounts.length} Accounts</span>}
              </div>
              
              {bankAccounts.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  {bankAccounts.map((bank) => (
                    <div key={bank.id} className="min-w-[320px] p-6 bg-slate-50 rounded-2xl border border-slate-100 shrink-0 cursor-default hover:shadow-md transition-shadow">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><Building2 size={20}/></div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company Name</p>
                              <p className="text-sm font-bold text-slate-900">{bank.companyName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-purple-600"><Wallet size={20}/></div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Routing Number</p>
                              <p className="text-sm font-mono font-bold text-slate-900">•••••{bank.routingNumber?.slice(-4)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600"><CreditCard size={20}/></div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Account Number</p>
                              <p className="text-sm font-mono font-bold text-slate-900">••••••{bank.accountNumber?.slice(-4)}</p>
                            </div>
                        </div>
                      </div>
                      <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center gap-2">
                         <span className="text-xs text-slate-400 font-medium">Account Type:</span>
                         <span className="text-xs font-bold text-slate-700 uppercase">{bank.accountType || 'Checking'}</span>
                         {bank.isDefault && <span className="ml-auto text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">Default</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-400 text-sm italic border border-dashed border-slate-200">
                  <AlertCircle size={20} className="mx-auto mb-2 opacity-50"/>
                  No bank details linked yet.
                </div>
              )}
            </div>

            {/* Withdrawal Activity */}
            <div className="mt-8 pt-8 border-t border-slate-100">
               <div className="flex justify-between items-center mb-4">
                  <p className="text-sm font-bold text-slate-400">Withdrawal Activity</p>
                  <p className="text-xs text-slate-500">Last Withdrawal: <span className="font-bold text-slate-900">{lastWithdrawalDate}</span></p>
               </div>
               
               <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-500 uppercase font-bold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Ref ID</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Bank</th>
                            <th className="px-6 py-4 text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {payouts.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-slate-500">{p.referenceId || "---"}</td>
                                <td className="px-6 py-4 font-bold text-slate-900">₹{p.amount.toLocaleString()}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                        p.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                        p.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                        'bg-red-50 text-red-600 border-red-100'
                                    }`}>
                                        {p.status === 'paid' && <CheckCircle2 size={10}/>}
                                        {p.status === 'pending' && <Clock size={10}/>}
                                        {p.status === 'rejected' && <XCircle size={10}/>}
                                        {p.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-600">
                                    {p.bankSnapshot?.companyName || 'Bank Account'} 
                                    <span className="text-slate-400 text-[10px] ml-1">
                                        (..{p.bankSnapshot?.accountNumber?.slice(-4) || p.bankAccountUsed?.slice(-4)})
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-slate-500">{formatDate(p.requestedAt)}</td>
                            </tr>
                        ))}
                        {payouts.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-slate-400 italic">No withdrawal history found.</td>
                            </tr>
                        )}
                    </tbody>
                  </table>
               </div>
            </div>

          </div>
        </div>

        {/* --- RIGHT COLUMN: REFERRALS --- */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-fit">
           <h3 className="text-lg font-bold text-slate-900 mb-6">Referrals</h3>
           <div className="flex border border-slate-100 rounded-xl overflow-hidden mb-6">
              <div className="flex-1 p-4 text-center border-r border-slate-100 bg-slate-50/30">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Total Users</p>
                 <p className="text-2xl font-black text-slate-900 mt-1">{clients.length}</p>
              </div>
              <div className="flex-1 p-4 text-center bg-slate-50/30">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Subscribed</p>
                 <p className="text-2xl font-black text-emerald-600 mt-1">{subscribedCount}</p>
              </div>
           </div>
           <div className="space-y-1 max-h-150 overflow-y-auto custom-scrollbar">
             {clients.map(client => (
               <ReferralItem key={client.id} client={client} />
             ))}
             {clients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <User size={24} className="text-slate-200 mb-2"/>
                    <p className="text-slate-400 text-sm">No referrals found.</p>
                </div>
             )}
           </div>
        </div>

      </div>

      {/* CONFIRMATION MODAL CARD */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 transform scale-100 transition-all">
                
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto ${
                    isActive ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
                }`}>
                    {isActive ? <Ban size={32} /> : <ShieldCheck size={32} />}
                </div>

                <div className="text-center mb-6">
                    <h3 className="text-lg font-black text-slate-900">
                        {isActive ? "Disable Account?" : "Activate Account?"}
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                        {isActive 
                            ? "This will block the CA from accessing their dashboard and earning commissions." 
                            : "This will restore full access to the CA's dashboard and referral features."}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowStatusModal(false)}
                        className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        disabled={processing}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmToggleStatus}
                        disabled={processing}
                        className={`flex-1 py-3 text-sm font-bold text-white rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                            isActive 
                            ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" 
                            : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                        }`}
                    >
                        {processing && <Loader2 size={16} className="animate-spin"/>}
                        {isActive ? "Yes, Disable" : "Yes, Activate"}
                    </button>
                </div>

            </div>
        </div>
      )}

    </div>
  );
}