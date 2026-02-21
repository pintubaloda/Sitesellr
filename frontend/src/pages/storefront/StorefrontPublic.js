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

const fallbackHeroImage =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1800&q=80";

const fallbackCategoryImages = [
  "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
];

const isVideoMediaUrl = (url) => {
  const value = String(url || "").toLowerCase();
  return (
    value.endsWith(".mp4") ||
    value.endsWith(".webm") ||
    value.endsWith(".mov") ||
    value.includes("youtube.com") ||
    value.includes("youtu.be") ||
    value.includes("vimeo.com")
  );
};

const parseAttributes = (value) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
};

const productImageUrl = (product) => {
  const media = Array.isArray(product?.media) ? product.media : [];
  const first = media.find((m) => m?.url && !isVideoMediaUrl(m.url));
  return first?.url || "https://placehold.co/1200x1200/F4F4F5/334155?text=Product";
};

const productRating = (id) => {
  const seed = String(id || "")
    .split("")
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (4 + ((seed % 10) / 10)).toFixed(1);
};

const productBadge = (product) => {
  if (Number(product?.compareAtPrice || 0) > Number(product?.price || 0) && Number(product?.price || 0) > 0) return "Sale";
  const createdAt = new Date(product?.createdAt || 0);
  if (!Number.isNaN(createdAt.getTime()) && (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24) < 21) return "New";
  return "Trending";
};

