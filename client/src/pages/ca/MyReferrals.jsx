import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { useSearch } from "../../context/SearchContext";
import { Loader2, ChevronDown, Copy, Check } from "lucide-react";

// Empty state illustration
const EmptyIllustration = () => (
  <svg width="300" height="257" viewBox="0 0 300 257" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="150" cy="240" rx="80" ry="10" fill="#E3E6EA" fillOpacity="0.5"/>
    <path d="M150 40C120 40 95 65 95 95C95 110 100 123 110 133L90 200H210L190 133C200 123 205 110 205 95C205 65 180 40 150 40Z" fill="#F7F9FC" stroke="#E3E6EA" strokeWidth="2"/>
    <circle cx="130" cy="85" r="8" fill="#00D1A0"/>
    <circle cx="150" cy="75" r="8" fill="#00D1A0"/>
    <circle cx="170" cy="85" r="8" fill="#00D1A0"/>
    <ellipse cx="150" cy="50" rx="30" ry="15" fill="#F7F9FC" stroke="#E3E6EA" strokeWidth="2"/>
    <line x1="150" y1="200" x2="150" y2="220" stroke="#E3E6EA" strokeWidth="2" strokeDasharray="4 4"/>
    <path d="M120 220L150 240L180 220" stroke="#E3E6EA" strokeWidth="2"/>
  </svg>
);

export default function MyReferrals() {
  const { user } = useAuth();
  const { searchQuery } = useSearch();
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen to profile for stats
    const unsubProfile = onSnapshot(doc(db, "Partners", user.uid), (docSnap) => {
      if (docSnap.exists()) setProfile(docSnap.data());
    });

    const fetchAll = async () => {
      try {
        const q = query(collection(db, "Clients"), where("referredBy", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const clients = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        clients.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setReferrals(clients);
      } catch (error) { 
        console.error(error); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchAll();

    return () => unsubProfile();
  }, [user]);

  // Filter Logic
  const filtered = referrals.filter(c => {
    const matchesSearch = 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "subscribed") return matchesSearch && c.subscription?.status === "active";
    if (statusFilter === "free") return matchesSearch && c.subscription?.status !== "active";
    return matchesSearch;
  });

  const handleCopyLink = () => {
    const link = `https://writeoffgenie.ai/join?ref=${profile?.referralCode || ''}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filterOptions = [
    { value: "all", label: "All users" },
    { value: "subscribed", label: "Subscribed" },
    { value: "free", label: "Free users" }
  ];

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-[#00D1A0]" size={40} strokeWidth={2.5} />
      <p className="text-sm font-medium text-[#9499A1]">Loading referrals...</p>
    </div>
  );

  return (
    // Matches Dashboard/Performance spacing exactly
    <div className="flex flex-col gap-6 w-full max-w-full animate-in fade-in duration-500 pb-10">
      
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#111111] text-2xl font-bold tracking-tight">Referred Users</h1>
          <p className="text-[#9499A1] text-sm mt-1">Users who signed up using your referral link</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[#9499A1] text-sm font-medium">Filter by</span>
            <div className="relative">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="border border-[#E3E6EA] rounded-lg px-3 py-2 flex items-center gap-2 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span className="text-[#111111] text-sm font-medium">
                  {filterOptions.find(f => f.value === statusFilter)?.label}
                </span>
                <ChevronDown size={16} className="text-[#9499A1]" />
              </button>
              
              {filterOpen && (
                <div className="absolute top-full mt-2 right-0 bg-white border border-[#E3E6EA] rounded-lg shadow-lg z-10 w-[150px] overflow-hidden">
                  {filterOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setStatusFilter(option.value);
                        setFilterOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-gray-50 transition-colors ${
                        statusFilter === option.value ? 'text-[#00D1A0] bg-[rgba(0,209,160,0.05)]' : 'text-[#111111]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={handleCopyLink}
            className="bg-[#011C39] hover:bg-[#022a55] text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy referral link"}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {referrals.length === 0 ? (
        /* EMPTY STATE */
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E3E6EA] rounded-2xl">
          <EmptyIllustration />
          <div className="flex flex-col gap-2 items-center text-center mt-6">
            <h3 className="text-[#111111] text-lg font-bold">No referrals yet</h3>
            <p className="text-[#9499A1] text-sm max-w-xs">
              Share your referral link to invite users and start earning commission.
            </p>
          </div>
          <button 
            onClick={handleCopyLink}
            className="bg-[#011C39] hover:bg-[#022a55] text-white px-6 py-2.5 rounded-lg text-sm font-medium mt-6 transition-all cursor-pointer"
          >
            {copied ? "Copied!" : "Copy referral link"}
          </button>
        </div>
      ) : (
        /* TABLE STATE */
        <div className="bg-white border border-[#E3E6EA] rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
          
          {/* Table Header */}
          <div className="hidden md:flex items-center text-[#9499A1] text-xs font-medium uppercase tracking-wider pb-3 border-b border-[#E3E6EA]">
            <p className="w-1/4">User</p>
            <p className="w-1/5">Signup Date</p>
            <p className="w-1/5">Plan</p>
            <p className="w-1/6">Status</p>
            <p className="w-1/6 text-right">Commission</p>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col gap-2">
            {filtered.length > 0 ? (
              filtered.map((client) => {
                const hasSubscription = client.subscription?.plan && client.subscription?.status === "active";
                const planName = hasSubscription ? (client.subscription?.plan || "Standard Plan") : "Free Plan";
                const isActive = true;
                const dateStr = client.createdAt?.toDate().toLocaleDateString('en-US', { 
                  month: 'short', day: 'numeric', year: 'numeric' 
                });
                const commission = ((client.subscription?.amountPaid || 0) * 0.10).toFixed(2);

                return (
                  <div key={client.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-[#E3E6EA]">
                    
                    <div className="w-full md:w-1/4 mb-2 md:mb-0">
                      <p className="text-[#111111] text-sm font-medium truncate" title={client.email}>{client.email}</p>
                      <p className="text-[#9499A1] text-xs md:hidden">{client.name}</p>
                    </div>

                    <div className="w-full md:w-1/5 mb-2 md:mb-0 flex justify-between md:block">
                      <span className="md:hidden text-xs text-[#9499A1]">Joined:</span>
                      <p className="text-[#111111] text-sm">{dateStr}</p>
                    </div>

                    <div className="w-full md:w-1/5 mb-2 md:mb-0 flex justify-between md:block">
                      <span className="md:hidden text-xs text-[#9499A1]">Plan:</span>
                      <p className="text-[#111111] text-sm">{planName}</p>
                    </div>

                    <div className="w-full md:w-1/6 mb-2 md:mb-0">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        isActive 
                          ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]" 
                          : "bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]"
                      }`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="w-full md:w-1/6 text-left md:text-right flex justify-between md:block">
                      <span className="md:hidden text-xs text-[#9499A1]">Commission:</span>
                      <p className="text-[#011C39] text-sm font-bold">${commission}</p>
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-[#111111] text-sm font-medium">No users found</p>
                <p className="text-[#9499A1] text-xs mt-1">Try adjusting your filters or search.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}