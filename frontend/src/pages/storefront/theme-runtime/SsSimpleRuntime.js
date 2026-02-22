import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const heroFallback = "https://picsum.photos/1200/280?random=99";

export default function SsSimpleRuntime({
  subdomain,
  mode,
  searchedProducts,
  categoryNameById,
  showPricing,
  currencyText,
  productImageUrl,
  primary,
  addToCart,
  isPreviewMode,
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
  const [maxPrice, setMaxPrice] = useState(2000);
  const [selectedBrands, setSelectedBrands] = useState([]);

  const brandOptions = useMemo(() => {
    const values = searchedProducts
      .map((p) => String(categoryNameById.get(String(p.categoryId || "")) || "General"))
      .filter(Boolean);
    return Array.from(new Set(values));
  }, [searchedProducts, categoryNameById]);

  const filteredProducts = useMemo(() => searchedProducts.filter((p) => {
    const price = Number(p.price || 0);
    const brand = String(categoryNameById.get(String(p.categoryId || "")) || "General");
    return price <= maxPrice && (selectedBrands.length === 0 || selectedBrands.includes(brand));
  }), [searchedProducts, maxPrice, selectedBrands, categoryNameById]);

  const toggleBrand = (brand) => {
    setSelectedBrands((prev) => (prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]));
  };

  if (mode === "home" || mode === "catalog") {
    return (
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <section className="rounded-xl overflow-hidden">
          <img
            src={themeAssetBase ? `${themeAssetBase}/banner.jpg` : heroFallback}
            alt="SS Simple hero"
            className="w-full h-[220px] object-cover"
          />
        </section>

        <section className="grid lg:grid-cols-[260px,1fr] gap-6">
          <aside className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 h-fit">
            <h2 className="font-medium text-sm mb-3">Filters</h2>
            <div className="mb-4">
              <p className="text-xs mb-1">Price: INR {maxPrice}</p>
              <input
                type="range"
                min="500"
                max="20000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <p className="text-xs font-medium mb-2">Brand</p>
              {(brandOptions.length ? brandOptions : ["General"]).map((brand) => (
                <label key={brand} className="block text-xs mb-1">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleBrand(brand)}
                  />
                  {brand}
                </label>
              ))}
            </div>
          </aside>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Products</h2>
              <Link to={`/s/${subdomain}/sale`} className="text-sm underline">View Sale</Link>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map((p) => (
                <article key={p.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                  <Link to={`/s/${subdomain}/products/${p.id}`} className="block rounded mb-2 overflow-hidden bg-slate-100">
                    <img src={productImageUrl(p)} alt={p.title} className="w-full h-72 object-cover" />
                  </Link>
                  <p className="text-sm line-clamp-1">{p.title}</p>
                  <p className="text-xs text-gray-500">{categoryNameById.get(String(p.categoryId || "")) || "General"}</p>
                  <p className="text-sm font-semibold mt-1">{showPricing ? currencyText(p.price, p.currency) : "Login to view price"}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={isPreviewMode}
                      onClick={() => addToCart(p, 1)}
                      className="flex-1 rounded-md py-2 text-sm text-white disabled:opacity-50"
                      style={{ backgroundColor: primary }}
                    >
                      Add to Cart
                    </button>
                    <Link to={`/s/${subdomain}/products/${p.id}`} className="rounded-md border px-3 py-2 text-sm">View</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>
    );
  }

  if (mode === "pdp" && pdp) {
    const originalPrice = Number(pdp.compareAtPrice || 0) > Number(pdp.price || 0)
      ? Number(pdp.compareAtPrice || 0)
      : Math.round(Number(pdp.price || 0) * 1.35);
    const discount = originalPrice > 0
      ? Math.round(((originalPrice - Number(pdp.price || 0)) / originalPrice) * 100)
      : 0;

    return (
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-12">
          <section className="grid grid-cols-2 gap-4">
            {(pdpMedia.length ? pdpMedia : [{ url: productImageUrl(pdp) }]).slice(0, 4).map((media, i) => (
              <button type="button" key={`${media.url}-${i}`} className={`w-full rounded-lg overflow-hidden border ${pdpImage === i ? "border-slate-900" : "border-slate-200"}`} onClick={() => setPdpImage(i)}>
                <img src={media.url} alt={`${pdp.title}-${i + 1}`} className="w-full h-[290px] object-cover" />
              </button>
            ))}
          </section>

          <section>
            <h1 className="text-2xl font-semibold">{pdp.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Premium comfort wear designed for everyday elegance.</p>
            <div className="mt-4">
              <span className="text-3xl font-semibold">{showPricing ? currencyText(pdp.price, pdp.currency) : "Login to view price"}</span>
              {showPricing ? (
                <>
                  <span className="text-sm line-through text-gray-400 ml-2">{currencyText(originalPrice, pdp.currency)}</span>
                  <span className="text-sm text-red-500 ml-2">SALE {discount > 0 ? `${discount}%` : ""}</span>
                </>
              ) : null}
            </div>

            {pdpSizes.length > 0 ? (
              <div className="mt-6">
                <p className="text-sm font-medium mb-2">Size</p>
                <div className="flex gap-2 flex-wrap">
                  {pdpSizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPdpSize(s)}
                      className={`px-4 py-1 border rounded text-sm ${pdpSize === s ? "border-black bg-black text-white" : "border-gray-300"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {pdpColors.length > 0 ? (
              <div className="mt-6">
                <p className="text-sm font-medium mb-2">Color</p>
                <div className="flex gap-3">
                  {pdpColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setPdpColor(c)}
                      className={`w-6 h-6 rounded-full border ${pdpColor === c ? "ring-2 ring-black" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              disabled={isPreviewMode}
              onClick={() => addToCart(pdp, 1)}
              className="mt-8 w-full text-white py-3 text-sm rounded disabled:opacity-50"
              style={{ backgroundColor: primary }}
            >
              Add to Cart
            </button>

            <Link to={`/s/${subdomain}/checkout`} className="mt-2 w-full border py-3 text-sm rounded block text-center">Buy it Now</Link>

            <div className="mt-6 text-sm text-gray-600">
              <p>Free Shipping on INR 999</p>
              <p>30 Days Easy Returns</p>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-3 text-center text-xs text-gray-600 border-t mt-10 pt-6">
          <div>Free Shipping Over INR 999</div>
          <div>30 Days Easy Returns</div>
          <div>Secure Checkout</div>
        </div>
      </main>
    );
  }

  return null;
}
