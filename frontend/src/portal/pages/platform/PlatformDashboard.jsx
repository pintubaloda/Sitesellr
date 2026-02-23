import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/api";

const formatInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function PlatformDashboard() {
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [plans, setPlans] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setError("");
        const [summaryRes, activityRes, plansRes, healthRes] = await Promise.all([
          api.get("/platform/dashboard/summary"),
          api.get("/platform/dashboard/activity", { params: { limit: 20, offset: 0 } }),
          api.get("/platform/dashboard/revenue-by-plan"),
          api.get("/platform/system/health"),
        ]);
        if (!mounted) return;
        setSummary(summaryRes.data || null);
        setActivity(Array.isArray(activityRes?.data?.items) ? activityRes.data.items : []);
        setPlans(Array.isArray(plansRes?.data?.plans) ? plansRes.data.plans : []);
        setHealth(healthRes.data || null);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.error || "Could not load platform dashboard.");
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(() => ([
    { k: "Total Tenants", v: summary?.tenants?.total ?? 0 },
    { k: "Active Tenants", v: summary?.tenants?.active ?? 0 },
    { k: "MRR", v: summary?.revenue?.mrrFormatted || formatInr(summary?.revenue?.mrr || 0) },
    { k: "Orders Today", v: summary?.orders?.today ?? 0 },
  ]), [summary]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Live platform metrics and operational health.</p>
      </div>
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{error}</div> : null}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.k} className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">{c.k}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{c.v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 font-bold">Recent Activity</div>
          <div className="p-4 space-y-3">
            {activity.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-100 p-3">
                <p className="font-semibold text-slate-800 text-sm">{item.message || item.type}</p>
                <p className="text-xs text-slate-500 mt-1">{item.timeAgo || new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {activity.length === 0 ? <p className="text-sm text-slate-500">No activity available.</p> : null}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 font-bold">System Health</div>
          <div className="p-4 space-y-3">
            {(health?.services || []).map((svc) => (
              <div key={svc.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">{svc.name}</span>
                <span className={`text-xs font-semibold ${svc.status === "healthy" ? "text-emerald-600" : "text-amber-600"}`}>{svc.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 font-bold">Revenue by Plan</div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 text-slate-500">Plan</th>
                <th className="text-left py-2 text-slate-500">Revenue</th>
                <th className="text-left py-2 text-slate-500">Share</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.plan} className="border-t border-slate-100">
                  <td className="py-2">{p.plan}</td>
                  <td className="py-2 font-semibold">{p.revenueFormatted || formatInr(p.revenue)}</td>
                  <td className="py-2">{p.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {plans.length === 0 ? <p className="text-sm text-slate-500 mt-2">No billing data yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
