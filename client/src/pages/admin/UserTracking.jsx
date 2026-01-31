import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore"; // 🚀 Added query, where
import { db } from "../../services/firebase";
import { 
  Users, Search, Link as LinkIcon, AlertCircle, Copy, Check, 
  Tag, Filter, ChevronDown, UserCheck, RefreshCcw 
} from "lucide-react";

export default function UserTracking() {
  const [users, setUsers] = useState([]);
  const [partners, setPartners] = useState({}); 
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCA, setSelectedCA] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); 
  
  // UI State
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uSnap, pSnap] = await Promise.all([
          getDocs(collection(db, "Clients")),
          // 🔥 OPTIMIZED: Server-side filter. Only fetches CAs.
          getDocs(query(collection(db, "Partners"), where("role", "==", "ca"))) 
        ]);
        
        const pMap = {};
        pSnap.forEach(d => {
            const data = d.data();
            pMap[d.id] = { 
                name: data.name || "Unknown", 
                code: data.referralCode || "" 
            };
        });
        setPartners(pMap);
        setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleCopyLink = (userId, caId) => {
    const partner = partners[caId];
    if (!partner || !partner.code) return;
    const link = `https://writeoffgenie.ai/join?ref=${partner.code}`;
    navigator.clipboard.writeText(link);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            u.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCA = selectedCA === "all" || u.referredBy === selectedCA;
      
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = u.subscription?.status === 'active';
      if (statusFilter === 'expired') matchesStatus = u.subscription?.status !== 'active';

      return matchesSearch && matchesCA && matchesStatus;
    });
  }, [users, searchQuery, selectedCA, statusFilter]);

  const activeCount = filteredUsers.filter(u => u.subscription?.status === 'active').length;
  // Sort partners alphabetically for the dropdown
  const partnerList = Object.entries(partners).sort((a,b) => a[1].name.localeCompare(b[1].name));

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCA("all");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-slate-900 pb-20">
      
      {/* --- HEADER & STATS --- */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6 border-b border-slate-200 pb-6">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Global Directory</h1>
           <div className="flex items-center gap-4 mt-2 transition-all duration-300">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                <Users size={14} /> {filteredUsers.length} Users
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <UserCheck size={14} /> {activeCount} Active
              </div>
           </div>
        </div>
        
        {/* Status Tabs */}
        <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 w-fit self-start lg:self-auto">
            {['all', 'active', 'expired'].map(status => (
                <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all duration-300 ease-out ${
                        statusFilter === status 
                        ? 'bg-white text-slate-900 shadow-sm scale-100' 
                        : 'text-slate-500 hover:text-slate-700 scale-95 hover:scale-100'
                    }`}
                >
                    {status === 'expired' ? 'Leads' : status}
                </button>
            ))}
        </div>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="md:col-span-2 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300" size={20} />
          <input 
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300 shadow-sm placeholder:text-slate-400"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Partner Dropdown */}
        <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-blue-600 transition-colors">
                <Filter size={18} />
            </div>
            <select 
                className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm cursor-pointer hover:border-slate-300 transition-all duration-300"
                value={selectedCA}
                onChange={(e) => setSelectedCA(e.target.value)}
            >
                <option value="all">All Partners</option>
                <option disabled>──────────</option>
                {partnerList.map(([id, p]) => (
                    <option key={id} value={id}>{p.name}</option>
                ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronDown size={16} />
            </div>
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgb(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-8 py-5">User Profile</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Plan Tier</th>
                <th className="px-8 py-5">Referral Source</th>
                <th className="px-8 py-5 text-right">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                 // Loading Skeleton
                 [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                        <td className="px-8 py-5"><div className="h-10 w-32 bg-slate-100 rounded-lg"></div></td>
                        <td className="px-8 py-5"><div className="h-6 w-20 bg-slate-100 rounded-md"></div></td>
                        <td className="px-8 py-5"><div className="h-6 w-24 bg-slate-100 rounded-md"></div></td>
                        <td className="px-8 py-5"><div className="h-8 w-28 bg-slate-100 rounded-lg"></div></td>
                        <td className="px-8 py-5 text-right"><div className="h-6 w-24 bg-slate-100 rounded-md ml-auto"></div></td>
                    </tr>
                 ))
              ) : filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-blue-50/30 transition-colors duration-200 group">
                  
                  {/* User Profile */}
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm border border-slate-200 shadow-sm group-hover:bg-white group-hover:border-blue-200 group-hover:text-blue-600 transition-all">
                            {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-sm group-hover:text-blue-900 transition-colors">{u.name}</p>
                            <p className="text-xs font-medium text-slate-500">{u.email}</p>
                        </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border transition-all ${
                      u.subscription?.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100' 
                      : 'bg-slate-50 text-slate-500 border-slate-200 group-hover:bg-slate-100'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.subscription?.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {u.subscription?.status || 'Lead'}
                    </span>
                  </td>

                  {/* Plan Type */}
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                        <Tag size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">
                            {u.subscription?.planType || "Standard"}
                        </span>
                    </div>
                  </td>
                  
                  {/* Referral Source (Clickable) */}
                  <td className="px-8 py-5">
                    {u.referredBy && partners[u.referredBy] ? (
                      <button 
                        onClick={() => handleCopyLink(u.id, u.referredBy)}
                        className="group/btn flex items-center gap-2 bg-blue-50/50 hover:bg-blue-100 border border-blue-100 hover:border-blue-300 px-3 py-1.5 rounded-lg transition-all duration-300 hover:shadow-sm"
                        title="Copy CA Referral Link"
                      >
                         <LinkIcon size={12} className="text-blue-600" />
                         <span className="text-xs font-bold text-blue-700">{partners[u.referredBy].name}</span>
                         {copiedId === u.id ? (
                            <Check size={12} className="text-emerald-500 animate-in zoom-in spin-in-90" />
                         ) : (
                            <Copy size={12} className="text-blue-400 opacity-0 group-hover/btn:opacity-100 transition-all transform scale-90 group-hover/btn:scale-100" />
                         )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 px-3 py-1.5 opacity-60">
                         <AlertCircle size={14} />
                         <span className="text-xs font-medium italic">Organic / Direct</span>
                      </div>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-8 py-5 text-right">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 group-hover:bg-white transition-colors">
                       {u.createdAt?.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                </tr>
              ))}
              
              {/* Empty State */}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                    <td colSpan="5" className="py-24 text-center">
                        <div className="flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                <Search size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-slate-900 font-black text-lg">No users found</h3>
                            <p className="text-slate-500 text-sm mt-1 mb-6 max-w-xs mx-auto">
                                We couldn't find any users matching your current filters.
                            </p>
                            <button 
                                onClick={resetFilters}
                                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <RefreshCcw size={14} /> Clear all filters
                            </button>
                        </div>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}