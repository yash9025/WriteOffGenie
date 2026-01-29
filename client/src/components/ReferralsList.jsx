import { User, Calendar, ShieldCheck, Clock } from "lucide-react";

export function ReferralsList({ referrals }) {
  // 🛡️ Safety check: Ensure referrals is an array
  const hasReferrals = Array.isArray(referrals) && referrals.length > 0;

  if (!hasReferrals) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center border border-slate-100 mt-8">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#0e2b4a]">
          <User size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800">No Referrals Yet</h3>
        <p className="text-slate-500 mt-2">
          Share your link to start earning commissions!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#0e2b4a]">Referred Clients</h3>
          <p className="text-slate-500 text-sm mt-1">
            Track your signups and subscription status
          </p>
        </div>
        <span className="bg-blue-50 text-[#0e2b4a] px-4 py-1.5 rounded-full text-sm font-bold">
          {referrals.length} Total
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
              <th className="px-8 py-5">Client Name</th>
              <th className="px-6 py-5">Joined Date</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5">Subscription</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {referrals.map((client) => (
              <tr 
                key={client.id} 
                className="hover:bg-blue-50/30 transition-colors duration-200 group"
              >
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0e2b4a] to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                      {client.name ? client.name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{client.name || "Unknown Client"}</p>
                      <p className="text-xs text-slate-500">{client.email}</p>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                    <Calendar size={14} className="text-slate-400" />
                    {client.createdAt?.seconds 
                      ? new Date(client.createdAt.seconds * 1000).toLocaleDateString() 
                      : "Recently"}
                  </div>
                </td>

                <td className="px-6 py-5">
                   <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      client.status === "active" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                      : "bg-slate-50 text-slate-600 border-slate-100"
                   }`}>
                      {client.status === "active" ? <ShieldCheck size={12}/> : <Clock size={12}/>}
                      {client.status === "active" ? "Verified" : "Pending"}
                   </span>
                </td>

                <td className="px-6 py-5">
                   {client.subscriptionStatus === "active" ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#0e2b4a]/10 text-[#0e2b4a]">
                        Premium Plan
                      </span>
                   ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        Free Tier
                      </span>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}