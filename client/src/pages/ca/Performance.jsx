import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { Loader2, ChevronDown } from "lucide-react";
import {RevenueIcon, SubscriptionIcon, CalendarIcon, EmptyPerformanceIllustration as EmptyIllustration } from "../../components/Icons";

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
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "Clients"), where("referredBy", "==", user.uid));
    const unsubClients = onSnapshot(q, (snap) => {
      const clientsData = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          email: data.email,
          name: data.name,
          planType: data.subscription?.planType || "Free Plan",
          amountPaid: data.subscription?.amountPaid || 0,
          commission: (data.subscription?.amountPaid || 0) * 0.10,
          activatedAt: data.subscription?.activatedAt?.toDate() || data.createdAt?.toDate() || new Date(),
          subscriptionStatus: data.subscription?.status || "inactive"
        };
      });
      setClients(clientsData);
      setLoading(false);
    });

    return () => unsubClients();
  }, [user]);

  // Filter Logic
  const filteredClients = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    
    if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
    else if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (timeRange === 'year') startDate.setFullYear(now.getFullYear() - 1);
    
    return clients.filter(c => c.amountPaid > 0 && c.activatedAt >= startDate);
  }, [clients, timeRange]);

  // Stats Calculation
  const totalEarnings = useMemo(() => {
    return clients.filter(c => c.amountPaid > 0).reduce((sum, c) => sum + c.commission, 0);
  }, [clients]);

  const thisMonthEarnings = useMemo(() => {
    return filteredClients.reduce((sum, c) => sum + c.commission, 0);
  }, [filteredClients]);

  const activeSubscriptions = useMemo(() => {
    return clients.filter(c => c.subscriptionStatus === 'active').length;
  }, [clients]);

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

  const earningsData = clients.filter(c => c.amountPaid > 0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-full animate-in fade-in duration-500 pb-10">
      
      {/* Header & Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#111111] text-2xl font-bold tracking-tight">Earnings & Commission</h1>
          <p className="text-[#9499A1] text-sm mt-1">View commission earned from your referred subscriptions</p>
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
          value={`$${totalEarnings.toFixed(2)}`}
          description="Total commission earned from all referrals"
        />
        <StatCard 
          icon={CalendarIcon} 
          label="Period Earnings" 
          value={`$${thisMonthEarnings.toFixed(2)}`}
          description="Commission earned in the selected period"
        />
        <StatCard 
          icon={SubscriptionIcon} 
          label="Active Subscriptions" 
          value={activeSubscriptions}
          description="Active subscriptions linked to your referrals"
        />
      </div>

      {/* Table Section */}
      {earningsData.length === 0 ? (
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
            <p className="w-1/6">Commission (10%)</p>
            <p className="w-1/6">Credited On</p>
            <p className="w-1/12 text-right">Status</p>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col gap-2">
            {earningsData.map((item) => {
              const dateStr = item.activatedAt.toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', year: 'numeric' 
              });
              const isCredited = item.subscriptionStatus === 'active';

              return (
                <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-[#E3E6EA]">
                  
                  {/* Mobile Label included for responsiveness */}
                  <div className="w-full md:w-1/4 mb-2 md:mb-0">
                    <p className="text-[#111111] text-sm font-medium truncate" title={item.email}>{item.email}</p>
                  </div>

                  <div className="w-full md:w-1/5 mb-2 md:mb-0 flex justify-between md:block">
                    <span className="md:hidden text-xs text-[#9499A1]">Plan:</span>
                    <p className="text-[#111111] text-sm">{item.planType}</p>
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
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      isCredited 
                        ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]" 
                        : "bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]"
                    }`}>
                      {isCredited ? "Credited" : "Pending"}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}