import React, { useState, useEffect, useMemo } from "react";
import { doc, onSnapshot, collection, query, where, orderBy } from "firebase/firestore"; 
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { useSearch } from "../../context/SearchContext";
import toast, { Toaster } from "react-hot-toast"; 
import { Loader2, ChevronDown, X } from "lucide-react";
import { RevenueIcon, PendingIcon, WalletIcon, TotalPaidIcon, EmptyPayoutIllustration as EmptyIllustration } from "../../components/Icons";

// --- STAT CARD ---
const StatCard = ({ icon, label, value, description }) => (
  <div className="bg-white border border-[#E3E6EA] rounded-2xl p-5 flex flex-col gap-4 flex-1 min-w-0 shadow-sm">
    <div className="flex items-center justify-between w-full">
      <span className="text-[#9499A1] text-sm font-medium">{label}</span>
      <div className="bg-[rgba(77,124,254,0.1)] p-2 rounded-full">
        {icon}
      </div>
    </div>
    <div className="flex flex-col gap-1">
      <p className="text-[#111111] text-3xl font-bold tracking-tight">{value}</p>
      <p className="text-[#9499A1] text-[11px] leading-tight">{description}</p>
    </div>
  </div>
);

export default function AgentWallet() {
  const { user } = useAuth();
  const { searchQuery } = useSearch();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  
  // Form States
  const [isRequesting, setIsRequesting] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // --- LISTENERS ---
  useEffect(() => {
    if (!user) return;
    
    const unsubProfile = onSnapshot(doc(db, "Partners", user.uid), (s) => {
      if (s.exists()) setProfile(s.data());
    });

    const bankQuery = query(
      collection(db, "Partners", user.uid, "BankAccounts"),
      orderBy("createdAt", "desc")
    );
    const unsubBanks = onSnapshot(bankQuery, (snap) => {
      const accounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBankAccounts(accounts);
      
      const defaultAccount = accounts.find(a => a.isDefault);
      if (defaultAccount) setSelectedBankId(defaultAccount.id);
      else if (accounts.length > 0) setSelectedBankId(accounts[0].id);
    });

    const q = query(collection(db, "Payouts"), where("partner_id", "==", user.uid));
    const unsubHistory = onSnapshot(q, (s) => {
      const docs = s.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.requestedAt?.toDate() || 0) - (a.requestedAt?.toDate() || 0));
      setHistory(docs);
      setLoading(false);
    });

    return () => { unsubProfile(); unsubHistory(); unsubBanks(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const selectedBank = useMemo(() => 
    bankAccounts.find(a => a.id === selectedBankId) || null
  , [bankAccounts, selectedBankId]);

  const currentBalance = profile?.walletBalance || 0;
  const totalPaid = profile?.stats?.totalWithdrawn || 0;
  
  const pendingAmount = useMemo(() => 
    history.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0)
  , [history]);

  const filteredHistory = useMemo(() => {
    if (!searchQuery) return history;
    const searchLower = searchQuery.toLowerCase();
    
    return history.filter(item => {
      const dateStr = item.requestedAt?.toDate 
        ? item.requestedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
        : "";
      const amountStr = item.amount?.toString() || "";
      const bankStr = item.bankName || item.bankAccountUsed || "";
      const statusStr = item.status || "";
      const remarksStr = item.rejectionReason || item.remarks || "";
      
      return dateStr.toLowerCase().includes(searchLower) ||
             amountStr.includes(searchLower) ||
             bankStr.toLowerCase().includes(searchLower) ||
             statusStr.toLowerCase().includes(searchLower) ||
             remarksStr.toLowerCase().includes(searchLower);
    });
  }, [history, searchQuery]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (bankAccounts.length === 0) return toast.error("Please add bank details in Profile first");
    if (!selectedBank) return toast.error("Please select a bank account");
    if (isNaN(amount) || amount < 100) return toast.error("Minimum withdrawal is $100");
    if (amount > currentBalance) return toast.error("Insufficient balance");

    setIsRequesting(true);
    try {
      const fn = httpsCallable(getFunctions(), 'requestWithdrawal');
      const res = await fn({ 
        amount,
        bankAccountId: selectedBank.id,
        bankSnapshot: {
          companyName: selectedBank.companyName,
          routingNumber: selectedBank.routingNumber,
          accountNumber: selectedBank.accountNumber,
          accountType: selectedBank.accountType
        }
      });
      if (res.data.success) {
        toast.success("Request submitted successfully!");
        setWithdrawAmount("");
        setShowWithdrawModal(false);
      }
    } catch (err) {
      toast.error(err.message || "Failed to request withdrawal");
    } finally {
      setIsRequesting(false);
    }
  };

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-[#4D7CFE]" size={40} strokeWidth={2.5} />
      <p className="text-sm font-medium text-[#9499A1]">Loading payouts...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-full animate-in fade-in duration-500 pb-10">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#111111] text-2xl font-bold tracking-tight">Wallet & Withdrawals</h1>
          <p className="text-[#9499A1] text-sm mt-1">View your balance, request withdrawals, and track payout status</p>
        </div>
        <button 
          onClick={() => setShowWithdrawModal(true)}
          className="bg-black hover:bg-gray-800 cursor-pointer text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 cursor-pointer"
        >
          Request withdrawal
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard 
          icon={<RevenueIcon />} 
          label="Available Balance" 
          value={`$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          description="Funds available for withdrawal"
        />
        <StatCard 
          icon={<PendingIcon />} 
          label="Pending Withdrawals" 
          value={`$${pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          description="Withdrawal requests awaiting approval"
        />
        <StatCard 
          icon={<TotalPaidIcon />} 
          label="Total Paid" 
          value={`$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          description="Amount successfully transferred to your bank"
        />
      </div>

      {/* Withdrawal History Table */}
      <div className="bg-white border border-[#E3E6EA] rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
        <h3 className="text-[#111111] text-lg font-bold">Withdrawal History</h3>
        
        {filteredHistory.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="mb-4 transform scale-90">
              <EmptyIllustration />
            </div>
            <h3 className="text-[#111111] text-sm font-bold mb-1">No withdrawals yet</h3>
            <p className="text-[#9499A1] text-xs max-w-xs mb-6">
              Once you request a withdrawal, it will appear here with its status.
            </p>
            <button 
              onClick={() => setShowWithdrawModal(true)}
              className="bg-[#4D7CFE] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#3D6CED] transition-all cursor-pointer"
            >
              Request withdrawal
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Table Header */}
            <div className="hidden md:flex items-center justify-between text-[#9499A1] text-xs font-medium uppercase tracking-wider pb-3 border-b border-[#E3E6EA]">
              <p className="w-1/6">Date</p>
              <p className="w-1/6">Amount</p>
              <p className="w-1/4">Bank Account</p>
              <p className="w-1/6 text-center">Status</p>
              <p className="w-1/4 text-right">Remarks</p>
            </div>

            {/* Table Rows */}
            {filteredHistory.map((item) => {
              const dateStr = item.requestedAt?.toDate 
                ? item.requestedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                : "N/A";
              const amountDisplay = item.amount ? `$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "$0.00";
              
              const bankDisplay = item.bankSnapshot 
                ? `${item.bankSnapshot.companyName} •••• ${item.bankSnapshot.accountNumber?.slice(-4)}`
                : item.bankAccountUsed 
                  ? `Bank •••• ${item.bankAccountUsed}` 
                  : "Bank Transfer";
              
              const remarksDisplay = item.rejectionReason || item.remarks || "-";

              const statusKey = item.status?.toLowerCase() || 'pending';
              const statusConfig = {
                pending: { bg: 'rgba(250, 204, 21, 0.1)', text: '#FACC15', label: 'Pending', border: '#FDE68A' },
                approved: { bg: 'rgba(77, 124, 254, 0.1)', text: '#007AFF', label: 'Approved', border: '#BFDBFE' },
                paid: { bg: 'rgba(34, 177, 76, 0.1)', text: '#22C55E', label: 'Paid', border: '#A7F3D0' },
                rejected: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444', label: 'Rejected', border: '#FECACA' }
              };
              const status = statusConfig[statusKey] || statusConfig.pending;

              return (
                <div key={item.referenceId || item.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-[#E3E6EA]">
                  
                  <div className="w-full md:w-1/6 mb-2 md:mb-0">
                    <p className="text-[#111111] text-sm font-medium">{dateStr}</p>
                  </div>

                  <div className="w-full md:w-1/6 mb-2 md:mb-0 flex justify-between md:block">
                    <span className="md:hidden text-xs text-[#9499A1]">Amount:</span>
                    <p className="text-[#111111] text-sm font-medium">{amountDisplay}</p>
                  </div>

                  <div className="w-full md:w-1/4 mb-2 md:mb-0 flex justify-between md:block">
                    <span className="md:hidden text-xs text-[#9499A1]">Bank:</span>
                    <p className="text-[#111111] text-sm truncate" title={bankDisplay}>{bankDisplay}</p>
                  </div>

                  <div className="w-full md:w-1/6 mb-2 md:mb-0 text-left md:text-center">
                    <span 
                      className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border"
                      style={{ backgroundColor: status.bg, color: status.text, borderColor: status.border }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="w-full md:w-1/4 text-left md:text-right">
                    <span className="md:hidden text-xs text-[#9499A1] mr-2">Remarks:</span>
                    <p className="text-[#9499A1] text-xs truncate" title={remarksDisplay}>{remarksDisplay}</p>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="mt-4 text-center space-y-1">
        <p className="text-[#4D7CFE] text-xs font-medium">Withdrawals are processed after admin approval.</p>
        <p className="text-[#4D7CFE] text-xs font-medium">Processing time may vary depending on your bank.</p>
      </div>

      {/* --- WITHDRAWAL MODAL --- */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 flex flex-col gap-6 shadow-2xl scale-100 transition-all">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-[#111111] text-xl font-bold">Request withdrawal</h3>
              <button 
                onClick={() => setShowWithdrawModal(false)} 
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Available Balance Card */}
            <div className="bg-[#F8FAFC] border border-[#E3E6EA] rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] text-sm font-medium">Available Balance</span>
                <div className="bg-[#4D7CFE]/10 p-2 rounded-full text-[#4D7CFE]">
                  <WalletIcon size={20}/>
                </div>
              </div>
              <p className="text-[#111111] text-3xl font-bold">
                ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-[#111111] text-sm font-medium">Withdrawal amount</label>
                <input 
                  type="number" 
                  placeholder="Enter amount (min $100)" 
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4D7CFE] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[#111111] text-sm font-medium">Bank account</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBankDropdown(!showBankDropdown)}
                    className="w-full border border-[#E2E8F0] rounded-lg px-4 py-3 flex items-center justify-between bg-white hover:border-[#4D7CFE] transition-colors text-sm"
                  >
                    <span className={selectedBank ? "text-[#111111]" : "text-[#9499A1]"}>
                      {selectedBank 
                        ? `${selectedBank.companyName} •••• ${selectedBank.accountNumber?.slice(-4)}` 
                        : "Select bank account"}
                    </span>
                    <ChevronDown size={16} className={`text-[#9499A1] transition-transform ${showBankDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showBankDropdown && bankAccounts.length > 0 && (
                    <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#E3E6EA] rounded-lg shadow-xl z-20 max-h-[200px] overflow-y-auto">
                      {bankAccounts.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setSelectedBankId(account.id);
                            setShowBankDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between text-sm ${
                            selectedBankId === account.id ? 'bg-slate-50' : ''
                          }`}
                        >
                          <div>
                            <span className="block font-medium text-[#111111]">
                              {account.companyName} •••• {account.accountNumber?.slice(-4)}
                            </span>
                            <span className="block text-xs text-[#9499A1] mt-0.5 capitalize">{account.accountType || 'checking'}</span>
                          </div>
                          {account.isDefault && (
                            <span className="text-[10px] bg-[#4D7CFE]/10 text-[#4D7CFE] px-2 py-0.5 rounded-full font-bold uppercase">
                              Default
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {bankAccounts.length === 0 && (
                  <p className="text-xs text-red-500">Please go to Profile settings to add a bank account.</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => { setShowWithdrawModal(false); setShowBankDropdown(false); }}
                className="cursor-pointer flex-1 py-3 border border-[#E2E8F0] rounded-lg text-[#64748B] text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleWithdraw}
                disabled={isRequesting || bankAccounts.length === 0}
                className="cursor-pointer flex-1 py-3 bg-black rounded-lg text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                {isRequesting && <Loader2 className="animate-spin" size={16} />}
                {isRequesting ? "Processing..." : "Confirm Withdrawal"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
