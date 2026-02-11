import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Loader2, DollarSign, Wallet, TrendingUp, Users } from "../../components/Icons"; 
import { AlertCircle, PieChart } from "lucide-react"; 
import StatCard from "../../components/common/StatCard";
import toast, { Toaster } from "react-hot-toast";

export default function EarningsTracking() {
  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState([]);

  useEffect(() => {
    // Listen to the Transactions Ledger in Real-Time
    // We fetch all completed commission transactions
    const q = query(
      collection(db, "Transactions"), 
      where("type", "==", "commission"),
      where("status", "==", "completed")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setLedgerData(transactions);
        setLoading(false);
      } catch (error) {
        console.error("Ledger Sync Error:", error);
        toast.error("Failed to sync financial ledger");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    // Initialize Accumulators
    let cpaTotalRev = 0;
    let cpaTotalComm = 0;
    
    let agentTotalRev = 0;
    let agentTotalComm = 0;

    // Single pass aggregation of the Ledger
    ledgerData.forEach(txn => {
      const amount = Number(txn.amountPaid || 0);
      const cpaEarn = Number(txn.cpaEarnings || 0);
      const agentEarn = Number(txn.agentEarnings || 0);

      // --- CPA TIER STATS ---
      // If a transaction has a CPA ID, it counts towards CPA Revenue
      if (txn.cpaId) {
        cpaTotalRev += amount;
        cpaTotalComm += cpaEarn;
      }

      // --- AGENT TIER STATS ---
      // If a transaction has an Agent ID, it counts towards Agent Revenue
      // Note: This is usually a subset of CPA revenue, as Agents refer CPAs.
      if (txn.agentId) {
        agentTotalRev += amount;
        agentTotalComm += agentEarn;
      }
    });

    return {
      cpaRev: cpaTotalRev,
      cpaComm: cpaTotalComm,
      cpaNet: cpaTotalRev - cpaTotalComm, // What the platform keeps after paying CPA
      
      agentRev: agentTotalRev,
      agentComm: agentTotalComm,
      agentNet: agentTotalRev - agentTotalComm // What the platform keeps after paying Agent (on Agent-linked deals)
    };
  }, [ledgerData]);

  const formatCurrency = (val) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  if (loading) return (
    <div className="h-96 flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={32}/>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <Toaster position="top-right" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Tracking</h1>
          <p className="text-slate-500">Verified real-time ledger analysis</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-full text-blue-600">
          <PieChart size={24} />
        </div>
      </div>

      {/* CPA TIER */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase text-[10px] tracking-widest bg-emerald-50 w-fit px-2 py-1 rounded">
          <Users size={12}/> CPA Performance Tier
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Total CPA Revenue" 
            value={formatCurrency(stats.cpaRev)} 
            description="Gross revenue from CPA referrals" 
            icon={DollarSign}
          />
          <StatCard 
            title="CPA Commissions" 
            value={formatCurrency(stats.cpaComm)} 
            description="Total payouts to CPAs" 
            icon={TrendingUp}
          />
          <StatCard 
            title="Platform Net (CPA)" 
            value={formatCurrency(stats.cpaNet)} 
            description="Revenue retained after CPA payout" 
            icon={Wallet}
          />
        </div>
      </section>

      {/* AGENT TIER */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-blue-600 font-bold uppercase text-[10px] tracking-widest bg-blue-50 w-fit px-2 py-1 rounded">
          <Users size={12}/> Agent Performance Tier
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Total Agent Revenue" 
            value={formatCurrency(stats.agentRev)} 
            description="Revenue from Agent-managed CPAs" 
            icon={DollarSign}
          />
          <StatCard 
            title="Agent Commissions" 
            value={formatCurrency(stats.agentComm)} 
            description="Net profit share paid to Agents" 
            icon={TrendingUp}
          />
          <StatCard 
            title="Platform Net (Agent)" 
            value={formatCurrency(stats.agentNet)} 
            description="Revenue retained after Agent payout" 
            icon={Wallet}
          />
        </div>
      </section>

      {/* Empty State Alert */}
      {stats.cpaRev === 0 && (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex gap-3 text-slate-600">
          <AlertCircle className="shrink-0 text-slate-400" size={20} />
          <div className="text-sm">
            <p className="font-bold text-slate-800">No ledger activity found</p>
            <p>Financial stats will appear here as soon as the first successful commission transaction is recorded.</p>
          </div>
        </div>
      )}
    </div>
  );
}