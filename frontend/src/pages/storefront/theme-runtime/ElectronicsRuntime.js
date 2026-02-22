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

  return null;
}
