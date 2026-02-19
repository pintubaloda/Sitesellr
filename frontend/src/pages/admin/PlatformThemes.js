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
  isFeatured: false,
  featuredRank: 0,
  typographyPack: "modern-sans",
  layoutVariant: "default",
  runtimePackageJson: "{}",
};

export default function PlatformThemes() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [previewSubdomain, setPreviewSubdomain] = useState("demo");

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

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm({
      name: row.name || "",
      slug: row.slug || "",
      category: row.category || "General",
      description: row.description || "",
      previewUrl: row.previewUrl || "",
      isPaid: !!row.isPaid,
      price: Number(row.price || 0),
      allowedPlanCodesCsv: row.allowedPlanCodesCsv || "",
      isActive: !!row.isActive,
      isFeatured: !!row.isFeatured,
      featuredRank: Number(row.featuredRank || 0),
      typographyPack: row.typographyPack || "modern-sans",
      layoutVariant: row.layoutVariant || "default",
      runtimePackageJson: row.runtimePackageJson || "{}",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setMessage("");
    try {
      await api.put(`/platform/themes/${editingId}`, {
        ...editForm,
        price: Number(editForm.price || 0),
        featuredRank: Number(editForm.featuredRank || 0),
      });
      setEditingId("");
      await load();
      setMessage("Theme updated.");
    } catch (err) {
      setMessage(err?.response?.data?.error || "Could not update theme.");
    }
  };

  const runLifecycle = async (id, action) => {
    setMessage("");
    try {
      await api.post(`/platform/themes/${id}/${action}`);
      await load();
      setMessage(`Theme ${action} done.`);
    } catch (err) {
      setMessage(err?.response?.data?.error || `Could not ${action} theme.`);
    }
  };

  const saveFeatured = async (id, isFeatured, featuredRank) => {
    setMessage("");
    try {
      await api.post(`/platform/themes/${id}/feature`, {
        isFeatured,
        featuredRank: Number(featuredRank || 0),
      });
      await load();
      setMessage("Featured ranking updated.");
    } catch (err) {
      setMessage(err?.response?.data?.error || "Could not update featured ranking.");
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
          <div className="space-y-2"><Label>Featured rank</Label><Input type="number" value={form.featuredRank} onChange={(e) => setForm((s) => ({ ...s, featuredRank: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Typography pack</Label><Input value={form.typographyPack} onChange={(e) => setForm((s) => ({ ...s, typographyPack: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Layout variant</Label><Input value={form.layoutVariant} onChange={(e) => setForm((s) => ({ ...s, layoutVariant: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Runtime package JSON</Label><Input value={form.runtimePackageJson} onChange={(e) => setForm((s) => ({ ...s, runtimePackageJson: e.target.value }))} /></div>
          <div className="flex items-center gap-2"><Switch checked={form.isPaid} onCheckedChange={(v) => setForm((s) => ({ ...s, isPaid: v }))} /><Label>Paid theme</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: v }))} /><Label>Active</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.isFeatured} onCheckedChange={(v) => setForm((s) => ({ ...s, isFeatured: v }))} /><Label>Featured</Label></div>
          <Button onClick={create} className="md:col-span-2">Create Theme</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme Catalog Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Label className="text-xs">Preview store subdomain</Label>
            <Input className="max-w-xs" value={previewSubdomain} onChange={(e) => setPreviewSubdomain(e.target.value)} placeholder="demo" />
          </div>
          {rows.map((x) => (
            <div key={x.id} className="p-3 border rounded-lg space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{x.name}</p>
                  <p className="text-xs text-slate-500">
                    {x.slug} · {x.category} · {x.isPaid ? `INR ${Number(x.price || 0).toLocaleString()}` : "Free"} · {x.isActive ? "Published" : "Unpublished"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => runLifecycle(x.id, "publish")}>Publish</Button>
                  <Button size="sm" variant="outline" onClick={() => runLifecycle(x.id, "unpublish")}>Unpublish</Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(`/s/${previewSubdomain}?previewThemeId=${x.id}`, "_blank")}>Preview</Button>
                  <Button size="sm" onClick={() => startEdit(x)}>Edit</Button>
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-2 items-end">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Plan mapping</Label>
                  <Input
                    value={editingId === x.id ? editForm.allowedPlanCodesCsv : (x.allowedPlanCodesCsv || "")}
                    onChange={(e) => {
                      if (editingId !== x.id) startEdit(x);
                      setEditForm((s) => ({ ...s, allowedPlanCodesCsv: e.target.value }));
                    }}
                    placeholder="growth,pro,enterprise"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Featured rank</Label>
                  <Input
                    type="number"
                    value={editingId === x.id ? editForm.featuredRank : Number(x.featuredRank || 0)}
                    onChange={(e) => {
                      if (editingId !== x.id) startEdit(x);
                      setEditForm((s) => ({ ...s, featuredRank: e.target.value }));
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingId === x.id ? !!editForm.isFeatured : !!x.isFeatured}
                    onCheckedChange={(v) => {
                      if (editingId !== x.id) startEdit(x);
                      setEditForm((s) => ({ ...s, isFeatured: v }));
                    }}
                  />
                  <Label className="text-xs">Featured</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveFeatured(x.id, editingId === x.id ? !!editForm.isFeatured : !!x.isFeatured, editingId === x.id ? editForm.featuredRank : Number(x.featuredRank || 0))}
                >
                  Save Featured Rank
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveEdit}
                  disabled={editingId !== x.id}
                >
                  Save Plan Mapping
                </Button>
                <p className="text-xs text-slate-500">plans: {x.allowedPlanCodesCsv || "all"}</p>
              </div>
            </div>
          ))}
          {rows.length === 0 ? <p className="text-sm text-slate-500">No themes found.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
