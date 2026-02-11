import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot, doc, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { Loader2, ChevronDown } from "../../components/Icons";
import toast, { Toaster } from "react-hot-toast";
import {RevenueIcon, SubscriptionIcon, CalendarIconLarge, EmptyPerformanceIllustration as EmptyIllustration } from "../../components/Icons";

// --- STAT CARD ---
const StatCard = ({ icon: Icon, label, value, description }) => (
  <div className="bg-white border border-[#E3E6EA] rounded-2xl p-5 flex flex-col gap-4 flex-1 min-w-0 shadow-sm">
    <div className="flex items-center justify-between w-full">
      <p className="text-[#9499A1] text-sm font-medium">{label}</p>
      <div className="bg-[rgba(77,124,254,0.1)] p-2 rounded-full">
        <Icon />
      </div>
    </div>
    <div className="flex flex-col gap-1">
      <p className="text-[#111111] text-3xl font-bold tracking-tight">{value}</p>
      <p className="text-[#9499A1] text-[11px] leading-tight">{description}</p>
    </div>
  </div>
);

export default function Performance() {
  const { user } = useAuth();
  
  // Data State
  const [ledgerData, setLedgerData] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [partnerStats, setPartnerStats] = useState({});
  
  // UI State
  const [commissionRate, setCommissionRate] = useState(10);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    // 1. Listen to Partner Stats (Real-time Commission Rate & Totals)
    const unsubPartner = onSnapshot(doc(db, "Partners", user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const pData = docSnap.data();
        setCommissionRate(pData.commissionRate || 10);
        setPartnerStats(pData.stats || {});

        // 2. Fetch User Details Map (Once, to populate names/emails in table)
        if (pData.referralCode) {
            const usersQ = query(collection(db, "user"), where("referral_code", "==", pData.referralCode));
            getDocs(usersQ).then((snap) => {
                const map = {};
                snap.forEach(uDoc => {
                    const u = uDoc.data();
                    map[uDoc.id] = {
                        name: u.display_name || u.name || "Unknown",
                        email: u.email || ""
                    };
                });
                setUserMap(map);
            });
        }
      }
    });

    // 3. Listen to Transactions Ledger (The Source of Truth)
    const txnsQuery = query(
        collection(db, "Transactions"), 
        where("cpaId", "==", user.uid), 
        where("status", "==", "completed")
    );

    const unsubTxns = onSnapshot(txnsQuery, (snapshot) => {
        try {
            const txns = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Normalize Timestamp
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
                };
            });
            
            // Sort by newest first
            txns.sort((a, b) => b.createdAt - a.createdAt);
            
            setLedgerData(txns);
            setLoading(false);
        } catch (err) {
            console.error("Ledger error:", err);
            setLoading(false);
        }
    });

    return () => {
        unsubPartner();
        unsubTxns();
    };
  }, [user?.uid]);

  // --- MERGE DATA FOR TABLE ---
  const tableRows = useMemo(() => {
    return ledgerData.map(txn => {
        const userInfo = userMap[txn.userId] || {};
        return {
            id: txn.id,
            email: userInfo.email || "Loading...",
            name: userInfo.name || "Unknown User",
            planType: txn.plan?.replace('writeoffgenie-', '').replace('com.writeoffgenie.', '').replace('.monthly', '').replace('.yearly', '') || 'Unknown',
            amountPaid: Number(txn.amountPaid || 0),
            commission: Number(txn.cpaEarnings || 0),
            activatedAt: txn.createdAt,
            status: "Credited" // Ledger entries are always completed/credited
        };
    });
  }, [ledgerData, userMap]);

  // --- FILTERING ---
  const filteredRows = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    
    if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
    else if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (timeRange === 'year') startDate.setFullYear(now.getFullYear() - 1);
    
    return tableRows.filter(row => row.activatedAt >= startDate);
  }, [tableRows, timeRange]);

  // --- STATS CALCULATIONS ---
  // 1. Total Earnings: Use Partner Stats if available (fastest), else sum ledger
  const totalEarningsVal = partnerStats.totalEarnings ?? tableRows.reduce((acc, curr) => acc + curr.commission, 0);
  
  // 2. Period Earnings: Must calculate from filtered ledger
  const periodEarningsVal = filteredRows.reduce((acc, curr) => acc + curr.commission, 0);

  // 3. Active Subscribers: Unique UserIDs in the ledger
  const activeSubscribersVal = new Set(ledgerData.map(t => t.userId)).size;

  const filterOptions = [
    { value: "week", label: "This week" },
    { value: "month", label: "This month" },
    { value: "year", label: "This year" }
  ];

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-[#00D1A0]" size={40} strokeWidth={2.5} />
      <p className="text-sm font-medium text-[#9499A1]">Loading earnings...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-full animate-in fade-in duration-500 pb-10">
      <Toaster position="top-right" />
      
      {/* Header & Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#111111] text-2xl font-bold tracking-tight">Earnings & Commission</h1>
          <p className="text-[#9499A1] text-sm mt-1">Verified commission from transaction ledger</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#9499A1] text-sm font-medium hidden sm:block">Filter by period</span>
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="border border-[#E3E6EA] rounded-lg px-3 py-2 flex items-center gap-2 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="text-[#111111] text-sm font-medium">
                {filterOptions.find(f => f.value === timeRange)?.label}
              </span>
              <ChevronDown size={16} className="text-[#9499A1]" />
            </button>
            
            {filterOpen && (
              <div className="absolute top-full mt-2 right-0 bg-white border border-[#E3E6EA] rounded-lg shadow-lg z-10 w-[140px] overflow-hidden">
                {filterOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTimeRange(option.value);
                      setFilterOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-gray-50 transition-colors ${
                      timeRange === option.value ? 'text-[#00D1A0] bg-[rgba(0,209,160,0.05)]' : 'text-[#111111]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard 
          icon={RevenueIcon} 
          label="Total Earnings" 
          value={`$${totalEarningsVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          description="Total commission earned all-time"
        />
        <StatCard 
          icon={CalendarIconLarge} 
          label="Period Earnings" 
          value={`$${periodEarningsVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          description="Commission earned in selected period"
        />
        <StatCard 
          icon={SubscriptionIcon} 
          label="Active Subscriptions" 
          value={activeSubscribersVal}
          description="Unique paying users"
        />
      </div>

      {/* Table Section */}
      {tableRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E3E6EA] rounded-2xl">
          <EmptyIllustration />
          <div className="flex flex-col gap-2 items-center text-center mt-6">
            <h3 className="text-[#111111] text-lg font-bold">No earnings yet</h3>
            <p className="text-[#9499A1] text-sm max-w-xs">
              You'll see commission details here once users subscribe using your referral link.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E3E6EA] rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
          
          {/* Table Header */}
          <div className="hidden md:flex items-center text-[#9499A1] text-xs font-medium uppercase tracking-wider pb-3 border-b border-[#E3E6EA]">
            <p className="w-1/4">User</p>
            <p className="w-1/5">Plan</p>
            <p className="w-1/6">Amount</p>
            <p className="w-1/6">Commission ({commissionRate}%)</p>
            <p className="w-1/6">Credited On</p>
            <p className="w-1/12 text-right">Status</p>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col gap-2">
            {filteredRows.map((item) => {
              const dateStr = item.activatedAt.toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', year: 'numeric' 
              });

              return (
                <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-[#E3E6EA]">
                  
                  {/* Mobile Label included for responsiveness */}
                  <div className="w-full md:w-1/4 mb-2 md:mb-0">
                    <p className="text-[#111111] text-sm font-medium truncate" title={item.email}>{item.email}</p>
                  </div>

                  <div className="w-full md:w-1/5 mb-2 md:mb-0 flex justify-between md:block">
                    <span className="md:hidden text-xs text-[#9499A1]">Plan:</span>
                    <p className="text-[#111111] text-sm capitalize">{item.planType}</p>
                  </div>

                  <div className="w-full md:w-1/6 mb-2 md:mb-0 flex justify-between md:block">
                    <span className="md:hidden text-xs text-[#9499A1]">Amount:</span>
                    <p className="text-[#111111] text-sm font-medium">${item.amountPaid.toFixed(2)}</p>
                  </div>

                  <div className="w-full md:w-1/6 mb-2 md:mb-0 flex justify-between md:block">
                    <span className="md:hidden text-xs text-[#9499A1]">Comm:</span>
                    <p className="text-[#011C39] text-sm font-bold">${item.commission.toFixed(2)}</p>
                  </div>

                  <div className="w-full md:w-1/6 mb-2 md:mb-0 flex justify-between md:block">
                    <span className="md:hidden text-xs text-[#9499A1]">Date:</span>
                    <p className="text-[#9499A1] text-sm">{dateStr}</p>
                  </div>

                  <div className="w-full md:w-1/12 text-left md:text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                      {item.status}
                    </span>
                  </div>

                </div>
              );
            })}
            
            {filteredRows.length === 0 && (
                <div className="text-center py-8 text-sm text-[#9499A1] italic">
                    No transactions found for this period.
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}