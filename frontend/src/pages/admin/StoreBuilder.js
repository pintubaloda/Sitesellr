import { useEffect, useMemo, useRef, useState } from "react";
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

const SECTION_MARKETPLACE = [
  { key: "hero-banner-basic", title: "Hero Banner", type: "hero", tier: "free" },
  { key: "featured-products", title: "Featured Products", type: "products", tier: "free" },
  { key: "category-grid", title: "Category Grid", type: "collection", tier: "free" },
  { key: "announcement-bar-pro", title: "Announcement Bar", type: "announcement", tier: "paid" },
  { key: "testimonial-carousel-pro", title: "Testimonial Carousel", type: "testimonials", tier: "paid" },
  { key: "video-story-pro", title: "Brand Video Story", type: "video", tier: "paid" },
  { key: "wholesale-cta-pro", title: "Wholesale CTA Block", type: "wholesale_cta", tier: "paid" },
];

const BRANDING_PRESETS = [
  { key: "classic-blue", name: "Classic Blue", tokens: { primary: "#2563eb", accent: "#0f172a", radius: "12px" }, typographyPack: "modern-sans" },
  { key: "earthy-market", name: "Earthy Market", tokens: { primary: "#166534", accent: "#78350f", radius: "10px" }, typographyPack: "merchant-serif" },
  { key: "luxury-night", name: "Luxury Night", tokens: { primary: "#111827", accent: "#c2410c", radius: "14px" }, typographyPack: "luxury-display" },
];

const CAMPAIGN_TEMPLATES = [
  { key: "flash-sale", name: "Flash Sale", sections: ["announcement-bar-pro", "hero-banner-basic", "featured-products"] },
  { key: "festival-launch", name: "Festival Launch", sections: ["hero-banner-basic", "video-story-pro", "featured-products", "testimonial-carousel-pro"] },
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
const newMenuId = () => `menu_${Math.random().toString(36).slice(2, 10)}`;
const normalizeNodes = (nodes = []) =>
  (Array.isArray(nodes) ? nodes : []).map((n) => ({
    id: n.id || newNodeId(),
    type: n.type || "block",
    title: n.title || n.type || "Block",
    settings: n.settings || {},
    children: normalizeNodes(n.children || []),
  }));

const normalizeMenuItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((i) => {
    let parsedMode = "all";
    let parsedConditions = [];
    try {
      if (i.visibility?.ruleJson) {
        const parsed = JSON.parse(i.visibility.ruleJson);
        parsedMode = parsed?.mode === "any" ? "any" : "all";
        parsedConditions = Array.isArray(parsed?.conditions) ? parsed.conditions : [];
      }
    } catch {
      parsedMode = "all";
      parsedConditions = [];
    }
    return {
      id: i.id || newMenuId(),
      label: i.label || "Menu",
      path: i.path || "/",
      visibility: {
        customerType: i.visibility?.customerType || "all",
        login: i.visibility?.login || "any",
        device: i.visibility?.device || "all",
        ruleMode: parsedMode,
        conditions: parsedConditions,
      },
      children: normalizeMenuItems(i.children || []),
    };
  });

const findNodeByIdInTree = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNodeByIdInTree(node.children || [], id);
    if (child) return child;
  }
  return null;
};

const insertNodeRelative = (nodes, targetId, node, position) => {
  const out = [];
  let inserted = false;
  for (const item of nodes) {
    if (item.id === targetId && position === "before") {
      out.push(node);
      inserted = true;
    }
    if (item.children?.length) {
      const nested = insertNodeRelative(item.children, targetId, node, position);
      out.push({ ...item, children: nested.nodes });
      if (nested.inserted) inserted = true;
    } else {
      out.push(item);
    }
    if (item.id === targetId && position === "after") {
      out.push(node);
      inserted = true;
    }
  }
  return { nodes: out, inserted };
};

const countNodes = (nodes) =>
  nodes.reduce((acc, n) => acc + 1 + countNodes(n.children || []), 0);

