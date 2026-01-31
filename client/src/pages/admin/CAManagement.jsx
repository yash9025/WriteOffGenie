import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom"; // 🚀 Added Navigation
import { db } from "../../services/firebase";
import { 
  Search, Loader2, Copy, Check, Building2, Wallet, 
  CreditCard, X, ChevronRight, Users, ExternalLink 
} from "lucide-react";

export default function CAManagement() {
  const [cas, setCas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [filter, setFilter] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  
  // Bank Details Modal State
  const [selectedBank, setSelectedBank] = useState(null);
  const [bankLoading, setBankLoading] = useState(false);

  const navigate = useNavigate(); // 🚀 Hook for navigation

  useEffect(() => {
    const q = query(collection(db, "Partners"), where("role", "==", "ca"));
    const unsub = onSnapshot(q, (s) => {
      setCas(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    const newAction = currentStatus === 'active' ? 'suspend' : 'activate';
    setProcessing(id);
    try {
      const fn = httpsCallable(getFunctions(), 'toggleCAStatus');
      await fn({ targetUserId: id, action: newAction });
    } catch (e) { alert("Update Failed: " + e.message); } 
    finally { setProcessing(null); }
  };

  const handleCopyLink = (id, code, e) => {
    e.stopPropagation(); // Prevent card click
    if (!code) return;
    const link = `https://writeoffgenie.ai/join?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const viewBankDetails = async (partner, e) => {
    e.stopPropagation();
    setBankLoading(partner.id);
    try {
      const docRef = doc(db, "Partners", partner.id, "Sensitive", "BankDetails");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSelectedBank({ ...docSnap.data(), partnerName: partner.name });
      } else {
        alert("No bank details added by this partner yet.");
      }
    } catch (error) { console.error(error); alert("Error fetching bank data."); } 
    finally { setBankLoading(false); }
  };

  // 🚀 Navigation Handler
  const goToNetwork = (partnerId) => {
    navigate(`/admin/users?partner=${partnerId}`);
  };

  const filtered = cas.filter(ca => 
    ca.name?.toLowerCase().includes(filter) || 
    ca.email?.toLowerCase().includes(filter) || 
    ca.referralCode?.toLowerCase().includes(filter)
  );

  if (loading) return (
    <div className="h-[50vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40}/>
        <p className="text-slate-400 font-bold text-sm tracking-wide animate-pulse">Loading Partners...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-slate-900 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Partner Registry</h1>
           <p className="text-slate-500 font-medium mt-1">Manage partner accounts, credentials, and access.</p>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
          <input 
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm placeholder:text-slate-400"
            placeholder="Search by name, email, or code..."
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {/* 🚀 CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(ca => {
            const isActive = ca.status === 'active';
            
            return (
              <div key={ca.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative overflow-hidden">
                
                {/* Status Indicator Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${isActive ? "bg-emerald-500" : "bg-slate-300"}`} />

                {/* Top Row: Profile & Toggle */}
                <div className="flex justify-between items-start mb-6 pt-2">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 font-black text-lg shadow-sm">
                        {ca.name?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">{ca.name}</h3>
                        <p className="text-xs text-slate-500 font-medium">{ca.email}</p>
                      </div>
                   </div>

                   {/* Toggle Switch */}
                   <button 
                     onClick={() => toggleStatus(ca.id, ca.status)}
                     disabled={processing === ca.id}
                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        isActive ? 'bg-emerald-500' : 'bg-slate-200'
                     }`}
                   >
                     <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                     {processing === ca.id && <span className="absolute inset-0 flex items-center justify-center"><Loader2 size={12} className="animate-spin text-blue-600" /></span>}
                   </button>
                </div>

                {/* Credentials */}
                <div className="mb-6 bg-slate-50 rounded-xl p-4 border border-slate-100/80">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referral Code</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                         {isActive ? 'Active' : 'Suspended'}
                      </span>
                   </div>
                   <button 
                      onClick={(e) => handleCopyLink(ca.id, ca.referralCode, e)}
                      className="w-full flex items-center justify-between bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm px-3 py-2.5 rounded-lg transition-all group/btn"
                   >
                      <span className="font-mono font-bold text-slate-700 text-sm tracking-wide">{ca.referralCode || "---"}</span>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 group-hover/btn:text-blue-600">
                         {copiedId === ca.id ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                         <span>{copiedId === ca.id ? "Copied" : "Copy Link"}</span>
                      </div>
                   </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Total Earnings</p>
                        <p className="text-xl font-black text-slate-900 tracking-tight">₹{(ca.stats?.totalEarnings || 0).toLocaleString()}</p>
                    </div>
                    {/* 🚀 CLICKABLE LEADS STAT */}
                    <div 
                        onClick={() => goToNetwork(ca.id)}
                        className="cursor-pointer group/stat p-2 -m-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                        <div className="flex items-center gap-1 mb-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide group-hover/stat:text-blue-500">Total Leads</p>
                            <ExternalLink size={10} className="text-slate-300 group-hover/stat:text-blue-500" />
                        </div>
                        <div className="flex items-center gap-2">
                           <p className="text-xl font-black text-blue-600 tracking-tight">{ca.stats?.totalReferred || 0}</p>
                           <Users size={14} className="text-blue-300" />
                        </div>
                    </div>
                </div>

                {/* 🚀 DUAL ACTION BOTTOM ROW */}
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-3">
                   <button 
                     onClick={() => goToNetwork(ca.id)}
                     className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-all flex items-center justify-center gap-2"
                   >
                     <Users size={14} />
                     View Network
                   </button>

                   <button 
                     onClick={(e) => viewBankDetails(ca, e)}
                     disabled={bankLoading === ca.id}
                     className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                   >
                     {bankLoading === ca.id ? <Loader2 className="animate-spin text-blue-500" size={14}/> : <Building2 size={14}/>}
                     Bank Info
                   </button>
                </div>

              </div>
            );
        })}
      </div>

      {filtered.length === 0 && (
         <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300"><Search size={32} /></div>
            <p className="text-slate-500 font-bold text-lg">No partners found</p>
         </div>
      )}

      {/* Bank Modal (Same as before) */}
      {selectedBank && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-0 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-start">
               <div>
                  <h3 className="text-lg font-black text-slate-900">Bank Information</h3>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedBank.partnerName}</p>
                  </div>
               </div>
               <button onClick={() => setSelectedBank(null)} className="p-2 rounded-full hover:bg-slate-100"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-5">
               {/* Detail Items... (Same as previous sleek design) */}
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100"><Building2 size={20}/></div>
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase">Bank Name</p><p className="text-sm font-bold text-slate-900">{selectedBank.bankName}</p></div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><CreditCard size={20}/></div>
                  <div className="flex-1"><p className="text-[10px] font-bold text-slate-400 uppercase">Account Number</p><p className="text-lg font-mono font-bold text-slate-900">{selectedBank.accountNo}</p></div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100"><Wallet size={20}/></div>
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase">IFSC Code</p><p className="text-sm font-mono font-bold text-slate-900">{selectedBank.ifsc}</p></div>
               </div>
            </div>
            <div className="p-6 pt-0"><button onClick={() => setSelectedBank(null)} className="w-full py-3.5 font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 rounded-2xl shadow-lg">Close Details</button></div>
          </div>
        </div>
      )}
    </div>
  );
}