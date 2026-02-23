import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/api";

export default function TenantManagement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", subdomain: "", ownerName: "", ownerEmail: "", plan: "pro", industry: "General" });

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/platform/tenants", { params: { status, plan, search, page: 1, limit: 50 } });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load tenants.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, plan]);

  const createTenant = async () => {
    try {
      setError("");
      await api.post("/platform/tenants", form);
      setForm({ name: "", subdomain: "", ownerName: "", ownerEmail: "", plan: "pro", industry: "General" });
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not create tenant.");
    }
  };

  const suspendTenant = async (id) => {
    try {
      await api.patch(`/platform/tenants/${id}`, { status: "suspended" });
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not update tenant.");
    }
  };

  const reinstateTenant = async (id) => {
    try {
      await api.post(`/platform/tenants/${id}/reinstate`, {});
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not reinstate tenant.");
    }
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => String(r.name || "").toLowerCase().includes(q) || String(r.subdomain || "").toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenant Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage merchants/stores lifecycle and plan state.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid md:grid-cols-3 gap-3">
        <input className="h-10 border rounded-lg px-3" placeholder="Search tenant" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="h-10 border rounded-lg px-3" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Status</option><option value="active">Active</option><option value="trial">Trial</option><option value="suspended">Suspended</option><option value="setup">Setup</option>
        </select>
        <select className="h-10 border rounded-lg px-3" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="all">All Plans</option><option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="font-semibold text-slate-900 mb-3">Onboard Tenant</p>
        <div className="grid md:grid-cols-3 gap-3">
          <input className="h-10 border rounded-lg px-3" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="h-10 border rounded-lg px-3" placeholder="Subdomain" value={form.subdomain} onChange={(e) => setForm((p) => ({ ...p, subdomain: e.target.value }))} />
          <input className="h-10 border rounded-lg px-3" placeholder="Owner name" value={form.ownerName} onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))} />
          <input className="h-10 border rounded-lg px-3" placeholder="Owner email" value={form.ownerEmail} onChange={(e) => setForm((p) => ({ ...p, ownerEmail: e.target.value }))} />
          <select className="h-10 border rounded-lg px-3" value={form.plan} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}>
            <option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
          </select>
          <input className="h-10 border rounded-lg px-3" placeholder="Industry" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} />
        </div>
        <button className="mt-3 h-10 px-4 rounded-lg bg-blue-600 text-white font-semibold" onClick={createTenant}>Create Tenant</button>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{error}</div> : null}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 font-bold">Tenants</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-slate-500">Tenant</th>
                <th className="text-left px-4 py-3 text-slate-500">Plan</th>
                <th className="text-left px-4 py-3 text-slate-500">Status</th>
                <th className="text-left px-4 py-3 text-slate-500">Revenue</th>
                <th className="text-left px-4 py-3 text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{r.name}</p>
                    <p className="text-xs text-slate-500">{r.hasCustomDomain ? r.customDomain : `${r.subdomain}.sitesellr.com`}</p>
                  </td>
                  <td className="px-4 py-3">{r.plan}</td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                  <td className="px-4 py-3">{r.stats?.monthlyRevenueFormatted || "₹0"}</td>
                  <td className="px-4 py-3 space-x-2">
                    <button className="px-3 py-1 rounded border text-xs" onClick={() => suspendTenant(r.id)}>Suspend</button>
                    <button className="px-3 py-1 rounded border text-xs" onClick={() => reinstateTenant(r.id)}>Reinstate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredRows.length === 0 ? <p className="p-4 text-sm text-slate-500">No tenants found.</p> : null}
          {loading ? <p className="p-4 text-sm text-slate-500">Loading...</p> : null}
        </div>
      </div>
    </div>
  );
}
