import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { 
  Users, Search, Loader2, UserCheck, Filter, 
  Download, MoreVertical, CheckCircle2, XCircle, Clock,
  Mail, Calendar, DollarSign
} from "lucide-react";

export default function MyReferrals() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return;
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
  }, [user]);

  const activeCount = referrals.filter(c => c.subscription?.status === 'active').length;
  const expiredCount = referrals.filter(c => c.subscription?.status === 'expired').length;
  const pendingCount = referrals.length - activeCount - expiredCount;

  const filtered = referrals
    .filter(c => {
      const matchesSearch = 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "all" || 
        c.subscription?.status === statusFilter ||
        (statusFilter === "pending" && !c.subscription?.status);

      return matchesSearch && matchesStatus;
    });

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} strokeWidth={2.5} />
      <p className="text-sm font-medium text-slate-500">Loading client directory...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-8 bg-indigo-600 rounded-full" />
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Client Management</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Client Network</h1>
        <p className="text-slate-600">Manage and monitor your entire client referral network</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users size={20} strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{referrals.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 size={20} strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={20} strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pending</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
              <XCircle size={20} strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expired</span>
          </div>
          <p className="text-2xl font-bold text-slate-600">{expiredCount}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-3">
            <Filter size={20} className="text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{filtered.length}</span> of <span className="font-semibold text-slate-900">{referrals.length}</span> clients
          </p>
        </div>
      </div>

      {/* Client Cards - Mobile Friendly */}
      <div className="grid gap-4 md:hidden">
        {filtered.length > 0 ? filtered.map((client) => (
          <div key={client.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-500/20">
                  {client.name?.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{client.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail size={12} />
                    {client.email}
                  </p>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <MoreVertical size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-xs">
                {client.subscription?.status === 'active' ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span className="font-medium text-emerald-600">Active</span>
                  </>
                ) : client.subscription?.status === 'expired' ? (
                  <>
                    <XCircle size={14} className="text-slate-400" />
                    <span className="font-medium text-slate-500">Expired</span>
                  </>
                ) : (
                  <>
                    <Clock size={14} className="text-amber-600" />
                    <span className="font-medium text-amber-600">Pending</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-600">
                <DollarSign size={14} />
                <span className="font-semibold">₹{((client.subscription?.amountPaid || 0) * 0.10).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 text-xs text-slate-500">
              <Calendar size={12} />
              Joined {client.createdAt?.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        )) : (
          <div className="text-center py-12">
            <Users size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No clients found</p>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? filtered.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-linear-to-br from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-semibold shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                        {client.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      {client.subscription?.status === 'active' ? (
                        <>
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-sm font-medium text-emerald-600">Active</span>
                        </>
                      ) : client.subscription?.status === 'expired' ? (
                        <>
                          <div className="w-2 h-2 bg-slate-300 rounded-full" />
                          <span className="text-sm font-medium text-slate-500">Expired</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                          <span className="text-sm font-medium text-amber-600">Pending</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                      {client.subscription?.planType || "Standard"}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm font-semibold text-slate-900">
                      ₹{((client.subscription?.amountPaid || 0) * 0.10).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-sm text-slate-600">
                      {client.createdAt?.toDate().toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <Users size={48} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No clients found</p>
                    <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
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