const currencyText = (value, currency = "INR") => `${currency} ${Number(value || 0).toLocaleString("en-IN")}`;

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
  const [sortBy, setSortBy] = useState("popularity");
  const [selectedSize, setSelectedSize] = useState("all");
  const [selectedColor, setSelectedColor] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(50000);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [coupon, setCoupon] = useState("");
  const [shippingMethod, setShippingMethod] = useState("standard");
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
  const [checkoutStatus, setCheckoutStatus] = useState("info");
  const [checkoutAccount, setCheckoutAccount] = useState(null);
  const [reservation, setReservation] = useState({ id: "", cartKey: "", loading: false, message: "" });
  const [authForm, setAuthForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [authMode, setAuthMode] = useState("login");
  const [authState, setAuthState] = useState({ loading: true, authenticated: false, customer: null, message: "" });
  const [securityForm, setSecurityForm] = useState({ email: "", otp: "", token: "", newPassword: "" });
  const [sessions, setSessions] = useState([]);
  const [pdpImage, setPdpImage] = useState(0);
  const [pdpSize, setPdpSize] = useState("");
  const [pdpColor, setPdpColor] = useState("");

  const slug = useMemo(() => {
    const path = location.pathname.replace(`/s/${subdomain}`, "").replace(/^\//, "");
    return path || "";
  }, [location.pathname, subdomain]);
  const slugParts = slug.split("/").filter(Boolean);
  const mode = !slug
    ? "home"
    : slug === "products" || slug === "collections" || slug === "sale"
      ? "catalog"
      : slug === "cart"
        ? "cart"
        : slug === "checkout"
          ? "checkout"
          : slug === "login"
            ? "login"
            : slugParts[0] === "products" && slugParts[1]
              ? "pdp"
              : "page";

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
  const products = Array.isArray(data?.products) ? data.products : [];
  const priceCeiling = useMemo(() => {
    const maxPrice = products.reduce((max, p) => Math.max(max, Number(p?.price || 0)), 0);
    return maxPrice > 0 ? Math.ceil(maxPrice / 500) * 500 : 50000;
  }, [products]);
  useEffect(() => {
    if (priceMax > priceCeiling) setPriceMax(priceCeiling);
    if (priceMin > priceCeiling) setPriceMin(0);
  }, [priceCeiling, priceMax, priceMin]);

  const catalogMeta = useMemo(() => {
    const sizeSet = new Set();
    const colorSet = new Set();
    const brandSet = new Set();
    products.forEach((p) => {
      const variants = Array.isArray(p?.variants) ? p.variants : [];
      variants.forEach((v) => {
        const attrs = parseAttributes(v?.attributesJson);
        const size = String(attrs.size || attrs.Size || "").trim();
        const color = String(attrs.color || attrs.Color || "").trim();
        if (size) sizeSet.add(size);
        if (color) colorSet.add(color);
      });
      const brand = String(p?.categoryName || "").trim();
      if (brand) brandSet.add(brand);
    });
    const sizeList = Array.from(sizeSet);
    const colorList = Array.from(colorSet);
    const brandList = Array.from(brandSet);
    if (sizeList.length === 0) ["XS", "S", "M", "L", "XL"].forEach((s) => sizeList.push(s));
    if (colorList.length === 0) ["Black", "White", "Blue", "Olive", "Brown"].forEach((c) => colorList.push(c));
    if (brandList.length === 0) categories.slice(0, 6).forEach((c) => brandList.push(c.name));
    return { sizeList, colorList, brandList };
  }, [products, categories]);

  const searchedProducts = useMemo(() => {
    const visible = products
      .filter((p) => categoryId === "all" || p.categoryId === categoryId)
      .filter((p) => (slug === "sale" ? Number(p?.compareAtPrice || 0) > Number(p?.price || 0) : true))
      .filter((p) => {
        const haystack = `${p.title || ""} ${p.description || ""}`.toLowerCase();
        return search.trim() ? haystack.includes(search.toLowerCase()) : true;
      })
      .filter((p) => {
        const price = Number(p?.price || 0);
        return price >= Number(priceMin || 0) && price <= Number(priceMax || priceCeiling);
      })
      .filter((p) => {
        if (selectedBrand === "all") return true;
        return String(p?.categoryName || "").toLowerCase() === selectedBrand.toLowerCase();
      })
      .filter((p) => {
        if (selectedSize === "all" && selectedColor === "all") return true;
        const variants = Array.isArray(p?.variants) ? p.variants : [];
        return variants.some((v) => {
          const attrs = parseAttributes(v?.attributesJson);
          const size = String(attrs.size || attrs.Size || "").trim().toLowerCase();
          const color = String(attrs.color || attrs.Color || "").trim().toLowerCase();
          const sizeOk = selectedSize === "all" || size === selectedSize.toLowerCase();
          const colorOk = selectedColor === "all" || color === selectedColor.toLowerCase();
          return sizeOk && colorOk;
        });
      });
    const sorted = [...visible];
    if (sortBy === "price_asc") sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    else if (sortBy === "price_desc") sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    else if (sortBy === "newest") sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    else sorted.sort((a, b) => Number(productRating(b.id)) - Number(productRating(a.id)));
    return sorted;
  }, [
    categoryId,
    search,
    priceMin,
    priceMax,
    priceCeiling,
    selectedBrand,
    selectedColor,
    selectedSize,
    sortBy,
    slug,
    products,
  ]);

  const defaultMenu = [
    { label: "Men", path: "/products" },
    { label: "Women", path: "/products" },
    { label: "Kids", path: "/products" },
    { label: "Collections", path: "/collections" },
    { label: "Sale", path: "/sale" },
  ];
  const navItems = menu.length ? menu : defaultMenu;
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);
  const cartTotal = cart.reduce((n, i) => n + (Number(i.price || 0) * i.quantity), 0);
  const discountAmount = coupon.trim().toLowerCase() === "welcome10" ? Math.round(cartTotal * 0.1) : 0;
  const shippingAmount = shippingMethod === "express" ? 149 : 0;
  const payableTotal = Math.max(0, cartTotal + shippingAmount - discountAmount);
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
    setCheckoutAccount(null);
    if (!checkoutForm.name || !checkoutForm.email || !checkoutForm.phone) {
      setCheckoutStatus("error");
      setCheckoutMessage("Fill name, email, and phone.");
      return;
    }
    if (!checkoutForm.addressLine1 || !checkoutForm.city || !checkoutForm.state || !checkoutForm.postalCode) {
      setCheckoutStatus("error");
      setCheckoutMessage("Fill complete shipping address.");
      return;
    }
    const reserved = await reserveStock();
    if (!reserved) {
      setCheckoutStatus("error");
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
      setCheckoutStatus("success");
      setCheckoutMessage(`Order created: ${res.data?.orderId}`);
      if (res.data?.account?.created) {
        setCheckoutAccount({
          email: res.data?.account?.email,
          password: res.data?.account?.password,
        });
        window.setTimeout(() => {
          window.location.href = `/s/${subdomain}/login`;
        }, 1800);
      }
      await releaseReservation();
      setCart([]);
    } catch (err) {
      const apiError = err?.response?.data;
      const validationErrors = apiError?.errors;
      if (validationErrors && typeof validationErrors === "object") {
        const firstField = Object.keys(validationErrors)[0];
        const firstMessage = Array.isArray(validationErrors[firstField]) ? validationErrors[firstField][0] : "";
        setCheckoutStatus("error");
        setCheckoutMessage(firstMessage || "Please check checkout form fields.");
        return;
      }
      if (apiError?.error === "login_required_existing_customer") {
        setCheckoutStatus("warn");
        setCheckoutMessage("This email/mobile already exists. Please login to continue checkout.");
        return;
      }
      if (apiError?.error === "invalid_state") {
        setCheckoutStatus("error");
        setCheckoutMessage("Please select a valid Indian state.");
        return;
      }
      if (apiError?.error === "address_required") {
        setCheckoutStatus("error");
        setCheckoutMessage("Shipping address is required.");
        return;
      }
      setCheckoutStatus("error");
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
  const pdpVariant = pdp ? resolveCategoryVariant(data?.theme?.activeTheme?.pdpVariantsJson, pdp.categoryId) : "default";
  const pdpMedia = pdp
    ? (Array.isArray(pdp.media) && pdp.media.length ? pdp.media : [{ url: productImageUrl(pdp), sortOrder: 0 }])
    : [];
  const pdpVariantRows = pdp && Array.isArray(pdp.variants) ? pdp.variants : [];
  const pdpSizes = Array.from(new Set(pdpVariantRows.map((v) => String(parseAttributes(v.attributesJson).size || parseAttributes(v.attributesJson).Size || "").trim()).filter(Boolean)));
  const pdpColors = Array.from(new Set(pdpVariantRows.map((v) => String(parseAttributes(v.attributesJson).color || parseAttributes(v.attributesJson).Color || "").trim()).filter(Boolean)));

  useEffect(() => {
    if (!pdp) return;
    setPdpImage(0);
    setPdpSize((prev) => (pdpSizes.includes(prev) ? prev : (pdpSizes[0] || "")));
    setPdpColor((prev) => (pdpColors.includes(prev) ? prev : (pdpColors[0] || "")));
  }, [pdp, pdpColors, pdpSizes]);

  if (error) return <div className="min-h-screen p-10">{error}</div>;
  if (!data) return <div className="min-h-screen p-10">Loading storefront...</div>;

  return (
    <div className={`min-h-screen bg-white text-slate-900 ${layoutVariant === "immersive" ? "bg-slate-50" : ""}`} style={{ fontFamily }}>
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="bg-slate-950 text-slate-100 text-xs py-2 px-4 text-center">Trusted Shipping • Easy Returns • Secure Shopping</div>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {data?.theme?.logoUrl ? <img src={data.theme.logoUrl} alt={data?.store?.name} className="h-9 w-9 rounded-md object-cover border" /> : null}
            <Link to={`/s/${subdomain}`} className="text-xl font-bold truncate">{data?.store?.name}</Link>
            {data?.previewThemeId ? <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">Preview Mode</span> : null}
          </div>
          <div className="hidden lg:flex flex-1 max-w-xl">
            <div className="w-full h-10 px-4 rounded-full border border-slate-200 bg-slate-50 flex items-center gap-2">
              <span className="text-slate-400 text-sm">🔎</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="What are you looking for?" className="w-full bg-transparent focus:outline-none text-sm" />
            </div>
          </div>
          <nav className="hidden md:block">{renderMenu(navItems, subdomain, { customerType, isLoggedIn, device })}</nav>
          <div className="flex items-center gap-2">
            {authState.authenticated ? (
              <button type="button" onClick={customerLogout} className="text-sm px-3 py-2 border rounded-lg hover:bg-slate-50">Logout</button>
            ) : (
              <Link to={`/s/${subdomain}/login`} className="text-sm px-3 py-2 border rounded-lg hover:bg-slate-50">Login</Link>
            )}
            <Link to={`/s/${subdomain}/cart`} className="text-sm px-3 py-2 rounded-lg border bg-white hover:bg-slate-50">🛒 {cartCount}</Link>
            <Link to={`/s/${subdomain}/checkout`} className="text-sm px-3 py-2 rounded-lg text-white" style={{ backgroundColor: primary }}>Checkout</Link>
          </div>
        </div>
      </header>

      {mode === "home" ? (
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">
          <section className="relative rounded-3xl overflow-hidden min-h-[420px] border border-slate-200">
            <img src={data?.theme?.bannerJson ? (() => { try { const parsed = JSON.parse(data.theme.bannerJson); return parsed?.desktop || parsed?.image || fallbackHeroImage; } catch { return fallbackHeroImage; } })() : fallbackHeroImage} alt="Hero" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/20 to-transparent" />
            <div className="relative z-10 p-8 lg:p-14 max-w-xl text-white">
              <p className="uppercase text-xs tracking-[0.28em] text-white/80 mb-4">New Season Collection</p>
              <h1 className="text-4xl lg:text-6xl font-semibold leading-tight">Simple is more.</h1>
              <p className="mt-4 text-white/90 text-lg">Premium fashion storefront built for browsing, conversion, and fast checkout.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={`/s/${subdomain}/products`} className="px-6 py-3 rounded-xl font-semibold text-slate-900 bg-white">Shop Now</Link>
                <Link to={`/s/${subdomain}/sale`} className="px-6 py-3 rounded-xl font-semibold border border-white/50 text-white">View Sale</Link>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-2xl font-semibold tracking-tight">Featured Categories</h2>
              <Link to={`/s/${subdomain}/products`} className="text-sm font-medium underline">See all</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(categories.length ? categories : [{ id: "men", name: "Men" }, { id: "women", name: "Women" }, { id: "kids", name: "Kids" }, { id: "accessories", name: "Accessories" }]).slice(0, 4).map((cat, idx) => (
                <Link
                  key={cat.id}
                  to={`/s/${subdomain}/products`}
                  className="group relative rounded-2xl overflow-hidden h-44 border border-slate-200"
                >
                  <img src={fallbackCategoryImages[idx % fallbackCategoryImages.length]} alt={cat.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
                  <p className="absolute left-4 bottom-4 text-white text-lg font-semibold">{cat.name}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">Up to 40% off + free shipping above INR 999</p>
            <Link to={`/s/${subdomain}/sale`} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: primary }}>
              Grab Offer
            </Link>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-2xl font-semibold tracking-tight">Trending Products</h2>
              <Link to={`/s/${subdomain}/products`} className="text-sm font-medium underline">Browse all</Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {searchedProducts.slice(0, 10).map((p) => (
                <div key={p.id} className="min-w-[240px] max-w-[240px] rounded-2xl border border-slate-200 bg-white overflow-hidden group">
                  <Link to={`/s/${subdomain}/products/${p.id}`} className="block h-56 bg-slate-100 overflow-hidden">
                    <img src={productImageUrl(p)} alt={p.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </Link>
                  <div className="p-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{productBadge(p)}</span>
                      <span className="text-amber-500">★ {productRating(p.id)}</span>
                    </div>
                    <Link to={`/s/${subdomain}/products/${p.id}`} className="font-medium line-clamp-1 hover:text-slate-700">{p.title}</Link>
                    <p className="text-sm mt-1 font-semibold">{showPricing ? currencyText(p.price, p.currency) : "Login to view price"}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button className="flex-1 px-3 py-2 rounded-lg border text-sm hover:bg-slate-50" onClick={() => addToCart(p, wholesaleMode ? defaultMoq : 1)}>Quick Add</button>
                      <Link to={`/s/${subdomain}/products/${p.id}`} className="px-3 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: primary }}>View</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {sections.length > 0 ? (
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {sections.slice(0, 8).map((s, idx) => (
                <div key={`${s.type}-${idx}`} className="rounded-xl bg-white border border-slate-200 px-4 py-4">
                  <p className="text-xs uppercase text-slate-400 tracking-wide">{s.type || "Section"}</p>
                  <p className="mt-2 text-sm font-semibold">{s.title || "Content block"}</p>
                </div>
              ))}
            </section>
          ) : null}
        </main>
      ) : mode === "catalog" ? (
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          <section className="rounded-2xl overflow-hidden border border-slate-200 relative">
            <img src={fallbackHeroImage} alt="Catalog hero" className="h-56 w-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/25" />
            <div className="absolute left-6 bottom-6 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/85">Collection</p>
              <h2 className="text-3xl font-semibold mt-1">64+ results for clothes</h2>
            </div>
          </section>

          <div className="lg:hidden">
            <button className="px-4 py-2 rounded-lg border bg-white" onClick={() => setMobileFiltersOpen((v) => !v)}>
              {mobileFiltersOpen ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          <section className="grid lg:grid-cols-[280px,1fr] gap-6">
            <aside className={`${mobileFiltersOpen ? "block" : "hidden"} lg:block rounded-2xl border border-slate-200 bg-white p-4 space-y-5 h-fit`}>
              <div>
                <p className="font-semibold mb-2">Filter</p>
                <select className="w-full h-10 border rounded-lg px-3" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
                  <option value="all">All brands</option>
                  {catalogMeta.brandList.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </select>
              </div>
              <div>
                <p className="font-semibold mb-2">Price Range</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="h-10 border rounded-lg px-3" value={priceMin} onChange={(e) => setPriceMin(Number(e.target.value || 0))} />
                  <input type="number" className="h-10 border rounded-lg px-3" value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value || priceCeiling))} />
                </div>
              </div>
              <div>
                <p className="font-semibold mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  <button className={`px-3 py-1.5 rounded-lg border text-sm ${selectedSize === "all" ? "bg-slate-900 text-white" : ""}`} onClick={() => setSelectedSize("all")}>All</button>
                  {catalogMeta.sizeList.map((size) => (
                    <button key={size} className={`px-3 py-1.5 rounded-lg border text-sm ${selectedSize === size ? "bg-slate-900 text-white" : ""}`} onClick={() => setSelectedSize(size)}>{size}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold mb-2">Color</p>
                <div className="flex flex-wrap gap-2">
                  <button className={`px-3 py-1.5 rounded-lg border text-sm ${selectedColor === "all" ? "bg-slate-900 text-white" : ""}`} onClick={() => setSelectedColor("all")}>All</button>
                  {catalogMeta.colorList.map((color) => (
                    <button key={color} className={`px-3 py-1.5 rounded-lg border text-sm ${selectedColor === color ? "bg-slate-900 text-white" : ""}`} onClick={() => setSelectedColor(color)}>{color}</button>
                  ))}
                </div>
              </div>
            </aside>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <button className={`px-3 py-1.5 rounded border text-sm ${listLayout === "grid" ? "bg-slate-900 text-white" : ""}`} onClick={() => setListLayout("grid")}>Grid</button>
                  <button className={`px-3 py-1.5 rounded border text-sm ${listLayout === "list" ? "bg-slate-900 text-white" : ""}`} onClick={() => setListLayout("list")}>List</button>
                </div>
                <div className="flex items-center gap-2">
                  <select className="h-10 rounded-lg border px-3 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="all">All categories</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className="h-10 rounded-lg border px-3 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="popularity">Popularity</option>
                    <option value="price_asc">Price Low to High</option>
                    <option value="price_desc">Price High to Low</option>
                    <option value="newest">New Arrivals</option>
                  </select>
                </div>
              </div>
              <div className={listLayout === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
                {searchedProducts.map((p) => (
                  <article key={p.id} className={`rounded-2xl border border-slate-200 bg-white overflow-hidden ${listLayout === "list" ? "flex gap-4 p-4" : ""}`}>
                    <Link to={`/s/${subdomain}/products/${p.id}`} className={`${listLayout === "list" ? "w-44 h-44 shrink-0 rounded-xl overflow-hidden" : "h-64 block"}`}>
                      <img src={productImageUrl(p)} alt={p.title} className="h-full w-full object-cover" />
                    </Link>
                    <div className={listLayout === "list" ? "flex-1 py-1" : "p-4"}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{productBadge(p)}</span>
                        <span className="text-sm text-amber-500">★ {productRating(p.id)}</span>
                      </div>
                      <Link to={`/s/${subdomain}/products/${p.id}`} className="block text-lg font-semibold mt-2 hover:text-slate-700">{p.title}</Link>
                      <p className="text-sm text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <p className="font-semibold">{showPricing ? currencyText(p.price, p.currency) : "Login to view price"}</p>
                        {showPricing && Number(p.compareAtPrice || 0) > Number(p.price || 0) ? <p className="text-sm line-through text-slate-400">{currencyText(p.compareAtPrice, p.currency)}</p> : null}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button className="px-4 py-2 rounded-lg text-white text-sm" style={{ backgroundColor: primary }} onClick={() => addToCart(p, wholesaleMode ? defaultMoq : 1)}>Quick Add</button>
                        <Link to={`/s/${subdomain}/products/${p.id}`} className="px-4 py-2 rounded-lg border text-sm">Quick View</Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </main>
      ) : mode === "pdp" && pdp ? (
        <main className={`max-w-7xl mx-auto px-4 py-8 grid gap-8 ${pdpVariant === "stacked" ? "lg:grid-cols-1" : "lg:grid-cols-2"}`}>
          <div className="space-y-3">
            <div className="rounded-2xl border bg-slate-100 overflow-hidden min-h-[520px]">
              {isVideoMediaUrl(pdpMedia[pdpImage]?.url) ? (
                <video src={pdpMedia[pdpImage]?.url} controls className="h-[520px] w-full object-cover" />
              ) : (
                <img src={pdpMedia[pdpImage]?.url || productImageUrl(pdp)} alt={pdp.title} className="h-[520px] w-full object-cover" />
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {pdpMedia.map((media, idx) => (
                <button
                  key={`${media.url}-${idx}`}
                  type="button"
                  onClick={() => setPdpImage(idx)}
                  className={`h-20 w-20 rounded-lg border overflow-hidden shrink-0 ${pdpImage === idx ? "border-slate-900" : "border-slate-200"}`}
                >
                  {isVideoMediaUrl(media.url) ? (
                    <div className="h-full w-full bg-slate-900 text-white grid place-items-center text-xs">Video</div>
                  ) : (
                    <img src={media.url} alt={`${pdp.title} ${idx + 1}`} className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Product details</p>
            <h2 className="text-3xl font-bold mt-2">{pdp.title}</h2>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <span className="text-amber-500">★ {productRating(pdp.id)}</span>
              <span className="text-slate-500">{Math.max(12, Number(String(pdp.id).charCodeAt(0) || 0))} reviews</span>
              <span className={`px-2 py-1 rounded-full ${Number(pdp.stock || 0) > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {Number(pdp.stock || 0) > 0 ? "In Stock" : "Out of Stock"}
              </span>
            </div>
            <p className="text-slate-600 mt-4 whitespace-pre-wrap">{pdp.description}</p>
            <div className="mt-6 flex items-center gap-3">
              <p className="text-3xl font-bold">{showPricing ? currencyText(pdp.price, pdp.currency) : "Login to view price"}</p>
              {showPricing && Number(pdp.compareAtPrice || 0) > Number(pdp.price || 0) ? <p className="text-xl text-slate-400 line-through">{currencyText(pdp.compareAtPrice, pdp.currency)}</p> : null}
            </div>
            {wholesaleMode ? <p className="text-sm text-amber-700 mt-2">MOQ {defaultMoq}+ units • Pack size {packSize} • Bulk tier pricing available</p> : null}

            {pdpSizes.length > 0 ? (
              <div className="mt-6">
                <p className="text-sm font-semibold mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {pdpSizes.map((size) => (
                    <button key={size} className={`px-3 py-1.5 rounded-lg border text-sm ${pdpSize === size ? "bg-slate-900 text-white border-slate-900" : "border-slate-300"}`} onClick={() => setPdpSize(size)}>{size}</button>
                  ))}
                </div>
              </div>
            ) : null}

            {pdpColors.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">Color</p>
                <div className="flex flex-wrap gap-2">
                  {pdpColors.map((color) => (
                    <button key={color} className={`px-3 py-1.5 rounded-lg border text-sm ${pdpColor === color ? "bg-slate-900 text-white border-slate-900" : "border-slate-300"}`} onClick={() => setPdpColor(color)}>{color}</button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              <button className="px-5 py-3 rounded-xl text-white font-medium" style={{ backgroundColor: primary }} onClick={() => addToCart(pdp, wholesaleMode ? defaultMoq : 1)}>Add to cart</button>
              <Link className="px-5 py-3 rounded-xl border font-medium text-center" to={`/s/${subdomain}/checkout`}>Buy now</Link>
              {wholesaleMode ? <button className="sm:col-span-2 px-5 py-3 rounded-xl border font-medium" onClick={() => submitQuote(pdp)}>Request Quote</button> : null}
            </div>

            <div className="mt-7 grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl border p-3 text-sm"><p className="font-semibold">Delivery</p><p className="text-slate-500 mt-1">Ships in 24 hours across India.</p></div>
              <div className="rounded-xl border p-3 text-sm"><p className="font-semibold">Returns</p><p className="text-slate-500 mt-1">7-day easy returns on unused items.</p></div>
              <div className="rounded-xl border p-3 text-sm"><p className="font-semibold">Secure Payment</p><p className="text-slate-500 mt-1">UPI, Card, COD supported.</p></div>
            </div>
          </div>
        </main>
      ) : mode === "cart" ? (
        <main className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-3xl font-bold mb-2">Cart Review</h2>
          <p className="text-slate-600 mb-6">Review products, apply offers, and continue to secure checkout.</p>
          {cart.length === 0 ? <p className="text-slate-600">Your cart is empty.</p> : (
            <div className="grid lg:grid-cols-[1fr,360px] gap-6">
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="rounded-2xl border bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 rounded-xl bg-slate-100 overflow-hidden">
                        <img src={productImageUrl((data?.products || []).find((p) => p.id === item.id))} alt={item.title} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-sm text-slate-500">{currencyText(item.price)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="h-8 w-8 rounded border" onClick={() => updateCartQty(item.id, item.quantity - 1)}>-</button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button className="h-8 w-8 rounded border" onClick={() => updateCartQty(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <button className="text-sm text-rose-600 hover:underline" onClick={() => removeFromCart(item.id)}>Remove</button>
                  </div>
                ))}
                {reservation.message ? <p className="text-sm text-slate-600">{reservation.message}</p> : null}
              </div>
              <aside className="rounded-2xl border bg-white p-5 h-fit">
                <p className="font-semibold text-lg">Order Summary</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span>Subtotal</span><span>{currencyText(cartTotal)}</span></div>
                  <div className="flex items-center justify-between"><span>Shipping</span><span>{shippingAmount ? currencyText(shippingAmount) : "Free"}</span></div>
                  <div className="flex items-center justify-between text-emerald-600"><span>Discount</span><span>- {currencyText(discountAmount)}</span></div>
                  <div className="pt-3 border-t flex items-center justify-between text-base font-semibold"><span>Total</span><span>{currencyText(payableTotal)}</span></div>
                </div>
                <div className="mt-4">
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code (WELCOME10)" className="w-full h-10 border rounded-lg px-3 text-sm" />
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <label className="flex items-center justify-between border rounded-lg px-3 py-2"><span>Standard shipping</span><input type="radio" checked={shippingMethod === "standard"} onChange={() => setShippingMethod("standard")} /></label>
                  <label className="flex items-center justify-between border rounded-lg px-3 py-2"><span>Express shipping (+INR 149)</span><input type="radio" checked={shippingMethod === "express"} onChange={() => setShippingMethod("express")} /></label>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2.5 rounded-lg border w-full"
                    onClick={() => reserveStock(true)}
                    disabled={reservation.loading}
                  >
                    {reservation.loading ? "Reserving..." : "Reserve stock"}
                  </button>
                  <Link to={`/s/${subdomain}/checkout`} className="px-5 py-2.5 rounded-lg text-white font-medium w-full text-center" style={{ backgroundColor: primary }}>
                    Checkout
                  </Link>
                </div>
              </aside>
            </div>
          )}
        </main>
      ) : mode === "checkout" ? (
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="rounded-2xl border bg-white mb-6 px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-2xl font-bold tracking-tight">Checkout</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">✓</span>
              <span>Cart</span>
              <span className="text-slate-300">—</span>
              <span className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">✓</span>
              <span>Review</span>
              <span className="text-slate-300">—</span>
              <span className="h-7 w-7 rounded-full text-white grid place-items-center" style={{ backgroundColor: primary }}>3</span>
              <span>Checkout</span>
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
              <p className="text-xl font-semibold">Shipping Address</p>
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
              <p className="text-lg font-semibold pt-2">Shipping Method</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className={`rounded-lg border p-3 cursor-pointer ${shippingMethod === "standard" ? "border-emerald-500 bg-emerald-50" : ""}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span>Free Shipping</span>
                    <input type="radio" checked={shippingMethod === "standard"} onChange={() => setShippingMethod("standard")} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">7-10 days</p>
                </label>
                <label className={`rounded-lg border p-3 cursor-pointer ${shippingMethod === "express" ? "border-emerald-500 bg-emerald-50" : ""}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span>Express Shipping</span>
                    <input type="radio" checked={shippingMethod === "express"} onChange={() => setShippingMethod("express")} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">1-3 days (+INR 149)</p>
                </label>
              </div>

              <p className="text-lg font-semibold pt-2">Payment Method</p>
              <div className="space-y-2">
                <label className={`rounded-lg border p-3 flex items-center justify-between cursor-pointer ${checkoutForm.paymentMethod === "upi" ? "border-slate-900 bg-slate-50" : ""}`}>
                  <span>UPI</span>
                  <input type="radio" checked={checkoutForm.paymentMethod === "upi"} onChange={() => setCheckoutForm((s) => ({ ...s, paymentMethod: "upi" }))} />
                </label>
                <label className={`rounded-lg border p-3 flex items-center justify-between cursor-pointer ${checkoutForm.paymentMethod === "card" ? "border-slate-900 bg-slate-50" : ""}`}>
                  <span>Card</span>
                  <input type="radio" checked={checkoutForm.paymentMethod === "card"} onChange={() => setCheckoutForm((s) => ({ ...s, paymentMethod: "card" }))} />
                </label>
                <label className={`rounded-lg border p-3 flex items-center justify-between cursor-pointer ${checkoutForm.paymentMethod === "cod" ? "border-slate-900 bg-slate-50" : ""}`}>
                  <span>Cash on Delivery</span>
                  <input type="radio" checked={checkoutForm.paymentMethod === "cod"} onChange={() => setCheckoutForm((s) => ({ ...s, paymentMethod: "cod" }))} />
                </label>
              </div>

              {reservation.message ? <p className="text-sm text-slate-600">{reservation.message}</p> : null}
              {checkoutMessage ? (
                <div className={`rounded-lg px-3 py-2 text-sm ${
                  checkoutStatus === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : checkoutStatus === "warn"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                }`}>
                  {checkoutMessage}
                  {checkoutStatus === "warn" ? (
                    <div className="mt-1">
                      <Link to={`/s/${subdomain}/login`} className="underline font-medium">Go to login</Link>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {checkoutAccount ? (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-3 text-sm text-indigo-800">
                  <p className="font-semibold">Account created and logged in</p>
                  <p className="mt-1">Login ID: {checkoutAccount.email}</p>
                  <p>Password: {checkoutAccount.password}</p>
                  <p className="mt-1 text-xs">Redirecting to dashboard...</p>
                </div>
              ) : null}
            </div>
            <div className="rounded-2xl border bg-white p-5 h-fit shadow-sm">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Order Summary</p>
              <div className="mt-4 space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <p className="truncate pr-3">{item.title} x {item.quantity}</p>
                    <p className="font-medium">{currencyText((Number(item.price || 0) * item.quantity))}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm border-t pt-4">
                <div className="flex items-center justify-between"><span>Subtotal</span><span>{currencyText(cartTotal)}</span></div>
                <div className="flex items-center justify-between"><span>Shipping</span><span>{shippingAmount ? currencyText(shippingAmount) : "Free"}</span></div>
                <div className="flex items-center justify-between text-emerald-600"><span>Discount</span><span>- {currencyText(discountAmount)}</span></div>
                <div className="pt-2 mt-2 border-t flex items-center justify-between">
                  <p className="font-semibold">Payable</p>
                  <p className="text-lg font-bold">{currencyText(payableTotal)}</p>
                </div>
              </div>
              <div className="mt-4">
                <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" className="w-full h-10 border rounded-lg px-3 text-sm" />
              </div>
              <button className="mt-4 w-full px-5 py-3 rounded-lg text-white font-medium" style={{ backgroundColor: primary }} onClick={checkout}>Place order</button>
              <p className="mt-3 text-xs text-slate-500 text-center">Secure checkout • SSL encrypted</p>
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
