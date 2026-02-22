import { Link } from "react-router-dom";

const fallbackHero = "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1800&q=80";

const RuntimeBadge = ({ text }) => (
  <span className="text-[11px] px-2 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">{text}</span>
);

export default function KuzmaFashionRuntime({
  subdomain,
  mode,
  categories,
  searchedProducts,
  categoryNameById,
  showPricing,
  currencyText,
  productImageUrl,
  productRating,
  productBadge,
  primary,
  addToCart,
  isPreviewMode,
  categoryId,
  setCategoryId,
  sortBy,
  setSortBy,
  selectedBrand,
  setSelectedBrand,
  selectedSize,
  setSelectedSize,
  selectedColor,
  setSelectedColor,
  catalogMeta,
  pdp,
  pdpMedia,
  pdpImage,
  setPdpImage,
  pdpSizes,
  pdpSize,
  setPdpSize,
  pdpColors,
  pdpColor,
  setPdpColor,
  themeAssetBase,
  page,
  cart,
  cartCount,
  cartTotal,
  updateCartQty,
  removeFromCart,
  coupon,
  setCoupon,
  configuredOfferCode,
  shippingAmount,
  discountAmount,
  payableTotal,
  checkoutForm,
  setCheckoutForm,
  indiaStates,
  checkout,
  checkoutStatus,
  checkoutMessage,
  checkoutAccount,
  reservation,
  authState,
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  customerAuthSubmit,
  securityForm,
  setSecurityForm,
  verifyEmailOtp,
  forgotPassword,
  resetPassword,
  sessions,
  loadSessions,
  revokeSession,
}) {
  const heroImage = themeAssetBase ? `${themeAssetBase}/banner.jpg` : fallbackHero;

  if (mode === "home") {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <section className="grid lg:grid-cols-[1.2fr,1fr] rounded-3xl overflow-hidden border border-slate-200 bg-white">
          <div className="p-8 lg:p-12 bg-slate-50">
            <RuntimeBadge text="Kuzma Runtime Pack" />
            <h1 className="mt-4 text-4xl lg:text-6xl leading-tight font-light text-slate-900">Simple is More</h1>
            <p className="mt-4 text-slate-600 text-lg">Fashion-first storefront runtime with modern catalog and premium PDP flow.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={`/s/${subdomain}/products`} className="px-6 py-3 rounded-xl text-white font-medium" style={{ backgroundColor: primary }}>Shop Collection</Link>
              <Link to={`/s/${subdomain}/sale`} className="px-6 py-3 rounded-xl border border-slate-300 font-medium">View Sale</Link>
            </div>
          </div>
          <div className="min-h-[360px]">
            <img src={heroImage} alt="Kuzma hero" className="h-full w-full object-cover" />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Featured Categories</h2>
            <Link to={`/s/${subdomain}/products`} className="text-sm underline">Browse all</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.slice(0, 4).map((cat, idx) => (
              <Link
                key={cat.id}
                to={`/s/${subdomain}/products?category=${encodeURIComponent(cat.id)}`}
                className="group border border-slate-200 rounded-2xl overflow-hidden bg-white"
              >
                <img
                  src={themeAssetBase ? `${themeAssetBase}/luxury category ${idx + 1}.png` : `https://placehold.co/600x480/F4F4F5/334155?text=${encodeURIComponent(cat.name)}`}
                  alt={cat.name}
                  className="h-44 w-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="p-4">
                  <p className="font-semibold">{cat.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Trending Products</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {searchedProducts.slice(0, 8).map((p) => (
              <article key={p.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <Link to={`/s/${subdomain}/products/${p.id}`} className="block h-64 overflow-hidden bg-slate-100">
                  <img src={productImageUrl(p)} alt={p.title} className="h-full w-full object-cover hover:scale-105 transition duration-500" />
                </Link>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100">{productBadge(p)}</span>
                    <span className="text-xs text-amber-600">★ {productRating(p.id)}</span>
                  </div>
                  <Link to={`/s/${subdomain}/products/${p.id}`} className="font-medium line-clamp-1">{p.title}</Link>
                  <p className="text-xs text-slate-500 mt-1">{categoryNameById.get(String(p.categoryId || "")) || "General"}</p>
                  <p className="mt-2 font-semibold">{showPricing ? currencyText(p.price, p.currency) : "Login to view price"}</p>
                  <button
                    type="button"
                    className="mt-3 w-full px-3 py-2 rounded-lg text-white disabled:opacity-50"
                    style={{ backgroundColor: primary }}
                    disabled={isPreviewMode}
                    onClick={() => addToCart(p, 1)}
                  >
                    Quick Add
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (mode === "catalog") {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[280px,1fr] gap-6">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 h-fit">
          <h3 className="font-semibold">Filter</h3>
          <div>
            <p className="text-sm mb-1">Category</p>
            <select className="w-full h-10 border rounded-lg px-3" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-sm mb-1">Brand</p>
            <select className="w-full h-10 border rounded-lg px-3" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
              <option value="all">All brands</option>
              {catalogMeta.brandList.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </div>
          <div>
            <p className="text-sm mb-1">Size</p>
            <div className="flex flex-wrap gap-2">
              <button className={`px-3 py-1 rounded border text-sm ${selectedSize === "all" ? "bg-slate-900 text-white" : ""}`} onClick={() => setSelectedSize("all")}>All</button>
              {catalogMeta.sizeList.map((size) => (
                <button key={size} className={`px-3 py-1 rounded border text-sm ${selectedSize === size ? "bg-slate-900 text-white" : ""}`} onClick={() => setSelectedSize(size)}>{size}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm mb-1">Color</p>
            <div className="flex flex-wrap gap-2">
              <button className={`px-3 py-1 rounded border text-sm ${selectedColor === "all" ? "bg-slate-900 text-white" : ""}`} onClick={() => setSelectedColor("all")}>All</button>
              {catalogMeta.colorList.map((color) => (
                <button key={color} className={`px-3 py-1 rounded border text-sm ${selectedColor === color ? "bg-slate-900 text-white" : ""}`} onClick={() => setSelectedColor(color)}>{color}</button>
              ))}
            </div>
          </div>
        </aside>

        <section>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-2xl font-semibold">Product Catalog</h2>
            <select className="h-10 rounded-lg border px-3 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="popularity">Popularity</option>
              <option value="price_asc">Price Low to High</option>
              <option value="price_desc">Price High to Low</option>
              <option value="newest">New Arrivals</option>
            </select>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {searchedProducts.map((p) => (
              <article key={p.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <Link to={`/s/${subdomain}/products/${p.id}`} className="block h-64 bg-slate-100 overflow-hidden">
                  <img src={productImageUrl(p)} alt={p.title} className="h-full w-full object-cover hover:scale-105 transition duration-500" />
                </Link>
                <div className="p-4">
                  <p className="font-semibold line-clamp-1">{p.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{categoryNameById.get(String(p.categoryId || "")) || "General"}</p>
                  <p className="mt-2 font-semibold">{showPricing ? currencyText(p.price, p.currency) : "Login to view price"}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="flex-1 px-3 py-2 rounded-lg text-white text-sm disabled:opacity-50"
                      style={{ backgroundColor: primary }}
                      disabled={isPreviewMode}
                      onClick={() => addToCart(p, 1)}
                    >
                      Quick Add
                    </button>
                    <Link to={`/s/${subdomain}/products/${p.id}`} className="px-3 py-2 rounded-lg border text-sm">View</Link>
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
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-8">
        <section>
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100">
            <img src={pdpMedia[pdpImage]?.url || productImageUrl(pdp)} alt={pdp.title} className="h-[560px] w-full object-cover" />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {pdpMedia.map((media, idx) => (
              <button key={`${media.url}-${idx}`} className={`h-20 w-20 rounded-lg border overflow-hidden ${idx === pdpImage ? "border-slate-900" : "border-slate-200"}`} onClick={() => setPdpImage(idx)}>
                <img src={media.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>
        <section className="space-y-4">
          <RuntimeBadge text="Kuzma Product Detail Runtime" />
          <h1 className="text-3xl font-semibold">{pdp.title}</h1>
          <p className="text-slate-600">{pdp.description}</p>
          <p className="text-2xl font-bold">{showPricing ? currencyText(pdp.price, pdp.currency) : "Login to view price"}</p>

          {pdpSizes.length > 0 ? (
            <div>
              <p className="text-sm font-medium mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {pdpSizes.map((size) => (
                  <button key={size} className={`px-3 py-1.5 rounded border text-sm ${pdpSize === size ? "bg-slate-900 text-white" : ""}`} onClick={() => setPdpSize(size)}>{size}</button>
                ))}
              </div>
            </div>
          ) : null}

          {pdpColors.length > 0 ? (
            <div>
              <p className="text-sm font-medium mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {pdpColors.map((color) => (
                  <button key={color} className={`px-3 py-1.5 rounded border text-sm ${pdpColor === color ? "bg-slate-900 text-white" : ""}`} onClick={() => setPdpColor(color)}>{color}</button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <button type="button" disabled={isPreviewMode} className="px-4 py-3 rounded-xl text-white font-medium disabled:opacity-50" style={{ backgroundColor: primary }} onClick={() => addToCart(pdp, 1)}>Add to Cart</button>
            <Link to={`/s/${subdomain}/checkout`} className="px-4 py-3 rounded-xl border text-center font-medium">Buy Now</Link>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
            Delivery estimate: 2-5 business days • Easy returns • Secure payment
          </div>
        </section>
      </main>
    );
  }

  if (mode === "cart") {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[1.4fr,0.9fr] gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Your Cart</h2>
            <RuntimeBadge text="Kuzma Cart Runtime" />
          </div>
          {cart.length === 0 ? (
            <p className="text-slate-500">Your cart is empty.</p>
          ) : cart.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-slate-500">{currencyText(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="h-8 w-8 rounded border" onClick={() => updateCartQty(item.id, item.quantity - 1)}>-</button>
                <span className="min-w-7 text-center">{item.quantity}</span>
                <button className="h-8 w-8 rounded border" onClick={() => updateCartQty(item.id, item.quantity + 1)}>+</button>
                <button className="h-8 px-3 rounded border text-red-600" onClick={() => removeFromCart(item.id)}>Remove</button>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 h-fit space-y-4">
          <h3 className="text-xl font-semibold">Order Summary</h3>
          <div className="flex gap-2">
            <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder={`Coupon (${configuredOfferCode || "WELCOME10"})`} className="h-10 rounded-lg border px-3 flex-1" />
          </div>
          <div className="space-y-1 text-sm">
            <p className="flex justify-between"><span>Items ({cartCount})</span><span>{currencyText(cartTotal)}</span></p>
            <p className="flex justify-between"><span>Discount</span><span>- {currencyText(discountAmount)}</span></p>
            <p className="flex justify-between"><span>Shipping</span><span>{currencyText(shippingAmount)}</span></p>
            <p className="flex justify-between text-base font-semibold border-t pt-2 mt-2"><span>Total</span><span>{currencyText(payableTotal)}</span></p>
          </div>
          <Link to={`/s/${subdomain}/checkout`} className="block text-center w-full px-4 py-3 rounded-xl text-white font-medium" style={{ backgroundColor: primary }}>
            Proceed to Checkout
          </Link>
        </section>
      </main>
    );
  }

  if (mode === "checkout") {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[1.4fr,0.9fr] gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Checkout</h2>
            <RuntimeBadge text="Kuzma Checkout Runtime" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input value={checkoutForm.name} onChange={(e) => setCheckoutForm((s) => ({ ...s, name: e.target.value }))} placeholder="Full name" className="h-11 rounded-lg border px-3" />
            <input value={checkoutForm.email} onChange={(e) => setCheckoutForm((s) => ({ ...s, email: e.target.value }))} placeholder="Email" className="h-11 rounded-lg border px-3" />
            <input value={checkoutForm.phone} onChange={(e) => setCheckoutForm((s) => ({ ...s, phone: e.target.value }))} placeholder="Phone" className="h-11 rounded-lg border px-3" />
            <select value={checkoutForm.state} onChange={(e) => setCheckoutForm((s) => ({ ...s, state: e.target.value }))} className="h-11 rounded-lg border px-3">
              <option value="">Select state</option>
              {indiaStates.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
            <input value={checkoutForm.city} onChange={(e) => setCheckoutForm((s) => ({ ...s, city: e.target.value }))} placeholder="City" className="h-11 rounded-lg border px-3" />
            <input value={checkoutForm.postalCode} onChange={(e) => setCheckoutForm((s) => ({ ...s, postalCode: e.target.value }))} placeholder="Postal code" className="h-11 rounded-lg border px-3" />
            <input value={checkoutForm.addressLine1} onChange={(e) => setCheckoutForm((s) => ({ ...s, addressLine1: e.target.value }))} placeholder="Address line 1" className="h-11 rounded-lg border px-3 md:col-span-2" />
            <input value={checkoutForm.addressLine2} onChange={(e) => setCheckoutForm((s) => ({ ...s, addressLine2: e.target.value }))} placeholder="Address line 2" className="h-11 rounded-lg border px-3 md:col-span-2" />
          </div>
          <div className="grid md:grid-cols-3 gap-2">
            {["cod", "upi", "card"].map((modeKey) => (
              <button
                type="button"
                key={modeKey}
                className={`h-10 rounded-lg border text-sm ${checkoutForm.paymentMethod === modeKey ? "text-white border-transparent" : ""}`}
                style={checkoutForm.paymentMethod === modeKey ? { backgroundColor: primary } : {}}
                onClick={() => setCheckoutForm((s) => ({ ...s, paymentMethod: modeKey }))}
              >
                {modeKey.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              className="px-4 py-3 rounded-xl text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: primary }}
              disabled={reservation.loading}
              onClick={checkout}
            >
              {reservation.loading ? "Processing..." : `Pay ${currencyText(payableTotal)}`}
            </button>
            <Link to={`/s/${subdomain}/cart`} className="px-4 py-3 rounded-xl border text-center font-medium">Back to Cart</Link>
          </div>
          {checkoutMessage ? (
            <div className={`rounded-lg border px-3 py-2 text-sm ${
              checkoutStatus === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
              checkoutStatus === "error" ? "bg-red-50 border-red-200 text-red-700" :
              "bg-amber-50 border-amber-200 text-amber-700"
            }`}>{checkoutMessage}</div>
          ) : null}
          {checkoutAccount?.email ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              Account created: <strong>{checkoutAccount.email}</strong><br />
              Password: <strong>{checkoutAccount.password}</strong>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 h-fit space-y-3">
          <h3 className="text-xl font-semibold">Summary</h3>
          <p className="flex justify-between text-sm"><span>Subtotal</span><span>{currencyText(cartTotal)}</span></p>
          <p className="flex justify-between text-sm"><span>Shipping</span><span>{currencyText(shippingAmount)}</span></p>
          <p className="flex justify-between text-sm"><span>Discount</span><span>- {currencyText(discountAmount)}</span></p>
          <p className="flex justify-between text-base font-semibold border-t pt-2"><span>Total</span><span>{currencyText(payableTotal)}</span></p>
        </section>
      </main>
    );
  }

  if (mode === "login") {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{authMode === "register" ? "Create account" : "Login to your account"}</h2>
            <RuntimeBadge text="Kuzma Auth Runtime" />
          </div>
          <div className="flex gap-2">
            <button className={`px-4 py-2 rounded-lg border ${authMode === "login" ? "bg-slate-900 text-white" : ""}`} onClick={() => setAuthMode("login")}>Login</button>
            <button className={`px-4 py-2 rounded-lg border ${authMode === "register" ? "bg-slate-900 text-white" : ""}`} onClick={() => setAuthMode("register")}>Register</button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {authMode === "register" ? <input value={authForm.name} onChange={(e) => setAuthForm((s) => ({ ...s, name: e.target.value }))} placeholder="Name" className="h-11 rounded-lg border px-3" /> : null}
            <input value={authForm.email} onChange={(e) => setAuthForm((s) => ({ ...s, email: e.target.value }))} placeholder="Email" className="h-11 rounded-lg border px-3" />
            {authMode === "register" ? <input value={authForm.phone} onChange={(e) => setAuthForm((s) => ({ ...s, phone: e.target.value }))} placeholder="Phone" className="h-11 rounded-lg border px-3" /> : null}
            <input value={authForm.password} type="password" onChange={(e) => setAuthForm((s) => ({ ...s, password: e.target.value }))} placeholder="Password" className="h-11 rounded-lg border px-3" />
          </div>
          <button className="px-4 py-3 rounded-xl text-white font-medium" style={{ backgroundColor: primary }} onClick={customerAuthSubmit}>
            {authMode === "register" ? "Register" : "Login"}
          </button>
          {authState?.message ? <p className="text-sm text-slate-600">{authState.message}</p> : null}

          <div className="pt-2 border-t space-y-2">
            <p className="text-sm font-medium">Security Actions</p>
            <div className="grid md:grid-cols-2 gap-2">
              <input value={securityForm.email} onChange={(e) => setSecurityForm((s) => ({ ...s, email: e.target.value }))} placeholder="Email for OTP / reset" className="h-10 rounded-lg border px-3" />
              <input value={securityForm.otp} onChange={(e) => setSecurityForm((s) => ({ ...s, otp: e.target.value }))} placeholder="Email OTP" className="h-10 rounded-lg border px-3" />
              <input value={securityForm.token} onChange={(e) => setSecurityForm((s) => ({ ...s, token: e.target.value }))} placeholder="Reset token" className="h-10 rounded-lg border px-3" />
              <input value={securityForm.newPassword} type="password" onChange={(e) => setSecurityForm((s) => ({ ...s, newPassword: e.target.value }))} placeholder="New password" className="h-10 rounded-lg border px-3" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-2 rounded border text-sm" onClick={verifyEmailOtp}>Verify Email OTP</button>
              <button className="px-3 py-2 rounded border text-sm" onClick={forgotPassword}>Forgot Password</button>
              <button className="px-3 py-2 rounded border text-sm" onClick={resetPassword}>Reset Password</button>
              <button className="px-3 py-2 rounded border text-sm" onClick={loadSessions}>Load Sessions</button>
            </div>
            {Array.isArray(sessions) && sessions.length > 0 ? (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div key={session.id} className="rounded border p-2 text-sm flex items-center justify-between">
                    <span>{session.userAgent || "Session"} • {session.clientIp || "ip"}</span>
                    <button className="px-2 py-1 rounded border text-xs" onClick={() => revokeSession(session.id)}>Revoke</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  if (mode === "page") {
    return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <article className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-semibold">{page?.title || "Page"}</h1>
            <RuntimeBadge text="Kuzma Static Page Runtime" />
          </div>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: page?.content || "" }} />
        </article>
      </main>
    );
  }

  return null;
}
