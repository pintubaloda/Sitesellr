import { useEffect, useMemo, useState } from "react";
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

export default function StorefrontPublic() {
  const { subdomain } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(null);
  const [error, setError] = useState("");

  const slug = useMemo(() => {
    const path = location.pathname.replace(`/s/${subdomain}`, "").replace(/^\//, "");
    return path || "";
  }, [location.pathname, subdomain]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get(`/public/storefront/${subdomain}`);
        setData(res.data);
        setError("");
      } catch {
        setError("Store not found.");
      }
    };
    run();
  }, [subdomain]);

  useEffect(() => {
    const run = async () => {
      if (!slug) {
        setPage(null);
        return;
      }
      try {
        const res = await api.get(`/public/storefront/${subdomain}/pages/${slug}`);
        setPage(res.data);
      } catch {
        setPage({ title: "Page not found", content: "" });
      }
    };
    run();
  }, [slug, subdomain]);

  if (error) return <div className="min-h-screen p-10">{error}</div>;
  if (!data) return <div className="min-h-screen p-10">Loading storefront...</div>;

  const menu = parseJsonArray(data.navigation?.itemsJson);
  const sections = parseJsonArray(data.homepage?.sectionsJson);
  const showPricing = !!data.theme?.showPricing;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {data.theme?.logoUrl ? <img src={data.theme.logoUrl} alt={data.store?.name} className="h-8 w-8 rounded" /> : null}
            <h1 className="text-xl font-bold">{data.store?.name}</h1>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            {(menu.length ? menu : [{ label: "Home", path: "/" }]).map((m, idx) => (
              <Link key={`${m.path}-${idx}`} to={`/s/${subdomain}${m.path === "/" ? "" : m.path}`} className="text-slate-600 hover:text-slate-900">
                {m.label || "Link"}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {!slug ? (
        <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {sections.length > 0 ? (
            <section className="grid gap-3">
              {sections.map((s, idx) => (
                <div key={`${s.type}-${idx}`} className="rounded-xl bg-slate-100 px-4 py-3">{s.title || s.type || "Section"}</div>
              ))}
            </section>
          ) : null}

          <section>
            <h2 className="text-lg font-semibold mb-4">Products</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(data.products || []).map((p) => (
                <div key={p.id} className="border rounded-xl p-3">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                  <p className="text-sm mt-2 font-semibold">
                    {showPricing ? `${p.currency || "INR"} ${Number(p.price || 0).toLocaleString()}` : "Login to view price"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>
      ) : (
        <main className="max-w-3xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-4">{page?.title}</h2>
          <div className="prose prose-slate max-w-none whitespace-pre-wrap">{page?.content}</div>
        </main>
      )}
    </div>
  );
}
