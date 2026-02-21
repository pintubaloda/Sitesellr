import { useCallback, useEffect, useMemo, useState } from "react";
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

const sanitizeRuntimePackage = (value) => {
  let parsed = {};
  try {
    parsed = JSON.parse(value || "{}");
  } catch {
    parsed = {};
  }
  // Storefront runtime isolation: only allowlisted keys are honored.
  return {
    cardStyle: parsed.cardStyle === "sharp" ? "sharp" : "rounded",
    heroStyle: parsed.heroStyle === "split" ? "split" : "default",
    plpDensity: parsed.plpDensity === "compact" ? "compact" : "comfortable",
    pdpLayout: parsed.pdpLayout === "stacked" ? "stacked" : "split",
  };
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
    <ul className={`flex ${depth > 0 ? "flex-col gap-2 mt-2 ml-5 border-l border-slate-200 pl-3" : "items-center gap-5"} text-sm`}>
      {visible.map((m, idx) => (
        <li key={`${m.path || "link"}-${m.label || "item"}-${idx}`} className="text-slate-600">
          <Link to={`/s/${subdomain}${m.path === "/" ? "" : (m.path || "")}`} className="hover:text-slate-900 font-medium">
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
  const [search, setSearch] = useState("");
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    paymentMethod: "cod"
  });
  const [indiaStates, setIndiaStates] = useState([]);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [reservation, setReservation] = useState({ id: "", cartKey: "", loading: false, message: "" });
  const [authForm, setAuthForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [authMode, setAuthMode] = useState("login");
  const [authState, setAuthState] = useState({ loading: true, authenticated: false, customer: null, message: "" });
  const [securityForm, setSecurityForm] = useState({ email: "", otp: "", token: "", newPassword: "" });
  const [sessions, setSessions] = useState([]);

  const slug = useMemo(() => {
    const path = location.pathname.replace(`/s/${subdomain}`, "").replace(/^\//, "");
    return path || "";
  }, [location.pathname, subdomain]);
  const slugParts = slug.split("/").filter(Boolean);
  const mode = !slug ? "home" : slug === "cart" ? "cart" : slug === "checkout" ? "checkout" : slug === "login" ? "login" : slugParts[0] === "products" && slugParts[1] ? "pdp" : "page";

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get("/meta/india-states");
        setIndiaStates(Array.isArray(res.data?.states) ? res.data.states : []);
      } catch {
        setIndiaStates([]);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const query = new URLSearchParams(location.search);
        const previewThemeId = query.get("previewThemeId");
        const storeId = query.get("storeId");
        const params = {};
        if (previewThemeId) params.previewThemeId = previewThemeId;
        if (storeId) params.storeId = storeId;
        const res = await api.get(`/public/storefront/${subdomain}`, { params });
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
        const query = new URLSearchParams(location.search);
        const storeId = query.get("storeId");
        const res = await api.get(`/public/storefront/${subdomain}/pages/${slug}`, {
          params: storeId ? { storeId } : {},
        });
        setPage(res.data);
      } catch {
        setPage({ title: "Page not found", content: "" });
      }
    };
    run();
  }, [slug, subdomain]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get(`/public/storefront/${subdomain}/customer-auth/me`, { withCredentials: true });
        setAuthState({ loading: false, authenticated: !!res.data?.authenticated, customer: res.data?.customer || null, message: "" });
      } catch {
        setAuthState({ loading: false, authenticated: false, customer: null, message: "" });
      }
    };
    run();
  }, [subdomain]);

  const menu = parseJsonArray(data?.navigation?.itemsJson);
  const sections = parseJsonArray(data?.homepage?.sectionsJson);
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  const showPricing = !!data?.theme?.showPricing;
  const wholesaleMode = ["wholesale", "hybrid"].includes((data?.theme?.catalogMode || "retail").toLowerCase());
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
    const cfg = JSON.parse(data?.theme?.catalogVisibilityJson || "{}");
    if (Number(cfg.defaultMoq) > 0) defaultMoq = Number(cfg.defaultMoq);
    if (Number(cfg.packSize) > 0) packSize = Number(cfg.packSize);
  } catch {
    // ignore invalid config
  }
  const filteredProducts = (data?.products || []).filter((p) => categoryId === "all" || p.categoryId === categoryId);
  const searchedProducts = filteredProducts.filter((p) =>
    search.trim() ? `${p.title} ${p.description || ""}`.toLowerCase().includes(search.toLowerCase()) : true
  );
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);
  const cartTotal = cart.reduce((n, i) => n + (Number(i.price || 0) * i.quantity), 0);
  const cartKey = useMemo(
    () =>
      cart
        .slice()
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
        .map((x) => `${x.id}:${x.quantity}`)
        .join("|"),
    [cart]
  );
  const typographyPack = (data?.theme?.activeTheme?.typographyPack || "modern-sans").toLowerCase();
  const layoutVariant = (data?.theme?.activeTheme?.layoutVariant || "default").toLowerCase();
  const runtimePackage = sanitizeRuntimePackage(data?.theme?.activeTheme?.runtimePackageJson || "{}");
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

  const resolveCategoryVariant = (variantsJson, categoryId) => {
    try {
      const parsed = JSON.parse(variantsJson || "[]");
      const rows = Array.isArray(parsed) ? parsed : [];
      const category = categories.find((c) => c.id === categoryId);
      const categorySlug = (category?.slug || "").toLowerCase();
      const categoryName = (category?.name || "").toLowerCase();
      const direct = rows.find((x) => String(x?.categoryId || "").toLowerCase() === String(categoryId || "").toLowerCase());
      if (direct?.variant) return String(direct.variant).toLowerCase();
      const bySlug = rows.find((x) => String(x?.category || "").toLowerCase() === categorySlug || String(x?.category || "").toLowerCase() === categoryName);
      if (bySlug?.variant) return String(bySlug.variant).toLowerCase();
      const fallback = rows.find((x) => String(x?.category || "").toLowerCase() === "default");
      return String(fallback?.variant || "default").toLowerCase();
    } catch {
      return "default";
    }
  };

  const updateCartQty = (id, quantity) => {
    setCart((prev) => prev
      .map((x) => (x.id === id ? { ...x, quantity: Math.max(1, quantity) } : x))
      .filter((x) => x.quantity > 0));
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((x) => x.id !== id));
  };

  const releaseReservation = useCallback(
    async (targetId) => {
      const reservationId = targetId || reservation.id;
      if (!reservationId) return;
      try {
        await api.post(`/public/storefront/${subdomain}/cart/release`, { reservationId });
      } catch {
        // no-op
      }
      setReservation((prev) => (prev.id === reservationId ? { id: "", cartKey: "", loading: false, message: "" } : prev));
    },
    [reservation.id, subdomain]
  );

  const reserveStock = useCallback(
    async (force = false) => {
      if (!cart.length) {
        setReservation({ id: "", cartKey: "", loading: false, message: "Cart is empty." });
        return false;
      }
      if (!force && reservation.id && reservation.cartKey === cartKey) return true;
      setReservation((prev) => ({ ...prev, loading: true, message: "Reserving stock..." }));
      if (reservation.id && reservation.cartKey !== cartKey) {
        await releaseReservation(reservation.id);
      }
      try {
        const res = await api.post(`/public/storefront/${subdomain}/cart/reserve`, {
          items: cart.map((x) => ({ productId: x.id, quantity: x.quantity })),
        });
        setReservation({
          id: res.data?.reservationId || "",
          cartKey,
          loading: false,
          message: "Stock reserved for checkout.",
        });
        return true;
      } catch (err) {
        const apiError = err?.response?.data?.error;
        setReservation({
          id: "",
          cartKey: "",
          loading: false,
          message: apiError === "stock_unavailable" ? "Some items are out of stock." : "Could not reserve stock.",
        });
        return false;
      }
    },
    [cart, cartKey, releaseReservation, reservation.cartKey, reservation.id, subdomain]
  );

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
    if (!checkoutForm.name || !checkoutForm.email || !checkoutForm.phone) {
      setCheckoutMessage("Fill name, email, and phone.");
      return;
    }
    if (!checkoutForm.addressLine1 || !checkoutForm.city || !checkoutForm.state || !checkoutForm.postalCode) {
      setCheckoutMessage("Fill complete shipping address.");
      return;
    }
    const reserved = await reserveStock();
    if (!reserved) {
      setCheckoutMessage("Stock reservation failed. Update cart and retry.");
      return;
    }
    try {
      const res = await api.post(`/public/storefront/${subdomain}/checkout`, {
        name: checkoutForm.name,
        email: checkoutForm.email,
        phone: checkoutForm.phone,
        addressLine1: checkoutForm.addressLine1,
        addressLine2: checkoutForm.addressLine2,
        city: checkoutForm.city,
        state: checkoutForm.state,
        postalCode: checkoutForm.postalCode,
        paymentMethod: checkoutForm.paymentMethod,
        items: cart.map((x) => ({ productId: x.id, quantity: x.quantity })),
      });
      setCheckoutMessage(`Order created: ${res.data?.orderId}`);
      await releaseReservation();
      setCart([]);
    } catch {
      setCheckoutMessage("Checkout failed.");
    }
  };

  useEffect(() => {
    if (!cart.length && reservation.id) {
      releaseReservation(reservation.id);
    }
  }, [cart.length, releaseReservation, reservation.id]);

  useEffect(() => {
    if (mode === "checkout" && cart.length) {
      reserveStock();
    }
  }, [cart.length, mode, reserveStock]);

  const customerAuthSubmit = async () => {
    const endpoint = authMode === "register" ? "register" : "login";
    try {
      const payload = authMode === "register"
        ? { name: authForm.name, email: authForm.email, phone: authForm.phone, password: authForm.password }
        : { email: authForm.email, password: authForm.password };
      const res = await api.post(`/public/storefront/${subdomain}/customer-auth/${endpoint}`, payload, { withCredentials: true });
      if (authMode === "register") {
        setAuthState((s) => ({ ...s, message: "Registered. You can log in now." }));
        setAuthMode("login");
      } else {
        setAuthState({ loading: false, authenticated: !!res.data?.authenticated, customer: res.data?.customer || null, message: "Logged in." });
      }
    } catch (err) {
      setAuthState((s) => ({ ...s, message: err?.response?.data?.error || "Authentication failed." }));
    }
  };

  const customerLogout = async () => {
    try {
      await api.post(`/public/storefront/${subdomain}/customer-auth/logout`, {}, { withCredentials: true });
    } catch {
      // ignore
    }
    setAuthState({ loading: false, authenticated: false, customer: null, message: "Logged out." });
  };

  const verifyEmailOtp = async () => {
    try {
      await api.post(`/public/storefront/${subdomain}/customer-auth/verify-email`, { email: securityForm.email || authForm.email, otp: securityForm.otp });
      setAuthState((s) => ({ ...s, message: "Email verified. Login now." }));
    } catch (err) {
      setAuthState((s) => ({ ...s, message: err?.response?.data?.error || "Email verification failed." }));
    }
  };

  const forgotPassword = async () => {
    try {
      const res = await api.post(`/public/storefront/${subdomain}/customer-auth/forgot-password`, { email: securityForm.email || authForm.email });
      setAuthState((s) => ({ ...s, message: `Reset token: ${res.data?.resetToken || "sent"}` }));
    } catch (err) {
      setAuthState((s) => ({ ...s, message: err?.response?.data?.error || "Could not start reset." }));
    }
  };

  const resetPassword = async () => {
    try {
      await api.post(`/public/storefront/${subdomain}/customer-auth/reset-password`, { token: securityForm.token, newPassword: securityForm.newPassword });
      setAuthState((s) => ({ ...s, message: "Password reset complete." }));
    } catch (err) {
      setAuthState((s) => ({ ...s, message: err?.response?.data?.error || "Could not reset password." }));
    }
  };

  const loadSessions = async () => {
    try {
      const res = await api.get(`/public/storefront/${subdomain}/customer-auth/sessions`, { withCredentials: true });
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSessions([]);
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      await api.delete(`/public/storefront/${subdomain}/customer-auth/sessions/${sessionId}`, { withCredentials: true });
      await loadSessions();
    } catch {
      // ignore
    }
  };

  const pdp = mode === "pdp" ? (data?.products || []).find((x) => x.id === slugParts[1]) : null;
  const tokens = (() => {
    try {
      return JSON.parse(data?.theme?.designTokensJson || "{}");
    } catch {
      return {};
    }
  })();
  const primary = tokens.primaryColor || "#2563eb";
  const accent = tokens.accentColor || "#f59e0b";
  const plpVariant = resolveCategoryVariant(data?.theme?.activeTheme?.plpVariantsJson, categoryId === "all" ? categories[0]?.id : categoryId);
  const pdpVariant = pdp ? resolveCategoryVariant(data?.theme?.activeTheme?.pdpVariantsJson, pdp.categoryId) : "default";

  if (error) return <div className="min-h-screen p-10">{error}</div>;
  if (!data) return <div className="min-h-screen p-10">Loading storefront...</div>;

  return (
    <div className={`min-h-screen bg-white text-slate-900 ${layoutVariant === "immersive" ? "bg-slate-50" : ""}`} style={{ fontFamily }}>
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="bg-slate-900 text-white text-xs py-2 px-4 text-center">Free shipping on orders over INR 999 • Fast India-wide delivery</div>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {data?.theme?.logoUrl ? <img src={data.theme.logoUrl} alt={data?.store?.name} className="h-9 w-9 rounded-md object-cover border" /> : null}
            <Link to={`/s/${subdomain}`} className="text-xl font-bold truncate">{data?.store?.name}</Link>
            {data?.previewThemeId ? <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">Preview Mode</span> : null}
          </div>
          <div className="hidden lg:block flex-1 max-w-xl">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full h-10 px-4 rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <nav className="hidden md:block">{renderMenu(menu.length ? menu : [{ label: "Home", path: "/" }], subdomain, { customerType, isLoggedIn, device })}</nav>
          <div className="flex items-center gap-2">
            {authState.authenticated ? (
              <button type="button" onClick={customerLogout} className="text-sm px-3 py-2 border rounded-lg hover:bg-slate-50">Logout</button>
            ) : (
              <Link to={`/s/${subdomain}/login`} className="text-sm px-3 py-2 border rounded-lg hover:bg-slate-50">Login</Link>
            )}
            <Link to={`/s/${subdomain}/cart`} className="text-sm px-3 py-2 rounded-lg text-white" style={{ backgroundColor: primary }}>Cart ({cartCount})</Link>
          </div>
        </div>
      </header>

      {mode === "home" ? (
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          <section className="rounded-2xl overflow-hidden grid lg:grid-cols-2 border border-slate-200">
            <div className="p-8 lg:p-12 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
              <p className="uppercase text-xs tracking-[0.2em] mb-4 opacity-90">New collection</p>
              <h2 className="text-3xl lg:text-5xl font-bold leading-tight">Build your brand with a conversion-ready storefront</h2>
              <p className="mt-4 text-white/90 max-w-md">Professional ecommerce theme with fast PLP/PDP flows, quote for wholesale, and checkout built for Indian commerce.</p>
              <div className="mt-6 flex gap-3">
                <a href="#products" className="px-5 py-3 rounded-xl bg-white text-slate-900 font-semibold">Shop now</a>
                <Link to={`/s/${subdomain}/pages/about`} className="px-5 py-3 rounded-xl border border-white/40 font-semibold">Brand story</Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50">
              {(searchedProducts || []).slice(0, 4).map((p) => (
                <Link to={`/s/${subdomain}/products/${p.id}`} key={p.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition">
                  <div className="h-28 rounded-lg bg-slate-100 mb-3" />
                  <p className="text-sm font-semibold line-clamp-1">{p.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{showPricing ? `${p.currency || "INR"} ${Number(p.price || 0).toLocaleString()}` : "Login to view price"}</p>
                </Link>
              ))}
            </div>
          </section>

          {sections.length > 0 ? (
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {sections.map((s, idx) => (
                <div key={`${s.type}-${idx}`} className="rounded-xl bg-white border border-slate-200 px-4 py-4">
                  <p className="text-xs uppercase text-slate-400 tracking-wide">{s.type || "Section"}</p>
                  <p className="mt-2 text-sm font-semibold">{s.title || "Content block"}</p>
                </div>
              ))}
            </section>
          ) : null}

          <section id="products">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-2xl font-bold">Featured products</h2>
              <div className="flex items-center gap-2">
                <select className="h-9 rounded border px-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className={`px-2 py-1 rounded border text-xs ${listLayout === "grid" ? "bg-slate-900 text-white" : ""}`} onClick={() => setListLayout("grid")}>Grid</button>
                <button className={`px-2 py-1 rounded border text-xs ${listLayout === "list" ? "bg-slate-900 text-white" : ""}`} onClick={() => setListLayout("list")}>List</button>
              </div>
            </div>
            <div className={listLayout === "grid" ? (plpVariant === "magazine" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-5" : "grid sm:grid-cols-2 lg:grid-cols-4 gap-4") : "space-y-3"}>
              {searchedProducts.map((p) => (
                <div key={p.id} className={`border p-3 bg-white ${runtimePackage.cardStyle === "sharp" ? "rounded-md" : "rounded-xl"} ${layoutVariant === "minimal" ? "shadow-sm" : "hover:shadow-lg"} transition ${plpVariant === "magazine" ? "lg:p-5" : ""}`}>
                  <Link to={`/s/${subdomain}/products/${p.id}`} className="block h-40 rounded-lg bg-slate-100 mb-3" />
                  <Link to={`/s/${subdomain}/products/${p.id}`} className="font-medium hover:text-blue-700">{p.title}</Link>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-8">{p.description}</p>
                  <p className="text-sm mt-2 font-semibold">
                    {showPricing ? `${p.currency || "INR"} ${Number(p.price || 0).toLocaleString()}` : "Login to view price"}
                  </p>
                  {wholesaleMode ? <p className="text-xs text-amber-700 mt-1">MOQ {defaultMoq}+ · Pack size {packSize} · Bulk pricing available</p> : null}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className="text-xs px-3 py-1.5 rounded-md text-white"
                      style={{ backgroundColor: primary }}
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
      ) : mode === "pdp" && pdp ? (
        <main className={`max-w-7xl mx-auto px-4 py-8 grid gap-8 ${pdpVariant === "stacked" ? "lg:grid-cols-1" : "lg:grid-cols-2"}`}>
          <div className="rounded-2xl border bg-slate-100 min-h-[420px]" />
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Product details</p>
            <h2 className="text-3xl font-bold mt-2">{pdp.title}</h2>
            <p className="text-slate-600 mt-4 whitespace-pre-wrap">{pdp.description}</p>
            <p className="text-2xl font-bold mt-6">{showPricing ? `${pdp.currency || "INR"} ${Number(pdp.price || 0).toLocaleString()}` : "Login to view price"}</p>
            {wholesaleMode ? <p className="text-sm text-amber-700 mt-2">MOQ {defaultMoq}+ units • Pack size {packSize} • Bulk tier pricing available</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="px-5 py-3 rounded-xl text-white font-medium" style={{ backgroundColor: primary }} onClick={() => addToCart(pdp, wholesaleMode ? defaultMoq : 1)}>Add to cart</button>
              {wholesaleMode ? <button className="px-5 py-3 rounded-xl border font-medium" onClick={() => submitQuote(pdp)}>Request Quote</button> : null}
              <Link className="px-5 py-3 rounded-xl border font-medium" to={`/s/${subdomain}/checkout`}>Buy now</Link>
            </div>
          </div>
        </main>
      ) : mode === "cart" ? (
        <main className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-4">Your cart</h2>
          {cart.length === 0 ? <p className="text-slate-600">Your cart is empty.</p> : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="rounded-xl border bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-500">INR {Number(item.price || 0).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="h-8 w-8 rounded border" onClick={() => updateCartQty(item.id, item.quantity - 1)}>-</button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button className="h-8 w-8 rounded border" onClick={() => updateCartQty(item.id, item.quantity + 1)}>+</button>
                  </div>
                  <button className="text-sm text-red-600 hover:underline" onClick={() => removeFromCart(item.id)}>Remove</button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t">
                <p className="font-semibold">Total: INR {cartTotal.toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-4 py-2.5 rounded-lg border"
                    onClick={() => reserveStock(true)}
                    disabled={reservation.loading}
                  >
                    {reservation.loading ? "Reserving..." : "Reserve stock"}
                  </button>
                  <Link to={`/s/${subdomain}/checkout`} className="px-5 py-2.5 rounded-lg text-white" style={{ backgroundColor: primary }}>Continue to checkout</Link>
                </div>
              </div>
              {reservation.message ? <p className="text-sm text-slate-600">{reservation.message}</p> : null}
            </div>
          )}
        </main>
      ) : mode === "checkout" ? (
        <main className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-2">Checkout</h2>
          <p className="text-slate-600 mb-6">Secure checkout with shipping details and payment method.</p>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border bg-white p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <input className="w-full h-11 border rounded-lg px-3" placeholder="Full name" value={checkoutForm.name} onChange={(e) => setCheckoutForm((s) => ({ ...s, name: e.target.value }))} />
                <input className="w-full h-11 border rounded-lg px-3" placeholder="Phone" value={checkoutForm.phone} onChange={(e) => setCheckoutForm((s) => ({ ...s, phone: e.target.value }))} />
              </div>
              <input className="w-full h-11 border rounded-lg px-3" placeholder="Email" value={checkoutForm.email} onChange={(e) => setCheckoutForm((s) => ({ ...s, email: e.target.value }))} />
              <input className="w-full h-11 border rounded-lg px-3" placeholder="Address line 1" value={checkoutForm.addressLine1} onChange={(e) => setCheckoutForm((s) => ({ ...s, addressLine1: e.target.value }))} />
              <input className="w-full h-11 border rounded-lg px-3" placeholder="Address line 2 (optional)" value={checkoutForm.addressLine2} onChange={(e) => setCheckoutForm((s) => ({ ...s, addressLine2: e.target.value }))} />
              <div className="grid sm:grid-cols-3 gap-3">
                <input className="w-full h-11 border rounded-lg px-3" placeholder="City" value={checkoutForm.city} onChange={(e) => setCheckoutForm((s) => ({ ...s, city: e.target.value }))} />
                <select className="w-full h-11 border rounded-lg px-3" value={checkoutForm.state} onChange={(e) => setCheckoutForm((s) => ({ ...s, state: e.target.value }))}>
                  <option value="">Select state</option>
                  {indiaStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                <input className="w-full h-11 border rounded-lg px-3" placeholder="PIN code" value={checkoutForm.postalCode} onChange={(e) => setCheckoutForm((s) => ({ ...s, postalCode: e.target.value }))} />
              </div>
              <select className="w-full h-11 border rounded-lg px-3" value={checkoutForm.paymentMethod} onChange={(e) => setCheckoutForm((s) => ({ ...s, paymentMethod: e.target.value }))}>
                <option value="cod">Cash on Delivery</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
              {reservation.message ? <p className="text-sm text-slate-600">{reservation.message}</p> : null}
              {checkoutMessage ? <p className="text-sm text-slate-600">{checkoutMessage}</p> : null}
            </div>
            <div className="rounded-2xl border bg-white p-5 h-fit">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Order Summary</p>
              <div className="mt-4 space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <p className="truncate pr-3">{item.title} x {item.quantity}</p>
                    <p className="font-medium">INR {(Number(item.price || 0) * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <p className="font-semibold">Payable</p>
                <p className="text-lg font-bold">INR {cartTotal.toLocaleString()}</p>
              </div>
              <button className="mt-4 w-full px-5 py-2.5 rounded-lg text-white font-medium" style={{ backgroundColor: primary }} onClick={checkout}>Place order</button>
              <p className="mt-3 text-xs text-slate-500">By placing order, you agree to store terms and policies.</p>
            </div>
          </div>
        </main>
      ) : mode === "login" ? (
        <main className="max-w-md mx-auto px-4 py-10">
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-2xl font-bold">{authMode === "register" ? "Create customer account" : "Customer login"}</h2>
            <p className="text-sm text-slate-600 mt-1">Secure customer session for order tracking and faster checkout.</p>
            {authState.authenticated ? (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
                Logged in as {authState.customer?.email}
              </div>
            ) : null}
            <div className="mt-5 space-y-3">
              {authMode === "register" ? <input className="w-full h-11 border rounded-lg px-3" placeholder="Full name" value={authForm.name} onChange={(e) => setAuthForm((s) => ({ ...s, name: e.target.value }))} /> : null}
              <input className="w-full h-11 border rounded-lg px-3" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm((s) => ({ ...s, email: e.target.value }))} />
              {authMode === "register" ? <input className="w-full h-11 border rounded-lg px-3" placeholder="Phone" value={authForm.phone} onChange={(e) => setAuthForm((s) => ({ ...s, phone: e.target.value }))} /> : null}
              <input className="w-full h-11 border rounded-lg px-3" placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm((s) => ({ ...s, password: e.target.value }))} />
              <button className="w-full h-11 rounded-lg text-white font-medium" style={{ backgroundColor: primary }} onClick={customerAuthSubmit}>
                {authMode === "register" ? "Register" : "Login"}
              </button>
              <button className="w-full h-10 rounded-lg border font-medium" onClick={() => setAuthMode((m) => (m === "register" ? "login" : "register"))}>
                {authMode === "register" ? "Switch to login" : "Create new account"}
              </button>
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Security tools</p>
                <input className="w-full h-10 border rounded-lg px-3" placeholder="Email for OTP/reset" value={securityForm.email} onChange={(e) => setSecurityForm((s) => ({ ...s, email: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="h-10 border rounded-lg px-3" placeholder="OTP" value={securityForm.otp} onChange={(e) => setSecurityForm((s) => ({ ...s, otp: e.target.value }))} />
                  <button className="h-10 rounded-lg border text-sm" onClick={verifyEmailOtp}>Verify Email</button>
                </div>
                <button className="w-full h-10 rounded-lg border text-sm" onClick={forgotPassword}>Forgot Password</button>
                <div className="grid grid-cols-2 gap-2">
                  <input className="h-10 border rounded-lg px-3" placeholder="Reset token" value={securityForm.token} onChange={(e) => setSecurityForm((s) => ({ ...s, token: e.target.value }))} />
                  <input className="h-10 border rounded-lg px-3" placeholder="New password" type="password" value={securityForm.newPassword} onChange={(e) => setSecurityForm((s) => ({ ...s, newPassword: e.target.value }))} />
                </div>
                <button className="w-full h-10 rounded-lg border text-sm" onClick={resetPassword}>Reset Password</button>
              </div>
              {authState.authenticated ? (
                <div className="border-t pt-3 space-y-2">
                  <button className="w-full h-10 rounded-lg border text-sm" onClick={loadSessions}>Load Active Sessions</button>
                  {sessions.map((s) => (
                    <div key={s.id} className="text-xs p-2 border rounded flex items-center justify-between gap-2">
                      <span className="truncate">{s.userAgent || "session"} · {s.clientIp || "ip"}</span>
                      <button className="text-red-600" onClick={() => revokeSession(s.id)}>Revoke</button>
                    </div>
                  ))}
                </div>
              ) : null}
              {authState.message ? <p className="text-sm text-slate-600">{authState.message}</p> : null}
            </div>
          </div>
        </main>
      ) : (
        <main className="max-w-3xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-4">{page?.title}</h2>
          <div className="prose prose-slate max-w-none whitespace-pre-wrap">{page?.content}</div>
        </main>
      )}
      {cartCount > 0 && mode !== "cart" && mode !== "checkout" ? (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur z-40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{cartCount} item(s) · INR {cartTotal.toLocaleString()}</p>
            <Link className="px-4 py-2 rounded-md text-white text-sm" style={{ backgroundColor: primary }} to={`/s/${subdomain}/checkout`}>Checkout</Link>
          </div>
        </div>
      ) : null}
      <footer className="border-t bg-slate-950 text-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <p className="font-semibold text-white text-base">{data?.store?.name}</p>
            <p className="mt-2 text-slate-400">Professional commerce storefront with retail + wholesale support.</p>
          </div>
          <div>
            <p className="font-semibold text-white">Shop</p>
            <div className="mt-3 space-y-2">
              <Link to={`/s/${subdomain}`} className="block hover:text-white">Home</Link>
              <Link to={`/s/${subdomain}/cart`} className="block hover:text-white">Cart</Link>
              <Link to={`/s/${subdomain}/checkout`} className="block hover:text-white">Checkout</Link>
            </div>
          </div>
          <div>
            <p className="font-semibold text-white">Company</p>
            <div className="mt-3 space-y-2">
              <Link to={`/s/${subdomain}/pages/about`} className="block hover:text-white">About</Link>
              <Link to={`/s/${subdomain}/pages/contact`} className="block hover:text-white">Contact</Link>
              <Link to={`/s/${subdomain}/pages/policy`} className="block hover:text-white">Policy</Link>
            </div>
          </div>
          <div>
            <p className="font-semibold text-white">Newsletter</p>
            <div className="mt-3 flex gap-2">
              <input className="flex-1 h-9 rounded-md px-3 bg-slate-800 border border-slate-700 text-white" placeholder="Email address" />
              <button className="px-3 rounded-md text-white text-xs" style={{ backgroundColor: primary }}>Join</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
