import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../../lib/api";

const parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const renderMenu = (items, subdomain, context, depth = 0) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const visible = items.filter((m) => {
    const customerType = (m.visibility?.customerType || "all").toLowerCase();
    const login = (m.visibility?.login || "any").toLowerCase();
    const device = (m.visibility?.device || "all").toLowerCase();
    if (customerType !== "all" && customerType !== context.customerType) return false;
    if (login === "required" && !context.isLoggedIn) return false;
    if (login === "guest" && context.isLoggedIn) return false;
    if (device !== "all" && device !== context.device) return false;
    const ruleJson = m.visibility?.ruleJson;
    if (ruleJson) {
      try {
        const parsed = JSON.parse(ruleJson);
        const conditions = Array.isArray(parsed?.conditions) ? parsed.conditions : [];
        const mode = (parsed?.mode || "all").toLowerCase();
        const checks = conditions.map((c) => {
          const field = String(c?.field || "").trim();
          const op = String(c?.op || "eq").trim().toLowerCase();
          const value = String(c?.value || "").trim().toLowerCase();
          const current = String(context[field] ?? "").toLowerCase();
          return op === "neq" ? current !== value : current === value;
        });
        const ok = mode === "any" ? checks.some(Boolean) : checks.every(Boolean);
        if (!ok) return false;
      } catch {
        return false;
      }
    }
    return true;
  });
  if (visible.length === 0) return null;
  return (
    <ul className={`flex ${depth > 0 ? "flex-col gap-1 mt-1 ml-4 border-l pl-3" : "items-center gap-4"} text-sm`}>
      {visible.map((m, idx) => (
        <li key={`${m.path || "link"}-${m.label || "item"}-${idx}`} className="text-slate-600">
          <Link to={`/s/${subdomain}${m.path === "/" ? "" : (m.path || "")}`} className="hover:text-slate-900">
            {m.label || "Link"}
          </Link>
          {renderMenu(m.children || [], subdomain, context, depth + 1)}
        </li>
      ))}
    </ul>
  );
};

