import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Palette,
  Layout,
  Navigation,
  Eye,
  Check,
  Lock,
  Sparkles,
  Monitor,
  Smartphone,
  Tablet,
  Settings,
  Move,
  Type,
  Image,
  Layers,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import useActiveStore from "../../hooks/useActiveStore";
import api from "../../lib/api";

const FALLBACK_SECTIONS = [
  { type: "hero", title: "Hero Banner" },
  { type: "products", title: "Featured Products" },
  { type: "collection", title: "Collections" },
];

const FALLBACK_MENU = [
  { label: "Home", path: "/" },
  { label: "Products", path: "/products" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

const parseJsonArray = (value, fallback) => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const ThemeCard = ({ theme, isActive, onSelect }) => {
  const blocked = !theme.planAllowed;
  return (
    <Card
      className={`border-2 transition-all cursor-pointer hover:shadow-lg ${
        isActive
          ? "border-blue-600 dark:border-blue-500"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
      onClick={() => !blocked && onSelect(theme.id)}
      data-testid={`theme-card-${theme.slug}`}
    >
      <div className="relative">
        <img src={theme.previewUrl || "https://placehold.co/800x500"} alt={theme.name} className="w-full h-48 object-cover rounded-t-lg" />
        {theme.isPaid && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-slate-900 text-white">
              <Lock className="w-3 h-3 mr-1" />
              Paid
            </Badge>
          </div>
        )}
        {blocked && (
          <div className="absolute inset-0 bg-black/60 rounded-t-lg flex items-center justify-center">
            <Badge className="bg-amber-600 text-white">Upgrade Plan Required</Badge>
          </div>
        )}
        {isActive && (
          <div className="absolute top-3 right-3">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2 gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">{theme.name}</h3>
          <Badge variant="secondary" className="text-xs">{theme.category || "General"}</Badge>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{theme.description || "Theme"}</p>
        {theme.isPaid ? (
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2">INR {Number(theme.price || 0).toLocaleString()}</p>
        ) : (
          <p className="text-sm font-semibold text-emerald-600 mt-2">Free</p>
        )}
      </CardContent>
    </Card>
  );
};

export const StoreBuilder = () => {
  const { storeId, loadingStores } = useActiveStore();
  const [themes, setThemes] = useState([]);
  const [activeThemeId, setActiveThemeId] = useState("");
  const [themeSettings, setThemeSettings] = useState({
    logoUrl: "",
    faviconUrl: "",
    headerJson: "{}",
    footerJson: "{}",
    bannerJson: "{}",
    designTokensJson: "{}",
    showPricing: true,
    loginToViewPrice: false,
    catalogMode: "retail",
    catalogVisibilityJson: "[]",
  });
  const [sections, setSections] = useState(FALLBACK_SECTIONS);
  const [menuItems, setMenuItems] = useState(FALLBACK_MENU);
  const [pages, setPages] = useState([]);
  const [pageForm, setPageForm] = useState({ title: "", slug: "", content: "", seoTitle: "", seoDescription: "", isPublished: false });
  const [editingPageId, setEditingPageId] = useState("");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const activeTheme = useMemo(() => themes.find((x) => x.id === activeThemeId) || null, [themes, activeThemeId]);

  const loadData = async () => {
    if (!storeId) return;
    setLoading(true);
    setStatus("");
    try {
      const [themesRes, settingsRes, layoutRes, navRes, pagesRes] = await Promise.all([
        api.get(`/stores/${storeId}/storefront/themes`),
        api.get(`/stores/${storeId}/storefront/settings`),
        api.get(`/stores/${storeId}/storefront/homepage-layout`),
        api.get(`/stores/${storeId}/storefront/navigation`),
        api.get(`/stores/${storeId}/storefront/pages`),
      ]);

      const themeRows = Array.isArray(themesRes.data) ? themesRes.data : [];
      setThemes(themeRows);
      setActiveThemeId(settingsRes.data?.activeThemeId || "");
      setThemeSettings({
        logoUrl: settingsRes.data?.logoUrl || "",
        faviconUrl: settingsRes.data?.faviconUrl || "",
        headerJson: settingsRes.data?.headerJson || "{}",
        footerJson: settingsRes.data?.footerJson || "{}",
        bannerJson: settingsRes.data?.bannerJson || "{}",
        designTokensJson: settingsRes.data?.designTokensJson || "{}",
        showPricing: settingsRes.data?.showPricing ?? true,
        loginToViewPrice: settingsRes.data?.loginToViewPrice ?? false,
        catalogMode: settingsRes.data?.catalogMode || "retail",
        catalogVisibilityJson: settingsRes.data?.catalogVisibilityJson || "[]",
      });
      setSections(parseJsonArray(layoutRes.data?.sectionsJson, FALLBACK_SECTIONS));
      setMenuItems(parseJsonArray(navRes.data?.itemsJson, FALLBACK_MENU));
      setPages(Array.isArray(pagesRes.data) ? pagesRes.data : []);
    } catch (err) {
      setStatus(err?.response?.status === 403 ? "You are not authorized." : "Could not load storefront settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeId]);

  const applyTheme = async (themeId) => {
    if (!storeId || !themeId) return;
    setStatus("");
    try {
      await api.post(`/stores/${storeId}/storefront/themes/${themeId}/apply`);
      setActiveThemeId(themeId);
      setStatus("Theme applied successfully.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not apply theme.");
    }
  };

  const saveThemeSettings = async () => {
    if (!storeId) return;
    setStatus("");
    try {
      await api.put(`/stores/${storeId}/storefront/settings`, themeSettings);
      setStatus("Design settings saved.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not save design settings.");
    }
  };

  const addSection = () => {
    setSections((prev) => [...prev, { type: "custom", title: `Section ${prev.length + 1}` }]);
    setSelectedSectionIndex(sections.length);
  };

  const removeSection = (idx) => {
    setSections((prev) => prev.filter((_, i) => i !== idx));
    setSelectedSectionIndex(0);
  };

  const moveSection = (idx, direction) => {
    const target = idx + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    const temp = next[idx];
    next[idx] = next[target];
    next[target] = temp;
    setSections(next);
    setSelectedSectionIndex(target);
  };

  const patchSection = (idx, patch) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const saveLayout = async () => {
    if (!storeId) return;
    setStatus("");
    try {
      await api.put(`/stores/${storeId}/storefront/homepage-layout`, { sectionsJson: JSON.stringify(sections) });
      setStatus("Homepage layout saved.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not save homepage layout.");
    }
  };

  const addMenuItem = () => {
    setMenuItems((prev) => [...prev, { label: "New", path: "/new" }]);
  };

  const removeMenuItem = (idx) => {
    setMenuItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveNavigation = async () => {
    if (!storeId) return;
    setStatus("");
    try {
      await api.put(`/stores/${storeId}/storefront/navigation`, { itemsJson: JSON.stringify(menuItems) });
      setStatus("Navigation saved.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not save navigation.");
    }
  };

  const uploadMedia = async (e, kind = "generic") => {
    if (!storeId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    setStatus("");
    try {
      const res = await api.post(`/stores/${storeId}/storefront/media/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.url || "";
      if (kind === "logo") setThemeSettings((s) => ({ ...s, logoUrl: url }));
      if (kind === "favicon") setThemeSettings((s) => ({ ...s, faviconUrl: url }));
      setStatus("Media uploaded.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not upload media.");
    }
  };

  const savePage = async () => {
    if (!storeId) return;
    setStatus("");
    try {
      if (editingPageId) {
        await api.put(`/stores/${storeId}/storefront/pages/${editingPageId}`, pageForm);
      } else {
        await api.post(`/stores/${storeId}/storefront/pages`, pageForm);
      }
      setPageForm({ title: "", slug: "", content: "", seoTitle: "", seoDescription: "", isPublished: false });
      setEditingPageId("");
      await loadData();
      setStatus("Page saved.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not save page.");
    }
  };

  const editPage = (page) => {
    setEditingPageId(page.id);
    setPageForm({
      title: page.title || "",
      slug: page.slug || "",
      content: page.content || "",
      seoTitle: page.seoTitle || "",
      seoDescription: page.seoDescription || "",
      isPublished: !!page.isPublished,
    });
  };

  const deletePage = async (pageId) => {
    if (!storeId) return;
    setStatus("");
    try {
      await api.delete(`/stores/${storeId}/storefront/pages/${pageId}`);
      await loadData();
      setStatus("Page deleted.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not delete page.");
    }
  };

  return (
    <div className="space-y-6" data-testid="store-builder-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Store Builder</h1>
          <p className="text-slate-500 dark:text-slate-400">Theme marketplace and storefront customization</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-lg" data-testid="preview-store-btn">
            <Eye className="w-4 h-4 mr-2" />Preview
          </Button>
          <Button className="rounded-lg bg-blue-600 hover:bg-blue-700" onClick={saveThemeSettings}>
            <Sparkles className="w-4 h-4 mr-2" />Save Design
          </Button>
        </div>
      </div>

      {status ? <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}
      {loadingStores ? <p className="text-sm text-slate-500">Loading stores...</p> : null}
      {!storeId ? <p className="text-sm text-slate-500">Select a store to manage storefront settings.</p> : null}

      <Tabs defaultValue="themes" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="themes" className="rounded-lg"><Palette className="w-4 h-4 mr-2" />Themes</TabsTrigger>
          <TabsTrigger value="pages" className="rounded-lg"><Layout className="w-4 h-4 mr-2" />Homepage</TabsTrigger>
          <TabsTrigger value="navigation" className="rounded-lg"><Navigation className="w-4 h-4 mr-2" />Navigation</TabsTrigger>
          <TabsTrigger value="static-pages" className="rounded-lg"><FileText className="w-4 h-4 mr-2" />Static Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme Marketplace</CardTitle>
              <CardDescription>Choose free or paid category-based themes mapped to your subscription plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {themes.map((theme) => (
                  <ThemeCard key={theme.id} theme={theme} isActive={activeThemeId === theme.id} onSelect={applyTheme} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Customization</CardTitle>
              <CardDescription>Header, footer, logo, favicon, banners, and design token controls.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input value={themeSettings.logoUrl} onChange={(e) => setThemeSettings((s) => ({ ...s, logoUrl: e.target.value }))} />
                <Input type="file" accept="image/*" onChange={(e) => uploadMedia(e, "logo")} />
              </div>
              <div className="space-y-2">
                <Label>Favicon URL</Label>
                <Input value={themeSettings.faviconUrl} onChange={(e) => setThemeSettings((s) => ({ ...s, faviconUrl: e.target.value }))} />
                <Input type="file" accept="image/*" onChange={(e) => uploadMedia(e, "favicon")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Header JSON</Label>
                <Textarea rows={3} value={themeSettings.headerJson} onChange={(e) => setThemeSettings((s) => ({ ...s, headerJson: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Footer JSON</Label>
                <Textarea rows={3} value={themeSettings.footerJson} onChange={(e) => setThemeSettings((s) => ({ ...s, footerJson: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Banner JSON</Label>
                <Textarea rows={3} value={themeSettings.bannerJson} onChange={(e) => setThemeSettings((s) => ({ ...s, bannerJson: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Design Tokens JSON</Label>
                <Textarea rows={3} value={themeSettings.designTokensJson} onChange={(e) => setThemeSettings((s) => ({ ...s, designTokensJson: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Catalog Mode</Label>
                <Input value={themeSettings.catalogMode} onChange={(e) => setThemeSettings((s) => ({ ...s, catalogMode: e.target.value }))} placeholder="retail|wholesale|hybrid" />
              </div>
              <div className="space-y-2">
                <Label>Catalog Visibility JSON</Label>
                <Textarea rows={2} value={themeSettings.catalogVisibilityJson} onChange={(e) => setThemeSettings((s) => ({ ...s, catalogVisibilityJson: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <input id="showPricing" type="checkbox" checked={themeSettings.showPricing} onChange={(e) => setThemeSettings((s) => ({ ...s, showPricing: e.target.checked }))} />
                <Label htmlFor="showPricing">Show pricing in storefront</Label>
              </div>
              <div className="flex items-center gap-2">
                <input id="loginToViewPrice" type="checkbox" checked={themeSettings.loginToViewPrice} onChange={(e) => setThemeSettings((s) => ({ ...s, loginToViewPrice: e.target.checked }))} />
                <Label htmlFor="loginToViewPrice">Login required to view price</Label>
              </div>
              {activeTheme ? <p className="text-xs text-slate-500 md:col-span-2">Active theme: {activeTheme.name}</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Homepage Sections</CardTitle>
                <CardDescription className="text-xs">Drag/drop-ready section list persisted via API.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sections.map((section, idx) => (
                  <div key={`${section.type}-${idx}`} className={`flex items-center gap-3 p-3 border rounded-lg ${idx === selectedSectionIndex ? "border-blue-500" : "border-slate-200 dark:border-slate-700"}`} onClick={() => setSelectedSectionIndex(idx)}>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      {section.type === "hero" ? <Image className="w-4 h-4 text-slate-500" /> : section.type === "products" ? <Layers className="w-4 h-4 text-slate-500" /> : <Type className="w-4 h-4 text-slate-500" />}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{section.title || section.type}</span>
                    <Move className="w-4 h-4 text-slate-400 ml-auto" />
                    <Button size="icon" variant="ghost" onClick={() => moveSection(idx, -1)}>↑</Button>
                    <Button size="icon" variant="ghost" onClick={() => moveSection(idx, 1)}>↓</Button>
                    <Button size="icon" variant="ghost" onClick={() => removeSection(idx)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full rounded-xl" onClick={addSection}><Plus className="w-4 h-4 mr-2" />Add Section</Button>
                {sections[selectedSectionIndex] ? (
                  <div className="space-y-2 p-3 border rounded-lg">
                    <Label>Selected Section Title</Label>
                    <Input value={sections[selectedSectionIndex]?.title || ""} onChange={(e) => patchSection(selectedSectionIndex, { title: e.target.value })} />
                    <Label>Section Type</Label>
                    <Input value={sections[selectedSectionIndex]?.type || ""} onChange={(e) => patchSection(selectedSectionIndex, { type: e.target.value })} />
                    <Label>Widget Settings JSON</Label>
                    <Textarea rows={3} value={JSON.stringify(sections[selectedSectionIndex]?.settings || {}, null, 2)} onChange={(e) => {
                      try {
                        patchSection(selectedSectionIndex, { settings: JSON.parse(e.target.value || "{}") });
                      } catch {
                        // keep editor responsive while JSON is invalid
                      }
                    }} />
                  </div>
                ) : null}
                <Button className="w-full rounded-xl" onClick={saveLayout}>Save Homepage Layout</Button>
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Responsive Preview</CardTitle>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                      <Button variant={previewDevice === "desktop" ? "default" : "ghost"} size="sm" className="h-8 px-3 rounded-md" onClick={() => setPreviewDevice("desktop")}><Monitor className="w-4 h-4" /></Button>
                      <Button variant={previewDevice === "tablet" ? "default" : "ghost"} size="sm" className="h-8 px-3 rounded-md" onClick={() => setPreviewDevice("tablet")}><Tablet className="w-4 h-4" /></Button>
                      <Button variant={previewDevice === "mobile" ? "default" : "ghost"} size="sm" className="h-8 px-3 rounded-md" onClick={() => setPreviewDevice("mobile")}><Smartphone className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className={`mx-auto bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden transition-all ${previewDevice === "desktop" ? "w-full" : previewDevice === "tablet" ? "w-[768px] max-w-full" : "w-[375px] max-w-full"}`}>
                    <div className="h-96 p-6 space-y-3">
                      {sections.map((section, idx) => (
                        <div key={`${section.type}-preview-${idx}`} className="h-12 rounded-lg bg-white/70 dark:bg-slate-700/60 flex items-center px-4 text-sm text-slate-600 dark:text-slate-200">
                          {section.title || section.type}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="navigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Menu</CardTitle>
              <CardDescription>Header/footer menu controls backed by Storefront API.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {menuItems.map((item, idx) => (
                  <div key={`${item.path}-${idx}`} className="grid grid-cols-12 gap-2 items-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <Move className="w-4 h-4 text-slate-400 col-span-1" />
                    <Input className="col-span-4" value={item.label || ""} onChange={(e) => setMenuItems((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))} />
                    <Input className="col-span-6" value={item.path || ""} onChange={(e) => setMenuItems((prev) => prev.map((x, i) => (i === idx ? { ...x, path: e.target.value } : x)))} />
                    <Button className="col-span-1" variant="ghost" size="icon" onClick={() => removeMenuItem(idx)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full rounded-xl" onClick={addMenuItem}><Plus className="w-4 h-4 mr-2" />Add Menu Item</Button>
                <Button className="w-full rounded-xl" onClick={saveNavigation}>Save Navigation</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="static-pages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Static Pages (About/Contact/Policy)</CardTitle>
              <CardDescription>Create and manage SEO-ready static pages for storefront.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Title</Label><Input value={pageForm.title} onChange={(e) => setPageForm((p) => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Slug</Label><Input value={pageForm.slug} onChange={(e) => setPageForm((p) => ({ ...p, slug: e.target.value }))} placeholder="about-us" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Content</Label><Textarea rows={5} value={pageForm.content} onChange={(e) => setPageForm((p) => ({ ...p, content: e.target.value }))} /></div>
                <div className="space-y-2"><Label>SEO Title</Label><Input value={pageForm.seoTitle} onChange={(e) => setPageForm((p) => ({ ...p, seoTitle: e.target.value }))} /></div>
                <div className="space-y-2"><Label>SEO Description</Label><Input value={pageForm.seoDescription} onChange={(e) => setPageForm((p) => ({ ...p, seoDescription: e.target.value }))} /></div>
              </div>
              <div className="flex items-center gap-2">
                <input id="publishPage" type="checkbox" checked={pageForm.isPublished} onChange={(e) => setPageForm((p) => ({ ...p, isPublished: e.target.checked }))} />
                <Label htmlFor="publishPage">Publish page</Label>
              </div>
              <Button onClick={savePage}>{editingPageId ? "Update Page" : "Create Page"}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Pages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pages.length === 0 ? <p className="text-sm text-slate-500">No pages yet.</p> : null}
              {pages.map((page) => (
                <div key={page.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{page.title}</p>
                    <p className="text-xs text-slate-500">/{page.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={page.isPublished ? "default" : "secondary"}>{page.isPublished ? "Published" : "Draft"}</Badge>
                    <Button variant="outline" size="sm" onClick={() => editPage(page)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => deletePage(page.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading ? <p className="text-sm text-slate-500">Loading storefront module...</p> : null}
    </div>
  );
};

export default StoreBuilder;
