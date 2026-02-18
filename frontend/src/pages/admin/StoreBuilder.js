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
  Undo2,
  Redo2,
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

const cloneDeep = (value) => JSON.parse(JSON.stringify(value));
const newNodeId = () => `node_${Math.random().toString(36).slice(2, 10)}`;
const normalizeNodes = (nodes = []) =>
  (Array.isArray(nodes) ? nodes : []).map((n) => ({
    id: n.id || newNodeId(),
    type: n.type || "block",
    title: n.title || n.type || "Block",
    settings: n.settings || {},
    children: normalizeNodes(n.children || []),
  }));

const walkNodes = (nodes, cb) =>
  nodes.map((n) => ({ ...cb(n), children: walkNodes(n.children || [], cb) }));

const findNodeByIdInTree = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNodeByIdInTree(node.children || [], id);
    if (child) return child;
  }
  return null;
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
  const [sections, setSections] = useState(normalizeNodes(FALLBACK_SECTIONS));
  const [pastSections, setPastSections] = useState([]);
  const [futureSections, setFutureSections] = useState([]);
  const [layoutVersions, setLayoutVersions] = useState([]);
  const [menuItems, setMenuItems] = useState(FALLBACK_MENU);
  const [pages, setPages] = useState([]);
  const [pageForm, setPageForm] = useState({ title: "", slug: "", content: "", seoTitle: "", seoDescription: "", isPublished: false });
  const [editingPageId, setEditingPageId] = useState("");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [draggingNodeId, setDraggingNodeId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const activeTheme = useMemo(() => themes.find((x) => x.id === activeThemeId) || null, [themes, activeThemeId]);
  const selectedNode = useMemo(() => findNodeByIdInTree(sections, selectedNodeId), [sections, selectedNodeId]);

  const loadData = async () => {
    if (!storeId) return;
    setLoading(true);
    setStatus("");
    try {
      const [themesRes, settingsRes, layoutRes, navRes, pagesRes, versionsRes] = await Promise.all([
        api.get(`/stores/${storeId}/storefront/themes`),
        api.get(`/stores/${storeId}/storefront/settings`),
        api.get(`/stores/${storeId}/storefront/homepage-layout`),
        api.get(`/stores/${storeId}/storefront/navigation`),
        api.get(`/stores/${storeId}/storefront/pages`),
        api.get(`/stores/${storeId}/storefront/homepage-layout/versions`),
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
      const normalized = normalizeNodes(parseJsonArray(layoutRes.data?.sectionsJson, FALLBACK_SECTIONS));
      setSections(normalized);
      setSelectedNodeId(normalized[0]?.id || "");
      setMenuItems(parseJsonArray(navRes.data?.itemsJson, FALLBACK_MENU));
      setPages(Array.isArray(pagesRes.data) ? pagesRes.data : []);
      setLayoutVersions(Array.isArray(versionsRes.data) ? versionsRes.data : []);
    } catch (err) {
      setStatus(err?.response?.status === 403 ? "You are not authorized." : "Could not load storefront settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeId]);

  const recordSectionsHistory = () => {
    setPastSections((p) => [...p, cloneDeep(sections)]);
    setFutureSections([]);
  };

  const updateNodeById = (nodes, id, updater) =>
    nodes.map((n) => (n.id === id ? updater(n) : { ...n, children: updateNodeById(n.children || [], id, updater) }));

  const removeNodeById = (nodes, id) => {
    let removed = null;
    const next = [];
    for (const n of nodes) {
      if (n.id === id) {
        removed = n;
        continue;
      }
      const childResult = removeNodeById(n.children || [], id);
      if (childResult.removed) removed = childResult.removed;
      next.push({ ...n, children: childResult.nodes });
    }
    return { nodes: next, removed };
  };

  const addChildToNode = (nodes, parentId, childNode) =>
    nodes.map((n) =>
      n.id === parentId
        ? { ...n, children: [...(n.children || []), childNode] }
        : { ...n, children: addChildToNode(n.children || [], parentId, childNode) }
    );

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
    recordSectionsHistory();
    const node = { id: newNodeId(), type: "custom", title: `Section ${sections.length + 1}`, settings: {}, children: [] };
    setSections((prev) => [...prev, node]);
    setSelectedSectionIndex(sections.length);
    setSelectedNodeId(node.id);
  };

  const removeSection = (idx) => {
    recordSectionsHistory();
    setSections((prev) => prev.filter((_, i) => i !== idx));
    setSelectedSectionIndex(0);
    setSelectedNodeId("");
  };

  const moveSection = (idx, direction) => {
    const target = idx + direction;
    if (target < 0 || target >= sections.length) return;
    recordSectionsHistory();
    const next = [...sections];
    const temp = next[idx];
    next[idx] = next[target];
    next[target] = temp;
    setSections(next);
    setSelectedSectionIndex(target);
  };

  const patchSection = (idx, patch) => {
    recordSectionsHistory();
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const undoSections = () => {
    if (pastSections.length === 0) return;
    const prev = pastSections[pastSections.length - 1];
    setPastSections((p) => p.slice(0, -1));
    setFutureSections((f) => [cloneDeep(sections), ...f]);
    setSections(prev);
  };

  const redoSections = () => {
    if (futureSections.length === 0) return;
    const next = futureSections[0];
    setFutureSections((f) => f.slice(1));
    setPastSections((p) => [...p, cloneDeep(sections)]);
    setSections(next);
  };

  const addChildBlock = (idx) => {
    recordSectionsHistory();
    const childNode = { id: newNodeId(), type: "block", title: "Nested Block", settings: {}, children: [] };
    const targetId = sections[idx]?.id;
    if (!targetId) return;
    setSections((prev) => addChildToNode(prev, targetId, childNode));
    setSelectedNodeId(childNode.id);
  };

  const patchSelectedNode = (patch) => {
    if (!selectedNodeId) return;
    recordSectionsHistory();
    setSections((prev) => updateNodeById(prev, selectedNodeId, (node) => ({ ...node, ...patch })));
  };

  const moveNodeAsChild = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const targetNode = findNodeByIdInTree(sections, targetId);
    if (!targetNode) return;
    const isInvalidDrop = findNodeByIdInTree(targetNode.children || [], sourceId);
    if (isInvalidDrop) return;
    recordSectionsHistory();
    const removed = removeNodeById(sections, sourceId);
    if (!removed.removed) return;
    const inserted = addChildToNode(removed.nodes, targetId, removed.removed);
    setSections(inserted);
  };

  const saveLayout = async () => {
    if (!storeId) return;
    setStatus("");
    try {
      const validation = await api.post(`/stores/${storeId}/storefront/homepage-layout/validate`, { sectionsJson: JSON.stringify(sections) });
      if (!validation.data?.valid) {
        setStatus(validation.data?.error || "Layout validation failed.");
        return;
      }
      await api.put(`/stores/${storeId}/storefront/homepage-layout`, { sectionsJson: JSON.stringify(sections) });
      const versionsRes = await api.get(`/stores/${storeId}/storefront/homepage-layout/versions`);
      setLayoutVersions(Array.isArray(versionsRes.data) ? versionsRes.data : []);
      setStatus("Homepage layout saved.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not save homepage layout.");
    }
  };

  const publishVersion = async (versionId) => {
    if (!storeId) return;
    try {
      await api.post(`/stores/${storeId}/storefront/homepage-layout/publish`, { versionId });
      await loadData();
      setStatus("Version published.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not publish version.");
    }
  };

  const rollbackVersion = async (versionId) => {
    if (!storeId) return;
    try {
      await api.post(`/stores/${storeId}/storefront/homepage-layout/rollback`, { versionId });
      await loadData();
      setStatus("Rollback complete.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not rollback.");
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

  const renderCanvasNode = (node, depth = 0) => (
    <div
      key={node.id}
      className={`rounded-lg border p-3 ${selectedNodeId === node.id ? "border-blue-500 bg-blue-50/40 dark:bg-blue-900/10" : "border-slate-200 dark:border-slate-700"} ${draggingNodeId === node.id ? "opacity-60" : ""}`}
      style={{ marginLeft: `${Math.min(depth, 6) * 14}px` }}
      draggable
      onDragStart={() => setDraggingNodeId(node.id)}
      onDragEnd={() => setDraggingNodeId("")}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const sourceId = draggingNodeId;
        setDraggingNodeId("");
        moveNodeAsChild(sourceId, node.id);
      }}
      onClick={() => setSelectedNodeId(node.id)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{node.title || node.type}</div>
        <div className="text-xs text-slate-500">{node.type}</div>
      </div>
      {(node.children || []).length > 0 ? (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => renderCanvasNode(child, depth + 1))}
        </div>
      ) : null}
    </div>
  );

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
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={undoSections} disabled={pastSections.length === 0}><Undo2 className="w-4 h-4 mr-2" />Undo</Button>
                  <Button variant="outline" onClick={redoSections} disabled={futureSections.length === 0}><Redo2 className="w-4 h-4 mr-2" />Redo</Button>
                </div>
                {sections.map((section, idx) => (
                  <div key={`${section.type}-${idx}`} className={`flex items-center gap-3 p-3 border rounded-lg ${idx === selectedSectionIndex ? "border-blue-500" : "border-slate-200 dark:border-slate-700"}`} onClick={() => { setSelectedSectionIndex(idx); setSelectedNodeId(section.id); }}>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      {section.type === "hero" ? <Image className="w-4 h-4 text-slate-500" /> : section.type === "products" ? <Layers className="w-4 h-4 text-slate-500" /> : <Type className="w-4 h-4 text-slate-500" />}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{section.title || section.type}</span>
                    <Move className="w-4 h-4 text-slate-400 ml-auto" />
                    <Button size="icon" variant="ghost" onClick={() => moveSection(idx, -1)}>↑</Button>
                    <Button size="icon" variant="ghost" onClick={() => moveSection(idx, 1)}>↓</Button>
                    <Button size="icon" variant="ghost" onClick={() => addChildBlock(idx)}>+</Button>
                    <Button size="icon" variant="ghost" onClick={() => removeSection(idx)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full rounded-xl" onClick={addSection}><Plus className="w-4 h-4 mr-2" />Add Section</Button>
                {selectedNode ? (
                  <div className="space-y-2 p-3 border rounded-lg">
                    <Label>Inspector: Title</Label>
                    <Input value={selectedNode?.title || ""} onChange={(e) => patchSelectedNode({ title: e.target.value })} />
                    <Label>Inspector: Type</Label>
                    <Input value={selectedNode?.type || ""} onChange={(e) => patchSelectedNode({ type: e.target.value })} />
                    <Label>Inspector: CSS Class</Label>
                    <Input value={selectedNode?.settings?.cssClass || ""} onChange={(e) => patchSelectedNode({ settings: { ...(selectedNode?.settings || {}), cssClass: e.target.value } })} />
                    <Label>Inspector: Background</Label>
                    <Input value={selectedNode?.settings?.background || ""} onChange={(e) => patchSelectedNode({ settings: { ...(selectedNode?.settings || {}), background: e.target.value } })} />
                    <Label>Nested Blocks</Label>
                    <div className="space-y-1">
                      {(selectedNode?.children || []).map((c, i) => (
                        <div key={`${c.type}-${i}`} className="text-xs p-2 rounded border bg-slate-50 dark:bg-slate-900">{c.title || c.type}</div>
                      ))}
                    </div>
                    <Label>Widget Settings JSON</Label>
                    <Textarea rows={3} value={JSON.stringify(selectedNode?.settings || {}, null, 2)} onChange={(e) => {
                      try {
                        patchSelectedNode({ settings: JSON.parse(e.target.value || "{}") });
                      } catch {
                        // keep editor responsive while JSON is invalid
                      }
                    }} />
                  </div>
                ) : null}
                <Button className="w-full rounded-xl" onClick={saveLayout}>Save Homepage Layout</Button>
                <div className="space-y-2">
                  <Label>Layout Versions</Label>
                  {(layoutVersions || []).slice(0, 8).map((v) => (
                    <div key={v.id} className="p-2 border rounded flex items-center justify-between gap-2">
                      <span className="text-xs">v{v.versionNumber} · {v.versionType}</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => publishVersion(v.id)}>Publish</Button>
                        <Button size="sm" variant="ghost" onClick={() => rollbackVersion(v.id)}>Rollback</Button>
                      </div>
                    </div>
                  ))}
                </div>
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
                    <div className="h-96 overflow-auto p-6 space-y-3" onDragOver={(e) => e.preventDefault()}>
                      {sections.map((section) => renderCanvasNode(section, 0))}
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
