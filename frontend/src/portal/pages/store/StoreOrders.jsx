import React, { useEffect, useMemo, useState } from "react";
import { Search, Download, Plus, Eye, CheckCircle, Clock, XCircle, Truck } from "lucide-react";
import api from "../../../lib/api";

const STATUS_MAP = {
  paid:      { bg:"bg-emerald-50", text:"text-emerald-700", dot:"bg-emerald-500", label:"Paid",      icon: CheckCircle },
  shipped:   { bg:"bg-blue-50",    text:"text-blue-700",    dot:"bg-blue-500",    label:"Shipped",   icon: Truck },
  pending:   { bg:"bg-amber-50",   text:"text-amber-700",   dot:"bg-amber-500",   label:"Pending",   icon: Clock },
  cancelled: { bg:"bg-red-50",     text:"text-red-700",     dot:"bg-red-500",     label:"Cancelled", icon: XCircle },
};

function StatusBadge({ status }) {
  const c = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export default function StoreOrders() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0, shipped: 0, pending: 0, cancelled: 0, revenueToday: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/store/orders", {
          params: {
            status: activeTab,
            search: search || undefined,
            page,
            limit: 20,
          },
        });
        if (!mounted) return;
        setSummary(res?.data?.summary || {});
        setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
        setPagination(res?.data?.pagination || { total: 0, totalPages: 1, limit: 20 });
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.error || "Could not load orders.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [activeTab, search, page]);

  const TAB_COUNTS = useMemo(
    () => ({
      all: summary?.total ?? 0,
      paid: summary?.paid ?? 0,
      shipped: summary?.shipped ?? 0,
      pending: summary?.pending ?? 0,
      cancelled: summary?.cancelled ?? 0,
    }),
    [summary]
  );

  const markShipped = async (id) => {
    try {
      await api.patch(`/store/orders/${id}`, { status: "shipped" });
      const updated = rows.map((row) => (row.id === id ? { ...row, status: "shipped" } : row));
      setRows(updated);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not update order.");
    }
  };

  const tabs = [
    { key:"all",       label:"All Orders" },
    { key:"paid",      label:"Paid" },
    { key:"shipped",   label:"Shipped" },
    { key:"pending",   label:"Pending" },
    { key:"cancelled", label:"Cancelled" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-extrabold text-slate-900 text-2xl tracking-tight" style={{ fontFamily:"Manrope,sans-serif" }}>Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and fulfil your store orders</p>
        </div>
        <div className="flex gap-2.5">
          <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:border-blue-400 hover:text-blue-600 transition-all">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-bold hover:-translate-y-0.5 transition-all"
            style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow:"0 3px 12px rgba(37,99,235,0.3)", fontFamily:"Manrope,sans-serif" }}>
            <Plus className="w-4 h-4" /> Create Order
          </button>
        </div>
      </div>
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      ) : null}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label:"Total Orders",  val:String(summary?.total ?? 0), color:"text-blue-600", bg:"bg-blue-50" },
          { label:"Revenue Today", val:`₹${Number(summary?.revenueToday || 0).toLocaleString("en-IN")}`, color:"text-emerald-700", bg:"bg-emerald-50" },
          { label:"Pending",       val:String(summary?.pending ?? 0), color:"text-amber-700", bg:"bg-amber-50" },
          { label:"Shipped",       val:String(summary?.shipped ?? 0), color:"text-indigo-700", bg:"bg-indigo-50" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 border border-white`}>
            <div className={`font-extrabold text-xl mb-1 ${color}`} style={{ fontFamily:"Manrope,sans-serif" }}>{val}</div>
            <div className="text-slate-500 text-xs font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-slate-100 px-5 overflow-x-auto">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
              }`}>
                {TAB_COUNTS[key]}
              </span>
            </button>
          ))}
          {/* Search */}
          <div className="ml-auto flex-shrink-0 flex items-center gap-2 pb-1">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search orders..."
                className="bg-transparent border-none outline-none text-xs text-slate-700 placeholder:text-slate-400 w-32"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
              {["Order ID","Customer","Items","Amount","Date","Payment","Status","Actions"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">No orders found</td>
                </tr>
              ) : rows.map(o => (
                <tr key={o.id} className="border-t border-slate-50 hover:bg-blue-50/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-blue-600 text-xs">{o.id}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-800 text-sm">{o.customer?.name}</div>
                    <div className="text-slate-400 text-[11px]">{o.customer?.email}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs max-w-[160px] truncate">{o.itemsSummary}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-800">{o.amountFormatted}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{o.createdAtFormatted}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{o.paymentMethod}</span>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5">
                      <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-all">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      {o.status === "pending" && (
                        <button
                          className="w-7 h-7 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-center hover:bg-emerald-500 hover:border-emerald-500 transition-all group"
                          onClick={() => markShipped(o.id)}
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 group-hover:text-white" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Loading orders...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
          <span className="text-xs text-slate-400">Showing {rows.length} of {pagination?.total || 0} orders</span>
          <div className="flex gap-1.5">
            <button
              className="min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-500 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <button className="min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white">
              {page}
            </button>
            <button
              className="min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-500 disabled:opacity-40"
              onClick={() => setPage((p) => (p < (pagination?.totalPages || 1) ? p + 1 : p))}
              disabled={page >= (pagination?.totalPages || 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
