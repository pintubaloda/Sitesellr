import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import api from "../../lib/api";
import { Building2, CheckCircle2, Clock3, Ban, Plus, Search } from "lucide-react";

const STATUS = {
  0: { label: "Trial", cls: "bg-amber-50 text-amber-700" },
  1: { label: "Active", cls: "bg-emerald-50 text-emerald-700" },
  2: { label: "Suspended", cls: "bg-rose-50 text-rose-700" },
  3: { label: "Expired", cls: "bg-slate-100 text-slate-700" },
};

const statusToInt = (raw) => Number(raw ?? 0);

export const Merchants = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", primaryDomain: "", status: "0" });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/merchants");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err?.response?.status === 403 ? "You are not authorized." : (err?.response?.data?.error || "Could not load merchants."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createMerchant = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.post("/merchants", {
        name: form.name.trim(),
        primaryDomain: form.primaryDomain.trim() || null,
        status: Number(form.status),
      });
      setForm({ name: "", primaryDomain: "", status: "0" });
      setShowCreate(false);
      setMessage("Merchant created.");
      await load();
    } catch (err) {
      setError(err?.response?.status === 403 ? "You are not authorized." : (err?.response?.data?.error || "Could not create merchant."));
    } finally {
      setSaving(false);
    }
  };

  const updateMerchantStatus = async (merchant, status) => {
    setError("");
    setMessage("");
    try {
      await api.put(`/merchants/${merchant.id}`, {
        ...merchant,
        status: Number(status),
      });
      setRows((prev) => prev.map((m) => (m.id === merchant.id ? { ...m, status: Number(status) } : m)));
      setMessage("Merchant updated.");
    } catch (err) {
      setError(err?.response?.status === 403 ? "You are not authorized." : (err?.response?.data?.error || "Could not update merchant."));
    }
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => statusToInt(r.status) === 1).length;
    const trial = rows.filter((r) => statusToInt(r.status) === 0).length;
    const suspended = rows.filter((r) => statusToInt(r.status) === 2).length;
    return { total, active, trial, suspended };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((m) => {
      const status = statusToInt(m.status);
      if (activeTab === "trial" && status !== 0) return false;
      if (activeTab === "active" && status !== 1) return false;
      if (activeTab === "suspended" && status !== 2) return false;
      if (!q) return true;
      const domain = String(m.primaryDomain || "").toLowerCase();
      const name = String(m.name || "").toLowerCase();
      return name.includes(q) || domain.includes(q);
    });
  }, [rows, search, activeTab]);

  const tabs = [
    { key: "all", label: "All" },
    { key: "trial", label: `Trial (${stats.trial})` },
    { key: "active", label: `Active (${stats.active})` },
    { key: "suspended", label: `Suspended (${stats.suspended})` },
  ];

  return (
    <div className="space-y-5" data-testid="merchants-page">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-start justify-between"><p className="text-slate-500">Total Merchants</p><div className="h-12 w-12 rounded-xl bg-blue-50 grid place-items-center"><Building2 className="h-5 w-5 text-blue-600" /></div></div><p className="mt-5 text-5xl font-semibold text-slate-800">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-start justify-between"><p className="text-slate-500">Active</p><div className="h-12 w-12 rounded-xl bg-emerald-50 grid place-items-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div></div><p className="mt-5 text-5xl font-semibold text-slate-800">{stats.active}</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-start justify-between"><p className="text-slate-500">Trial</p><div className="h-12 w-12 rounded-xl bg-amber-50 grid place-items-center"><Clock3 className="h-5 w-5 text-amber-600" /></div></div><p className="mt-5 text-5xl font-semibold text-slate-800">{stats.trial}</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-start justify-between"><p className="text-slate-500">Suspended</p><div className="h-12 w-12 rounded-xl bg-rose-50 grid place-items-center"><Ban className="h-5 w-5 text-rose-600" /></div></div><p className="mt-5 text-5xl font-semibold text-slate-800">{stats.suspended}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9 h-12" placeholder="Search merchants..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`h-12 px-5 rounded-full border text-sm font-medium ${activeTab === tab.key ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}
          >
            {tab.label}
          </button>
        ))}
        <Button className="h-12 px-6" onClick={() => setShowCreate((v) => !v)}><Plus className="h-4 w-4 mr-2" /> New Merchant</Button>
      </div>

      {showCreate ? (
        <Card>
          <CardContent className="p-5 grid gap-3 md:grid-cols-3">
            <Input placeholder="Merchant name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Primary domain" value={form.primaryDomain} onChange={(e) => setForm((p) => ({ ...p, primaryDomain: e.target.value }))} />
            <select className="h-10 rounded-md border border-slate-300 px-3" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="0">Trial</option>
              <option value="1">Active</option>
              <option value="2">Suspended</option>
              <option value="3">Expired</option>
            </select>
            <div className="md:col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createMerchant} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : "Create Merchant"}</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0 overflow-auto">
          <div className="px-6 py-5 border-b">
            <h2 className="text-3xl font-semibold text-slate-800">Merchants ({filteredRows.length})</h2>
            <p className="text-slate-500">Manage all merchant accounts</p>
          </div>
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="text-left text-xs tracking-[0.14em] uppercase text-slate-500 border-b bg-slate-50">
                <th className="px-6 py-4">Merchant</th>
                <th className="px-6 py-4">Domain</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Stores</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((m, idx) => {
                const status = STATUS[statusToInt(m.status)] || STATUS[0];
                const storesCount = Array.isArray(m.stores) ? m.stores.length : 0;
                const created = m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : "-";
                return (
                  <tr key={m.id} className="border-b last:border-b-0">
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 grid place-items-center text-blue-600 font-semibold">
                          {String(m.name || "M").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-xl text-slate-800 leading-tight">{m.name}</p>
                          <p className="text-slate-500">ID: m{idx + 1}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-2xl text-slate-600">{m.primaryDomain || "-"}</td>
                    <td className="px-6 py-5"><span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">{m.planName || "Starter"}</span></td>
                    <td className="px-6 py-5 text-blue-600 font-semibold">{storesCount} stores</td>
                    <td className="px-6 py-5"><span className={`px-4 py-1 rounded-full text-sm font-medium ${status.cls}`}>{status.label}</span></td>
                    <td className="px-6 py-5 text-slate-600">{created}</td>
                    <td className="px-6 py-5">
                      <select className="h-10 min-w-[170px] rounded-xl border border-slate-300 px-3" value={String(m.status)} onChange={(e) => updateMerchantStatus(m, e.target.value)}>
                        <option value="1">Active</option>
                        <option value="0">Trial</option>
                        <option value="2">Suspended</option>
                        <option value="3">Expired</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading ? <p className="p-4 text-sm text-slate-500">Loading...</p> : null}
          {!loading && filteredRows.length === 0 ? <p className="p-4 text-sm text-slate-500">No merchants found.</p> : null}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </div>
  );
};

export default Merchants;
