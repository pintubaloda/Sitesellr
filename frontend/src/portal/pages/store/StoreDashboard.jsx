import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/api";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

export default function StoreDashboard() {
  const [summary, setSummary] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [health, setHealth] = useState(null);
  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setError("");
        const [sRes, wRes, hRes, oRes, aRes] = await Promise.all([
          api.get("/store/dashboard/summary"),
          api.get("/store/dashboard/revenue-weekly"),
          api.get("/store/dashboard/health"),
          api.get("/store/orders", { params: { page: 1, limit: 5 } }),
          api.get("/store/inventory/alerts"),
        ]);
        if (!mounted) return;
        setSummary(sRes.data || null);
        setWeekly(wRes.data || null);
        setHealth(hRes.data || null);
        setOrders(Array.isArray(oRes?.data?.data) ? oRes.data.data : []);
        setAlerts(Array.isArray(aRes?.data?.data) ? aRes.data.data : []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.error || "Could not load store dashboard.");
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(() => ([
    { k: "Today's Revenue", v: summary?.today?.revenueFormatted || money(summary?.today?.revenue || 0) },
    { k: "Orders Today", v: summary?.today?.orders ?? 0 },
    { k: "Visitors", v: summary?.today?.visitors ?? 0 },
    { k: "Low Stock", v: summary?.inventory?.lowStockCount ?? 0 },
  ]), [summary]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Store Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Operational metrics for your store.</p>
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
          <div className="px-5 py-4 border-b border-slate-100 font-bold">Recent Orders</div>
          <div className="p-4 space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">{o.displayId}</p>
                  <span className="text-xs capitalize">{o.status}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{o.customer?.name}</p>
                <p className="text-xs text-slate-500 mt-1">{o.amountFormatted}</p>
              </div>
            ))}
            {orders.length === 0 ? <p className="text-sm text-slate-500">No recent orders.</p> : null}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 font-bold">Store Health</div>
          <div className="p-4 space-y-3">
            {(health?.checks || []).map((check) => (
              <div key={check.key} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">{check.label}</span>
                <span className={`text-xs font-semibold ${check.status === "ok" ? "text-emerald-600" : "text-amber-600"}`}>{check.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 font-bold">Revenue (7 days)</div>
          <div className="p-4">
            <p className="text-2xl font-extrabold text-slate-900">{weekly?.totalFormatted || money(0)}</p>
            <p className="text-xs text-slate-500">vs last week: {weekly?.vsLastWeekPct ?? 0}%</p>
            <div className="mt-4 flex items-end gap-2 h-24">
              {(weekly?.days || []).map((d) => (
                <div key={d.date} className="flex-1 bg-blue-100 rounded-t" style={{ height: `${Math.max(8, d.pct || 0)}%` }} title={`${d.label}: ${money(d.revenue)}`} />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-500">
              {(weekly?.days || []).map((d) => <span key={d.date}>{d.label}</span>)}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 font-bold">Inventory Alerts</div>
          <div className="p-4 space-y-3">
            {alerts.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">{a.name}</p>
                  <span className="text-xs text-amber-600">{a.stockLabel}</span>
                </div>
                <p className="text-xs text-slate-500">{a.sku} · {a.priceFormatted}</p>
              </div>
            ))}
            {alerts.length === 0 ? <p className="text-sm text-slate-500">No low-stock items.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
