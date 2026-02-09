import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  doc, getDoc, collection, query, where, getDocs 
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import toast, { Toaster } from "react-hot-toast";
import { 
  Loader2, User, ChevronDown, ChevronUp, CreditCard, 
  Building2, Wallet, Clock, CheckCircle2, XCircle, AlertCircle,
  ShieldCheck, Ban, ArrowLeft, Network
} from "lucide-react";

// --- LEVEL 3: CLIENT ITEM (The Leaf) ---
const ClientItem = ({ client, isLast }) => {
  const subStatus = client.subscription?.status || 'inactive';
  const isSubscribed = subStatus === 'active';

  return (
    <div className="relative flex items-center gap-3 p-3 ml-6 hover:bg-slate-50 transition-colors rounded-lg group">
        {/* Connector Line (Horizontal) */}
        <div className="absolute -left-4 top-1/2 w-4 h-px bg-slate-300"></div>
        {/* Connector Line (Vertical Cover for last item) */}
        {isLast && <div className="absolute -left-4 top-0 h-1/2 w-px bg-slate-300 bg-white"></div>}

        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border ${isSubscribed ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
            {client.displayName?.charAt(0) || "U"}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate">{client.displayName || client.name || "Unknown User"}</p>
            <p className="text-[10px] text-slate-400 truncate">{client.email}</p>
        </div>
        <div className="text-right">
            {isSubscribed ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full uppercase tracking-wide">Active</span>
            ) : (
                <span className="text-[10px] text-slate-400">Inactive</span>
            )}
        </div>
    </div>
  );
};

