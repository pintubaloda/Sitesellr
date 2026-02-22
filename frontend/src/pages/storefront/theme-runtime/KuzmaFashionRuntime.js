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

  return null;
}
