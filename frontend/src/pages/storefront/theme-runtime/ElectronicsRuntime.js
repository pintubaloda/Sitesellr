import { Link } from "react-router-dom";

const heroFallback = "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1800&q=80";

export default function ElectronicsRuntime({
  subdomain,
  mode,
  categories,
  searchedProducts,
  categoryNameById,
  showPricing,
  currencyText,
  productImageUrl,
  primary,
  addToCart,
  isPreviewMode,
  categoryId,
  setCategoryId,
  sortBy,
  setSortBy,
  pdp,
  pdpMedia,
  pdpImage,
  setPdpImage,
  page,
  cart,
  updateCartQty,
  removeFromCart,
  payableTotal,
  cartTotal,
  shippingAmount,
  discountAmount,
  checkoutForm,
  setCheckoutForm,
  indiaStates,
  checkout,
  checkoutMessage,
  checkoutStatus,
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  customerAuthSubmit,
  authState,
  themeAssetBase,
}) {
  const heroImage = themeAssetBase ? `${themeAssetBase}/banner.jpg` : heroFallback;

  if (mode === "home") {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-white grid lg:grid-cols-[1.1fr,1fr]">
          <div className="p-8 lg:p-10">
            <p className="text-xs tracking-[0.28em] text-cyan-300">ELECTRONICS RUNTIME</p>
            <h1 className="mt-4 text-4xl font-semibold">Tech Deals, Faster Checkout</h1>
            <p className="mt-3 text-slate-300">Comparison-ready cards, compact listings, and conversion-first product pages.</p>
            <div className="mt-6 flex gap-3">
              <Link to={`/s/${subdomain}/products`} className="px-5 py-2.5 rounded-lg font-medium bg-cyan-500 text-slate-950">Shop Electronics</Link>
              <Link to={`/s/${subdomain}/sale`} className="px-5 py-2.5 rounded-lg font-medium border border-slate-600">Open Deals</Link>
            </div>
          </div>
          <img src={heroImage} alt="Electronics Hero" className="h-72 lg:h-full w-full object-cover" />
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {searchedProducts.slice(0, 8).map((p) => (
            <article key={p.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <Link to={`/s/${subdomain}/products/${p.id}`} className="block h-44 bg-slate-100">
                <img src={productImageUrl(p)} alt={p.title} className="h-full w-full object-cover" />
              </Link>
              <div className="p-3 space-y-2">
                <p className="font-medium line-clamp-2 min-h-[40px]">{p.title}</p>
                <p className="text-xs text-slate-500">{categoryNameById.get(String(p.categoryId || "")) || "General"}</p>
                <p className="font-semibold">{showPricing ? currencyText(p.price, p.currency) : "Login to view price"}</p>
                <button disabled={isPreviewMode} onClick={() => addToCart(p, 1)} className="w-full h-9 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: primary }}>Quick Add</button>
              </div>
            </article>
          ))}
        </section>
      </main>
    );
  }

  if (mode === "catalog") {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[240px,1fr] gap-5">
        <aside className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 h-fit">
          <h3 className="font-semibold">Filters</h3>
          <select className="h-10 rounded-lg border px-2 w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </aside>
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Products</h2>
            <select className="h-10 rounded-lg border px-3" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="popularity">Popularity</option>
              <option value="price_asc">Price Low to High</option>
              <option value="price_desc">Price High to Low</option>
              <option value="newest">New Arrivals</option>
            </select>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {searchedProducts.map((p) => (
              <article key={p.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <Link to={`/s/${subdomain}/products/${p.id}`} className="block h-44 bg-slate-100">
                  <img src={productImageUrl(p)} alt={p.title} className="h-full w-full object-cover" />
                </Link>
                <div className="p-3">
                  <p className="text-sm font-medium line-clamp-2">{p.title}</p>
                  <p className="mt-2 font-semibold">{showPricing ? currencyText(p.price, p.currency) : "Login to view price"}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (mode === "pdp" && pdp) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-6">
        <section>
          <div className="rounded-xl border border-slate-200 bg-slate-100 overflow-hidden">
            <img src={pdpMedia[pdpImage]?.url || productImageUrl(pdp)} alt={pdp.title} className="h-[500px] w-full object-cover" />
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {pdpMedia.map((m, idx) => (
              <button key={`${m.url}-${idx}`} className={`h-16 w-16 rounded border ${idx === pdpImage ? "border-slate-900" : "border-slate-200"}`} onClick={() => setPdpImage(idx)}>
                <img src={m.url} alt="" className="h-full w-full object-cover rounded" />
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h1 className="text-3xl font-semibold">{pdp.title}</h1>
          <p className="text-slate-600">{pdp.description}</p>
          <p className="text-2xl font-bold">{showPricing ? currencyText(pdp.price, pdp.currency) : "Login to view price"}</p>
          <div className="grid grid-cols-2 gap-3">
            <button disabled={isPreviewMode} onClick={() => addToCart(pdp, 1)} className="h-11 rounded-lg text-white font-medium disabled:opacity-50" style={{ backgroundColor: primary }}>Add to Cart</button>
            <Link to={`/s/${subdomain}/checkout`} className="h-11 rounded-lg border flex items-center justify-center font-medium">Buy Now</Link>
          </div>
        </section>
      </main>
    );
  }

  if (mode === "cart") {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[1.3fr,0.9fr] gap-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-xl font-semibold">Tech Cart</h2>
          {cart.map((item) => (
            <div key={item.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-slate-500">{currencyText(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="h-8 w-8 rounded border" onClick={() => updateCartQty(item.id, item.quantity - 1)}>-</button>
                <span>{item.quantity}</span>
                <button className="h-8 w-8 rounded border" onClick={() => updateCartQty(item.id, item.quantity + 1)}>+</button>
                <button className="h-8 px-2 rounded border text-red-600" onClick={() => removeFromCart(item.id)}>x</button>
              </div>
            </div>
          ))}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 h-fit">
          <p className="flex justify-between text-sm"><span>Subtotal</span><span>{currencyText(cartTotal)}</span></p>
          <p className="flex justify-between text-sm"><span>Discount</span><span>- {currencyText(discountAmount)}</span></p>
          <p className="flex justify-between text-sm"><span>Shipping</span><span>{currencyText(shippingAmount)}</span></p>
          <p className="flex justify-between text-lg font-semibold border-t mt-2 pt-2"><span>Total</span><span>{currencyText(payableTotal)}</span></p>
          <Link to={`/s/${subdomain}/checkout`} className="mt-3 block text-center h-11 rounded-lg text-white font-medium leading-[44px]" style={{ backgroundColor: primary }}>Checkout</Link>
        </section>
      </main>
    );
  }

  if (mode === "checkout") {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-xl font-semibold">Checkout</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="h-10 rounded-lg border px-3" value={checkoutForm.name} onChange={(e) => setCheckoutForm((s) => ({ ...s, name: e.target.value }))} placeholder="Full name" />
            <input className="h-10 rounded-lg border px-3" value={checkoutForm.email} onChange={(e) => setCheckoutForm((s) => ({ ...s, email: e.target.value }))} placeholder="Email" />
            <input className="h-10 rounded-lg border px-3" value={checkoutForm.phone} onChange={(e) => setCheckoutForm((s) => ({ ...s, phone: e.target.value }))} placeholder="Phone" />
            <select className="h-10 rounded-lg border px-3" value={checkoutForm.state} onChange={(e) => setCheckoutForm((s) => ({ ...s, state: e.target.value }))}>
              <option value="">State</option>
              {indiaStates.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <input className="h-10 rounded-lg border px-3 md:col-span-2" value={checkoutForm.addressLine1} onChange={(e) => setCheckoutForm((s) => ({ ...s, addressLine1: e.target.value }))} placeholder="Address line 1" />
          </div>
          <button onClick={checkout} className="h-11 px-5 rounded-lg text-white font-medium" style={{ backgroundColor: primary }}>Place Order</button>
          {checkoutMessage ? <p className={`text-sm ${checkoutStatus === "error" ? "text-red-600" : checkoutStatus === "success" ? "text-emerald-600" : "text-amber-600"}`}>{checkoutMessage}</p> : null}
        </section>
      </main>
    );
  }

  if (mode === "login") {
    return (
      <main className="max-w-xl mx-auto px-4 py-10">
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex gap-2">
            <button className={`px-3 py-1.5 rounded border ${authMode === "login" ? "bg-slate-900 text-white" : ""}`} onClick={() => setAuthMode("login")}>Login</button>
            <button className={`px-3 py-1.5 rounded border ${authMode === "register" ? "bg-slate-900 text-white" : ""}`} onClick={() => setAuthMode("register")}>Register</button>
          </div>
          {authMode === "register" ? <input className="h-10 rounded-lg border px-3 w-full" value={authForm.name} onChange={(e) => setAuthForm((s) => ({ ...s, name: e.target.value }))} placeholder="Name" /> : null}
          <input className="h-10 rounded-lg border px-3 w-full" value={authForm.email} onChange={(e) => setAuthForm((s) => ({ ...s, email: e.target.value }))} placeholder="Email" />
          <input className="h-10 rounded-lg border px-3 w-full" type="password" value={authForm.password} onChange={(e) => setAuthForm((s) => ({ ...s, password: e.target.value }))} placeholder="Password" />
          <button onClick={customerAuthSubmit} className="h-11 px-5 rounded-lg text-white font-medium" style={{ backgroundColor: primary }}>{authMode === "register" ? "Register" : "Login"}</button>
          {authState?.message ? <p className="text-sm text-slate-600">{authState.message}</p> : null}
        </section>
      </main>
    );
  }

  if (mode === "page") {
    return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <article className="rounded-xl border border-slate-200 bg-white p-8">
          <h1 className="text-3xl font-semibold mb-3">{page?.title || "Page"}</h1>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: page?.content || "" }} />
        </article>
      </main>
    );
  }

  return null;
}
