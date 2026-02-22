import { Link } from "react-router-dom";

const heroFallback = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=80";

export default function LuxurySignatureRuntime({
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
  themeAssetBase,
}) {
  const heroImage = themeAssetBase ? `${themeAssetBase}/banner.jpg` : heroFallback;
  const accent = primary || "#bfa36a";

  if (mode === "home") {
    return (
      <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <section className="rounded-3xl overflow-hidden border border-amber-200 bg-black text-white grid lg:grid-cols-[1.1fr,1fr]">
          <div className="p-10">
            <p className="text-xs tracking-[0.32em] text-amber-300">LUXURY SIGNATURE</p>
            <h1 className="mt-4 text-5xl leading-tight font-light">Crafted for premium brands</h1>
            <p className="mt-4 text-amber-100/85">High-contrast editorial storefront with premium checkout feel.</p>
            <div className="mt-7 flex gap-3">
              <Link to={`/s/${subdomain}/products`} className="px-6 py-3 rounded-xl font-medium text-black" style={{ backgroundColor: accent }}>Explore Collection</Link>
              <Link to={`/s/${subdomain}/sale`} className="px-6 py-3 rounded-xl border border-amber-400/50 font-medium">Exclusive Offers</Link>
            </div>
          </div>
          <img src={heroImage} alt="Luxury Hero" className="h-80 lg:h-full w-full object-cover" />
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {searchedProducts.slice(0, 8).map((p) => (
            <article key={p.id} className="border border-amber-200 bg-white overflow-hidden">
              <Link to={`/s/${subdomain}/products/${p.id}`} className="block h-72 bg-slate-100">
                <img src={productImageUrl(p)} alt={p.title} className="h-full w-full object-cover" />
              </Link>
              <div className="p-4">
                <p className="text-sm uppercase tracking-wide text-slate-500">Luxury Edit</p>
                <p className="mt-2 text-base font-medium line-clamp-2 min-h-[44px]">{p.title}</p>
                <p className="mt-2 text-lg font-semibold">{showPricing ? currencyText(p.price, p.currency) : "Login to view price"}</p>
                <button disabled={isPreviewMode} onClick={() => addToCart(p, 1)} className="mt-4 w-full h-10 text-black font-medium disabled:opacity-50" style={{ backgroundColor: accent }}>Add to Bag</button>
              </div>
            </article>
          ))}
        </section>
      </main>
    );
  }

  if (mode === "catalog") {
    return (
      <main className="max-w-7xl mx-auto px-4 py-10 grid lg:grid-cols-[230px,1fr] gap-5">
        <aside className="border border-amber-200 bg-white p-4 h-fit">
          <p className="text-sm uppercase tracking-wider text-slate-500 mb-2">Collection</p>
          <select className="h-10 w-full border px-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </aside>
        <section>
          <div className="flex justify-end mb-3">
            <select className="h-10 border px-3" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="popularity">Popularity</option>
              <option value="price_asc">Price Low to High</option>
              <option value="price_desc">Price High to Low</option>
              <option value="newest">New Arrivals</option>
            </select>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {searchedProducts.map((p) => (
              <article key={p.id} className="border border-amber-200 bg-white overflow-hidden">
                <Link to={`/s/${subdomain}/products/${p.id}`} className="block h-80 bg-slate-100">
                  <img src={productImageUrl(p)} alt={p.title} className="h-full w-full object-cover" />
                </Link>
                <div className="p-4">
                  <p className="text-base font-medium line-clamp-2">{p.title}</p>
                  <p className="mt-2 text-lg font-semibold">{showPricing ? currencyText(p.price, p.currency) : "Login to view price"}</p>
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
      <main className="max-w-7xl mx-auto px-4 py-10 grid lg:grid-cols-2 gap-8">
        <section>
          <div className="border border-amber-200 bg-slate-100 overflow-hidden">
            <img src={pdpMedia[pdpImage]?.url || productImageUrl(pdp)} alt={pdp.title} className="h-[620px] w-full object-cover" />
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {pdpMedia.map((m, idx) => (
              <button key={`${m.url}-${idx}`} className={`h-16 w-16 border ${idx === pdpImage ? "border-amber-500" : "border-slate-200"}`} onClick={() => setPdpImage(idx)}>
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>
        <section className="border border-amber-200 bg-white p-8 space-y-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Signature Product</p>
          <h1 className="text-4xl font-light">{pdp.title}</h1>
          <p className="text-slate-600 leading-7">{pdp.description}</p>
          <p className="text-3xl font-semibold">{showPricing ? currencyText(pdp.price, pdp.currency) : "Login to view price"}</p>
          <div className="grid grid-cols-2 gap-3">
            <button disabled={isPreviewMode} onClick={() => addToCart(pdp, 1)} className="h-12 font-medium text-black disabled:opacity-50" style={{ backgroundColor: accent }}>Add to Bag</button>
            <Link to={`/s/${subdomain}/checkout`} className="h-12 border flex items-center justify-center font-medium">Buy Now</Link>
          </div>
        </section>
      </main>
    );
  }

  return null;
}
