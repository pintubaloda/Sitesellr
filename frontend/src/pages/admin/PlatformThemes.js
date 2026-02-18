import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import api from "../../lib/api";

const initialForm = {
  name: "",
  slug: "",
  category: "General",
  description: "",
  previewUrl: "",
  isPaid: false,
  price: 0,
  allowedPlanCodesCsv: "",
  isActive: true,
};

export default function PlatformThemes() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/platform/themes");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMessage(err?.response?.status === 403 ? "You are not authorized." : "Could not load themes.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setMessage("");
    try {
      await api.post("/platform/themes", { ...form, price: Number(form.price || 0) });
      setForm(initialForm);
      await load();
      setMessage("Theme created.");
    } catch (err) {
      setMessage(err?.response?.data?.error || "Could not create theme.");
    }
  };

  return (
    <div className="space-y-6" data-testid="platform-themes-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Themes</h1>
        <p className="text-slate-500 dark:text-slate-400">Platform owner theme marketplace management</p>
      </div>

      {message ? <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Create Theme</CardTitle>
          <CardDescription>Define free/paid theme and allowed plan codes</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Preview URL</Label><Input value={form.previewUrl} onChange={(e) => setForm((s) => ({ ...s, previewUrl: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Allowed plan codes CSV</Label><Input value={form.allowedPlanCodesCsv} onChange={(e) => setForm((s) => ({ ...s, allowedPlanCodesCsv: e.target.value }))} placeholder="growth,pro,enterprise" /></div>
          <div className="flex items-center gap-2"><Switch checked={form.isPaid} onCheckedChange={(v) => setForm((s) => ({ ...s, isPaid: v }))} /><Label>Paid theme</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: v }))} /><Label>Active</Label></div>
          <Button onClick={create} className="md:col-span-2">Create Theme</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme Catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((x) => (
            <div key={x.id} className="p-3 border rounded-lg flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{x.name}</p>
                <p className="text-xs text-slate-500">{x.slug} · {x.category} · {x.isPaid ? `INR ${Number(x.price || 0).toLocaleString()}` : "Free"}</p>
              </div>
              <p className="text-xs text-slate-500">plans: {x.allowedPlanCodesCsv || "all"}</p>
            </div>
          ))}
          {rows.length === 0 ? <p className="text-sm text-slate-500">No themes found.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
