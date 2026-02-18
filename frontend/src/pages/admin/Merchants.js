import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import api from "../../lib/api";

export const Merchants = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    primaryDomain: "",
    status: "0",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/merchants");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError("You are not authorized.");
      } else {
        setError(err?.response?.data?.error || "Could not load merchants.");
      }
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
      setMessage("Merchant created.");
      await load();
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError("You are not authorized.");
      } else {
        setError(err?.response?.data?.error || "Could not create merchant.");
      }
    } finally {
      setSaving(false);
    }
  };

  const updateMerchantStatus = async (merchant, status) => {
    setError("");
    try {
      await api.put(`/merchants/${merchant.id}`, {
        ...merchant,
        status: Number(status),
      });
      setRows((prev) => prev.map((m) => (m.id === merchant.id ? { ...m, status: Number(status) } : m)));
      setMessage("Merchant updated.");
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError("You are not authorized.");
      } else {
        setError(err?.response?.data?.error || "Could not update merchant.");
      }
    }
  };

  return (
    <div className="space-y-6" data-testid="merchants-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Merchants</h1>
        <p className="text-slate-500 dark:text-slate-400">Platform-level merchant management.</p>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Create Merchant</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Primary Domain</Label>
            <Input value={form.primaryDomain} onChange={(e) => setForm((p) => ({ ...p, primaryDomain: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Status (0-3)</Label>
            <Input value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} />
          </div>
          <div>
            <Button onClick={createMerchant} disabled={saving || !form.name.trim()}>
              {saving ? "Saving..." : "Create Merchant"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Merchant List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-600">{message}</p> : null}
          <div className="space-y-3">
            {rows.map((m) => (
              <div key={m.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <p className="font-medium">{m.name}</p>
                <p className="text-sm text-slate-500">{m.primaryDomain || "-"}</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-sm text-slate-500">Status:</p>
                  <select
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                    value={String(m.status)}
                    onChange={(e) => updateMerchantStatus(m, e.target.value)}
                  >
                    <option value="0">Trial</option>
                    <option value="1">Active</option>
                    <option value="2">Suspended</option>
                    <option value="3">Expired</option>
                  </select>
                </div>
              </div>
            ))}
            {!loading && rows.length === 0 ? <p className="text-sm text-slate-500">No merchants found.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Merchants;
