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
  templatesJson: "[\"homepage\",\"product_listing\",\"product_detail\",\"cart\",\"static_page\",\"checkout\"]",
  sectionSchemasJson: "[{\"name\":\"HeroSection\",\"fields\":[{\"key\":\"title\",\"type\":\"text\"},{\"key\":\"subtitle\",\"type\":\"text\"},{\"key\":\"backgroundImage\",\"type\":\"image\"},{\"key\":\"buttonText\",\"type\":\"text\"},{\"key\":\"buttonUrl\",\"type\":\"url\"}]},{\"name\":\"ProductGridSection\",\"fields\":[{\"key\":\"title\",\"type\":\"text\"},{\"key\":\"collection\",\"type\":\"collection\"}]},{\"name\":\"OfferBannerSection\",\"fields\":[{\"key\":\"title\",\"type\":\"text\"},{\"key\":\"offerCode\",\"type\":\"text\"}]}]",
  hookPointsJson: "[\"BeforePrice\",\"AfterPrice\",\"BeforeAddToCart\",\"AfterDescription\"]",
  themeVersion: "1.0.0",
  plpVariantsJson: "[]",
  pdpVariantsJson: "[]",
};

export default function PlatformThemes() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [previewSubdomain, setPreviewSubdomain] = useState("demo");
  const [zipFile, setZipFile] = useState(null);
  const [importingZip, setImportingZip] = useState(false);
  const [branding, setBranding] = useState({
    brandName: "Sitesellr",
    logoUrl: "",
    primaryColor: "#2563eb",
    accentColor: "#0f172a",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    landingHeroTitle: "",
    landingHeroSubtitle: "",
  });

  const load = async () => {
    try {
      const [themesRes, brandingRes] = await Promise.all([
        api.get("/platform/themes"),
        api.get("/platform/branding"),
      ]);
      setRows(Array.isArray(themesRes.data) ? themesRes.data : []);
      setBranding({
        brandName: brandingRes.data?.brandName || "Sitesellr",
        logoUrl: brandingRes.data?.logoUrl || "",
        primaryColor: brandingRes.data?.primaryColor || "#2563eb",
        accentColor: brandingRes.data?.accentColor || "#0f172a",
        fontFamily: brandingRes.data?.fontFamily || "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        landingHeroTitle: brandingRes.data?.landingHeroTitle || "",
        landingHeroSubtitle: brandingRes.data?.landingHeroSubtitle || "",
      });
    } catch (err) {
      setMessageType("error");
      setMessage(err?.response?.status === 403 ? "You are not authorized." : "Could not load themes.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setMessage("");
    setMessageType("info");
    try {
      await api.post("/platform/themes", { ...form, price: Number(form.price || 0) });
      setForm(initialForm);
      await load();
      setMessageType("success");
      setMessage("Theme created.");
    } catch (err) {
      setMessageType("error");
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
      templatesJson: row.templatesJson || "[\"homepage\",\"product_listing\",\"product_detail\",\"cart\",\"static_page\",\"checkout\"]",
      sectionSchemasJson: row.sectionSchemasJson || "[]",
      hookPointsJson: row.hookPointsJson || "[\"BeforePrice\",\"AfterPrice\",\"BeforeAddToCart\",\"AfterDescription\"]",
      themeVersion: row.themeVersion || "1.0.0",
      plpVariantsJson: row.plpVariantsJson || "[]",
      pdpVariantsJson: row.pdpVariantsJson || "[]",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setMessage("");
    setMessageType("info");
    try {
      await api.put(`/platform/themes/${editingId}`, {
        ...editForm,
        price: Number(editForm.price || 0),
        featuredRank: Number(editForm.featuredRank || 0),
      });
      setEditingId("");
      await load();
      setMessageType("success");
      setMessage("Theme updated.");
    } catch (err) {
      setMessageType("error");
      setMessage(err?.response?.data?.error || "Could not update theme.");
    }
  };

  const runLifecycle = async (id, action) => {
    setMessage("");
    setMessageType("info");
    try {
      await api.post(`/platform/themes/${id}/${action}`);
      await load();
      setMessageType("success");
      setMessage(`Theme ${action} done.`);
    } catch (err) {
      setMessageType("error");
      setMessage(err?.response?.data?.error || `Could not ${action} theme.`);
    }
  };

  const saveFeatured = async (id, isFeatured, featuredRank) => {
    setMessage("");
    setMessageType("info");
    try {
      await api.post(`/platform/themes/${id}/feature`, {
        isFeatured,
        featuredRank: Number(featuredRank || 0),
      });
      await load();
      setMessageType("success");
      setMessage("Featured ranking updated.");
    } catch (err) {
      setMessageType("error");
      setMessage(err?.response?.data?.error || "Could not update featured ranking.");
    }
  };

  const importZip = async () => {
    if (!zipFile) {
      setMessageType("error");
      setMessage("Select a ZIP file first.");
      return;
    }
    setMessage("");
    setMessageType("info");
    setImportingZip(true);
    try {
      const formData = new FormData();
      formData.append("file", zipFile);
      const res = await api.post("/platform/themes/import-zip", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setZipFile(null);
      await load();
      setMessageType("success");
      setMessage(`Theme ZIP imported: ${res.data?.name || res.data?.slug || "success"}.`);
    } catch (err) {
      setMessageType("error");
      const apiError = err?.response?.data?.error;
      const detail = err?.response?.data?.detail;
      setMessage(apiError ? `${apiError}${detail ? `: ${detail}` : ""}` : "Could not import theme zip.");
    } finally {
      setImportingZip(false);
    }
  };

  const saveBranding = async () => {
    setMessage("");
    setMessageType("info");
    try {
      await api.put("/platform/branding", branding);
      setMessageType("success");
      setMessage("Platform branding saved.");
    } catch (err) {
      setMessageType("error");
      setMessage(err?.response?.data?.error || "Could not save platform branding.");
    }
  };

  return (
    <div className="space-y-6" data-testid="platform-themes-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Themes</h1>
        <p className="text-slate-500 dark:text-slate-400">Platform owner theme marketplace management</p>
      </div>

      {message ? (
        <p
          className={`text-sm px-3 py-2 rounded border ${
            messageType === "error"
              ? "text-red-700 border-red-200 bg-red-50"
              : messageType === "success"
                ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                : "text-slate-700 border-slate-200 bg-slate-50"
          }`}
        >
          {message}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Platform Global Branding</CardTitle>
          <CardDescription>Applied to admin shell and landing page theme tokens.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Brand Name</Label><Input value={branding.brandName} onChange={(e) => setBranding((s) => ({ ...s, brandName: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Logo URL</Label><Input value={branding.logoUrl} onChange={(e) => setBranding((s) => ({ ...s, logoUrl: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Primary Color</Label><Input value={branding.primaryColor} onChange={(e) => setBranding((s) => ({ ...s, primaryColor: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Accent Color</Label><Input value={branding.accentColor} onChange={(e) => setBranding((s) => ({ ...s, accentColor: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Font Family</Label><Input value={branding.fontFamily} onChange={(e) => setBranding((s) => ({ ...s, fontFamily: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Landing Hero Title (optional override)</Label><Input value={branding.landingHeroTitle} onChange={(e) => setBranding((s) => ({ ...s, landingHeroTitle: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Landing Hero Subtitle (optional override)</Label><Input value={branding.landingHeroSubtitle} onChange={(e) => setBranding((s) => ({ ...s, landingHeroSubtitle: e.target.value }))} /></div>
          <Button className="md:col-span-2" onClick={saveBranding}>Save Platform Branding</Button>
        </CardContent>
      </Card>

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
          <div className="space-y-2"><Label>Theme version</Label><Input value={form.themeVersion} onChange={(e) => setForm((s) => ({ ...s, themeVersion: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Runtime package JSON</Label><Input value={form.runtimePackageJson} onChange={(e) => setForm((s) => ({ ...s, runtimePackageJson: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Templates JSON (mandatory pages)</Label><Input value={form.templatesJson} onChange={(e) => setForm((s) => ({ ...s, templatesJson: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Section schemas JSON</Label><Input value={form.sectionSchemasJson} onChange={(e) => setForm((s) => ({ ...s, sectionSchemasJson: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Plugin hook points JSON</Label><Input value={form.hookPointsJson} onChange={(e) => setForm((s) => ({ ...s, hookPointsJson: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>PLP variants JSON</Label><Input value={form.plpVariantsJson} onChange={(e) => setForm((s) => ({ ...s, plpVariantsJson: e.target.value }))} placeholder='[{"category":"default","variant":"cards"}]' /></div>
          <div className="space-y-2 md:col-span-2"><Label>PDP variants JSON</Label><Input value={form.pdpVariantsJson} onChange={(e) => setForm((s) => ({ ...s, pdpVariantsJson: e.target.value }))} placeholder='[{"category":"default","variant":"split"}]' /></div>
          <div className="flex items-center gap-2"><Switch checked={form.isPaid} onCheckedChange={(v) => setForm((s) => ({ ...s, isPaid: v }))} /><Label>Paid theme</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: v }))} /><Label>Active</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.isFeatured} onCheckedChange={(v) => setForm((s) => ({ ...s, isFeatured: v }))} /><Label>Featured</Label></div>
          <Button onClick={create} className="md:col-span-2">Create Theme</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Theme ZIP</CardTitle>
          <CardDescription>Upload a theme package zip containing `theme.manifest.json` and `assets/*`.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center gap-3">
          <Input type="file" accept=".zip,application/zip" onChange={(e) => setZipFile(e.target.files?.[0] || null)} />
          <Button onClick={importZip} disabled={importingZip || !zipFile}>
            {importingZip ? "Importing..." : "Upload & Import"}
          </Button>
          {zipFile ? <p className="text-xs text-slate-500">Selected: {zipFile.name}</p> : null}
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
