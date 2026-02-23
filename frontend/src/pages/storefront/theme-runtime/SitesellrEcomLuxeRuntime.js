import { Link } from "react-router-dom";

const pick = (v, fallback) => (typeof v === "string" && v.trim() ? v : fallback);
const placeholder = (label = "Image", bg = "F3EDE3", fg = "1A1208") =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><rect width='100%' height='100%' fill='#${bg}'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#${fg}' font-family='Arial' font-size='52'>${label}</text></svg>`
  )}`;

export default function SitesellrEcomLuxeRuntime(props) {
  const {
    subdomain,
    mode,
    categories = [],
    searchedProducts = [],
    categoryNameById,
    showPricing,
    currencyText,
    productImageUrl,
    primary,
    addToCart,
    isPreviewMode,
    pdp,
    pdpMedia = [],
    pdpImage,
    setPdpImage,
    pdpSizes = [],
    pdpSize,
    setPdpSize,
    pdpColors = [],
    pdpColor,
    setPdpColor,
    themeTokens = {},
    cart = [],
    cartCount = 0,
    cartTotal = 0,
    coupon,
    setCoupon,
    configuredOfferCode,
    configuredOfferPercent,
    discountAmount = 0,
    shippingMethod,
    setShippingMethod,
    shippingAmount = 0,
    payableTotal = 0,
    updateCartQty,
    removeFromCart,
    checkout,
    checkoutForm,
    setCheckoutForm,
    checkoutMessage,
    checkoutStatus,
    checkoutAccount,
    availablePaymentModes = [],
    indiaStates = [],
    authState,
    authForm,
    setAuthForm,
    authMode,
    setAuthMode,
    customerAuthSubmit,
    accountData,
    accountLoading,
    accountError,
    accountSelectedOrderId,
    setAccountSelectedOrderId,
  } = props;

  const accent = pick(themeTokens.accentColor, "#0D6E6E");
  const secondary = pick(themeTokens.secondaryColor, "#C9921A");
  const bg = pick(themeTokens.backgroundColor, "#FAF7F2");
  const surface = pick(themeTokens.surfaceColor, "#FFFFFF");
  const text = pick(themeTokens.textColor, "#1A1208");
  const muted = pick(themeTokens.mutedColor, "#7A6652");
  const border = pick(themeTokens.borderColor, "#E0D5C5");

  if (mode === "home" || mode === "catalog") {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8" style={{ color: text }}>
        <section className="rounded-3xl border overflow-hidden" style={{ borderColor: border, backgroundColor: surface }}>
          <div className="grid lg:grid-cols-[1.1fr,1fr]">
            <div className="p-8 lg:p-12">
              <p className="text-xs uppercase tracking-[0.25em] font-semibold" style={{ color: muted }}>New Season</p>
              <h1 className="mt-3 text-4xl lg:text-5xl font-semibold leading-tight">Crafted for modern India</h1>
              <p className="mt-4 text-sm lg:text-base" style={{ color: muted }}>
                Premium storefront with curated categories, high-conversion product cards, and India-ready checkout.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={`/s/${subdomain}/products`} className="px-5 py-2.5 rounded-lg text-white font-medium" style={{ backgroundColor: primary }}>Shop Now</Link>
                <Link to={`/s/${subdomain}/sale`} className="px-5 py-2.5 rounded-lg border font-medium" style={{ borderColor: border }}>View Sale</Link>
              </div>
            </div>
            <div className="min-h-[280px] lg:min-h-[360px] relative">
              <img src={searchedProducts[0] ? productImageUrl(searchedProducts[0]) : placeholder("Sitesellr Theme")} alt="Theme hero" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(0,0,0,0.05), rgba(0,0,0,0.25))" }} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border px-5 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: border, backgroundColor: surface }}>
          <p className="text-sm" style={{ color: muted }}>Use code <strong>{configuredOfferCode || "WELCOME10"}</strong> for {configuredOfferPercent || 10}% off</p>
          <Link to={`/s/${subdomain}/sale`} className="px-4 py-2 rounded-lg text-white text-sm" style={{ backgroundColor: accent }}>Grab Offer</Link>
        </section>

        {categories.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-semibold">Featured Categories</h2>
              <Link to={`/s/${subdomain}/products`} className="text-sm underline">Browse all</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.slice(0, 8).map((c) => (
                <Link key={c.id} to={`/s/${subdomain}/products?category=${encodeURIComponent(c.id)}`} className="rounded-xl border px-4 py-5 hover:shadow-sm transition" style={{ borderColor: border, backgroundColor: surface }}>
                  <div className="text-xs uppercase tracking-wide" style={{ color: muted }}>Category</div>
                  <div className="mt-1 text-lg font-semibold">{c.name}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-semibold">Trending Products</h2>
            <span className="text-sm" style={{ color: muted }}>{searchedProducts.length} items</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {searchedProducts.slice(0, 12).map((p) => (
              <article key={p.id} className="rounded-2xl overflow-hidden border group" style={{ borderColor: border, backgroundColor: surface }}>
                <Link to={`/s/${subdomain}/products/${p.id}`} className="block h-56 bg-slate-100 overflow-hidden">
                  <img src={productImageUrl(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                </Link>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide" style={{ color: muted }}>{categoryNameById.get(String(p.categoryId || "")) || "General"}</p>
                  <Link to={`/s/${subdomain}/products/${p.id}`} className="mt-1 block font-semibold line-clamp-1">{p.title}</Link>
                  <p className="mt-1 text-sm font-semibold">{showPricing ? currencyText(p.price, p.currency) : "Login to view price"}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" disabled={isPreviewMode} onClick={() => addToCart(p, 1)} className="flex-1 rounded-lg py-2 text-sm text-white disabled:opacity-50" style={{ backgroundColor: primary }}>
                      Add to Cart
                    </button>
                    <Link to={`/s/${subdomain}/products/${p.id}`} className="px-3 py-2 text-sm rounded-lg border" style={{ borderColor: border }}>View</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (mode === "pdp" && pdp) {
    const media = pdpMedia.length ? pdpMedia : [{ url: productImageUrl(pdp) }];
    return (
      <main className="max-w-7xl mx-auto px-4 py-8" style={{ color: text }}>
        <div className="grid lg:grid-cols-2 gap-10">
          <section className="space-y-3">
            <div className="rounded-2xl overflow-hidden border h-[540px]" style={{ borderColor: border }}>
              <img src={media[pdpImage]?.url || media[0].url} alt={pdp.title} className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {media.slice(0, 4).map((m, idx) => (
                <button key={`${m.url}-${idx}`} type="button" onClick={() => setPdpImage(idx)} className={`rounded-xl overflow-hidden border h-24 ${pdpImage === idx ? "ring-2 ring-offset-1" : ""}`} style={{ borderColor: border, boxShadow: pdpImage === idx ? `0 0 0 2px ${primary}` : "none" }}>
                  <img src={m.url} alt={`${pdp.title}-${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </section>
          <section>
            <p className="text-xs uppercase tracking-wide" style={{ color: muted }}>{categoryNameById.get(String(pdp.categoryId || "")) || "General"}</p>
            <h1 className="mt-2 text-3xl font-semibold">{pdp.title}</h1>
            <p className="mt-2 text-sm" style={{ color: muted }}>{pdp.description || "Premium product crafted for performance and style."}</p>
            <p className="mt-5 text-3xl font-bold">{showPricing ? currencyText(pdp.price, pdp.currency) : "Login to view price"}</p>

            {pdpSizes.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {pdpSizes.map((size) => (
                    <button key={size} type="button" onClick={() => setPdpSize(size)} className={`px-4 py-1.5 text-sm rounded-lg border ${pdpSize === size ? "text-white" : ""}`} style={{ borderColor: border, backgroundColor: pdpSize === size ? primary : surface }}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pdpColors.length > 0 && (
              <div className="mt-5">
                <p className="text-sm font-semibold mb-2">Color</p>
                <div className="flex items-center gap-2">
                  {pdpColors.map((color) => (
                    <button key={color} type="button" onClick={() => setPdpColor(color)} title={color} className={`w-7 h-7 rounded-full border ${pdpColor === color ? "ring-2 ring-offset-1" : ""}`} style={{ backgroundColor: color, borderColor: "#fff", boxShadow: pdpColor === color ? `0 0 0 2px ${primary}` : "none" }} />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              <button type="button" disabled={isPreviewMode} onClick={() => addToCart(pdp, 1)} className="h-12 rounded-xl text-white font-medium disabled:opacity-50" style={{ backgroundColor: primary }}>
                Add to Cart
              </button>
              <Link to={`/s/${subdomain}/checkout`} className="h-12 rounded-xl border font-medium flex items-center justify-center" style={{ borderColor: border }}>
                Buy Now
              </Link>
            </div>

            <div className="mt-6 rounded-xl border p-4 text-sm" style={{ borderColor: border, backgroundColor: bg, color: muted }}>
              <p>Free shipping above INR 999</p>
              <p className="mt-1">Easy returns • Secure checkout • GST invoice</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (mode === "cart") {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8" style={{ color: text }}>
        <h1 className="text-3xl font-semibold mb-6">Cart</h1>
        {cart.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center" style={{ borderColor: border, backgroundColor: surface }}>
            <p className="text-lg font-medium">Your cart is empty</p>
            <Link to={`/s/${subdomain}/products`} className="inline-block mt-4 px-5 py-2.5 rounded-lg text-white font-medium" style={{ backgroundColor: primary }}>Continue shopping</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr,340px] gap-6">
            <section className="rounded-2xl border p-4 space-y-3" style={{ borderColor: border, backgroundColor: surface }}>
              {cart.map((item) => (
                <div key={item.id} className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: border }}>
                  <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden">
                    <img src={item.imageUrl || placeholder("Item", "EFE7DB", "5C3D1E")} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-1">{item.title}</p>
                    <p className="text-sm" style={{ color: muted }}>{currencyText(item.price, "INR")} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" className="w-8 h-8 rounded border" style={{ borderColor: border }} onClick={() => updateCartQty(item.id, item.quantity - 1)}>-</button>
                    <span className="w-7 text-center text-sm">{item.quantity}</span>
                    <button type="button" className="w-8 h-8 rounded border" style={{ borderColor: border }} onClick={() => updateCartQty(item.id, item.quantity + 1)}>+</button>
                  </div>
                  <button type="button" className="text-sm underline" onClick={() => removeFromCart(item.id)}>Remove</button>
                </div>
              ))}
            </section>
            <aside className="rounded-2xl border p-4 h-fit" style={{ borderColor: border, backgroundColor: surface }}>
              <p className="font-semibold mb-3">Order Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span style={{ color: muted }}>Subtotal ({cartCount} items)</span><span>{currencyText(cartTotal, "INR")}</span></div>
                <div className="flex justify-between"><span style={{ color: muted }}>Shipping</span><span>{shippingAmount ? currencyText(shippingAmount, "INR") : "Free"}</span></div>
                <div className="flex justify-between"><span style={{ color: muted }}>Discount</span><span>-{currencyText(discountAmount, "INR")}</span></div>
              </div>
              <div className="border-t mt-3 pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span>{currencyText(payableTotal, "INR")}</span>
              </div>
              <Link to={`/s/${subdomain}/checkout`} className="mt-4 h-11 rounded-xl text-white font-medium flex items-center justify-center" style={{ backgroundColor: primary }}>
                Checkout
              </Link>
            </aside>
          </div>
        )}
      </main>
    );
  }

  if (mode === "checkout") {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8" style={{ color: text }}>
        <h1 className="text-3xl font-semibold mb-6">Secure Checkout</h1>
        <div className="grid lg:grid-cols-[1fr,360px] gap-6">
          <section className="rounded-2xl border p-5 space-y-4" style={{ borderColor: border, backgroundColor: surface }}>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="h-11 rounded-lg border px-3" style={{ borderColor: border }} placeholder="Full name" value={checkoutForm.name} onChange={(e) => setCheckoutForm((s) => ({ ...s, name: e.target.value }))} />
              <input className="h-11 rounded-lg border px-3" style={{ borderColor: border }} placeholder="Phone" value={checkoutForm.phone} onChange={(e) => setCheckoutForm((s) => ({ ...s, phone: e.target.value }))} />
            </div>
            <input className="h-11 rounded-lg border px-3 w-full" style={{ borderColor: border }} placeholder="Email" value={checkoutForm.email} onChange={(e) => setCheckoutForm((s) => ({ ...s, email: e.target.value }))} />
            <input className="h-11 rounded-lg border px-3 w-full" style={{ borderColor: border }} placeholder="Address line 1" value={checkoutForm.addressLine1} onChange={(e) => setCheckoutForm((s) => ({ ...s, addressLine1: e.target.value }))} />
            <input className="h-11 rounded-lg border px-3 w-full" style={{ borderColor: border }} placeholder="Address line 2 (optional)" value={checkoutForm.addressLine2} onChange={(e) => setCheckoutForm((s) => ({ ...s, addressLine2: e.target.value }))} />
            <div className="grid sm:grid-cols-3 gap-3">
              <input className="h-11 rounded-lg border px-3" style={{ borderColor: border }} placeholder="City" value={checkoutForm.city} onChange={(e) => setCheckoutForm((s) => ({ ...s, city: e.target.value }))} />
              <select className="h-11 rounded-lg border px-3" style={{ borderColor: border }} value={checkoutForm.state} onChange={(e) => setCheckoutForm((s) => ({ ...s, state: e.target.value }))}>
                <option value="">Select state</option>
                {indiaStates.map((st) => <option key={st.code || st.name} value={st.name}>{st.name}</option>)}
              </select>
              <input className="h-11 rounded-lg border px-3" style={{ borderColor: border }} placeholder="PIN code" value={checkoutForm.postalCode} onChange={(e) => setCheckoutForm((s) => ({ ...s, postalCode: e.target.value }))} />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Payment Method</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {availablePaymentModes.map((m) => (
                  <label key={m} className={`rounded-lg border px-3 py-2 text-sm flex items-center justify-between cursor-pointer ${checkoutForm.paymentMethod === m ? "ring-1" : ""}`} style={{ borderColor: checkoutForm.paymentMethod === m ? primary : border, boxShadow: checkoutForm.paymentMethod === m ? `0 0 0 1px ${primary}` : "none" }}>
                    <span className="capitalize">{m === "cod" ? "Cash on Delivery" : m}</span>
                    <input type="radio" checked={checkoutForm.paymentMethod === m} onChange={() => setCheckoutForm((s) => ({ ...s, paymentMethod: m }))} />
                  </label>
                ))}
              </div>
            </div>
            {checkoutMessage ? (
              <div className={`rounded-lg px-3 py-2 text-sm ${checkoutStatus === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : checkoutStatus === "warn" ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                {checkoutMessage}
              </div>
            ) : null}
            {checkoutAccount ? (
              <div className="rounded-lg px-3 py-2 text-sm border" style={{ borderColor: border, backgroundColor: bg }}>
                <p className="font-semibold">Account created</p>
                <p>Login ID: {checkoutAccount.email}</p>
                <p>Password: {checkoutAccount.password}</p>
              </div>
            ) : null}
          </section>
          <aside className="rounded-2xl border p-4 h-fit" style={{ borderColor: border, backgroundColor: surface }}>
            <p className="font-semibold mb-3">Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span style={{ color: muted }}>Items</span><span>{cartCount}</span></div>
              <div className="flex justify-between"><span style={{ color: muted }}>Subtotal</span><span>{currencyText(cartTotal, "INR")}</span></div>
              <div className="flex justify-between"><span style={{ color: muted }}>Shipping</span><span>{shippingAmount ? currencyText(shippingAmount, "INR") : "Free"}</span></div>
              <div className="flex justify-between"><span style={{ color: muted }}>Discount</span><span>-{currencyText(discountAmount, "INR")}</span></div>
            </div>
            <div className="border-t mt-3 pt-3 flex justify-between font-semibold">
              <span>Total</span>
              <span>{currencyText(payableTotal, "INR")}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <input className="h-10 rounded-lg border px-3 flex-1 text-sm" style={{ borderColor: border }} placeholder="Coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
              <button type="button" className="px-3 rounded-lg border text-sm" style={{ borderColor: border }}>Apply</button>
            </div>
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              <button type="button" className={`h-10 rounded-lg border text-sm ${shippingMethod === "standard" ? "text-white" : ""}`} style={{ borderColor: border, backgroundColor: shippingMethod === "standard" ? accent : "transparent" }} onClick={() => setShippingMethod("standard")}>Standard</button>
              <button type="button" className={`h-10 rounded-lg border text-sm ${shippingMethod === "express" ? "text-white" : ""}`} style={{ borderColor: border, backgroundColor: shippingMethod === "express" ? accent : "transparent" }} onClick={() => setShippingMethod("express")}>Express</button>
            </div>
            <button type="button" disabled={isPreviewMode} onClick={checkout} className="mt-4 h-11 w-full rounded-xl text-white font-medium disabled:opacity-50" style={{ backgroundColor: primary }}>
              Place Order
            </button>
            <p className="text-xs mt-2 text-center" style={{ color: muted }}>SSL encrypted • Secure checkout</p>
          </aside>
        </div>
      </main>
    );
  }

  if (mode === "login") {
    return (
      <main className="max-w-5xl mx-auto px-4 py-10" style={{ color: text }}>
        <div className="grid lg:grid-cols-[1fr,1fr] rounded-3xl overflow-hidden border" style={{ borderColor: border, backgroundColor: surface }}>
          <section className="p-8 lg:p-12 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
            <h2 className="text-4xl font-semibold">Welcome back</h2>
            <p className="mt-3 text-sm text-white/90">Secure customer session for order tracking and faster checkout.</p>
          </section>
          <section className="p-8 lg:p-12">
            <div className="inline-flex rounded-lg border p-1 mb-5" style={{ borderColor: border }}>
              <button type="button" className="px-4 py-2 rounded-md text-sm font-medium" style={{ backgroundColor: authMode === "login" ? primary : "transparent", color: authMode === "login" ? "#fff" : text }} onClick={() => setAuthMode("login")}>Login</button>
              <button type="button" className="px-4 py-2 rounded-md text-sm font-medium" style={{ backgroundColor: authMode === "register" ? primary : "transparent", color: authMode === "register" ? "#fff" : text }} onClick={() => setAuthMode("register")}>Signup</button>
            </div>
            {authMode === "register" ? (
              <div className="space-y-3">
                <input className="h-11 rounded-lg border px-3 w-full" style={{ borderColor: border }} placeholder="Full name" value={authForm.name} onChange={(e) => setAuthForm((s) => ({ ...s, name: e.target.value }))} />
                <input className="h-11 rounded-lg border px-3 w-full" style={{ borderColor: border }} placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm((s) => ({ ...s, email: e.target.value }))} />
                <input className="h-11 rounded-lg border px-3 w-full" style={{ borderColor: border }} placeholder="Phone" value={authForm.phone} onChange={(e) => setAuthForm((s) => ({ ...s, phone: e.target.value }))} />
                <input type="password" className="h-11 rounded-lg border px-3 w-full" style={{ borderColor: border }} placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm((s) => ({ ...s, password: e.target.value }))} />
                <button type="button" onClick={customerAuthSubmit} className="h-11 w-full rounded-lg text-white font-medium" style={{ backgroundColor: primary }}>Create Account</button>
              </div>
            ) : (
              <div className="space-y-3">
                <input className="h-11 rounded-lg border px-3 w-full" style={{ borderColor: border }} placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm((s) => ({ ...s, email: e.target.value }))} />
                <input type="password" className="h-11 rounded-lg border px-3 w-full" style={{ borderColor: border }} placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm((s) => ({ ...s, password: e.target.value }))} />
                <button type="button" onClick={customerAuthSubmit} className="h-11 w-full rounded-lg text-white font-medium" style={{ backgroundColor: primary }}>Sign In</button>
              </div>
            )}
            {authState?.message ? <p className="mt-4 text-sm" style={{ color: muted }}>{authState.message}</p> : null}
          </section>
        </div>
      </main>
    );
  }

  if (mode === "account") {
    if (accountLoading) {
      return <main className="max-w-6xl mx-auto px-4 py-10">Loading account...</main>;
    }
    if (accountError) {
      return <main className="max-w-6xl mx-auto px-4 py-10 text-rose-700">{accountError}</main>;
    }
    if (!authState?.authenticated) {
      return (
        <main className="max-w-4xl mx-auto px-4 py-10 text-center">
          <h2 className="text-2xl font-semibold">Please login to view your dashboard</h2>
          <Link to={`/s/${subdomain}/login`} className="inline-block mt-4 px-5 py-2.5 rounded-lg text-white font-medium" style={{ backgroundColor: primary }}>
            Login
          </Link>
        </main>
      );
    }
    const orders = Array.isArray(accountData?.orders) ? accountData.orders : [];
    const selectedOrder = orders.find((o) => o.id === accountSelectedOrderId) || orders[0];
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6" style={{ color: text }}>
        <section className="rounded-2xl border p-5" style={{ borderColor: border, backgroundColor: surface }}>
          <h2 className="text-2xl font-semibold">Customer Dashboard</h2>
          <p className="mt-1 text-sm" style={{ color: muted }}>{accountData?.customer?.email || authState?.customer?.email || "Logged in customer"}</p>
        </section>
        <section className="grid lg:grid-cols-[320px,1fr] gap-5">
          <aside className="rounded-2xl border p-4 space-y-2" style={{ borderColor: border, backgroundColor: surface }}>
            <p className="font-semibold mb-1">Orders</p>
            {orders.length === 0 ? <p className="text-sm" style={{ color: muted }}>No orders yet.</p> : null}
            {orders.map((order) => (
              <button key={order.id} type="button" onClick={() => setAccountSelectedOrderId(order.id)} className="w-full text-left rounded-xl border px-3 py-2 text-sm" style={{ borderColor: accountSelectedOrderId === order.id ? primary : border, boxShadow: accountSelectedOrderId === order.id ? `0 0 0 1px ${primary}` : "none" }}>
                <p className="font-medium">{order.id}</p>
                <p style={{ color: muted }}>{currencyText(order.total || 0, order.currency || "INR")}</p>
              </button>
            ))}
          </aside>
          <div className="rounded-2xl border p-5" style={{ borderColor: border, backgroundColor: surface }}>
            {!selectedOrder ? (
              <p className="text-sm" style={{ color: muted }}>Select an order to view details.</p>
            ) : (
              <>
                <h3 className="text-xl font-semibold">Order {selectedOrder.id}</h3>
                <p className="mt-1 text-sm" style={{ color: muted }}>Status: {selectedOrder.status || "Processing"}</p>
                <div className="mt-4 space-y-2">
                  {(selectedOrder.items || []).map((it, idx) => (
                    <div key={`${selectedOrder.id}-${idx}`} className="flex items-center justify-between text-sm border-b pb-2" style={{ borderColor: border }}>
                      <span>{it.productTitle || it.title || "Product"} × {it.quantity || 1}</span>
                      <span>{currencyText(it.unitPrice || 0, selectedOrder.currency || "INR")}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    );
  }

  return null;
}