// --- LEVEL 2: CPA ITEM (The Branch) ---
const CPAItem = ({ cpa, toggle, isExpanded, isLast }) => {
    return (
        <div className="relative">
            {/* Tree Connector Lines */}
            <div className="absolute -left-5 top-0 bottom-0 w-px bg-slate-300"></div>
            {/* Horizontal Line to Node */}
            <div className="absolute -left-5 top-7 w-5 h-px bg-slate-300"></div>
            {/* Mask vertical line if last item */}
            {isLast && <div className="absolute -left-5 top-7 bottom-0 w-px bg-white"></div>}

            <div className="mb-2">
                <button 
                    onClick={() => toggle(cpa.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all relative z-10 ${
                        isExpanded ? 'bg-white border-[#4D7CFE] shadow-sm' : 'bg-white border-slate-200 hover:border-[#4D7CFE]/50'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-[#4D7CFE] flex items-center justify-center text-xs font-bold border border-blue-100">
                            {cpa.displayName?.charAt(0) || "C"}
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-slate-900">{cpa.displayName}</p>
                            <p className="text-[10px] text-slate-500 font-medium">
                                CPA • <span className="text-emerald-600">{cpa.clients?.length || 0} Clients</span>
                            </p>
                        </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-[#4D7CFE]"/> : <ChevronDown size={16} className="text-slate-400"/>}
                </button>

                {/* Level 3 Container (Clients) */}
                {isExpanded && (
                    <div className="ml-4 pl-4 border-l border-slate-300 space-y-1 pt-2 pb-2">
                        {cpa.clients && cpa.clients.length > 0 ? (
                            cpa.clients.map((client, idx) => (
                                <ClientItem 
                                    key={client.id} 
                                    client={client} 
                                    isLast={idx === cpa.clients.length - 1}
                                />
                            ))
                        ) : (
                            <div className="flex items-center gap-2 p-2 ml-4 text-slate-400">
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <span className="text-[10px] italic">No clients added yet.</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- LEVEL 1: AGENT ROOT (The Root) ---
const AgentRoot = ({ agent, cpas, toggleCPA, expandedCPAs }) => {
    const [isAgentExpanded, setIsAgentExpanded] = useState(true);

    return (
        <div className="relative">
            <button 
                onClick={() => setIsAgentExpanded(!isAgentExpanded)}
                className="w-full flex items-center justify-between p-4 bg-[#011C39] text-white rounded-xl shadow-md relative z-20 hover:bg-[#022a55] transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                        <User size={18} className="text-white"/>
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold">{agent.displayName || "Agent Name"}</p>
                        <p className="text-[11px] text-slate-300">Root Agent • {cpas.length} CPAs</p>
                    </div>
                </div>
                {isAgentExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {/* Level 2 Container (CPAs) */}
            {isAgentExpanded && (
                <div className="ml-5 pl-5 pt-4 pb-2">
                    {cpas.length > 0 ? (
                        cpas.map((cpa, idx) => (
                            <CPAItem 
                                key={cpa.id} 
                                cpa={cpa} 
                                toggle={toggleCPA} 
                                isExpanded={expandedCPAs[cpa.id]}
                                isLast={idx === cpas.length - 1}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 border-l border-dashed border-slate-300 ml-[-1px]">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                <Network size={16} className="text-slate-400" />
                            </div>
                            <p className="text-xs text-slate-400">No CPAs in this network yet.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


// --- MAIN PAGE ---
const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Data State
  const [agent, setAgent] = useState(null);
  const [cpas, setCPAs] = useState([]); 
  const [bankAccounts, setBankAccounts] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [expandedCPAs, setExpandedCPAs] = useState({});
  const [processing, setProcessing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    // 1. Fetch Agent Profile
    const fetchAgent = async () => {
        try {
            const agentDoc = await getDoc(doc(db, "Partners", id));
            if (!agentDoc.exists()) {
                toast.error("Agent not found");
                navigate("/admin/agents");
                return;
            }
            setAgent({ id: agentDoc.id, ...agentDoc.data() });

            // 2. Fetch Network Tree (CPAs -> Clients)
            const cpasQuery = query(
                collection(db, "Partners"),
                where("referredBy", "==", id),
                where("role", "==", "cpa")
            );
            const cpasSnap = await getDocs(cpasQuery);
            
            const cpasData = [];
            for (const cpaDoc of cpasSnap.docs) {
                const cpaData = { id: cpaDoc.id, ...cpaDoc.data() };
                
                // Get clients for this CPA
                const clientsQuery = query(collection(db, "Clients"), where("referredBy", "==", cpaDoc.id));
                const clientsSnap = await getDocs(clientsQuery);
                cpaData.clients = clientsSnap.docs.map(c => ({ id: c.id, ...c.data() }));
                
                cpasData.push(cpaData);
            }
            setCPAs(cpasData);

            // 3. Fetch Bank Accounts
            const bankQuery = query(collection(db, "Partners", id, "BankAccounts"));
            const bankSnap = await getDocs(bankQuery);
            setBankAccounts(bankSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // 4. Fetch Withdrawals
            const wdQuery = query(collection(db, "Payouts"), where("partner_id", "==", id));
            const wdSnap = await getDocs(wdQuery);
            const wdList = wdSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                requestedAt: doc.data().requestedAt?.toDate() || new Date()
            }));
            wdList.sort((a, b) => b.requestedAt - a.requestedAt);
            setWithdrawals(wdList);

            setLoading(false);
        } catch (error) {
            console.error("Error loading agent:", error);
            setLoading(false);
        }
    };

    fetchAgent();
  }, [id, navigate]);

  const toggleCPA = (cpaId) => {
    setExpandedCPAs(prev => ({ ...prev, [cpaId]: !prev[cpaId] }));
  };

  const confirmToggleStatus = async () => {
     setProcessing(true);
     const action = agent.status === 'active' ? 'suspend' : 'activate';
     const fn = httpsCallable(getFunctions(), 'toggleCAStatus'); 

     toast.promise(fn({ targetUserId: id, action }), {
        loading: 'Updating status...',
        success: `Agent ${action === 'activate' ? 'Activated' : 'Suspended'} successfully!`,
        error: (err) => `Failed: ${err.message}`
     }).finally(() => {
        setProcessing(false);
        setShowStatusModal(false);
        setAgent(prev => ({ ...prev, status: action === 'activate' ? 'active' : 'suspended' }));
     });
  };

  const formatDate = (date) => {
    return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
  };

  const formatCurrency = (val) => `$${(val || 0).toLocaleString()}`;

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32}/></div>;
  if (!agent) return null;

  const isActive = agent.status === 'active';
  const lastWithdrawalDate = withdrawals.length > 0 ? formatDate(withdrawals[0].requestedAt) : "No withdrawals yet";

  return (
    <div className="animate-in fade-in duration-300 pb-10 relative">
      <Toaster position="top-right" />
      
      {/* --- TOP BAR --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/agents" className="hover:text-slate-900 transition-colors flex items-center gap-1">
             <ArrowLeft size={14} /> Agent Management
          </Link>
          <span>{'>'}</span>
          <span className="font-bold text-slate-900">{agent.displayName || agent.name}</span>
        </div>
        
        <button 
          onClick={() => setShowStatusModal(true)}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2 ${
            isActive ? "bg-slate-900 hover:bg-slate-800" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {isActive ? "Disable Agent" : "Activate Agent"}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* --- LEFT COLUMN: PROFILE & STATS --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            
            {/* Header Info */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                    <User size={32} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900">{agent.displayName || agent.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      <span className={`text-xs font-bold uppercase tracking-wide ${isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {agent.status || 'Inactive'}
                      </span>
                      <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Agent</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid md:grid-cols-3 gap-8 pb-8 border-b border-slate-50">
               <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Email Address</p>
                  <p className="text-sm font-bold text-slate-900 break-all">{agent.email}</p>
               </div>
               <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Phone Number</p>
                  <p className="text-sm font-bold text-slate-900">{agent.phoneNumber || agent.phone || "N/A"}</p>
               </div>
               <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Referral Code</p>
                  <p className="text-sm font-bold text-slate-900 font-mono">#{agent.referralCode || "N/A"}</p>
               </div>
            </div>

            {/* Commission Rate (Fixed for Agents) */}
            <div className="mt-8 pb-8 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Fixed Commission</p>
                  <div className="flex items-center gap-3">
                     <p className="text-2xl font-black text-emerald-600">10%</p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Agents earn a fixed 10% commission on revenue generated by their referred CPAs.</p>
            </div>

            {/* Agent Earnings Summary */}
            <div className="mt-8">
              <p className="text-sm font-bold text-slate-400 mb-4">Earnings Overview</p>
              <div className="grid md:grid-cols-3 gap-4">
                 <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 border-b-4 border-b-emerald-400 hover:bg-slate-50 transition-colors">
                    <p className="text-xs text-slate-400 font-bold mb-2">Total Earned</p>
                    <p className="text-xl font-black text-slate-900">{formatCurrency(agent.stats?.totalEarnings)}</p>
                 </div>
                 <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 border-b-4 border-b-amber-400 hover:bg-slate-50 transition-colors">
                    <p className="text-xs text-slate-400 font-bold mb-2">Wallet Balance</p>
                    <p className="text-xl font-black text-slate-900">{formatCurrency(agent.walletBalance)}</p>
                 </div>
                 <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 border-b-4 border-b-rose-400 hover:bg-slate-50 transition-colors">
                    <p className="text-xs text-slate-400 font-bold mb-2">Total Withdrawn</p>
                    <p className="text-xl font-black text-slate-900">{formatCurrency(agent.stats?.totalWithdrawn)}</p>
                 </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                 <p className="text-sm font-bold text-slate-400">Linked Bank Accounts</p>
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
                  <p className="text-sm font-bold text-slate-400">Withdrawal History</p>
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
                        {withdrawals.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-slate-500">{p.referenceId || "---"}</td>
                                <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(p.amount)}</td>
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
                        {withdrawals.length === 0 && (
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

        {/* --- RIGHT COLUMN: UNIFIED HIERARCHY TREE --- */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-fit">
           <h3 className="text-lg font-bold text-slate-900 mb-6">Network Hierarchy</h3>
           
           <div className="space-y-4">
              <AgentRoot 
                 agent={agent} 
                 cpas={cpas} 
                 toggleCPA={toggleCPA} 
                 expandedCPAs={expandedCPAs} 
              />
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
                        {isActive ? "Disable Agent Account?" : "Activate Agent Account?"}
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                        {isActive 
                            ? "This will block the Agent from accessing their dashboard and earning commissions." 
                            : "This will restore full access to the Agent's dashboard and referral features."}
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
};

export default AgentDetail;