const ThemeCard = ({ theme, isActive, onSelect, onPreview }) => {
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
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(theme.id);
            }}
          >
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const StoreBuilder = () => {
  const { stores, storeId, loadingStores } = useActiveStore();
  const [themes, setThemes] = useState([]);
  const [themeCategoryFilter, setThemeCategoryFilter] = useState("All");
  const [themeSearch, setThemeSearch] = useState("");
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
    quoteAlertEmail: "",
  });
  const [sections, setSections] = useState(normalizeNodes(FALLBACK_SECTIONS));
  const [pastSections, setPastSections] = useState([]);
  const [futureSections, setFutureSections] = useState([]);
  const [layoutVersions, setLayoutVersions] = useState([]);
  const [menuItems, setMenuItems] = useState(normalizeMenuItems(FALLBACK_MENU));
  const [draggingMenuId, setDraggingMenuId] = useState("");
  const [pages, setPages] = useState([]);
  const [pageForm, setPageForm] = useState({ title: "", slug: "", content: "", seoTitle: "", seoDescription: "", isPublished: false });
  const [editingPageId, setEditingPageId] = useState("");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [draggingNodeId, setDraggingNodeId] = useState("");
  const [canvasMode, setCanvasMode] = useState("flow");
  const [gridSnap, setGridSnap] = useState(true);
  const [playbackIndex, setPlaybackIndex] = useState(null);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [editorName, setEditorName] = useState("Store Editor");
  const [diffResult, setDiffResult] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState([]);
  const [customerGroups, setCustomerGroups] = useState([]);
  const [visibilityRules, setVisibilityRules] = useState([]);
  const [sectionEntitlements, setSectionEntitlements] = useState({ planCode: "", allowedPremiumKeys: [] });
  const [quoteInquiries, setQuoteInquiries] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [campaignTemplates, setCampaignTemplates] = useState(CAMPAIGN_TEMPLATES.map((x) => ({ ...x, id: x.key, isPaid: false, isActiveForStore: true })));
  const [newGroupName, setNewGroupName] = useState("");
  const [ruleForm, setRuleForm] = useState({ customerGroupId: "", targetType: "product", targetKey: "", effect: "deny" });
  const [previewGroupId, setPreviewGroupId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);
  const suppressRealtimeRef = useRef(false);
  const revisionRef = useRef(0);

  const activeTheme = useMemo(() => themes.find((x) => x.id === activeThemeId) || null, [themes, activeThemeId]);
  const themeCategories = useMemo(() => {
    const rows = themes
      .map((x) => (x.category || "General").trim())
      .filter(Boolean);
    return ["All", ...Array.from(new Set(rows)).sort((a, b) => a.localeCompare(b))];
  }, [themes]);
  const filteredThemes = useMemo(() => {
    const q = themeSearch.trim().toLowerCase();
    return themes.filter((x) => {
      const category = (x.category || "General").trim();
      if (themeCategoryFilter !== "All" && category !== themeCategoryFilter) return false;
      if (!q) return true;
      return (
        (x.name || "").toLowerCase().includes(q) ||
        (x.category || "").toLowerCase().includes(q) ||
        (x.description || "").toLowerCase().includes(q)
      );
    });
  }, [themes, themeCategoryFilter, themeSearch]);
  const selectedNode = useMemo(() => findNodeByIdInTree(sections, selectedNodeId), [sections, selectedNodeId]);
  const historyFrames = useMemo(() => [...pastSections, sections], [pastSections, sections]);

  useEffect(() => {
    if (!isTimelinePlaying) return undefined;
    const timer = setInterval(() => {
      setPlaybackIndex((prev) => {
        const base = typeof prev === "number" ? prev : 0;
        const next = base + 1;
        if (next >= historyFrames.length) {
          setIsTimelinePlaying(false);
          return historyFrames.length - 1;
        }
        jumpToHistory(next);
        return next;
      });
    }, 900);
    return () => clearInterval(timer);
  }, [isTimelinePlaying, historyFrames.length]);

  const loadData = async () => {
    if (!storeId) return;
    setLoading(true);
    setStatus("");
    try {
      const [themesRes, settingsRes, layoutRes, navRes, pagesRes, versionsRes, groupsRes, rulesRes, entitlementsRes, quoteRes, teamRes, campaignRes] = await Promise.all([
        api.get(`/stores/${storeId}/storefront/themes`),
        api.get(`/stores/${storeId}/storefront/settings`),
        api.get(`/stores/${storeId}/storefront/homepage-layout`),
        api.get(`/stores/${storeId}/storefront/navigation`),
        api.get(`/stores/${storeId}/storefront/pages`),
        api.get(`/stores/${storeId}/storefront/homepage-layout/versions`),
        api.get(`/stores/${storeId}/b2b/groups`),
        api.get(`/stores/${storeId}/b2b/rules`),
        api.get(`/stores/${storeId}/storefront/section-entitlements`),
        api.get(`/stores/${storeId}/storefront/quote-inquiries`),
        api.get(`/stores/${storeId}/team`),
        api.get(`/stores/${storeId}/storefront/campaign-templates`),
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
        quoteAlertEmail: settingsRes.data?.quoteAlertEmail || "",
      });
      const normalized = normalizeNodes(parseJsonArray(layoutRes.data?.sectionsJson, FALLBACK_SECTIONS));
      setSections(normalized);
      setSelectedNodeId(normalized[0]?.id || "");
      revisionRef.current = 0;
      setMenuItems(normalizeMenuItems(parseJsonArray(navRes.data?.itemsJson, FALLBACK_MENU)));
      setPages(Array.isArray(pagesRes.data) ? pagesRes.data : []);
      setLayoutVersions(Array.isArray(versionsRes.data) ? versionsRes.data : []);
      setCustomerGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
      setVisibilityRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
      setSectionEntitlements({
        planCode: entitlementsRes.data?.planCode || "",
        allowedPremiumKeys: Array.isArray(entitlementsRes.data?.allowedPremiumKeys) ? entitlementsRes.data.allowedPremiumKeys : [],
      });
      setQuoteInquiries(Array.isArray(quoteRes.data) ? quoteRes.data : []);
      setTeamMembers(Array.isArray(teamRes.data) ? teamRes.data : []);
      setCampaignTemplates(Array.isArray(campaignRes.data) && campaignRes.data.length > 0 ? campaignRes.data : CAMPAIGN_TEMPLATES.map((x) => ({ ...x, id: x.key, isPaid: false, isActiveForStore: true })));
    } catch (err) {
      setStatus(err?.response?.status === 403 ? "You are not authorized." : "Could not load storefront settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return undefined;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const clientId = `client_${Math.random().toString(36).slice(2, 10)}`;
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/storefront/${storeId}?clientId=${clientId}`);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "snapshot" || msg.type === "op_applied") {
          revisionRef.current = Number(msg.revision || 0);
          if (msg.clientId && msg.clientId === clientId) return;
          suppressRealtimeRef.current = true;
          const normalized = normalizeNodes(parseJsonArray(msg.sectionsJson, FALLBACK_SECTIONS));
          setSections(normalized);
          setTimeout(() => {
            suppressRealtimeRef.current = false;
          }, 150);
        } else if (msg.type === "conflict") {
          revisionRef.current = Number(msg.revision || 0);
          suppressRealtimeRef.current = true;
          const normalized = normalizeNodes(parseJsonArray(msg.sectionsJson, FALLBACK_SECTIONS));
          setSections(normalized);
          setStatus("Realtime conflict resolved with latest server state.");
          setTimeout(() => {
            suppressRealtimeRef.current = false;
          }, 150);
        } else if (msg.type === "cursor") {
          setRemoteCursors((prev) => {
            const filtered = prev.filter((c) => c.clientId !== msg.clientId);
            return [...filtered, { clientId: msg.clientId, nodeId: msg.nodeId, x: msg.x, y: msg.y }];
          });
        }
      } catch {
        // no-op
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setRemoteCursors([]);
    };
  }, [storeId]);

  useEffect(() => {
    if (!selectedNodeId) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "cursor", nodeId: selectedNodeId, x: 0, y: 0 }));
  }, [selectedNodeId]);

  useEffect(() => {
    if (!storeId) return undefined;
    let timer = null;
    const heartbeat = async () => {
      try {
        await api.post(`/stores/${storeId}/storefront/collaboration/sessions`, { editorName });
        const res = await api.get(`/stores/${storeId}/storefront/collaboration/sessions`);
        setSessions(Array.isArray(res.data) ? res.data : []);
      } catch {
        // keep silent for collaboration polling
      }
    };
    heartbeat();
    timer = setInterval(heartbeat, 15000);
    return () => {
      clearInterval(timer);
      api.delete(`/stores/${storeId}/storefront/collaboration/sessions/me`).catch(() => {});
    };
  }, [storeId, editorName]);

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

  const moveNodeRelative = (sourceId, targetId, position) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const targetNode = findNodeByIdInTree(sections, targetId);
    if (!targetNode) return;
    const sourceNode = findNodeByIdInTree(sections, sourceId);
    if (!sourceNode) return;
    const invalid = findNodeByIdInTree(sourceNode.children || [], targetId);
    if (invalid) return;
    recordSectionsHistory();
    const removed = removeNodeById(sections, sourceId);
    if (!removed.removed) return;
    const inserted = insertNodeRelative(removed.nodes, targetId, removed.removed, position);
    if (!inserted.inserted) return;
    setSections(inserted.nodes);
  };

  const snapValue = (value) => {
    if (!gridSnap) return Number(value || 0);
    const n = Number(value || 0);
    return Math.round(n / 8) * 8;
  };

  const jumpToHistory = (idx) => {
    const frame = historyFrames[idx];
    if (!frame) return;
    setPlaybackIndex(idx);
    setSections(cloneDeep(frame));
    setSelectedNodeId(findNodeByIdInTree(frame, selectedNodeId)?.id || frame[0]?.id || "");
  };

  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return undefined;
    if (suppressRealtimeRef.current) return undefined;
    const timer = setTimeout(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          type: "op",
          baseRevision: revisionRef.current,
          sectionsJson: JSON.stringify(sections),
        })
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [sections]);

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

  const loadDiff = async (fromVersionId, toVersionId) => {
    if (!storeId || !fromVersionId || !toVersionId) return;
    try {
      const res = await api.get(`/stores/${storeId}/storefront/homepage-layout/diff`, { params: { fromVersionId, toVersionId } });
      setDiffResult(res.data);
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not load version diff.");
    }
  };

  const createGroup = async () => {
    if (!storeId || !newGroupName.trim()) return;
    try {
      await api.post(`/stores/${storeId}/b2b/groups`, { name: newGroupName.trim() });
      setNewGroupName("");
      const res = await api.get(`/stores/${storeId}/b2b/groups`);
      setCustomerGroups(Array.isArray(res.data) ? res.data : []);
      setStatus("Customer group created.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not create group.");
    }
  };

  const createRule = async () => {
    if (!storeId || !ruleForm.targetKey.trim()) return;
    try {
      await api.post(`/stores/${storeId}/b2b/rules`, {
        customerGroupId: ruleForm.customerGroupId || null,
        targetType: ruleForm.targetType,
        targetKey: ruleForm.targetKey.trim(),
        effect: ruleForm.effect,
      });
      setRuleForm((r) => ({ ...r, targetKey: "" }));
      const res = await api.get(`/stores/${storeId}/b2b/rules`);
      setVisibilityRules(Array.isArray(res.data) ? res.data : []);
      setStatus("Visibility rule saved.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not save rule.");
    }
  };

  const upsertMenuNode = (nodes, id, patch) =>
    nodes.map((n) =>
      n.id === id
        ? { ...n, ...patch }
        : { ...n, children: upsertMenuNode(n.children || [], id, patch) }
    );

  const removeMenuNode = (nodes, id) =>
    nodes
      .filter((n) => n.id !== id)
      .map((n) => ({ ...n, children: removeMenuNode(n.children || [], id) }));

  const appendMenuChild = (nodes, parentId, child) =>
    nodes.map((n) =>
      n.id === parentId
        ? { ...n, children: [...(n.children || []), child] }
        : { ...n, children: appendMenuChild(n.children || [], parentId, child) }
    );

  const moveMenuNode = (nodes, id, dir) => {
    const work = (arr) => {
      const idx = arr.findIndex((n) => n.id === id);
      if (idx >= 0)
      {
        const target = dir === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= arr.length) return arr;
        const next = [...arr];
        [next[idx], next[target]] = [next[target], next[idx]];
        return next;
      }
      return arr.map((n) => ({ ...n, children: work(n.children || []) }));
    };
    return work(nodes);
  };

  const addMenuItem = () => {
    setMenuItems((prev) => [...prev, { id: newMenuId(), label: "New", path: "/new", children: [] }]);
  };

  const addMenuChild = (parentId) => {
    setMenuItems((prev) => appendMenuChild(prev, parentId, { id: newMenuId(), label: "Child", path: "/child", children: [] }));
  };

  const updateMenuItem = (id, patch) => {
    setMenuItems((prev) => upsertMenuNode(prev, id, patch));
  };

  const removeMenuItem = (id) => {
    setMenuItems((prev) => removeMenuNode(prev, id));
  };

  const reorderMenuItem = (id, dir) => {
    setMenuItems((prev) => moveMenuNode(prev, id, dir));
  };

  const syncVisibilityRule = (visibility) => {
    const mode = visibility?.ruleMode === "any" ? "any" : "all";
    const conditions = Array.isArray(visibility?.conditions)
      ? visibility.conditions
          .filter((c) => c?.field && c?.value !== undefined && c?.value !== null && String(c.value).trim() !== "")
          .map((c) => ({ field: c.field, op: c.op === "neq" ? "neq" : "eq", value: String(c.value) }))
      : [];
    return {
      ...visibility,
      ruleJson: conditions.length > 0 ? JSON.stringify({ mode, conditions }) : "",
    };
  };

  const setMenuVisibility = (item, patch) => {
    const next = syncVisibilityRule({ ...(item.visibility || {}), ...patch });
    updateMenuItem(item.id, { visibility: next });
  };

  const addVisibilityCondition = (item) => {
    const conditions = Array.isArray(item.visibility?.conditions) ? item.visibility.conditions : [];
    setMenuVisibility(item, { conditions: [...conditions, { field: "customerType", op: "eq", value: "retail" }] });
  };

  const updateVisibilityCondition = (item, idx, patch) => {
    const conditions = Array.isArray(item.visibility?.conditions) ? [...item.visibility.conditions] : [];
    if (!conditions[idx]) return;
    conditions[idx] = { ...conditions[idx], ...patch };
    setMenuVisibility(item, { conditions });
  };

  const removeVisibilityCondition = (item, idx) => {
    const conditions = Array.isArray(item.visibility?.conditions) ? item.visibility.conditions.filter((_, i) => i !== idx) : [];
    setMenuVisibility(item, { conditions });
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

  const addSectionTemplate = (template) => {
    if (template.tier === "paid" && !sectionEntitlements.allowedPremiumKeys.includes(template.key))
    {
      setStatus("Premium section not available on current plan.");
      return;
    }
    pushHistory();
    setSections((prev) => [
      ...prev,
      {
        id: newNodeId(),
        type: template.type,
        title: template.title,
        settings: { tier: template.tier, templateKey: template.key },
        children: [],
      },
    ]);
    setStatus(`Added section: ${template.title}`);
  };

  const applyBrandingPreset = (preset) => {
    let existing = {};
    try {
      existing = JSON.parse(themeSettings.designTokensJson || "{}");
    } catch {
      existing = {};
    }
    setThemeSettings((s) => ({
      ...s,
      designTokensJson: JSON.stringify({ ...existing, ...preset.tokens, typographyPack: preset.typographyPack }, null, 2),
    }));
    setStatus(`Applied branding preset: ${preset.name}`);
  };

  const applyCampaignTemplate = async (tpl) => {
    if (!storeId) return;
    if (tpl.isPaid && !tpl.isActiveForStore) {
      try {
        await api.post(`/stores/${storeId}/storefront/campaign-templates/${tpl.id}/purchase`);
      } catch (err) {
        setStatus(err?.response?.data?.error || "Could not activate campaign template.");
        return;
      }
    }
    let keys = [];
    try {
      const parsed = JSON.parse(tpl.sectionsJson || "[]");
      keys = Array.isArray(parsed) ? parsed : [];
    } catch {
      keys = Array.isArray(tpl.sections) ? tpl.sections : [];
    }
    const allowed = new Set(sectionEntitlements.allowedPremiumKeys);
    keys = keys.filter((k) => !String(k).endsWith("-pro") || allowed.has(k));
    const toAdd = SECTION_MARKETPLACE.filter((x) => keys.includes(x.key));
    pushHistory();
    setSections((prev) => [
      ...prev,
      ...toAdd.map((template) => ({
        id: newNodeId(),
        type: template.type,
        title: template.title,
        settings: { tier: template.tier, templateKey: template.key },
        children: [],
      })),
    ]);
    setStatus(`Applied campaign template: ${tpl.name}`);
    await loadData();
  };

  const previewTheme = (themeId) => {
    if (!storeId || !themeId) return;
    const selectedStore = stores.find((x) => x.id === storeId);
    const sub = selectedStore?.subdomain || selectedStore?.name?.toLowerCase().replace(/\s+/g, "-");
    if (!sub) return;
    window.open(`/s/${sub}?previewThemeId=${encodeURIComponent(themeId)}`, "_blank");
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

  const updateQuoteStatus = async (id, status, assignedToUserId, priority, slaDueAt) => {
    if (!storeId || !id) return;
    try {
      await api.put(`/stores/${storeId}/storefront/quote-inquiries/${id}/status`, { status, assignedToUserId, priority, slaDueAt });
      const res = await api.get(`/stores/${storeId}/storefront/quote-inquiries`);
      setQuoteInquiries(Array.isArray(res.data) ? res.data : []);
      setStatus("Quote inquiry status updated.");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Could not update quote inquiry status.");
    }
  };

  const handleDropMenu = (sourceId, targetId, mode) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const extractNode = (nodes, id) => {
      let found = null;
      const next = nodes
        .filter((n) => {
          if (n.id === id) {
            found = n;
            return false;
          }
          return true;
        })
        .map((n) => {
          const child = extractNode(n.children || [], id);
          if (child.node) found = child.node;
          return { ...n, children: child.nodes };
        });
      return { nodes: next, node: found };
    };
    const insertRelative = (nodes, id, node, where) => {
      const out = [];
      for (const n of nodes) {
        if (n.id === id && where === "before") out.push(node);
        out.push({ ...n, children: insertRelative(n.children || [], id, node, where) });
        if (n.id === id && where === "after") out.push(node);
      }
      return out;
    };
    const insertChild = (nodes, id, node) =>
      nodes.map((n) => (n.id === id ? { ...n, children: [...(n.children || []), node] } : { ...n, children: insertChild(n.children || [], id, node) }));

    setMenuItems((prev) => {
      const removed = extractNode(prev, sourceId);
      if (!removed.node) return prev;
      if (mode === "child") return insertChild(removed.nodes, targetId, removed.node);
      return insertRelative(removed.nodes, targetId, removed.node, mode);
    });
    setDraggingMenuId("");
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

  const renderCanvasNode = (node, depth = 0) => {
    const x = Number(node.settings?.x || 0);
    const y = Number(node.settings?.y || 0);
    const w = Number(node.settings?.w || 280);
    return (
      <div key={node.id} className="space-y-1">
        <div
          className="h-2 rounded bg-transparent hover:bg-blue-200/60"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            moveNodeRelative(draggingNodeId, node.id, "before");
            setDraggingNodeId("");
          }}
        />
        <div
          className={`rounded-lg border p-3 ${selectedNodeId === node.id ? "border-blue-500 bg-blue-50/40 dark:bg-blue-900/10" : "border-slate-200 dark:border-slate-700"} ${draggingNodeId === node.id ? "opacity-60" : ""}`}
          style={canvasMode === "absolute" ? { position: "absolute", left: `${x}px`, top: `${y}px`, width: `${w}px` } : { marginLeft: `${Math.min(depth, 6) * 14}px` }}
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
        <div
          className="h-2 rounded bg-transparent hover:bg-blue-200/60"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            moveNodeRelative(draggingNodeId, node.id, "after");
            setDraggingNodeId("");
          }}
        />
      </div>
    );
  };

  const renderMenuNodeEditor = (item, depth = 0) => (
    <div key={item.id} className="space-y-2">
      <div className="grid grid-cols-12 gap-2 items-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl" style={{ marginLeft: `${Math.min(depth, 5) * 18}px` }}>
        <Move className="w-4 h-4 text-slate-400 col-span-1" />
        <Input className="col-span-2" value={item.label || ""} onChange={(e) => updateMenuItem(item.id, { label: e.target.value })} />
        <Input className="col-span-2" value={item.path || ""} onChange={(e) => updateMenuItem(item.id, { path: e.target.value })} />
        <select
          className="col-span-2 h-9 rounded-md border px-2 bg-transparent text-xs"
          value={item.visibility?.customerType || "all"}
          onChange={(e) => setMenuVisibility(item, { customerType: e.target.value })}
        >
          <option value="all">All</option>
          <option value="retail">Retail only</option>
          <option value="business">Business only</option>
        </select>
        <select
          className="col-span-1 h-9 rounded-md border px-1 bg-transparent text-xs"
          value={item.visibility?.login || "any"}
          onChange={(e) => setMenuVisibility(item, { login: e.target.value })}
        >
          <option value="any">Any</option>
          <option value="required">Login</option>
          <option value="guest">Guest</option>
        </select>
        <select
          className="col-span-1 h-9 rounded-md border px-1 bg-transparent text-xs"
          value={item.visibility?.device || "all"}
          onChange={(e) => setMenuVisibility(item, { device: e.target.value })}
        >
          <option value="all">All</option>
          <option value="mobile">M</option>
          <option value="desktop">D</option>
          <option value="tablet">T</option>
        </select>
        <div className="col-span-1 flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => reorderMenuItem(item.id, "up")} title="Move up">↑</Button>
          <Button variant="ghost" size="icon" onClick={() => reorderMenuItem(item.id, "down")} title="Move down">↓</Button>
          <Button variant="outline" size="icon" onClick={() => addMenuChild(item.id)} title="Add child menu"><Plus className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => removeMenuItem(item.id)} title="Delete menu"><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>
      <div
        className="h-2 rounded bg-transparent hover:bg-blue-200/70"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleDropMenu(draggingMenuId, item.id, "before"); }}
      />
      <div className="flex gap-2 pl-6">
        <button
          type="button"
          className="text-[10px] text-slate-500 hover:text-slate-700"
          draggable
          onDragStart={() => setDraggingMenuId(item.id)}
          onDragEnd={() => setDraggingMenuId("")}
        >
          drag
        </button>
        <button type="button" className="text-[10px] text-slate-500 hover:text-slate-700" onClick={() => handleDropMenu(draggingMenuId, item.id, "child")}>
          drop as child
        </button>
      </div>
      <div className="ml-6 p-2 border rounded-md bg-slate-50/60 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Advanced rule</span>
          <select
            className="h-7 rounded border px-1 bg-transparent text-xs"
            value={item.visibility?.ruleMode || "all"}
            onChange={(e) => setMenuVisibility(item, { ruleMode: e.target.value })}
          >
            <option value="all">AND (all)</option>
            <option value="any">OR (any)</option>
          </select>
          <Button size="sm" variant="outline" onClick={() => addVisibilityCondition(item)}>Add condition</Button>
        </div>
        {(item.visibility?.conditions || []).map((c, idx) => (
          <div key={`${item.id}-cond-${idx}`} className="grid grid-cols-12 gap-1 items-center">
            <select className="col-span-4 h-7 rounded border px-1 bg-transparent text-xs" value={c.field || "customerType"} onChange={(e) => updateVisibilityCondition(item, idx, { field: e.target.value })}>
              <option value="customerType">customerType</option>
              <option value="login">login</option>
              <option value="device">device</option>
            </select>
            <select className="col-span-2 h-7 rounded border px-1 bg-transparent text-xs" value={c.op || "eq"} onChange={(e) => updateVisibilityCondition(item, idx, { op: e.target.value })}>
              <option value="eq">==</option>
              <option value="neq">!=</option>
            </select>
            <Input className="col-span-5 h-7 text-xs" value={c.value || ""} onChange={(e) => updateVisibilityCondition(item, idx, { value: e.target.value })} />
            <Button className="col-span-1 h-7" size="icon" variant="ghost" onClick={() => removeVisibilityCondition(item, idx)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
      </div>
      {(item.children || []).map((child) => renderMenuNodeEditor(child, depth + 1))}
      <div
        className="h-2 rounded bg-transparent hover:bg-blue-200/70"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleDropMenu(draggingMenuId, item.id, "after"); }}
      />
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
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <select
                    className="h-10 rounded-md border px-2 bg-transparent w-full"
                    value={themeCategoryFilter}
                    onChange={(e) => setThemeCategoryFilter(e.target.value)}
                  >
                    {themeCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Search Themes</Label>
                  <Input
                    value={themeSearch}
                    onChange={(e) => setThemeSearch(e.target.value)}
                    placeholder="Search by theme name, category, or description"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">{filteredThemes.length} theme(s) available</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredThemes.map((theme) => (
                  <ThemeCard key={theme.id} theme={theme} isActive={activeThemeId === theme.id} onSelect={applyTheme} onPreview={previewTheme} />
                ))}
              </div>
              {filteredThemes.length === 0 ? <p className="text-sm text-slate-500">No themes match current filters.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding Presets & Typography Packs</CardTitle>
              <CardDescription>Apply ready visual presets and theme typography quickly.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              {BRANDING_PRESETS.map((preset) => (
                <div key={preset.key} className="p-3 border rounded-lg">
                  <p className="text-sm font-medium">{preset.name}</p>
                  <p className="text-xs text-slate-500 mt-1">Typography: {preset.typographyPack}</p>
                  <Button className="mt-2" size="sm" variant="outline" onClick={() => applyBrandingPreset(preset)}>Apply</Button>
                </div>
              ))}
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
              <div className="space-y-2">
                <Label>Quote Alert Email</Label>
                <Input value={themeSettings.quoteAlertEmail} onChange={(e) => setThemeSettings((s) => ({ ...s, quoteAlertEmail: e.target.value }))} placeholder="ops@yourstore.com" />
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

          <Card>
            <CardHeader>
              <CardTitle>B2B Customer Group Visibility</CardTitle>
              <CardDescription>Create groups, define visibility rules, and preview storefront as a group.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-2">
                <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="New group name" />
                <Button variant="outline" onClick={createGroup}>Add Group</Button>
                <div className="flex gap-2">
                  <Input value={previewGroupId} onChange={(e) => setPreviewGroupId(e.target.value)} placeholder="Preview Group ID" />
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/s/${(window.location.host || "").split(".")[0]}?customerGroupId=${encodeURIComponent(previewGroupId)}`, "_blank")}
                  >
                    Preview
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-2">
                <select
                  className="h-10 rounded-md border px-2 bg-transparent"
                  value={ruleForm.customerGroupId}
                  onChange={(e) => setRuleForm((r) => ({ ...r, customerGroupId: e.target.value }))}
                >
                  <option value="">All groups</option>
                  {customerGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <select className="h-10 rounded-md border px-2 bg-transparent" value={ruleForm.targetType} onChange={(e) => setRuleForm((r) => ({ ...r, targetType: e.target.value }))}>
                  <option value="product">product</option>
                  <option value="category">category</option>
                  <option value="page">page</option>
                  <option value="theme_block">theme_block</option>
                </select>
                <Input value={ruleForm.targetKey} onChange={(e) => setRuleForm((r) => ({ ...r, targetKey: e.target.value }))} placeholder="Target key (id/slug/block id)" />
                <div className="flex gap-2">
                  <select className="h-10 rounded-md border px-2 bg-transparent" value={ruleForm.effect} onChange={(e) => setRuleForm((r) => ({ ...r, effect: e.target.value }))}>
                    <option value="deny">deny</option>
                    <option value="allow">allow</option>
                  </select>
                  <Button onClick={createRule}>Save Rule</Button>
                </div>
              </div>

              <div className="space-y-2">
                {visibilityRules.slice(0, 20).map((r) => (
                  <div key={r.id} className="text-xs p-2 border rounded">
                    {r.effect} {r.targetType}:{r.targetKey} group={r.customerGroupId || "all"}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quote Inquiries</CardTitle>
              <CardDescription>Requests submitted from wholesale storefront “Request Quote”.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await api.post(`/stores/${storeId}/storefront/quote-inquiries/automation/run`);
                    setStatus("Quote automation run completed.");
                  } catch (err) {
                    setStatus(err?.response?.data?.error || "Could not run quote automation.");
                  }
                }}
              >
                Run SLA Automation
              </Button>
              {quoteInquiries.length === 0 ? <p className="text-sm text-slate-500">No quote inquiries yet.</p> : null}
              {quoteInquiries.map((q) => (
                <div key={q.id} className="p-3 border rounded-lg flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{q.name} · {q.phone}</p>
                    <p className="text-xs text-slate-500">{q.email} · {q.message || "No message"}</p>
                    <p className="text-xs text-slate-400">Status: {q.status}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="h-8 rounded border px-2 text-xs bg-transparent"
                      value={q.assignedToUserId || ""}
                      onChange={(e) => setQuoteInquiries((prev) => prev.map((x) => x.id === q.id ? { ...x, assignedToUserId: e.target.value || null } : x))}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((u) => <option key={u.userId} value={u.userId}>{u.email}</option>)}
                    </select>
                    <select
                      className="h-8 rounded border px-2 text-xs bg-transparent"
                      value={q.priority || "normal"}
                      onChange={(e) => setQuoteInquiries((prev) => prev.map((x) => x.id === q.id ? { ...x, priority: e.target.value } : x))}
                    >
                      <option value="low">low</option>
                      <option value="normal">normal</option>
                      <option value="high">high</option>
                      <option value="urgent">urgent</option>
                    </select>
                    <Input
                      type="datetime-local"
                      className="h-8 text-xs"
                      value={q.slaDueAt ? new Date(q.slaDueAt).toISOString().slice(0, 16) : ""}
                      onChange={(e) => setQuoteInquiries((prev) => prev.map((x) => x.id === q.id ? { ...x, slaDueAt: e.target.value ? new Date(e.target.value).toISOString() : null } : x))}
                    />
                    <select
                      className="h-8 rounded border px-2 text-xs bg-transparent"
                      value={q.status}
                      onChange={(e) => setQuoteInquiries((prev) => prev.map((x) => x.id === q.id ? { ...x, status: e.target.value } : x))}
                    >
                      <option value="new">new</option>
                      <option value="in_progress">in_progress</option>
                      <option value="resolved">resolved</option>
                      <option value="closed">closed</option>
                    </select>
                    <Button
                      size="sm"
                      className="col-span-2"
                      variant="outline"
                      onClick={() => updateQuoteStatus(q.id, q.status, q.assignedToUserId || null, q.priority || "normal", q.slaDueAt || null)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Section Marketplace</CardTitle>
              <CardDescription>Add free and premium storefront sections to homepage. Current plan: {sectionEntitlements.planCode || "none"}.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {SECTION_MARKETPLACE.map((template) => (
                <div key={template.key} className="p-3 border rounded-lg flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{template.title}</p>
                    <p className="text-xs text-slate-500">
                      {template.tier === "paid"
                        ? (sectionEntitlements.allowedPremiumKeys.includes(template.key) ? "Premium section (enabled)" : "Premium section (upgrade required)")
                        : "Free section"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={template.tier === "paid" ? "outline" : "default"}
                    disabled={template.tier === "paid" && !sectionEntitlements.allowedPremiumKeys.includes(template.key)}
                    onClick={() => addSectionTemplate(template)}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Templates</CardTitle>
              <CardDescription>Quickly apply prebuilt marketing block combinations.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              {campaignTemplates.map((tpl) => (
                <div key={tpl.id || tpl.key} className="p-3 border rounded-lg flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{tpl.name}</p>
                    <p className="text-xs text-slate-500">
                      {tpl.isPaid
                        ? (tpl.isActiveForStore ? `Paid template active • INR ${Number(tpl.price || 0).toLocaleString()}` : `Purchase required • INR ${Number(tpl.price || 0).toLocaleString()}`)
                        : "Free template"}
                    </p>
                  </div>
                  <Button size="sm" variant={tpl.isPaid ? "outline" : "default"} onClick={() => applyCampaignTemplate(tpl)}>
                    {tpl.isPaid && !tpl.isActiveForStore ? "Purchase + Apply" : "Apply"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

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
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={canvasMode === "flow" ? "default" : "outline"} onClick={() => setCanvasMode("flow")}>Flow Mode</Button>
                  <Button variant={canvasMode === "absolute" ? "default" : "outline"} onClick={() => setCanvasMode("absolute")}>Absolute Mode</Button>
                </div>
                <div className="flex items-center gap-2">
                  <input id="gridSnap" type="checkbox" checked={gridSnap} onChange={(e) => setGridSnap(e.target.checked)} />
                  <Label htmlFor="gridSnap">Grid snapping (8px)</Label>
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
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label>X</Label>
                        <Input
                          type="number"
                          value={selectedNode?.settings?.x || 0}
                          onChange={(e) => patchSelectedNode({ settings: { ...(selectedNode?.settings || {}), x: snapValue(e.target.value) } })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Y</Label>
                        <Input
                          type="number"
                          value={selectedNode?.settings?.y || 0}
                          onChange={(e) => patchSelectedNode({ settings: { ...(selectedNode?.settings || {}), y: snapValue(e.target.value) } })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>W</Label>
                        <Input
                          type="number"
                          value={selectedNode?.settings?.w || 280}
                          onChange={(e) => patchSelectedNode({ settings: { ...(selectedNode?.settings || {}), w: snapValue(e.target.value) } })}
                        />
                      </div>
                    </div>
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
                        <Button size="sm" variant="ghost" onClick={() => loadDiff(v.id, layoutVersions[0]?.id)}>Diff</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Collaboration</Label>
                  <Input value={editorName} onChange={(e) => setEditorName(e.target.value)} placeholder="Editor display name" />
                  {(sessions || []).slice(0, 5).map((s) => (
                    <div key={s.id} className="text-xs p-2 border rounded flex items-center justify-between">
                      <span>{s.editorName || "Editor"}</span>
                      <span className="text-slate-500">{new Date(s.lastSeenAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {(remoteCursors || []).slice(0, 5).map((c) => (
                    <div key={`cursor-${c.clientId}`} className="text-xs p-2 rounded border bg-slate-50 dark:bg-slate-900">
                      Remote cursor: {c.clientId.slice(0, 6)} on {c.nodeId || "canvas"}
                    </div>
                  ))}
                </div>
                {diffResult ? (
                  <div className="space-y-2 p-2 border rounded">
                    <Label>Version Diff</Label>
                    <p className="text-xs">Added: {(diffResult.added || []).length} | Removed: {(diffResult.removed || []).length} | Renamed: {(diffResult.renamed || []).length}</p>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>Timeline Playback</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setPlaybackIndex(0); jumpToHistory(0); }}>Reset</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsTimelinePlaying((p) => !p)}>{isTimelinePlaying ? "Pause" : "Play"}</Button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, historyFrames.length - 1)}
                    value={typeof playbackIndex === "number" ? playbackIndex : Math.max(0, historyFrames.length - 1)}
                    onChange={(e) => {
                      const idx = Number(e.target.value || 0);
                      setPlaybackIndex(idx);
                      jumpToHistory(idx);
                    }}
                    className="w-full"
                  />
                  {historyFrames.slice(-8).map((frame, idx) => {
                    const frameIdx = historyFrames.length - Math.min(8, historyFrames.length) + idx;
                    const prev = historyFrames[frameIdx - 1] || [];
                    const delta = countNodes(frame) - countNodes(prev);
                    return (
                      <button
                        key={`timeline-${frameIdx}`}
                        type="button"
                        className={`w-full text-left text-xs p-2 border rounded ${playbackIndex === frameIdx ? "border-blue-500" : "border-slate-200 dark:border-slate-700"}`}
                        onClick={() => jumpToHistory(frameIdx)}
                      >
                        Step {frameIdx + 1} · nodes {countNodes(frame)} · diff {delta >= 0 ? `+${delta}` : delta}
                      </button>
                    );
                  })}
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
                    <div className={`${canvasMode === "absolute" ? "relative min-h-[520px]" : "h-96"} overflow-auto p-6 space-y-3 bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:8px_8px]`} onDragOver={(e) => e.preventDefault()}>
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
              <CardDescription>Header/footer nested menu controls backed by Storefront API.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {menuItems.map((item) => renderMenuNodeEditor(item))}
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
