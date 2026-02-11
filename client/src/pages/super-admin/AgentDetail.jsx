import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  doc, getDoc, collection, query, where, getDocs, updateDoc, onSnapshot 
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase";
import toast, { Toaster } from "react-hot-toast";
import { 
  Loader2, User, ChevronDown, ChevronUp, ShieldCheck, Ban, ArrowLeft, Network, Settings, TrendingUp, DollarSign, Info, X
} from "lucide-react";

// --- LEVEL 3: CLIENT ITEM (The Leaf) ---
const ClientItem = ({ client, isLast }) => {
  // Logic: Consider active if they have revenue in the ledger
  const isSubscribed = client.isActive || client.totalRevenue > 0;

  return (
    <div className="relative flex items-center gap-3 p-3 ml-6 hover:bg-slate-50 transition-colors rounded-lg group">
        {/* Connector Line (Horizontal) */}
        <div className="absolute -left-4 top-1/2 w-4 h-px bg-slate-300"></div>
        {/* Connector Line (Vertical Cover for last item) */}
        {isLast && <div className="absolute -left-4 top-0 h-1/2 w-px bg-slate-300 bg-white"></div>}

        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border ${isSubscribed ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
            {client.display_name?.charAt(0) || client.email?.charAt(0) || "U"}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate">{client.display_name || "Unknown User"}</p>
            <p className="text-[10px] text-slate-400 truncate">{client.email}</p>
            <p className="text-[10px] font-semibold text-slate-600">Total: ${client.totalRevenue?.toFixed(2) || '0.00'}</p>
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
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({
    totalRevenue: 0,
    totalCPACommissions: 0,
    activeClients: 0,
    netProfit: 0,
    agentCommission: 0
  });
  
  // UI State
  const [expandedCPAs, setExpandedCPAs] = useState({});
  const [processing, setProcessing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    commissionPercentage: 15,
    maintenanceCostPerUser: 6.00
  });

  useEffect(() => {
    if (!id) return;
    
    // Listen to Transactions (The heartbeat of the system)
    // This allows the dashboard to update instantly when a new sale happens.
    const unsubTxns = onSnapshot(
        query(collection(db, "Transactions"), where("agentId", "==", id), where("status", "==", "completed")), 
        async (txnsSnap) => {
            try {
                // Fetch Static/Semi-static data (Agent Profile, CPAs, Users)
                // We fetch Users list to get names for the tree view
                const [agentDoc, cpasSnap, usersSnap] = await Promise.all([
                    getDoc(doc(db, "Partners", id)),
                    getDocs(query(collection(db, "Partners"), where("referredBy", "==", id), where("role", "==", "cpa"))),
                    getDocs(collection(db, "user"))
                ]);

                if (!agentDoc.exists()) {
                    toast.error("Agent not found");
                    navigate("/admin/agents");
                    return;
                }

                const agentData = { id: agentDoc.id, ...agentDoc.data() };
                setAgent(agentData);

                // --- DATA PROCESSING (Ledger Based) ---
                
                // 1. Prepare User Map for quick name lookup
                const userMap = {};
                usersSnap.docs.forEach(u => userMap[u.id] = u.data());

                // 2. Prepare CPA Map
                const cpasMap = {};
                const cpasList = cpasSnap.docs.map(doc => {
                    const data = { id: doc.id, ...doc.data(), clients: [] };
                    cpasMap[doc.id] = data;
                    return data;
                });

                // 3. Aggregate Transactions
                let totalRevenue = 0;
                let totalCPACommissions = 0;
                let totalAgentCommissions = 0;
                const uniqueClientsSet = new Set();

                // Temp storage for client aggregation per CPA
                // Map<cpaId, Map<userId, {totalRevenue, isActive}>>
                const cpaClientTracker = {};

                txnsSnap.docs.forEach(doc => {
                    const txn = doc.data();
                    
                    // Stats Aggregation
                    totalRevenue += Number(txn.amountPaid || 0);
                    totalCPACommissions += Number(txn.cpaEarnings || 0);
                    totalAgentCommissions += Number(txn.agentEarnings || 0);
                    uniqueClientsSet.add(txn.userId);

                    // Tree Construction Data
                    const cpaId = txn.cpaId;
                    const userId = txn.userId;

                    if (cpaId && cpasMap[cpaId]) {
                        if (!cpaClientTracker[cpaId]) cpaClientTracker[cpaId] = {};
                        if (!cpaClientTracker[cpaId][userId]) {
                            cpaClientTracker[cpaId][userId] = { 
                                id: userId, 
                                totalRevenue: 0, 
                                isActive: true 
                            };
                        }
                        cpaClientTracker[cpaId][userId].totalRevenue += Number(txn.amountPaid || 0);
                    }
                });

                // 4. Populate CPA Clients Array for the Tree
                cpasList.forEach(cpa => {
                    const clientsObj = cpaClientTracker[cpa.id] || {};
                    const clientArray = Object.values(clientsObj).map(clientData => {
                        const userProfile = userMap[clientData.id] || {};
                        return {
                            ...clientData,
                            display_name: userProfile.displayName || userProfile.display_name || userProfile.name || "Unknown",
                            email: userProfile.email || "No Email"
                        };
                    });
                    cpa.clients = clientArray;
                });

                setCPAs(cpasList);

                // 5. Calculate Net Profit & Earnings using verified formula
                const commRate = (agentData.commissionPercentage || 15) / 100;
                const maintCost = agentData.maintenanceCostPerUser || 6.00;
                const activeClientCount = uniqueClientsSet.size;
                
                // Net Profit = (Rev - CPA_Paid) - (ActiveUsers * Maint)
                const netProfitCalc = (totalRevenue - totalCPACommissions) - (activeClientCount * maintCost);

                setEarnings({
                    totalRevenue,
                    totalCPACommissions,
                    activeClients: activeClientCount,
                    netProfit: netProfitCalc,
                    agentCommission: totalAgentCommissions // Use ledger value for absolute accuracy
                });

                setLoading(false);

            } catch (error) {
                console.error("Error updating agent details:", error);
                setLoading(false);
            }
        }
    );

    return () => unsubTxns();
  }, [id, navigate]);

  const toggleCPA = (cpaId) => {
    setExpandedCPAs(prev => ({ ...prev, [cpaId]: !prev[cpaId] }));
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    
    // Validation
    if (editForm.commissionPercentage < 0 || editForm.commissionPercentage > 100) {
      toast.error("Commission percentage must be between 0 and 100");
      return;
    }
    
    if (editForm.maintenanceCostPerUser < 0) {
      toast.error("Maintenance cost cannot be negative");
      return;
    }

    setProcessing(true);
    const toastId = toast.loading("Updating settings...");

    try {
      await updateDoc(doc(db, "Partners", id), {
        commissionPercentage: parseFloat(editForm.commissionPercentage),
        maintenanceCostPerUser: parseFloat(editForm.maintenanceCostPerUser)
      });

      // Optimistic Update
      setAgent(prev => ({
        ...prev,
        commissionPercentage: parseFloat(editForm.commissionPercentage),
        maintenanceCostPerUser: parseFloat(editForm.maintenanceCostPerUser)
      }));

      // Note: The Real-time listener will catch the DB change and re-run calculations automatically.
      
      toast.success("Settings updated successfully!", { id: toastId });
      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings", { id: toastId });
    } finally {
      setProcessing(false);
    }
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

  const formatCurrency = (val) => `$${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32}/></div>;
  if (!agent) return null;

  const isActive = agent.status === 'active';

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

            {/* Commission Settings (Editable) */}
            <div className="mt-8 pb-8 border-b border-slate-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Commission Settings</p>
                  <div className="flex items-center gap-4 mt-2">
                      <div>
                        <p className="text-xs text-slate-500">Commission Rate</p>
                        <p className="text-2xl font-black text-[#4D7CFE]">{agent.commissionPercentage || 15}%</p>
                      </div>
                      <div className="w-px h-12 bg-slate-200"></div>
                      <div>
                        <p className="text-xs text-slate-500">Maintenance Cost per User</p>
                        <p className="text-2xl font-black text-slate-700">{formatCurrency(agent.maintenanceCostPerUser || 6.00)}</p>
                      </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setEditForm({
                      commissionPercentage: agent.commissionPercentage || 15,
                      maintenanceCostPerUser: agent.maintenanceCostPerUser || 6.00
                    });
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 bg-[#4D7CFE] text-white rounded-lg text-sm font-semibold hover:bg-[#3D6CED] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Settings size={16} />
                  Edit Settings
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Edit commission percentage and maintenance cost to calculate agent earnings based on net profit.</p>
            </div>

            {/* Agent Earnings Summary with Formula Breakdown */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm font-bold text-slate-400">Earnings Breakdown</p>
                <div className="group relative">
                  <Info size={14} className="text-slate-400 cursor-help" />
                  <div className="absolute left-0 top-6 w-80 bg-slate-900 text-white text-xs p-3 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg">
                    <p className="font-bold mb-1">Formula:</p>
                    <p className="text-slate-300">Commission = {agent.commissionPercentage || 15}% × [(Revenue - CPA Commissions) - (Active Clients × {formatCurrency(agent.maintenanceCostPerUser || 6.00)})]</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
                      <p className="text-lg font-black text-slate-900">{formatCurrency(earnings.totalRevenue)}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-red-500 font-medium">- CPA Commissions</p>
                      <p className="text-lg font-black text-red-600">-{formatCurrency(earnings.totalCPACommissions)}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-red-500 font-medium">- Maintenance Costs ({earnings.activeClients} × {formatCurrency(agent.maintenanceCostPerUser || 6.00)})</p>
                      <p className="text-lg font-black text-red-600">-{formatCurrency(earnings.activeClients * (agent.maintenanceCostPerUser || 6.00))}</p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200"></div>

                  <div className="p-4 rounded-xl border-2 border-blue-100 bg-blue-50/50">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-blue-600 font-bold uppercase">= Net Profit</p>
                      <p className="text-lg font-black text-blue-900">{formatCurrency(earnings.netProfit)}</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border-2 border-emerald-200 bg-emerald-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-emerald-600 font-bold uppercase">Agent Commission</p>
                        <p className="text-[10px] text-emerald-600/70 mt-0.5">{agent.commissionPercentage || 15}% of Net Profit</p>
                      </div>
                      <p className="text-2xl font-black text-emerald-900">{formatCurrency(earnings.agentCommission)}</p>
                    </div>
                  </div>
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

      {/* EDIT SETTINGS MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Commission Settings</h3>
                <p className="text-sm text-slate-500 mt-1">Adjust commission rate and maintenance cost</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSettings} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editForm.commissionPercentage}
                  onChange={(e) => setEditForm({ ...editForm, commissionPercentage: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#4D7CFE] transition-colors"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Percentage of net profit earned by the agent</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Maintenance Cost per User ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.maintenanceCostPerUser}
                  onChange={(e) => setEditForm({ ...editForm, maintenanceCostPerUser: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#4D7CFE] transition-colors"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Cost deducted per active subscription before calculating commission</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-900 mb-1">Formula Preview</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Commission = {editForm.commissionPercentage}% × [(Revenue - CPA Commissions) - (Active Clients × ${editForm.maintenanceCostPerUser})]
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 px-4 py-2.5 bg-[#4D7CFE] text-white rounded-lg text-sm font-semibold hover:bg-[#3D6CED] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {processing ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                  {processing ? "Updating..." : "Update Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AgentDetail;