import React, { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Copy, Check, Loader2, Link as LinkIcon, Mail } from "../../components/Icons";
import toast, { Toaster } from "react-hot-toast";
import { db } from "../../services/firebase";
import { getFunctions, httpsCallable } from "firebase/functions"; 
import { useAuth } from "../../context/AuthContext";
import { useSearch } from "../../context/SearchContext";
import { RevenueIcon, SubscriptionIcon, UsersIconLarge, TrendingUp } from "../../components/Icons";

// --- STAT CARD ---
const StatCard = ({ title, value, description, icon: Icon, isLoading }) => (
  <div className="bg-white border border-[#E3E6EA] rounded-2xl p-5 flex-1 min-w-0 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <p className="text-[#9499A1] text-sm font-medium">{title}</p>
      <div className="bg-[rgba(77,124,254,0.1)] p-2 rounded-full">
        <Icon size={20} />
      </div>
    </div>
    <div className="flex flex-col gap-1">
      {isLoading ? (
        <div className="h-10 w-24 bg-gray-50 animate-pulse rounded" />
      ) : (
        <p className="text-[#111111] text-3xl font-bold tracking-tight">{value}</p>
      )}
      <p className="text-[#9499A1] text-[11px] leading-tight">{description}</p>
    </div>
  </div>
);

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { searchQuery } = useSearch();
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({ totalReferred: 0, totalEarnings: 0, activeSubs: 0 });
  const [copied, setCopied] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Email State
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    // 1. Listen to Partner Profile (Config & basic info)
    const unsubProfile = onSnapshot(doc(db, "Partners", user.uid), (docSnap) => {
      if (docSnap.exists()) {
          const pData = docSnap.data();
          setProfile(pData);
          
          if (pData.referralCode) {
              fetchRealTimeStats(pData.referralCode, user.uid);
          } else {
              setDataLoading(false);
          }
      }
    });

    return () => unsubProfile();
  }, [user?.uid, authLoading]);

  // --- REAL-TIME STATS FETCHING (The Fix) ---
  const fetchRealTimeStats = (referralCode, cpaId) => {
      // A. Listen to Users (Count Referrals)
      const qUsers = query(collection(db, "user"), where("referral_code", "==", referralCode));
      
      const unsubUsers = onSnapshot(qUsers, (snap) => {
          const usersData = snap.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              // We'll hydrate the subscription/commission info in the next step
              totalRevenue: 0, 
              subscription: { status: 'inactive' } 
          }));
          
          setStats(prev => ({ ...prev, totalReferred: snap.size }));
          
          // Trigger the detailed fetch for table & earnings
          fetchLedgerAndHydrate(cpaId, usersData);
      });

      return () => unsubUsers();
  };

  // B. Fetch Ledger for Earnings & Active Status
  const fetchLedgerAndHydrate = async (cpaId, usersList) => {
      try {
          const qTxns = query(collection(db, "Transactions"), where("cpaId", "==", cpaId), where("status", "==", "completed"));
          const txnsSnap = await getDocs(qTxns);
          
          let earningsSum = 0;
          const activeUserIds = new Set();
          const userRevenueMap = {}; // userId -> totalRevenue

          txnsSnap.docs.forEach(doc => {
              const txn = doc.data();
              earningsSum += Number(txn.cpaEarnings || 0);
              activeUserIds.add(txn.userId);
              
              if (!userRevenueMap[txn.userId]) userRevenueMap[txn.userId] = 0;
              userRevenueMap[txn.userId] += Number(txn.amountPaid || 0);
          });

          // Hydrate the user list for the table
          const hydratedUsers = usersList.map(u => ({
              ...u,
              totalRevenue: userRevenueMap[u.id] || 0,
              subscription: { 
                  status: activeUserIds.has(u.id) ? 'active' : 'inactive',
                  planType: activeUserIds.has(u.id) ? 'Premium' : 'Free' // Simplification
              },
              // Fix createdAt sort issue
              createdAt: u.created_time || u.createdAt
          }));

          // Sort by newest
          hydratedUsers.sort((a, b) => {
             const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
             const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
             return timeB - timeA;
          });

          setReferrals(hydratedUsers);
          setStats(prev => ({ 
              ...prev, 
              totalEarnings: earningsSum,
              activeSubs: activeUserIds.size 
          }));
          
      } catch (err) {
          console.error("Ledger Fetch Error:", err);
      } finally {
          setDataLoading(false);
      }
  };

  // Referral Link Logic
  const referralLink = `https://writeoffgenie-link.vercel.app/?ref=${profile?.referralCode || ''}`;

  const copyLink = () => {
    if (!profile?.referralCode) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      toast.error('Please enter a recipient email');
      return;
    }
    if (!profile?.referralCode) {
        toast.error('Referral code not found. Please contact support.');
        return;
    }
    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Invalid email format');
      return;
    }

    setSendingInvite(true);
    const toastId = toast.loading("Sending invitation...");

    try {
      const functions = getFunctions();
      const sendInvite = httpsCallable(functions, 'sendReferralInvite');
      await sendInvite({
        email: inviteEmail,
        senderName: profile?.name || "Your Accountant",
        referralCode: profile.referralCode
      });

      toast.success(`Invite sent to ${inviteEmail}`, { id: toastId });
      setInviteEmail(""); 

    } catch (error) {
      console.error("Invite Error:", error);
      toast.error(error.message || "Failed to send invite.", { id: toastId });
    } finally {
      setSendingInvite(false);
    }
  };

  const filteredReferrals = useMemo(() => {
    if (!searchQuery) return referrals;
    const searchLower = searchQuery.toLowerCase();
    return referrals.filter(client => {
      const email = (client.email || '').toLowerCase();
      const name = (client.display_name || client.name || '').toLowerCase();
      return email.includes(searchLower) || name.includes(searchLower);
    });
  }, [referrals, searchQuery]);

  if (authLoading || dataLoading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-[#00D1A0]" size={40} strokeWidth={2.5} />
      <p className="text-sm font-medium text-[#9499A1]">Loading dashboard...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-full animate-in fade-in duration-500 pb-10">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div>
        <h1 className="text-[#111111] text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-[#9499A1] text-sm mt-1">Track your referrals, earnings, and subscription performance</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
            title="Total Earnings" 
            value={`$${stats.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
            description="Amount earned from subscriptions" 
            icon={RevenueIcon} 
            isLoading={dataLoading} 
        />
        <StatCard 
            title="Commission Rate" 
            value={`${profile?.commissionRate || 10}%`} 
            description="Your earnings percentage" 
            icon={TrendingUp} 
            isLoading={dataLoading} 
        />
        <StatCard 
            title="Users Referred" 
            value={stats.totalReferred} 
            description="Total signups via your link" 
            icon={UsersIconLarge} 
            isLoading={dataLoading} 
        />
        <StatCard 
            title="Active Subscriptions" 
            value={stats.activeSubs} 
            description="Users with active paid plans" 
            icon={SubscriptionIcon} 
            isLoading={dataLoading} 
        />
      </div>

      {/* Invite & Link Section */}
      <div className="bg-white border border-[#E3E6EA] rounded-2xl p-6 flex flex-col lg:flex-row gap-8 shadow-sm">
        
        {/* Left: Copy Link */}
        <div className="flex flex-col gap-4 flex-1">
          <div>
            <p className="text-[#111111] text-sm font-semibold mb-2">Your referral link</p>
            <div className="border border-[#E3E6EA] rounded-lg px-3 py-2.5 flex items-center gap-3 bg-slate-50/50">
              <LinkIcon size={16} className="text-[#9499A1] shrink-0" />
              <p className="text-[#111111] text-sm truncate flex-1 font-medium select-all">{referralLink}</p>
            </div>
          </div>
          <p className="text-[#9499A1] text-xs leading-relaxed">
            Earn <strong className="text-[#00D1A0]">{profile?.commissionRate || 10}% commission</strong> on every subscription purchased via your link.
          </p>
          <button
            onClick={copyLink}
            disabled={!profile?.referralCode}
            className="bg-[#011C39] hover:bg-[#022a55] text-white px-5 py-2.5 rounded-lg text-sm font-medium w-fit flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-[#E3E6EA] self-stretch" />
        <div className="block lg:hidden h-px bg-[#E3E6EA] w-full" />

        {/* Right: Email Invite */}
        <div className="flex flex-col gap-4 flex-1">
          <div>
            <p className="text-[#111111] text-sm font-semibold mb-2">Invite via email</p>
            <div className="border border-[#E3E6EA] rounded-lg px-3 py-2.5 flex items-center gap-3 focus-within:border-[#011C39] focus-within:ring-1 focus-within:ring-[#011C39]/20 transition-all bg-white">
              <input
                type="email"
                placeholder="Enter client email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 text-sm outline-none placeholder:text-[#9CA3AF] bg-transparent"
                disabled={sendingInvite}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendInvite();
                }}
              />
              <Mail size={16} className="text-[#9499A1] shrink-0" />
            </div>
          </div>
          <p className="text-[#9499A1] text-xs leading-relaxed">
            We will send a professional invitation email with your unique referral link attached.
          </p>
          <button
            onClick={handleSendInvite}
            disabled={sendingInvite || !inviteEmail}
            className="bg-[#011C39] hover:bg-[#022a55] text-white px-5 py-2.5 rounded-lg text-sm font-medium w-fit flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {sendingInvite ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sending...
              </>
            ) : (
              "Send Invite"
            )}
          </button>
        </div>
      </div>

      {/* Recent Referrals Table */}
      <div className="bg-white border border-[#E3E6EA] rounded-2xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[#111111] text-lg font-bold">Recent Referrals</h2>
          <Link 
            to="/my-referrals" 
            className="text-[#00D1A0] text-sm font-medium hover:underline cursor-pointer"
          >
            View all
          </Link>
        </div>

        {/* Table Header */}
        <div className="hidden md:flex items-center justify-between text-[#9499A1] text-xs font-medium uppercase tracking-wider pb-3 border-b border-[#E3E6EA]">
          <p className="w-1/3">User</p>
          <p className="w-1/4">Plan</p>
          <p className="w-1/6 text-center">Status</p>
          <p className="w-1/6 text-right">Commission</p>
        </div>

        {/* Table Rows */}
        <div className="flex flex-col gap-3">
          {filteredReferrals.length > 0 ? (
            filteredReferrals.slice(0, 5).map((client) => {
              const isActive = client.subscription?.status === "active";
              // Only check subscription plan if active, otherwise show Free
              const planName = isActive ? "Premium" : "Free";
              
              const commissionRate = (profile?.commissionRate || 10) / 100;
              const commission = (client.totalRevenue * commissionRate).toFixed(2);
              
              return (
                <div key={client.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-[#E3E6EA]">
                  <div className="w-full md:w-1/3 mb-2 md:mb-0">
                    <p className="text-[#111111] text-sm font-medium truncate">{client.display_name || client.name || "Unknown User"}</p>
                    <p className="text-[#9499A1] text-xs truncate">{client.email}</p>
                  </div>
                  
                  <p className="w-full md:w-1/4 text-[#111111] text-sm md:text-sm mb-2 md:mb-0 flex items-center gap-2">
                    <span className="md:hidden text-[#9499A1] text-xs">Plan:</span>
                    <span className="capitalize">{planName}</span>
                  </p>
                  
                  <div className="w-full md:w-1/6 text-left md:text-center mb-2 md:mb-0">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${isActive ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {isActive ? 'Active' : 'Free'}
                    </span>
                  </div>
                  
                  <div className="w-full md:w-1/6 text-left md:text-right">
                    <span className="md:hidden text-[#9499A1] text-xs mr-2">Commission:</span>
                    <span className="text-[#011C39] text-sm font-bold">${commission}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <UsersIconLarge /> 
              </div>
              <p className="text-[#111111] text-sm font-medium">No referrals found</p>
              <p className="text-[#9499A1] text-xs mt-1">
                {searchQuery ? "Try a different search term" : "Share your link to start earning"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;