export default function StorefrontPublic() {
  const { subdomain } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(null);
  const [error, setError] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [listLayout, setListLayout] = useState("grid");
  const [cart, setCart] = useState([]);

  const slug = useMemo(() => {
    const path = location.pathname.replace(`/s/${subdomain}`, "").replace(/^\//, "");
    return path || "";
  }, [location.pathname, subdomain]);

  useEffect(() => {
    const run = async () => {
      try {
        const query = new URLSearchParams(location.search);
        const previewThemeId = query.get("previewThemeId");
        const res = await api.get(`/public/storefront/${subdomain}`, { params: previewThemeId ? { previewThemeId } : {} });
        setData(res.data);
        setError("");
      } catch {
        setError("Store not found.");
      }
    };
    run();
  }, [subdomain, location.search]);

  useEffect(() => {
    const run = async () => {
      if (!slug) {
        setPage(null);
        return;
      }
      try {
        const res = await api.get(`/public/storefront/${subdomain}/pages/${slug}`);
        setPage(res.data);
      } catch {
        setPage({ title: "Page not found", content: "" });
      }
    };
    run();
  }, [slug, subdomain]);

  if (error) return <div className="min-h-screen p-10">{error}</div>;
  if (!data) return <div className="min-h-screen p-10">Loading storefront...</div>;

  const menu = parseJsonArray(data.navigation?.itemsJson);
  const sections = parseJsonArray(data.homepage?.sectionsJson);
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const showPricing = !!data.theme?.showPricing;
  const wholesaleMode = ["wholesale", "hybrid"].includes((data.theme?.catalogMode || "retail").toLowerCase());
  const device = /Mobi|Android|iPhone/i.test(navigator.userAgent)
    ? "mobile"
    : /iPad|Tablet/i.test(navigator.userAgent)
      ? "tablet"
      : "desktop";
  const customerType = (new URLSearchParams(location.search).get("customerType") || "retail").toLowerCase();
  const isLoggedIn = (new URLSearchParams(location.search).get("loggedIn") || "false").toLowerCase() === "true";
  let defaultMoq = 10;
  let packSize = 1;
  try {
    const cfg = JSON.parse(data.theme?.catalogVisibilityJson || "{}");
    if (Number(cfg.defaultMoq) > 0) defaultMoq = Number(cfg.defaultMoq);
    if (Number(cfg.packSize) > 0) packSize = Number(cfg.packSize);
  } catch {
    // ignore invalid config
  }
  const filteredProducts = (data.products || []).filter((p) => categoryId === "all" || p.categoryId === categoryId);
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);
  const cartTotal = cart.reduce((n, i) => n + (Number(i.price || 0) * i.quantity), 0);
  const typographyPack = (data.theme?.activeTheme?.typographyPack || "modern-sans").toLowerCase();
  const layoutVariant = (data.theme?.activeTheme?.layoutVariant || "default").toLowerCase();
  let runtimePackage = {};
  try {
    runtimePackage = JSON.parse(data.theme?.activeTheme?.runtimePackageJson || "{}");
  } catch {
    runtimePackage = {};
  }
  const fontFamily = typographyPack === "merchant-serif"
    ? "Georgia, Cambria, 'Times New Roman', Times, serif"
    : typographyPack === "luxury-display"
      ? "'Trebuchet MS', 'Segoe UI', sans-serif"
      : "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const addToCart = (product, qty = 1) => {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.id === product.id);
      if (idx < 0) return [...prev, { id: product.id, title: product.title, price: Number(product.price || 0), quantity: qty }];
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
      return next;
    });
  };

  const submitQuote = async (product) => {
    const name = window.prompt("Your name");
    if (!name) return;
    const email = window.prompt("Your email");
    if (!email) return;
    const phone = window.prompt("Your phone");
    if (!phone) return;
    const message = window.prompt("Message (optional)") || `Need quote for ${product.title}`;
    try {
      await api.post(`/public/storefront/${subdomain}/quote-inquiries`, {
        productId: product.id,
        name,
        email,
        phone,
        message,
      });
      window.alert("Quote request submitted.");
    } catch {
      window.alert("Could not submit quote request.");
    }
  };

  const checkout = async () => {
    const name = window.prompt("Checkout: Your name");
    if (!name) return;
    const email = window.prompt("Checkout: Your email");
    if (!email) return;
    const phone = window.prompt("Checkout: Your phone");
    if (!phone) return;
    const paymentMethod = window.prompt("Payment method (cod/upi/card)", "cod") || "cod";
    try {
      const res = await api.post(`/public/storefront/${subdomain}/checkout`, {
        name,
        email,
        phone,
        paymentMethod,
        items: cart.map((x) => ({ productId: x.id, quantity: x.quantity })),
      });
      window.alert(`Order created: ${res.data?.orderId}`);
      setCart([]);
    } catch {
      window.alert("Checkout failed.");
    }
  };

  return (
    <div className={`min-h-screen bg-white text-slate-900 ${layoutVariant === "immersive" ? "bg-slate-50" : ""}`} style={{ fontFamily }}>
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {data.theme?.logoUrl ? <img src={data.theme.logoUrl} alt={data.store?.name} className="h-8 w-8 rounded" /> : null}
            <h1 className="text-xl font-bold">{data.store?.name}</h1>
            {data.previewThemeId ? <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">Preview Mode</span> : null}
          </div>
          <nav>{renderMenu(menu.length ? menu : [{ label: "Home", path: "/" }], subdomain, { customerType, isLoggedIn, device })}</nav>
        </div>
      </header>

      {!slug ? (
        <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {sections.length > 0 ? (
            <section className="grid gap-3">
              {sections.map((s, idx) => (
                <div key={`${s.type}-${idx}`} className="rounded-xl bg-slate-100 px-4 py-3">{s.title || s.type || "Section"}</div>
              ))}
            </section>
          ) : null}

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold">Products</h2>
              <div className="flex items-center gap-2">
                <select className="h-9 rounded border px-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className={`px-2 py-1 rounded border text-xs ${listLayout === "grid" ? "bg-slate-900 text-white" : ""}`} onClick={() => setListLayout("grid")}>Grid</button>
                <button className={`px-2 py-1 rounded border text-xs ${listLayout === "list" ? "bg-slate-900 text-white" : ""}`} onClick={() => setListLayout("list")}>List</button>
              </div>
            </div>
            <div className={listLayout === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-4 gap-4" : "space-y-3"}>
              {filteredProducts.map((p) => (
                <div key={p.id} className={`border p-3 ${runtimePackage.cardStyle === "sharp" ? "rounded-md" : "rounded-xl"} ${layoutVariant === "minimal" ? "shadow-sm" : ""}`}>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                  <p className="text-sm mt-2 font-semibold">
                    {showPricing ? `${p.currency || "INR"} ${Number(p.price || 0).toLocaleString()}` : "Login to view price"}
                  </p>
                  {wholesaleMode ? <p className="text-xs text-amber-700 mt-1">MOQ {defaultMoq}+ · Pack size {packSize} · Bulk pricing available</p> : null}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className="text-xs px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
                      onClick={() => addToCart(p, wholesaleMode ? defaultMoq : 1)}
                    >
                      Add to cart
                    </button>
                  </div>
                  {wholesaleMode ? <button className="mt-2 text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50" onClick={() => submitQuote(p)}>Request Quote</button> : null}
                </div>
              ))}
            </div>
          </section>
        </main>
      ) : (
        <main className="max-w-3xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-4">{page?.title}</h2>
          <div className="prose prose-slate max-w-none whitespace-pre-wrap">{page?.content}</div>
        </main>
      )}
      {cartCount > 0 ? (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur z-40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{cartCount} item(s) · INR {cartTotal.toLocaleString()}</p>
            <button className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700" onClick={checkout}>Checkout</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
