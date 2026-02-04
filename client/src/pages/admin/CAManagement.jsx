import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import toast, { Toaster } from "react-hot-toast"; // 🚀 Added Toaster
import { 
  Search, Loader2, Ban, CheckCircle2 
} from "lucide-react";

export default function CAManagement() {
  const [cas, setCas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [filter, setFilter] = useState("");
  
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "Partners"), where("role", "==", "ca"));
    const unsub = onSnapshot(q, (s) => {
      setCas(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);


  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    if (!window.confirm(`Are you sure you want to mark this account as ${newStatus}?`)) return;
    
    setProcessing(id);
    const toastId = toast.loading(`Updating status to ${newStatus}...`);

    try {
      const fn = httpsCallable(getFunctions(), 'toggleCAStatus');
      await fn({ targetUserId: id, action: newStatus }); // Sends 'inactive' or 'active'
      toast.success(`Account marked as ${newStatus}`, { id: toastId });
    } catch (e) { 
        console.error(e);
        toast.error("Update Failed: " + e.message, { id: toastId }); 
    } finally { 
        setProcessing(null); 
    }
  };

  const goToPartnerDetail = (partnerId) => {
    navigate(`/admin/cas/${partnerId}`);
  };

  const filtered = cas.filter(ca => 
    ca.name?.toLowerCase().includes(filter) || 
    ca.email?.toLowerCase().includes(filter)
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-slate-400" size={32}/>
    </div>
  );

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-10">
      <Toaster position="top-right" />
      
      {/* --- HEADER --- */}
      <div>
         <h1 className="text-2xl font-semibold leading-9 text-slate-900">CPA Management</h1>
         <p className="text-base font-normal leading-6 text-slate-400">View, manage, and control Chartered Public Accountant accounts</p>
      </div>

      {/* --- TABLE CONTAINER --- */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="py-5 px-6 text-xs font-medium text-slate-400">CA Name</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400">Email</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400">Joined On</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400">Referred Users</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400">Total Earnings</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400 text-center">Status</th>
                <th className="py-5 px-6 text-xs font-medium text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((ca) => {
                 const isActive = ca.status === 'active';
                 return (
                   <tr key={ca.id} className="hover:bg-slate-50/50 transition-colors group">
                     
                     {/* Name */}
                     <td className="py-5 px-6">
                        <span className="text-sm font-semibold text-slate-900">{ca.name}</span>
                     </td>

                     {/* Email */}
                     <td className="py-5 px-6">
                        <span className="text-sm text-slate-500 font-medium">{ca.email}</span>
                     </td>

                     {/* Joined Date */}
                     <td className="py-5 px-6">
                        <span className="text-sm text-slate-500">{formatDate(ca.createdAt)}</span>
                     </td>

                     {/* Referred Users */}
                     <td className="py-5 px-6">
                        <span className="text-sm font-medium text-slate-700 ml-2">{ca.stats?.totalReferred || 0}</span>
                     </td>

                     {/* Earnings */}
                     <td className="py-5 px-6">
                        <span className="text-sm font-bold text-slate-900">${(ca.stats?.totalEarnings || 0).toLocaleString()}</span>
                     </td>

                     {/* Status Badge */}
                     <td className="py-5 px-6 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                           isActive 
                           ? "bg-emerald-50 text-emerald-600" 
                           : "bg-red-50 text-red-600"
                        }`}>
                           {isActive ? "Active" : "Inactive"}
                        </span>
                     </td>

                     {/* Actions */}
                     <td className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                           <button 
                               onClick={() => toggleStatus(ca.id, ca.status)}
                               disabled={processing === ca.id}
                               className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                               title={isActive ? "Disable Account" : "Activate Account"}
                           >
                               {processing === ca.id ? <Loader2 size={16} className="animate-spin"/> : (isActive ? <Ban size={16}/> : <CheckCircle2 size={16}/>)}
                           </button>

                           <button 
                               onClick={() => goToPartnerDetail(ca.id)}
                               className="px-5 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm cursor-pointer"
                           >
                               View
                           </button>
                        </div>
                     </td>
                   </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
        
        {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 bg-white">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Search size={32} className="text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-bold text-lg">No CA accounts yet</h3>
                <p className="text-slate-500 text-sm mt-1">CA accounts will appear here once they register.</p>
            </div>
        )}
      </div>
    </div>
  );
}