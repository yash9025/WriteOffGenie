import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, collectionGroup } from "firebase/firestore";
import { db } from "../../services/firebase";
// Standard imports from your local file
import { Loader2, DollarSign, Wallet, TrendingUp, Users } from "../../components/Icons"; 
// Direct import to bypass the "export named AlertCircle" error
import { AlertCircle, PieChart } from "lucide-react"; 
import StatCard from "../../components/common/StatCard";
import toast, { Toaster } from "react-hot-toast";

const PLAN_PRICES = {
  'writeoffgenie-premium-month': 25.00,
  'com.writeoffgenie.premium.monthly': 25.00,
  'writeoffgenie-pro-month': 15.00,
  'com.writeoffgenie.pro.monthly': 15.00,
  'writeoffgenie-premium-year': 239.99,
  'com.writeoffgenie.premium.yearly': 239.99,
  'writeoffgenie-pro-year': 143.99,
  'com.writeoffgenie.pro.yearly': 143.99,
};

export default function EarningsTracking() {
  const [loading, setLoading] = useState(true);
  const [rawSubData, setRawSubData] = useState([]);
  const [partnerMap, setPartnerMap] = useState({ byId: {}, byCode: {} });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pSnap, uSnap, allSubsSnap] = await Promise.all([
          getDocs(collection(db, "Partners")),
          getDocs(collection(db, "user")),
          getDocs(collectionGroup(db, "subscription"))
        ]);
        
        const userRefCodes = {};
        uSnap.docs.forEach(d => {
          const u = d.data();
          if (u.referral_code) {
            userRefCodes[d.id] = String(u.referral_code).toLowerCase().trim();
          }
        });
        
        const byId = {};
        const byCode = {};
        pSnap.forEach(d => {
          const p = d.data();
          const partner = { 
            id: d.id,
            name: p.displayName || p.name || "Unknown", 
            code: p.referralCode ? String(p.referralCode).toLowerCase().trim() : null, 
            role: String(p.role || '').toLowerCase(),
            cpaRate: (p.commissionRate || 10) / 100,
            agentRate: (p.commissionPercentage || 15) / 100,
            maint: Number(p.maintenanceCostPerUser || 6.00),
            referredBy: p.referredBy
          };
          byId[d.id] = partner;
          if (partner.code) byCode[partner.code] = partner;
        });

        const subscriptions = allSubsSnap.docs.map(subDoc => {
          const sub = subDoc.data();
          const userId = subDoc.ref.path.split('/')[1];
          const price = PLAN_PRICES[sub.planname] || 0;
          const finalCode = userRefCodes[userId] || (sub.ref_code ? String(sub.ref_code).toLowerCase().trim() : null);

          return {
            id: subDoc.id,
            price,
            status: sub.status,
            expiration: sub.expiration_date?.toDate ? sub.expiration_date.toDate() : (sub.expiration_date ? new Date(sub.expiration_date) : null),
            refCode: finalCode
          };
        });

        setPartnerMap({ byId, byCode });
        setRawSubData(subscriptions);
      } catch (e) {
        console.error("Fetch error:", e);
        toast.error("Failed to sync live data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    let cpaTotalRev = 0;
    let cpaTotalComm = 0;
    let agentTotalRev = 0;
    const agentBuckets = {};

    rawSubData.forEach(sub => {
      if (sub.price === 0 || !sub.refCode) return;

      const cpa = partnerMap.byCode[sub.refCode];
      if (!cpa) return;

      cpaTotalRev += sub.price;
      const cpaComm = sub.price * cpa.cpaRate;
      cpaTotalComm += cpaComm;

      if (cpa.referredBy && partnerMap.byId[cpa.referredBy]) {
        const agent = partnerMap.byId[cpa.referredBy];
        if (agent.role.includes('agent')) {
          const agentId = agent.id;
          if (!agentBuckets[agentId]) {
            agentBuckets[agentId] = { rev: 0, cpaPaid: 0, activeCount: 0, config: agent };
          }
          agentBuckets[agentId].rev += sub.price;
          agentBuckets[agentId].cpaPaid += cpaComm;
          const isActive = sub.status === 'active' && sub.expiration && sub.expiration > now;
          if (isActive) agentBuckets[agentId].activeCount++;
          agentTotalRev += sub.price;
        }
      }
    });

    let agentTotalComm = 0;
    Object.values(agentBuckets).forEach(b => {
      const netProfit = (b.rev - b.cpaPaid) - (b.activeCount * b.config.maint);
      agentTotalComm += Math.max(0, netProfit * b.config.agentRate);
    });

    return {
      cpaRev: cpaTotalRev,
      cpaComm: cpaTotalComm,
      cpaNet: cpaTotalRev - cpaTotalComm,
      agentRev: agentTotalRev,
      agentComm: agentTotalComm,
      agentNet: agentTotalRev - agentTotalComm
    };
  }, [rawSubData, partnerMap]);

  const formatCurrency = (val) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32}/></div>;

  return (
    <div className="space-y-10 pb-20">
      <Toaster position="top-right" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Tracking</h1>
          <p className="text-slate-500">Real-time revenue and commission analysis</p>
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
          <StatCard title="Total CPA Revenue" value={formatCurrency(stats.cpaRev)} description="All revenue via CPA codes" icon={DollarSign}/>
          <StatCard title="CPA Commissions" value={formatCurrency(stats.cpaComm)} description="Total earnings paid to CPAs" icon={TrendingUp}/>
          <StatCard title="CPA Net Profit" value={formatCurrency(stats.cpaNet)} description="Revenue after CPA payout" icon={Wallet}/>
        </div>
      </section>

      {/* AGENT TIER */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-blue-600 font-bold uppercase text-[10px] tracking-widest bg-blue-50 w-fit px-2 py-1 rounded">
          <Users size={12}/> Agent Performance Tier
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Agent Revenue" value={formatCurrency(stats.agentRev)} description="Revenue from Agent-led network" icon={DollarSign}/>
          <StatCard title="Agent Commissions" value={formatCurrency(stats.agentComm)} description="Net profit share for Agents" icon={TrendingUp}/>
          <StatCard title="Agent Net Profit" value={formatCurrency(stats.agentNet)} description="Platform revenue after Agent cut" icon={Wallet}/>
        </div>
      </section>

      {/* Troubleshooting Alert */}
      {stats.cpaRev === 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800">
          <AlertCircle className="shrink-0" size={20} />
          <div className="text-sm">
            <p className="font-bold">No live data found</p>
            <p>Ensure the <strong>referral_code</strong> on users matches the <strong>referralCode</strong> in Partners exactly.</p>
          </div>
        </div>
      )}
    </div>
  );
}