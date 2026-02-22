import { Link } from "react-router-dom";

const heroFallback = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1800&q=80";

export default function GroceryFastCartRuntime({
  subdomain,
  mode,
  categories,
  searchedProducts,
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
        <section className="rounded-3xl overflow-hidden bg-emerald-700 text-white grid lg:grid-cols-[1.2fr,1fr]">
          <div className="p-8 lg:p-10">
            <p className="text-xs tracking-[0.26em] text-emerald-100">GROCERY FASTCART</p>
            <h1 className="mt-3 text-4xl font-semibold">Daily essentials in minutes</h1>
            <p className="mt-3 text-emerald-100">Compact cards, quick-add actions, and fast basket checkout.</p>
            <Link to={`/s/${subdomain}/products`} className="inline-block mt-6 px-5 py-2.5 rounded-lg bg-white text-emerald-700 font-semibold">Start Shopping</Link>
          </div>
          <img src={heroImage} alt="Grocery Hero" className="h-72 lg:h-full w-full object-cover" />
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {searchedProducts.slice(0, 10).map((p) => (
            <article key={p.id} className="rounded-xl border border-emerald-100 bg-white overflow-hidden">
              <Link to={`/s/${subdomain}/products/${p.id}`} className="block h-36 bg-slate-100">
                <img src={productImageUrl(p)} alt={p.title} className="h-full w-full object-cover" />
              </Link>
              <div className="p-2.5">
                <p className="text-sm font-medium line-clamp-2 min-h-[36px]">{p.title}</p>
                <p className="text-sm font-semibold mt-1">{showPricing ? currencyText(p.price, p.currency) : "Login to view price"}</p>
                <button onClick={() => addToCart(p, 1)} disabled={isPreviewMode} className="mt-2 w-full h-8 rounded-md text-white text-sm disabled:opacity-50" style={{ backgroundColor: primary }}>+ Add</button>
              </div>
            </article>
          ))}
        </section>
      </main>
    );
  }

  if (mode === "catalog") {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[220px,1fr] gap-4">
        <aside className="rounded-xl border border-emerald-100 bg-white p-3">
          <select className="h-10 rounded-lg border px-2 w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </aside>
        <section>
          <div className="flex justify-end mb-3">
            <select className="h-10 rounded-lg border px-3" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="popularity">Popularity</option>
              <option value="price_asc">Price Low to High</option>
              <option value="price_desc">Price High to Low</option>
              <option value="newest">New Arrivals</option>
            </select>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {searchedProducts.map((p) => (
              <article key={p.id} className="rounded-xl border border-emerald-100 bg-white overflow-hidden">
                <Link to={`/s/${subdomain}/products/${p.id}`} className="block h-36 bg-slate-100">
                  <img src={productImageUrl(p)} alt={p.title} className="h-full w-full object-cover" />
                </Link>
                <div className="p-2.5">
                  <p className="text-sm font-medium line-clamp-2 min-h-[36px]">{p.title}</p>
                  <p className="text-sm font-semibold mt-1">{showPricing ? currencyText(p.price, p.currency) : "Login to view price"}</p>
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
      <main className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr,1.1fr] gap-5">
        <section>
          <div className="rounded-xl border border-emerald-100 overflow-hidden bg-slate-100">
            <img src={pdpMedia[pdpImage]?.url || productImageUrl(pdp)} alt={pdp.title} className="h-[460px] w-full object-cover" />
          </div>
          <div className="mt-2 flex gap-2">
            {pdpMedia.slice(0, 5).map((m, idx) => (
              <button key={`${m.url}-${idx}`} className={`h-14 w-14 rounded border ${idx === pdpImage ? "border-emerald-600" : "border-slate-200"}`} onClick={() => setPdpImage(idx)}>
                <img src={m.url} alt="" className="h-full w-full object-cover rounded" />
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-emerald-100 bg-white p-5 space-y-4">
          <h1 className="text-2xl font-semibold">{pdp.title}</h1>
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
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <h2 className="text-2xl font-semibold">Basket</h2>
        {cart.map((item) => (
          <div key={item.id} className="rounded-xl border border-emerald-100 bg-white p-3 flex items-center justify-between">
            <p className="font-medium">{item.title}</p>
            <div className="flex items-center gap-2">
              <button className="h-8 w-8 rounded border" onClick={() => updateCartQty(item.id, item.quantity - 1)}>-</button>
              <span>{item.quantity}</span>
              <button className="h-8 w-8 rounded border" onClick={() => updateCartQty(item.id, item.quantity + 1)}>+</button>
              <button className="h-8 px-2 rounded border text-red-600" onClick={() => removeFromCart(item.id)}>x</button>
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-emerald-100 bg-white p-4 flex items-center justify-between">
          <p className="font-semibold">Total: {currencyText(payableTotal)}</p>
          <Link to={`/s/${subdomain}/checkout`} className="h-10 px-4 rounded-lg text-white font-medium leading-[40px]" style={{ backgroundColor: primary }}>Checkout</Link>
        </div>
      </main>
    );
  }

  if (mode === "checkout") {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <section className="rounded-xl border border-emerald-100 bg-white p-5 space-y-3">
          <h2 className="text-xl font-semibold">Fast Checkout</h2>
          <div className="grid md:grid-cols-2 gap-2">
            <input className="h-10 rounded-lg border px-3" value={checkoutForm.name} onChange={(e) => setCheckoutForm((s) => ({ ...s, name: e.target.value }))} placeholder="Name" />
            <input className="h-10 rounded-lg border px-3" value={checkoutForm.email} onChange={(e) => setCheckoutForm((s) => ({ ...s, email: e.target.value }))} placeholder="Email" />
            <input className="h-10 rounded-lg border px-3" value={checkoutForm.phone} onChange={(e) => setCheckoutForm((s) => ({ ...s, phone: e.target.value }))} placeholder="Phone" />
            <select className="h-10 rounded-lg border px-3" value={checkoutForm.state} onChange={(e) => setCheckoutForm((s) => ({ ...s, state: e.target.value }))}>
              <option value="">State</option>
              {indiaStates.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <input className="h-10 rounded-lg border px-3 md:col-span-2" value={checkoutForm.addressLine1} onChange={(e) => setCheckoutForm((s) => ({ ...s, addressLine1: e.target.value }))} placeholder="Address" />
          </div>
          <button onClick={checkout} className="h-11 px-5 rounded-lg text-white font-medium" style={{ backgroundColor: primary }}>Place Order</button>
          {checkoutMessage ? <p className={`text-sm ${checkoutStatus === "error" ? "text-red-600" : checkoutStatus === "success" ? "text-emerald-600" : "text-amber-600"}`}>{checkoutMessage}</p> : null}
        </section>
      </main>
    );
  }

  if (mode === "login") {
    return (
      <main className="max-w-lg mx-auto px-4 py-10">
        <section className="rounded-xl border border-emerald-100 bg-white p-5 space-y-3">
          <div className="flex gap-2">
            <button className={`px-3 py-1.5 rounded border ${authMode === "login" ? "bg-emerald-700 text-white border-emerald-700" : ""}`} onClick={() => setAuthMode("login")}>Login</button>
            <button className={`px-3 py-1.5 rounded border ${authMode === "register" ? "bg-emerald-700 text-white border-emerald-700" : ""}`} onClick={() => setAuthMode("register")}>Register</button>
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
        <article className="rounded-xl border border-emerald-100 bg-white p-8">
          <h1 className="text-3xl font-semibold mb-3">{page?.title || "Page"}</h1>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: page?.content || "" }} />
        </article>
      </main>
    );
  }

  return null;
}
