import { useState, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   SITESELLR — COMPLETE INDIAN E-COMMERCE THEME
   Pages: Landing · Product Detail · Cart · Checkout · Order Success
          Login · Signup · Customer Dashboard
   Design: Warm saffron-ivory luxury with deep teal accents
   Market: India — INR, COD, UPI, GST, Pincode, WhatsApp
═══════════════════════════════════════════════════════════════ */

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');`;

const C = {
  saffron:   "#E8650A",
  saffronL:  "#F5813B",
  saffronXL: "#FFF3EB",
  teal:      "#0D6E6E",
  tealL:     "#E6F4F4",
  tealD:     "#084848",
  gold:      "#C9921A",
  goldL:     "#FBF3DC",
  ivory:     "#FAF7F2",
  cream:     "#F3EDE3",
  brown:     "#5C3D1E",
  text:      "#1A1208",
  muted:     "#7A6652",
  border:    "#E0D5C5",
  white:     "#FFFFFF",
  green:     "#166534",
  greenL:    "#DCFCE7",
  red:       "#991B1B",
  redL:      "#FEE2E2",
  shadow:    "rgba(92,61,30,0.12)",
};

/* ─── MOCK DATA ──────────────────────────────────────────────── */
const PRODUCTS = [
  { id:1, name:"Banarasi Silk Saree", slug:"banarasi-silk-saree", category:"Sarees", price:4999, mrp:8500, images:["👘","🎋","✨"], rating:4.8, reviews:234, badge:"Bestseller", description:"Handwoven pure silk Banarasi saree with zari border. Pure katan silk with authentic brocade work. Perfect for weddings and festivals.", fabric:"Pure Katan Silk", origin:"Varanasi", care:"Dry clean only", sizes:["Free Size"], colors:["Red","Blue","Green","Maroon"], stock:12, cod:true, emi:"₹417/mo" },
  { id:2, name:"Chanderi Cotton Kurti", slug:"chanderi-kurti", category:"Kurtis", price:1299, mrp:2200, images:["👗","🌸","💐"], rating:4.5, reviews:189, badge:"New Arrival", description:"Light and breathable Chanderi cotton kurti with delicate prints. Ideal for daily wear and casual occasions.", fabric:"Chanderi Cotton", origin:"Madhya Pradesh", care:"Hand wash", sizes:["XS","S","M","L","XL","XXL"], colors:["White","Pink","Yellow"], stock:45, cod:true, emi:null },
  { id:3, name:"Kanjivaram Silk Saree", slug:"kanjivaram-saree", category:"Sarees", price:12999, mrp:18000, images:["🥻","🌺","⭐"], rating:4.9, reviews:312, badge:"Premium", description:"Authentic Kanjivaram pure silk saree with traditional temple border. Zari work in gold thread.", fabric:"Pure Mulberry Silk", origin:"Kanchipuram", care:"Dry clean only", sizes:["Free Size"], colors:["Purple","Green","Orange"], stock:6, cod:false, emi:"₹1,083/mo" },
  { id:4, name:"Phulkari Dupatta", slug:"phulkari-dupatta", category:"Dupattas", price:899, mrp:1500, images:["🌻","🎨","✿"], rating:4.6, reviews:98, badge:"Handcrafted", description:"Traditional Punjabi phulkari embroidery dupatta. Each piece is hand-embroidered by skilled artisans.", fabric:"Cotton", origin:"Punjab", care:"Hand wash cold", sizes:["Free Size"], colors:["Orange","Blue","Pink"], stock:28, cod:true, emi:null },
  { id:5, name:"Anarkali Suit Set", slug:"anarkali-suit", category:"Suits", price:3499, mrp:5500, images:["👑","🌹","💎"], rating:4.7, reviews:156, badge:"Festival Pick", description:"Floor-length Anarkali with churidar and dupatta. Heavy embroidery with sequin work.", fabric:"Georgette", origin:"Surat", care:"Dry clean", sizes:["S","M","L","XL"], colors:["Royal Blue","Wine","Forest Green"], stock:18, cod:true, emi:"₹292/mo" },
  { id:6, name:"Ikkat Silk Dress Material", slug:"ikkat-dress", category:"Dress Material", price:1899, mrp:3200, images:["🎭","🌈","◈"], rating:4.4, reviews:77, badge:"Artisan", description:"Hand-dyed Ikkat silk dress material with unstitched fabric. Each piece has unique pattern variations.", fabric:"Pure Silk", origin:"Odisha", care:"Dry clean", sizes:["Free Size"], colors:["Red & Black","Blue & White"], stock:9, cod:true, emi:null },
];

const CATEGORIES = [
  { name:"Sarees", emoji:"🥻", count:"2,400+" },
  { name:"Kurtis", emoji:"👗", count:"1,800+" },
  { name:"Suits", emoji:"👘", count:"950+" },
  { name:"Lehengas", emoji:"💃", count:"640+" },
  { name:"Dupattas", emoji:"🌸", count:"1,200+" },
  { name:"Jewellery", emoji:"💎", count:"800+" },
];

const ORDERS = [
  { id:"SS20240112-001", date:"12 Jan 2026", status:"Delivered", items:[{name:"Banarasi Silk Saree",qty:1,price:4999}], total:5148, tracking:"BD123456789IN" },
  { id:"SS20240108-002", date:"8 Jan 2026",  status:"In Transit", items:[{name:"Chanderi Cotton Kurti",qty:2,price:2598}], total:2697, tracking:"BD987654321IN" },
  { id:"SS20231225-003", date:"25 Dec 2025", status:"Delivered", items:[{name:"Phulkari Dupatta",qty:1,price:899},{name:"Ikkat Silk Dress",qty:1,price:1899}], total:2897, tracking:"BD112233445IN" },
];

const WISHLIST = [PRODUCTS[2], PRODUCTS[4]];

/* ─── UTILS ──────────────────────────────────────────────────── */
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const disc = (p, m) => Math.round(((m - p) / m) * 100);

/* ─── GLOBAL STYLES ──────────────────────────────────────────── */
const GLOBAL_CSS = `
  ${FONT}
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: 'DM Sans', sans-serif; background: ${C.ivory}; color: ${C.text}; }
  h1,h2,h3,h4,h5 { font-family: 'Cormorant Garamond', serif; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${C.cream}; }
  ::-webkit-scrollbar-thumb { background: ${C.gold}; border-radius: 3px; }
  input, select, textarea { font-family: 'DM Sans', sans-serif; }
  button { cursor: pointer; font-family: 'DM Sans', sans-serif; }
  a { text-decoration: none; color: inherit; }

  @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes slideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
  @keyframes pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.05);} }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer { 0%{background-position:-200% 0;} 100%{background-position:200% 0;} }
  @keyframes bounce { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
  @keyframes checkmark { from{stroke-dashoffset:100;} to{stroke-dashoffset:0;} }
  @keyframes confetti { 0%{transform:translateY(-10px) rotate(0deg);opacity:1;} 100%{transform:translateY(100vh) rotate(720deg);opacity:0;} }

  .fade-up { animation: fadeUp .5s ease forwards; }
  .fade-in { animation: fadeIn .4s ease forwards; }

  .btn-primary {
    background: ${C.saffron}; color: #fff; border: none;
    padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;
    transition: all .2s; letter-spacing: 0.3px;
  }
  .btn-primary:hover { background: ${C.saffronL}; transform: translateY(-1px); box-shadow: 0 4px 16px ${C.saffron}44; }
  .btn-secondary {
    background: transparent; color: ${C.saffron}; border: 1.5px solid ${C.saffron};
    padding: 13px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;
    transition: all .2s;
  }
  .btn-secondary:hover { background: ${C.saffronXL}; }
  .btn-teal {
    background: ${C.teal}; color: #fff; border: none;
    padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;
    transition: all .2s;
  }
  .btn-teal:hover { background: ${C.tealD}; transform: translateY(-1px); }

  .card {
    background: ${C.white}; border-radius: 16px;
    border: 1px solid ${C.border}; overflow: hidden;
    transition: transform .2s, box-shadow .2s;
  }
  .card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px ${C.shadow}; }

  .badge {
    display: inline-block; padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
  }
  .badge-saffron { background: ${C.saffronXL}; color: ${C.saffron}; }
  .badge-teal    { background: ${C.tealL}; color: ${C.teal}; }
  .badge-gold    { background: ${C.goldL}; color: ${C.gold}; }
  .badge-green   { background: ${C.greenL}; color: ${C.green}; }

  .input {
    width: 100%; padding: 12px 16px; border: 1.5px solid ${C.border};
    border-radius: 10px; font-size: 15px; background: ${C.white};
    color: ${C.text}; transition: border-color .2s, box-shadow .2s; outline: none;
  }
  .input:focus { border-color: ${C.saffron}; box-shadow: 0 0 0 3px ${C.saffron}18; }
  .input::placeholder { color: ${C.muted}; }

  .tag {
    display: inline-block; padding: 5px 12px; border-radius: 20px;
    border: 1px solid ${C.border}; font-size: 13px; cursor: pointer;
    transition: all .2s; background: ${C.white}; color: ${C.muted};
  }
  .tag:hover, .tag.active { border-color: ${C.saffron}; color: ${C.saffron}; background: ${C.saffronXL}; }

  .star { color: #F59E0B; }

  .divider { height: 1px; background: ${C.border}; margin: 24px 0; }

  .floating-whatsapp {
    position: fixed; bottom: 24px; right: 24px; z-index: 999;
    background: #25D366; color: white; border: none;
    width: 56px; height: 56px; border-radius: 50%;
    font-size: 26px; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 20px rgba(37,211,102,.4); transition: transform .2s;
  }
  .floating-whatsapp:hover { transform: scale(1.1); }

  .section-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(28px, 4vw, 42px); font-weight: 700;
    color: ${C.text}; line-height: 1.2;
  }
  .section-subtitle {
    font-size: 15px; color: ${C.muted}; margin-top: 8px; font-weight: 400;
  }

  .toast {
    position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
    background: ${C.text}; color: white; padding: 12px 24px; border-radius: 30px;
    font-size: 14px; font-weight: 500; z-index: 9999;
    animation: fadeUp .3s ease; white-space: nowrap;
    box-shadow: 0 4px 20px rgba(0,0,0,.3);
  }
`;

/* ─── TOAST ──────────────────────────────────────────────────── */
function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

/* ─── HEADER ─────────────────────────────────────────────────── */
function Header({ page, setPage, cart, user, setUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const nav = [
    { label: "New Arrivals", id: "home" },
    { label: "Sarees", id: "home" },
    { label: "Kurtis", id: "home" },
    { label: "Festive", id: "home" },
    { label: "Sale", id: "home" },
  ];

  return (
    <>
      <style>{`
        .header { position: sticky; top: 0; z-index: 200; }
        .header-top { background: ${C.teal}; color: white; text-align: center;
          padding: 8px; font-size: 12.5px; letter-spacing: 0.5px; font-weight: 500; }
        .header-main { background: ${C.white}; border-bottom: 1px solid ${C.border};
          padding: 0 5%; display: flex; align-items: center; gap: 24px; height: 68px; }
        .header-logo { font-family:'Cormorant Garamond',serif; font-size: 26px; font-weight: 700;
          color: ${C.saffron}; cursor: pointer; flex-shrink: 0; letter-spacing: -0.5px; }
        .header-logo span { color: ${C.teal}; }
        .header-nav { display: flex; gap: 28px; flex: 1; justify-content: center; }
        .header-nav a { font-size: 14px; font-weight: 500; color: ${C.muted}; cursor: pointer;
          transition: color .2s; padding: 4px 0; border-bottom: 2px solid transparent; }
        .header-nav a:hover { color: ${C.saffron}; border-color: ${C.saffron}; }
        .header-actions { display: flex; align-items: center; gap: 16px; }
        .icon-btn { background: none; border: none; padding: 8px; border-radius: 8px;
          color: ${C.muted}; font-size: 20px; position: relative; transition: all .2s; }
        .icon-btn:hover { background: ${C.cream}; color: ${C.text}; }
        .cart-badge { position: absolute; top: 2px; right: 2px; background: ${C.saffron};
          color: white; font-size: 10px; font-weight: 700; width: 17px; height: 17px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .search-bar { position: absolute; top: 68px; left: 0; right: 0; background: white;
          border-bottom: 1px solid ${C.border}; padding: 16px 5%; display: flex; gap: 12px;
          animation: fadeIn .2s; box-shadow: 0 4px 20px ${C.shadow}; }
        @media(max-width:768px) { .header-nav { display: none; } }
      `}</style>
      <header className="header">
        <div className="header-top">
          🎁 FREE shipping on orders above ₹999 &nbsp;|&nbsp; 🚚 COD Available &nbsp;|&nbsp; 💬 WhatsApp Support: +91 98765 43210
        </div>
        <div className="header-main">
          <div className="header-logo" onClick={() => setPage("home")}>
            Priya<span>Crafts</span>
          </div>
          <nav className="header-nav">
            {nav.map(n => (
              <a key={n.label} onClick={() => setPage(n.id)}>{n.label}</a>
            ))}
          </nav>
          <div className="header-actions">
            <button className="icon-btn" onClick={() => setSearchOpen(!searchOpen)}>🔍</button>
            {user
              ? <button className="icon-btn" onClick={() => setPage("dashboard")} title="My Account">👤</button>
              : <button className="icon-btn" onClick={() => setPage("login")} title="Login">👤</button>
            }
            <button className="icon-btn" onClick={() => setPage("wishlist")}>🤍</button>
            <button className="icon-btn" onClick={() => setPage("cart")} style={{ position: "relative" }}>
              🛍️
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="search-bar">
            <input className="input" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search sarees, kurtis, lehengas..." autoFocus style={{ maxWidth: 600 }} />
            <button className="btn-primary" style={{ padding: "12px 24px" }}>Search</button>
          </div>
        )}
      </header>
    </>
  );
}

/* ─── PRODUCT CARD ───────────────────────────────────────────── */
function ProductCard({ p, setPage, setCurrentProduct, addToCart, addToast }) {
  const [wished, setWished] = useState(false);

  return (
    <div className="card" style={{ cursor: "pointer" }}>
      <div style={{ position: "relative" }}>
        <div
          onClick={() => { setCurrentProduct(p); setPage("product"); }}
          style={{
            background: `linear-gradient(135deg, ${C.cream} 0%, ${C.goldL} 100%)`,
            height: 220, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 80, flexDirection: "column", gap: 4,
          }}
        >
          {p.images[0]}
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{p.category}</div>
        </div>
        <button
          onClick={() => { setWished(!wished); addToast(wished ? "Removed from wishlist" : "Added to wishlist ❤️"); }}
          style={{
            position: "absolute", top: 10, right: 10, background: "white",
            border: "none", width: 34, height: 34, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, boxShadow: "0 2px 8px rgba(0,0,0,.15)",
          }}
        >{wished ? "❤️" : "🤍"}</button>
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <span className="badge badge-saffron">{p.badge}</span>
        </div>
        {p.cod && (
          <div style={{ position: "absolute", bottom: 10, left: 10 }}>
            <span className="badge badge-teal">COD</span>
          </div>
        )}
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{p.category}</div>
        <div
          onClick={() => { setCurrentProduct(p); setPage("product"); }}
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600, lineHeight: 1.3, marginBottom: 8, color: C.text }}
        >{p.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
          <span className="star">★</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{p.rating}</span>
          <span style={{ fontSize: 12, color: C.muted }}>({p.reviews})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{inr(p.price)}</span>
          <span style={{ fontSize: 13, color: C.muted, textDecoration: "line-through" }}>{inr(p.mrp)}</span>
          <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{disc(p.price, p.mrp)}% off</span>
        </div>
        <button
          className="btn-primary"
          style={{ width: "100%", padding: "11px" }}
          onClick={() => { addToCart(p); addToast(`${p.name} added to cart 🛍️`); }}
        >Add to Cart</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE: HOME / LANDING
══════════════════════════════════════════════════════════════ */
function HomePage({ setPage, setCurrentProduct, addToCart, addToast }) {
  const [activeCat, setActiveCat] = useState("All");

  const filtered = activeCat === "All" ? PRODUCTS : PRODUCTS.filter(p => p.category === activeCat);
  const cats = ["All", ...Array.from(new Set(PRODUCTS.map(p => p.category)))];

  return (
    <div>
      <style>{`
        .hero { position: relative; overflow: hidden; min-height: 540px;
          background: linear-gradient(135deg, #FAF0E6 0%, #FFF8EE 50%, #E6F4F4 100%);
          display: flex; align-items: center; padding: 60px 5%; gap: 60px; }
        .hero-content { flex: 1; max-width: 560px; animation: fadeUp .6s ease; }
        .hero-tag { display: inline-block; background: ${C.goldL}; color: ${C.gold};
          padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;
          letter-spacing: 1px; text-transform: uppercase; margin-bottom: 20px; }
        .hero-title { font-family:'Cormorant Garamond',serif; font-size: clamp(36px,5vw,60px);
          font-weight: 700; line-height: 1.1; color: ${C.text}; margin-bottom: 18px; }
        .hero-title span { color: ${C.saffron}; }
        .hero-subtitle { font-size: 16px; color: ${C.muted}; line-height: 1.7; margin-bottom: 32px; }
        .hero-cta { display: flex; gap: 14px; flex-wrap: wrap; }
        .hero-visual { flex: 1; display: flex; justify-content: center; align-items: center; }
        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 360px; }
        .hero-item { background: white; border-radius: 16px; padding: 24px;
          text-align: center; font-size: 52px; box-shadow: 0 4px 24px ${C.shadow};
          animation: fadeUp .6s ease; border: 1px solid ${C.border}; }
        .hero-item:nth-child(2) { animation-delay: .1s; margin-top: 24px; }
        .hero-item:nth-child(3) { animation-delay: .2s; }
        .hero-item:nth-child(4) { animation-delay: .3s; margin-top: 24px; }
        .stats-bar { background: ${C.teal}; color: white; display: flex; justify-content: center;
          gap: 60px; padding: 20px 5%; flex-wrap: wrap; }
        .stat { text-align: center; }
        .stat-n { font-family:'Cormorant Garamond',serif; font-size: 28px; font-weight: 700; }
        .stat-l { font-size: 12px; opacity: .7; margin-top: 2px; letter-spacing: 0.5px; }
        .marquee { overflow: hidden; background: ${C.goldL}; padding: 12px 0; border-top: 1px solid ${C.border}; border-bottom: 1px solid ${C.border}; }
        .marquee-inner { display: flex; gap: 40px; animation: marquee 20s linear infinite; width: max-content; }
        @keyframes marquee { from{transform:translateX(0);} to{transform:translateX(-50%);} }
        .marquee-item { font-size: 13px; font-weight: 500; color: ${C.gold}; white-space: nowrap; display: flex; align-items: center; gap: 8px; }
        .section { padding: 64px 5%; }
        .section-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 36px; flex-wrap: wrap; gap: 16px; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; }
        .cats-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 28px; scrollbar-width: none; }
        .cats-scroll::-webkit-scrollbar { display: none; }
        .cat-card { background: ${C.white}; border: 1.5px solid ${C.border}; border-radius: 16px;
          padding: 20px 24px; text-align: center; cursor: pointer; transition: all .2s;
          min-width: 120px; flex-shrink: 0; }
        .cat-card:hover { border-color: ${C.saffron}; background: ${C.saffronXL}; transform: translateY(-2px); }
        .cat-card .emoji { font-size: 36px; display: block; margin-bottom: 8px; }
        .cat-card .name { font-size: 13px; font-weight: 600; color: ${C.text}; }
        .cat-card .count { font-size: 11px; color: ${C.muted}; margin-top: 2px; }
        .trust-strip { background: ${C.cream}; border-top: 1px solid ${C.border}; border-bottom: 1px solid ${C.border}; }
        .trust-inner { display: flex; justify-content: center; gap: 48px; padding: 36px 5%; flex-wrap: wrap; }
        .trust-item { text-align: center; }
        .trust-icon { font-size: 32px; display: block; margin-bottom: 8px; }
        .trust-label { font-size: 13px; font-weight: 600; color: ${C.text}; }
        .trust-sub { font-size: 11px; color: ${C.muted}; margin-top: 2px; }
        .banner { margin: 0 5% 64px; border-radius: 20px; overflow: hidden;
          background: linear-gradient(135deg, ${C.teal} 0%, ${C.tealD} 100%);
          padding: 48px 5%; display: flex; align-items: center; gap: 40px; flex-wrap: wrap; }
        .banner-text h2 { font-family:'Cormorant Garamond',serif; font-size: 38px; font-weight: 700;
          color: white; line-height: 1.2; margin-bottom: 12px; }
        .banner-text p { color: rgba(255,255,255,.7); font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
        .banner-emoji { font-size: 80px; flex-shrink: 0; }
        .testimonial-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .testimonial-card { background: white; border: 1px solid ${C.border}; border-radius: 16px; padding: 24px; }
        .t-stars { color: #F59E0B; font-size: 14px; margin-bottom: 12px; }
        .t-text { font-size: 14px; color: ${C.text}; line-height: 1.7; margin-bottom: 16px; font-style: italic; }
        .t-author { display: flex; align-items: center; gap: 10px; }
        .t-avatar { width: 36px; height: 36px; border-radius: 50%; background: ${C.cream};
          display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .t-name { font-size: 13px; font-weight: 600; color: ${C.text}; }
        .t-loc { font-size: 11px; color: ${C.muted}; }
        .newsletter { background: ${C.saffronXL}; padding: 56px 5%; text-align: center; border-top: 1px solid ${C.border}; }
        .newsletter h2 { font-family:'Cormorant Garamond',serif; font-size: 36px; font-weight: 700; color: ${C.text}; margin-bottom: 10px; }
        .newsletter p { color: ${C.muted}; margin-bottom: 28px; }
        .newsletter-form { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .newsletter-form input { max-width: 340px; flex: 1; }
        .footer { background: ${C.text}; color: rgba(255,255,255,.7); padding: 56px 5% 24px; }
        .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .footer-brand { font-family:'Cormorant Garamond',serif; font-size: 28px; font-weight: 700; color: white; margin-bottom: 14px; }
        .footer-brand span { color: ${C.saffron}; }
        .footer-desc { font-size: 14px; line-height: 1.7; margin-bottom: 20px; }
        .footer-col h4 { color: white; font-weight: 600; font-size: 13px; letter-spacing: 1px;
          text-transform: uppercase; margin-bottom: 16px; }
        .footer-col a { display: block; font-size: 13px; margin-bottom: 10px; cursor: pointer;
          transition: color .2s; }
        .footer-col a:hover { color: ${C.saffron}; }
        .footer-bottom { border-top: 1px solid rgba(255,255,255,.1); padding-top: 24px;
          display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 12px; }
        .pay-icons { display: flex; gap: 8px; flex-wrap: wrap; }
        .pay-icon { background: rgba(255,255,255,.1); border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 600; color: white; }
        @media(max-width:768px) {
          .hero { flex-direction: column; gap: 32px; }
          .hero-visual { display: none; }
          .stats-bar { gap: 24px; }
          .footer-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* HERO */}
      <div className="hero">
        <div className="hero-content">
          <div className="hero-tag">✦ New Festive Collection 2026</div>
          <h1 className="hero-title">
            Handcrafted<br />
            <span>Indian Elegance</span><br />
            Delivered
          </h1>
          <p className="hero-subtitle">
            Discover authentic handloom sarees, designer kurtis & traditional wear straight from the looms of India. Free shipping above ₹999.
          </p>
          <div className="hero-cta">
            <button className="btn-primary" onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>
              Shop Now →
            </button>
            <button className="btn-secondary" onClick={() => setPage("home")}>View Collections</button>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 32, flexWrap: "wrap" }}>
            {[["🚚","Free Delivery"],["🔄","Easy Returns"],["💳","UPI & COD"],["⭐","4.8★ Rated"]].map(([i,l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted }}>
                <span>{i}</span><span>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-grid">
            {["🥻","👘","💎","🌸"].map((e, i) => (
              <div key={i} className="hero-item" style={{ animationDelay: `${i * .1}s` }}>
                {e}
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontWeight: 500 }}>
                  {["Sarees","Kurtis","Jewellery","Dupattas"][i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MARQUEE */}
      <div className="marquee">
        <div className="marquee-inner">
          {[...Array(2)].map((_, ri) =>
            ["✦ Handloom Sarees","✦ Festival Offer: Up to 50% Off","✦ Free Shipping above ₹999",
             "✦ COD Available","✦ Artisan Kurtis","✦ New Lehenga Collection","✦ Easy Returns in 7 Days",
             "✦ UPI / Cards / EMI Accepted"].map((t, i) => (
              <span key={`${ri}-${i}`} className="marquee-item">{t}</span>
            ))
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="stats-bar">
        {[["2.4L+","Happy Customers"],["8,000+","Products"],["450+","Artisans"],["4.8★","Avg Rating"]].map(([n, l]) => (
          <div key={l} className="stat">
            <div className="stat-n">{n}</div>
            <div className="stat-l">{l}</div>
          </div>
        ))}
      </div>

      {/* TRUST */}
      <div className="trust-strip">
        <div className="trust-inner">
          {[["🔒","100% Secure","SSL encrypted payments"],["🚚","Free Delivery","Orders above ₹999"],["🔄","7-Day Returns","Hassle free returns"],["💬","WhatsApp Support","24/7 assistance"],["🏅","Authentic Products","Verified artisans"],["💳","EMI Available","No cost EMI on ₹3000+"]].map(([ic, lab, sub]) => (
            <div key={lab} className="trust-item">
              <span className="trust-icon">{ic}</span>
              <div className="trust-label">{lab}</div>
              <div className="trust-sub">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Shop by Category</h2>
            <p className="section-subtitle">Explore our curated collections</p>
          </div>
        </div>
        <div className="cats-scroll">
          {CATEGORIES.map(c => (
            <div key={c.name} className="cat-card" onClick={() => setActiveCat(c.name)}>
              <span className="emoji">{c.emoji}</span>
              <div className="name">{c.name}</div>
              <div className="count">{c.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PRODUCTS */}
      <div className="section" style={{ paddingTop: 0 }} id="products">
        <div className="section-header">
          <div>
            <h2 className="section-title">Featured Products</h2>
            <p className="section-subtitle">Handpicked by our fashion experts</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {cats.map(c => (
              <span key={c} className={`tag ${activeCat === c ? "active" : ""}`} onClick={() => setActiveCat(c)}>{c}</span>
            ))}
          </div>
        </div>
        <div className="products-grid">
          {filtered.map(p => (
            <ProductCard key={p.id} p={p} setPage={setPage} setCurrentProduct={setCurrentProduct}
              addToCart={addToCart} addToast={addToast} />
          ))}
        </div>
      </div>

      {/* BANNER */}
      <div className="banner">
        <div className="banner-emoji">🎁</div>
        <div className="banner-text" style={{ flex: 1 }}>
          <h2>Festive Season Sale<br />Up to 50% Off</h2>
          <p>Limited time offer on our premium silk sarees and designer suits. Use code FESTIVE50 at checkout.</p>
          <button className="btn-primary" style={{ background: C.gold }}>Shop Sale →</button>
        </div>
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{ fontSize: 48, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>50%</div>
          <div style={{ fontSize: 14, opacity: .7 }}>OFF SELECTED ITEMS</div>
          <div style={{ fontSize: 12, opacity: .5, marginTop: 4 }}>Use code: FESTIVE50</div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">What Our Customers Say</h2>
            <p className="section-subtitle">Loved by 2.4 lakh+ customers across India</p>
          </div>
        </div>
        <div className="testimonial-grid">
          {[
            { text: "Got my Banarasi saree just in time for the wedding. Quality is exactly as shown, maybe even better! The zari work is exquisite.", name: "Priya Sharma", loc: "Mumbai, Maharashtra", stars: 5 },
            { text: "Been ordering from PriyaCrafts for 2 years. Never disappointed. The Chanderi kurtis are my everyday go-to. Fast delivery too!", name: "Ananya Reddy", loc: "Hyderabad, Telangana", stars: 5 },
            { text: "The phulkari dupatta was a gift for my mother. She absolutely loved it. You could see the handwork quality up close. Worth every rupee.", name: "Gurpreet Kaur", loc: "Amritsar, Punjab", stars: 5 },
            { text: "Excellent packaging. Saree arrived in a beautiful box. COD option was very convenient. Will definitely order again for Diwali!", name: "Sunita Patel", loc: "Ahmedabad, Gujarat", stars: 4 },
            { text: "The return process was smooth when I needed a different size. WhatsApp support responded within minutes. Great service!", name: "Meera Nair", loc: "Kochi, Kerala", stars: 5 },
            { text: "Ordered the Kanjivaram for my daughter's engagement. The silk quality and the colours were stunning. 10/10 recommend!", name: "Vijayalakshmi R", loc: "Chennai, Tamil Nadu", stars: 5 },
          ].map((t, i) => (
            <div key={i} className="testimonial-card">
              <div className="t-stars">{"★".repeat(t.stars)}</div>
              <p className="t-text">"{t.text}"</p>
              <div className="t-author">
                <div className="t-avatar">👩</div>
                <div>
                  <div className="t-name">{t.name}</div>
                  <div className="t-loc">{t.loc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NEWSLETTER */}
      <div className="newsletter">
        <h2>Stay in the Loop</h2>
        <p>Get exclusive deals, new arrivals & festival offers straight to your inbox.</p>
        <div className="newsletter-form">
          <input className="input" placeholder="Your email address" type="email" />
          <button className="btn-primary">Subscribe →</button>
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 14 }}>No spam. Unsubscribe anytime.</div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">Priya<span>Crafts</span></div>
            <p className="footer-desc">Your one-stop destination for authentic Indian handloom and designer ethnic wear. Supporting artisans across India since 2018.</p>
            <div style={{ fontSize: 13, marginBottom: 8, color: "rgba(255,255,255,.5)" }}>Follow us:</div>
            <div style={{ display: "flex", gap: 10 }}>
              {["📘","📸","🐦","▶️"].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.1)", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>{s}</div>
              ))}
            </div>
          </div>
          {[
            { title: "Quick Links", links: ["New Arrivals","Bestsellers","Festival Collection","Sale","Track Order"] },
            { title: "Help", links: ["Size Guide","Shipping Policy","Return Policy","FAQ","Contact Us"] },
            { title: "Company", links: ["About Us","Our Artisans","Sustainability","Press","Careers"] },
          ].map(col => (
            <div key={col.title} className="footer-col">
              <h4>{col.title}</h4>
              {col.links.map(l => <a key={l}>{l}</a>)}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <div>© 2026 PriyaCrafts. All rights reserved. | GST No: 27AAPFK0532C1ZN</div>
          <div>
            <div style={{ marginBottom: 6, fontSize: 11, color: "rgba(255,255,255,.4)" }}>ACCEPTED PAYMENTS</div>
            <div className="pay-icons">
              {["UPI","Visa","Mastercard","RuPay","Paytm","COD","EMI"].map(p => (
                <span key={p} className="pay-icon">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE: PRODUCT DETAIL
══════════════════════════════════════════════════════════════ */
function ProductDetailPage({ product: p, setPage, addToCart, addToast }) {
  const [qty, setQty] = useState(1);
  const [selectedColor, setSelectedColor] = useState(p.colors[0]);
  const [selectedSize, setSelectedSize] = useState(p.sizes[0]);
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab] = useState("description");
  const [pincode, setPincode] = useState("");
  const [pincodeResult, setPincodeResult] = useState(null);
  const [wished, setWished] = useState(false);

  const checkPincode = () => {
    if (pincode.length === 6) {
      setPincodeResult({ deliverable: true, cod: p.cod, edd: "3–5 business days", carrier: "BlueDart" });
    }
  };

  const related = PRODUCTS.filter(pr => pr.id !== p.id).slice(0, 4);

  return (
    <div>
      <style>{`
        .pdp { max-width: 1200px; margin: 0 auto; padding: 32px 5%; }
        .pdp-breadcrumb { font-size: 12px; color: ${C.muted}; margin-bottom: 24px; display: flex; gap: 6px; align-items: center; }
        .pdp-breadcrumb a { cursor: pointer; transition: color .2s; }
        .pdp-breadcrumb a:hover { color: ${C.saffron}; }
        .pdp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
        .pdp-imgs { }
        .pdp-main-img { background: linear-gradient(135deg, ${C.cream} 0%, ${C.goldL} 100%);
          border-radius: 20px; height: 440px; display: flex; align-items: center;
          justify-content: center; font-size: 120px; margin-bottom: 12px;
          border: 1px solid ${C.border}; }
        .pdp-thumbs { display: flex; gap: 10px; }
        .pdp-thumb { width: 74px; height: 74px; border-radius: 10px; border: 2px solid transparent;
          display: flex; align-items: center; justify-content: center; font-size: 34px;
          background: ${C.cream}; cursor: pointer; transition: all .2s; flex-shrink: 0; }
        .pdp-thumb.active { border-color: ${C.saffron}; background: ${C.saffronXL}; }
        .pdp-info { }
        .pdp-cat { font-size: 11px; color: ${C.muted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .pdp-name { font-family:'Cormorant Garamond',serif; font-size: clamp(26px,3vw,38px); font-weight: 700; line-height: 1.2; margin-bottom: 14px; }
        .pdp-rating { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
        .pdp-price-block { margin-bottom: 22px; }
        .pdp-price { font-size: 32px; font-weight: 700; color: ${C.text}; }
        .pdp-mrp { font-size: 16px; color: ${C.muted}; text-decoration: line-through; margin-left: 10px; }
        .pdp-disc { font-size: 15px; color: ${C.green}; font-weight: 600; margin-left: 10px; }
        .pdp-emi { font-size: 13px; color: ${C.teal}; margin-top: 4px; }
        .color-opts { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
        .color-opt { padding: 7px 16px; border-radius: 8px; border: 1.5px solid ${C.border};
          font-size: 13px; cursor: pointer; transition: all .2s; }
        .color-opt.active { border-color: ${C.saffron}; background: ${C.saffronXL}; color: ${C.saffron}; font-weight: 600; }
        .size-opts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
        .size-opt { width: 44px; height: 44px; border-radius: 8px; border: 1.5px solid ${C.border};
          font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .2s; }
        .size-opt.active { border-color: ${C.saffron}; background: ${C.saffronXL}; color: ${C.saffron}; }
        .qty-ctrl { display: flex; align-items: center; gap: 0; border: 1.5px solid ${C.border}; border-radius: 10px; overflow: hidden; }
        .qty-btn { background: ${C.cream}; border: none; width: 40px; height: 44px; font-size: 18px; color: ${C.text}; transition: background .2s; }
        .qty-btn:hover { background: ${C.border}; }
        .qty-val { width: 52px; height: 44px; text-align: center; border: none; border-left: 1px solid ${C.border}; border-right: 1px solid ${C.border}; font-size: 15px; font-weight: 600; }
        .pdp-actions { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .pdp-actions button { flex: 1; min-width: 140px; }
        .pincode-box { background: ${C.cream}; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
        .pincode-row { display: flex; gap: 10px; }
        .pincode-row input { flex: 1; }
        .delivery-info { margin-top: 10px; font-size: 13px; }
        .delivery-info.ok { color: ${C.green}; }
        .delivery-info.no { color: ${C.red}; }
        .pdp-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .pdp-detail-item { background: ${C.cream}; border-radius: 10px; padding: 12px; }
        .pdp-detail-label { font-size: 11px; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.5px; }
        .pdp-detail-val { font-size: 14px; font-weight: 600; color: ${C.text}; margin-top: 2px; }
        .tabs { display: flex; gap: 0; border-bottom: 2px solid ${C.border}; margin-bottom: 20px; }
        .tab-btn { padding: 12px 24px; background: none; border: none; font-size: 14px; font-weight: 500;
          color: ${C.muted}; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all .2s; }
        .tab-btn.active { color: ${C.saffron}; border-bottom-color: ${C.saffron}; }
        .guarantee-strip { display: flex; gap: 16px; flex-wrap: wrap; }
        .guarantee-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: ${C.muted}; }
        @media(max-width:768px) { .pdp-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="pdp">
        {/* BREADCRUMB */}
        <div className="pdp-breadcrumb">
          <a onClick={() => setPage("home")}>Home</a> /
          <a onClick={() => setPage("home")}>{p.category}</a> /
          <span style={{ color: C.text }}>{p.name}</span>
        </div>

        <div className="pdp-grid">
          {/* IMAGES */}
          <div className="pdp-imgs">
            <div className="pdp-main-img">{p.images[activeImg]}</div>
            <div className="pdp-thumbs">
              {p.images.map((img, i) => (
                <div key={i} className={`pdp-thumb ${activeImg === i ? "active" : ""}`} onClick={() => setActiveImg(i)}>{img}</div>
              ))}
            </div>
          </div>

          {/* INFO */}
          <div className="pdp-info">
            <div className="pdp-cat">{p.category}</div>
            <h1 className="pdp-name">{p.name}</h1>
            <div className="pdp-rating">
              <span className="star">{"★".repeat(Math.floor(p.rating))}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{p.rating}</span>
              <span style={{ fontSize: 13, color: C.muted }}>({p.reviews} reviews)</span>
              <span className="badge badge-green" style={{ marginLeft: 8 }}>Verified</span>
            </div>

            <div className="pdp-price-block">
              <div>
                <span className="pdp-price">{inr(p.price)}</span>
                <span className="pdp-mrp">{inr(p.mrp)}</span>
                <span className="pdp-disc">{disc(p.price, p.mrp)}% off</span>
              </div>
              {p.emi && <div className="pdp-emi">💳 No cost EMI from {p.emi} · 3/6/9 months</div>}
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Inclusive of all taxes · GST invoice available</div>
            </div>

            {/* COLOR */}
            {p.colors.length > 1 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.muted }}>
                  COLOUR: <span style={{ color: C.text }}>{selectedColor}</span>
                </div>
                <div className="color-opts">
                  {p.colors.map(c => (
                    <div key={c} className={`color-opt ${selectedColor === c ? "active" : ""}`} onClick={() => setSelectedColor(c)}>{c}</div>
                  ))}
                </div>
              </div>
            )}

            {/* SIZE */}
            {p.sizes.length > 1 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>SIZE: <span style={{ color: C.text }}>{selectedSize}</span></span>
                  <span style={{ fontSize: 13, color: C.teal, cursor: "pointer", fontWeight: 500 }}>Size Guide →</span>
                </div>
                <div className="size-opts">
                  {p.sizes.map(s => (
                    <div key={s} className={`size-opt ${selectedSize === s ? "active" : ""}`} onClick={() => setSelectedSize(s)}>{s}</div>
                  ))}
                </div>
              </div>
            )}

            {/* QUANTITY */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>QTY:</div>
              <div className="qty-ctrl">
                <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <input className="qty-val" value={qty} readOnly />
                <button className="qty-btn" onClick={() => setQty(Math.min(p.stock, qty + 1))}>+</button>
              </div>
              <span style={{ fontSize: 13, color: p.stock < 10 ? C.red : C.green, fontWeight: 500 }}>
                {p.stock < 10 ? `⚠ Only ${p.stock} left` : `✓ In Stock`}
              </span>
            </div>

            {/* ACTIONS */}
            <div className="pdp-actions">
              <button className="btn-primary" onClick={() => { addToCart({ ...p, qty, selectedColor, selectedSize }); addToast("Added to cart! 🛍️"); }}>
                🛍️ Add to Cart
              </button>
              <button className="btn-teal" onClick={() => { addToCart({ ...p, qty, selectedColor, selectedSize }); setPage("checkout"); }}>
                ⚡ Buy Now
              </button>
              <button
                className="btn-secondary"
                style={{ flex: "0 0 48px", padding: "13px" }}
                onClick={() => { setWished(!wished); addToast(wished ? "Removed from wishlist" : "Added to wishlist ❤️"); }}
              >{wished ? "❤️" : "🤍"}</button>
            </div>

            {/* PINCODE CHECK */}
            <div className="pincode-box">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.text }}>🚚 Check Delivery & COD</div>
              <div className="pincode-row">
                <input className="input" placeholder="Enter pincode (e.g. 400001)" maxLength={6}
                  value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/, ""))}
                  style={{ padding: "10px 14px", fontSize: 14 }} />
                <button className="btn-primary" style={{ padding: "10px 18px", fontSize: 14 }} onClick={checkPincode}>Check</button>
              </div>
              {pincodeResult && (
                <div className={`delivery-info ${pincodeResult.deliverable ? "ok" : "no"}`}>
                  {pincodeResult.deliverable
                    ? `✓ Delivery in ${pincodeResult.edd} via ${pincodeResult.carrier}${pincodeResult.cod ? " · COD available" : " · Prepaid only"}`
                    : "✗ Delivery not available to this pincode"}
                </div>
              )}
            </div>

            {/* PRODUCT DETAILS */}
            <div className="pdp-details">
              {[["Fabric", p.fabric], ["Origin", p.origin], ["Care", p.care], ["Stock", `${p.stock} units`]].map(([l, v]) => (
                <div key={l} className="pdp-detail-item">
                  <div className="pdp-detail-label">{l}</div>
                  <div className="pdp-detail-val">{v}</div>
                </div>
              ))}
            </div>

            {/* GUARANTEE */}
            <div className="guarantee-strip">
              {[["🔒","Secure Payment"],["🔄","7-Day Returns"],["✅","Authentic Product"],["🏅","GST Invoice"]].map(([ic, l]) => (
                <div key={l} className="guarantee-item"><span>{ic}</span><span>{l}</span></div>
              ))}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ marginTop: 48 }}>
          <div className="tabs">
            {[["description","Description"],["shipping","Shipping"],["returns","Returns"],["reviews","Reviews"]].map(([id, label]) => (
              <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: C.text }}>
            {tab === "description" && <div><p>{p.description}</p><br/><p>Each piece comes with a certificate of authenticity and detailed care instructions.</p></div>}
            {tab === "shipping" && <div>
              <p><strong>Standard Delivery:</strong> 4–7 business days · ₹99 (Free above ₹999)</p><br/>
              <p><strong>Express Delivery:</strong> 1–3 business days · ₹199</p><br/>
              <p><strong>COD:</strong> {p.cod ? "Available on this product · ₹50 COD charge" : "Not available on this product"}</p><br/>
              <p>Shipped via BlueDart, Delhivery, or Shiprocket depending on location.</p>
            </div>}
            {tab === "returns" && <div>
              <p><strong>Return Window:</strong> 7 days from delivery</p><br/>
              <p><strong>Condition:</strong> Unused, unwashed, with all tags attached</p><br/>
              <p><strong>Process:</strong> Initiate return from My Orders → WhatsApp support → Pickup arranged</p><br/>
              <p><strong>Refund:</strong> 3–5 business days after pickup</p>
            </div>}
            {tab === "reviews" && <div>
              {[{n:"Priya S.", r:5, t:"Absolutely stunning saree! The colours are vivid and the silk is premium quality."},
                {n:"Ananya M.", r:5, t:"Exceeded my expectations. Arrived beautifully packed. Worth the price!"},
                {n:"Rekha T.", r:4, t:"Good quality. Slightly different shade in person but still beautiful."}
              ].map((rv, i) => (
                <div key={i} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span className="star">{"★".repeat(rv.r)}</span>
                    <strong style={{ fontSize: 14 }}>{rv.n}</strong>
                    <span className="badge badge-green">Verified Purchase</span>
                  </div>
                  <p style={{ fontSize: 14, color: C.text }}>{rv.t}</p>
                </div>
              ))}
            </div>}
          </div>
        </div>

        {/* RELATED */}
        <div style={{ marginTop: 48 }}>
          <h2 className="section-title" style={{ marginBottom: 24 }}>You May Also Like</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
            {related.map(p => (
              <ProductCard key={p.id} p={p} setPage={setPage} setCurrentProduct={() => {}} addToCart={addToCart} addToast={addToast} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE: CART
══════════════════════════════════════════════════════════════ */
function CartPage({ cart, setCart, setPage, addToast }) {
  const updateQty = (id, delta) => {
    setCart(c => c.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };
  const remove = (id) => {
    setCart(c => c.filter(i => i.id !== id));
    addToast("Item removed from cart");
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= 999 ? 0 : 99;
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + shipping + gst;

  return (
    <div>
      <style>{`
        .cart-page { max-width: 1100px; margin: 0 auto; padding: 32px 5%; }
        .cart-grid { display: grid; grid-template-columns: 1fr 360px; gap: 32px; align-items: start; }
        .cart-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
        .cart-header h1 { font-family:'Cormorant Garamond',serif; font-size: 32px; font-weight: 700; }
        .cart-item { display: flex; gap: 16px; align-items: flex-start; padding: 20px 0; border-bottom: 1px solid ${C.border}; }
        .cart-img { width: 90px; height: 90px; border-radius: 12px; background: ${C.cream};
          display: flex; align-items: center; justify-content: center; font-size: 46px; flex-shrink: 0; }
        .cart-item-info { flex: 1; }
        .cart-item-name { font-family:'Cormorant Garamond',serif; font-size: 17px; font-weight: 600; margin-bottom: 4px; }
        .cart-item-meta { font-size: 12px; color: ${C.muted}; margin-bottom: 10px; }
        .cart-item-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .cart-item-price { font-size: 18px; font-weight: 700; color: ${C.text}; }
        .summary-card { background: white; border: 1px solid ${C.border}; border-radius: 16px; padding: 24px; position: sticky; top: 90px; }
        .summary-card h3 { font-family:'Cormorant Garamond',serif; font-size: 22px; font-weight: 700; margin-bottom: 20px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
        .summary-total { display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; margin-top: 4px; padding-top: 12px; border-top: 1px solid ${C.border}; }
        .coupon-row { display: flex; gap: 8px; margin-bottom: 20px; }
        .coupon-row input { flex: 1; }
        .empty-cart { text-align: center; padding: 80px 20px; }
        .empty-cart-icon { font-size: 80px; margin-bottom: 16px; display: block; }
        @media(max-width:768px) { .cart-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="cart-page">
        <div className="cart-header">
          <span style={{ fontSize: 28 }}>🛍️</span>
          <h1>Your Cart</h1>
          {cart.length > 0 && <span style={{ fontSize: 14, color: C.muted }}>({cart.length} {cart.length === 1 ? "item" : "items"})</span>}
        </div>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <span className="empty-cart-icon">🛒</span>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, marginBottom: 12 }}>Your cart is empty</h2>
            <p style={{ color: C.muted, marginBottom: 28 }}>Looks like you haven't added anything yet.</p>
            <button className="btn-primary" onClick={() => setPage("home")}>Continue Shopping →</button>
          </div>
        ) : (
          <div className="cart-grid">
            {/* ITEMS */}
            <div>
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-img">{item.images[0]}</div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-meta">
                      {item.selectedColor && `Colour: ${item.selectedColor}`}
                      {item.selectedSize && ` · Size: ${item.selectedSize}`}
                    </div>
                    <div className="cart-item-actions">
                      <div className="qty-ctrl">
                        <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                        <input className="qty-val" value={item.qty} readOnly />
                        <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                      </div>
                      <div className="cart-item-price">{inr(item.price * item.qty)}</div>
                      <button onClick={() => remove(item.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 18, padding: 4 }}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}

              {/* TRUST */}
              <div style={{ display: "flex", gap: 20, marginTop: 24, flexWrap: "wrap" }}>
                {[["🔒","Secure Checkout"],["🔄","Easy Returns"],["🚚","Fast Delivery"]].map(([ic, l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted }}>
                    <span>{ic}</span><span>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SUMMARY */}
            <div className="summary-card">
              <h3>Order Summary</h3>

              {/* COUPON */}
              <div className="coupon-row">
                <input className="input" placeholder="Enter coupon code" style={{ fontSize: 13, padding: "10px 14px" }} />
                <button className="btn-secondary" style={{ padding: "10px 18px", fontSize: 13, whiteSpace: "nowrap" }}>Apply</button>
              </div>
              <div style={{ fontSize: 12, color: C.teal, marginBottom: 16 }}>Try: FESTIVE50 · NEWUSER10 · FLAT200</div>

              <div className="summary-row">
                <span style={{ color: C.muted }}>Subtotal ({cart.length} items)</span>
                <span>{inr(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span style={{ color: C.muted }}>Shipping</span>
                <span style={{ color: shipping === 0 ? C.green : C.text }}>
                  {shipping === 0 ? "FREE 🎉" : inr(shipping)}
                </span>
              </div>
              {shipping > 0 && (
                <div style={{ fontSize: 12, color: C.saffron, marginBottom: 8 }}>
                  Add {inr(999 - subtotal)} more for free shipping!
                </div>
              )}
              <div className="summary-row">
                <span style={{ color: C.muted }}>GST (5%)</span>
                <span>{inr(gst)}</span>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <span>{inr(total)}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, marginTop: 4 }}>
                Inclusive of all taxes
              </div>

              <button className="btn-primary" style={{ width: "100%", padding: "16px", fontSize: 16, marginBottom: 12 }}
                onClick={() => setPage("checkout")}>
                Proceed to Checkout →
              </button>
              <button className="btn-secondary" style={{ width: "100%", padding: "14px" }}
                onClick={() => setPage("home")}>
                ← Continue Shopping
              </button>

              {/* PAYMENT ICONS */}
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>WE ACCEPT</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                  {["UPI","Visa","MC","RuPay","Paytm","COD"].map(p => (
                    <span key={p} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 8px", fontSize: 11, fontWeight: 600, color: C.muted }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE: CHECKOUT
══════════════════════════════════════════════════════════════ */
function CheckoutPage({ cart, setPage, setOrderId }) {
  const [step, setStep] = useState(1); // 1=address, 2=payment, 3=review
  const [payMethod, setPayMethod] = useState("upi");
  const [addr, setAddr] = useState({ name:"", phone:"", email:"", flat:"", area:"", city:"", state:"", pin:"" });

  const states = ["Andhra Pradesh","Assam","Bihar","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= 999 ? 0 : 99;
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + shipping + gst;

  const placeOrder = () => {
    const oid = "SS" + Date.now().toString().slice(-8);
    setOrderId(oid);
    setPage("ordersuccess");
  };

  return (
    <div>
      <style>{`
        .checkout { max-width: 1000px; margin: 0 auto; padding: 32px 5%; }
        .checkout h1 { font-family:'Cormorant Garamond',serif; font-size: 30px; font-weight: 700; margin-bottom: 28px; }
        .steps { display: flex; align-items: center; margin-bottom: 36px; }
        .step { display: flex; align-items: center; gap: 10px; }
        .step-num { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .step-num.done { background: ${C.green}; color: white; }
        .step-num.active { background: ${C.saffron}; color: white; }
        .step-num.todo { background: ${C.cream}; color: ${C.muted}; border: 1.5px solid ${C.border}; }
        .step-label { font-size: 13px; font-weight: 600; }
        .step-label.active { color: ${C.saffron}; }
        .step-label.done { color: ${C.green}; }
        .step-label.todo { color: ${C.muted}; }
        .step-divider { flex: 1; height: 1px; background: ${C.border}; margin: 0 12px; }
        .checkout-grid { display: grid; grid-template-columns: 1fr 320px; gap: 32px; align-items: start; }
        .section-box { background: white; border: 1px solid ${C.border}; border-radius: 16px; padding: 24px; margin-bottom: 20px; }
        .section-box h3 { font-family:'Cormorant Garamond',serif; font-size: 20px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 12px; font-weight: 600; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.5px; }
        .form-full { grid-column: 1 / -1; }
        .pay-option { display: flex; align-items: center; gap: 14px; padding: 16px; border: 1.5px solid ${C.border};
          border-radius: 12px; cursor: pointer; transition: all .2s; margin-bottom: 10px; }
        .pay-option.active { border-color: ${C.saffron}; background: ${C.saffronXL}; }
        .pay-icon2 { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
        .pay-name { font-weight: 600; font-size: 14px; }
        .pay-sub { font-size: 12px; color: ${C.muted}; }
        .order-item { display: flex; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid ${C.border}; }
        .order-item-img { width: 52px; height: 52px; border-radius: 10px; background: ${C.cream}; display: flex; align-items: center; justify-content: center; font-size: 28px; }
        .order-item-name { font-size: 13px; font-weight: 600; flex: 1; }
        .order-item-price { font-size: 14px; font-weight: 700; }
        .cod-note { background: ${C.goldL}; border: 1px solid ${C.gold}22; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: ${C.brown}; margin-top: 10px; }
        @media(max-width:768px) { .checkout-grid { grid-template-columns: 1fr; } .form-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="checkout">
        <h1>Checkout</h1>

        {/* STEPS */}
        <div className="steps">
          {[["Address", 1], ["Payment", 2], ["Review", 3]].map(([label, n], i) => (
            <>
              {i > 0 && <div key={`d${n}`} className="step-divider" />}
              <div key={n} className="step">
                <div className={`step-num ${step > n ? "done" : step === n ? "active" : "todo"}`}>
                  {step > n ? "✓" : n}
                </div>
                <span className={`step-label ${step > n ? "done" : step === n ? "active" : "todo"}`}>{label}</span>
              </div>
            </>
          ))}
        </div>

        <div className="checkout-grid">
          <div>
            {/* STEP 1: ADDRESS */}
            {step === 1 && (
              <div className="section-box">
                <h3>📍 Delivery Address</h3>
                <div className="form-grid">
                  {[["Full Name","name","text"],["Mobile Number","phone","tel"],["Email Address","email","email"]].map(([l, k, t]) => (
                    <div key={k} className={`form-group ${k === "email" ? "form-full" : ""}`}>
                      <label>{l}</label>
                      <input className="input" type={t} value={addr[k]} onChange={e => setAddr({ ...addr, [k]: e.target.value })} placeholder={`Enter ${l.toLowerCase()}`} />
                    </div>
                  ))}
                  <div className="form-group form-full">
                    <label>Flat / House No / Building</label>
                    <input className="input" value={addr.flat} onChange={e => setAddr({ ...addr, flat: e.target.value })} placeholder="e.g. Flat 4B, Sunshine Apartments" />
                  </div>
                  <div className="form-group form-full">
                    <label>Area / Street / Locality</label>
                    <input className="input" value={addr.area} onChange={e => setAddr({ ...addr, area: e.target.value })} placeholder="e.g. Andheri West" />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input className="input" value={addr.city} onChange={e => setAddr({ ...addr, city: e.target.value })} placeholder="e.g. Mumbai" />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input className="input" value={addr.pin} maxLength={6} onChange={e => setAddr({ ...addr, pin: e.target.value.replace(/\D/, "") })} placeholder="6-digit pincode" />
                  </div>
                  <div className="form-group form-full">
                    <label>State</label>
                    <select className="input" value={addr.state} onChange={e => setAddr({ ...addr, state: e.target.value })}>
                      <option value="">Select State</option>
                      {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn-primary" style={{ marginTop: 20, width: "100%" }} onClick={() => setStep(2)}>
                  Continue to Payment →
                </button>
              </div>
            )}

            {/* STEP 2: PAYMENT */}
            {step === 2 && (
              <div className="section-box">
                <h3>💳 Payment Method</h3>
                {[
                  { id: "upi", icon: "📱", name: "UPI", sub: "Google Pay, PhonePe, Paytm, BHIM" },
                  { id: "card", icon: "💳", name: "Credit / Debit Card", sub: "Visa, Mastercard, RuPay — No cost EMI available" },
                  { id: "netbanking", icon: "🏦", name: "Net Banking", sub: "All major Indian banks" },
                  { id: "cod", icon: "💵", name: "Cash on Delivery", sub: cart.some(i => !i.cod) ? "⚠ Some items in cart are not eligible for COD" : "Pay when your order arrives · ₹50 charge" },
                  { id: "wallet", icon: "👛", name: "Wallet / Prepaid", sub: "Paytm Wallet, MobiKwik, Amazon Pay" },
                ].map(opt => (
                  <div key={opt.id} className={`pay-option ${payMethod === opt.id ? "active" : ""}`} onClick={() => setPayMethod(opt.id)}>
                    <div className={`pay-icon2`} style={{ background: C.cream }}>{opt.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div className="pay-name">{opt.name}</div>
                      <div className="pay-sub">{opt.sub}</div>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${payMethod === opt.id ? C.saffron : C.border}`, background: payMethod === opt.id ? C.saffron : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {payMethod === opt.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                    </div>
                  </div>
                ))}

                {payMethod === "upi" && (
                  <div style={{ marginTop: 16 }}>
                    <input className="input" placeholder="Enter UPI ID (e.g. name@upi)" />
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Or scan QR code at next step</div>
                  </div>
                )}
                {payMethod === "cod" && (
                  <div className="cod-note">
                    ⚠️ Cash on Delivery charge: ₹50 · Please keep exact change ready. Delivery in 4–7 days.
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
                  <button className="btn-primary" style={{ flex: 2 }} onClick={() => setStep(3)}>Review Order →</button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW */}
            {step === 3 && (
              <div className="section-box">
                <h3>✅ Review & Place Order</h3>
                <div style={{ background: C.cream, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>📍 Delivering to:</div>
                  <div style={{ fontSize: 14, color: C.muted }}>{addr.name} · {addr.phone}</div>
                  <div style={{ fontSize: 14, color: C.muted }}>{addr.flat}, {addr.area}, {addr.city} – {addr.pin}</div>
                  <div style={{ fontSize: 14, color: C.muted }}>{addr.state}</div>
                </div>
                <div style={{ background: C.cream, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>💳 Payment:</div>
                  <div style={{ fontSize: 14, color: C.muted }}>{{ upi: "UPI Payment", card: "Credit/Debit Card", netbanking: "Net Banking", cod: "Cash on Delivery", wallet: "Wallet" }[payMethod]}</div>
                </div>
                {cart.map(item => (
                  <div key={item.id} className="order-item">
                    <div className="order-item-img">{item.images[0]}</div>
                    <div className="order-item-name">{item.name} × {item.qty}</div>
                    <div className="order-item-price">{inr(item.price * item.qty)}</div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</button>
                  <button className="btn-primary" style={{ flex: 2, fontSize: 16 }} onClick={placeOrder}>
                    🎉 Place Order · {inr(total)}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 10 }}>
                  🔒 Your payment is secured with 256-bit SSL encryption
                </div>
              </div>
            )}
          </div>

          {/* ORDER SUMMARY SIDEBAR */}
          <div>
            <div className="section-box" style={{ position: "sticky", top: 90 }}>
              <h3 style={{ fontSize: 18, marginBottom: 16 }}>Order Summary</h3>
              {cart.map(item => (
                <div key={item.id} className="order-item">
                  <div className="order-item-img" style={{ width: 44, height: 44, fontSize: 22 }}>{item.images[0]}</div>
                  <div className="order-item-name" style={{ fontSize: 12 }}>{item.name} × {item.qty}</div>
                  <div className="order-item-price" style={{ fontSize: 13 }}>{inr(item.price * item.qty)}</div>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                {[["Subtotal", inr(subtotal)], ["Shipping", shipping === 0 ? "FREE" : inr(shipping)], ["GST (5%)", inr(gst)]].map(([l, v]) => (
                  <div key={l} className="summary-row"><span style={{ color: C.muted, fontSize: 13 }}>{l}</span><span style={{ fontSize: 13 }}>{v}</span></div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 17, paddingTop: 12, borderTop: `1px solid ${C.border}`, marginTop: 4 }}>
                  <span>Total</span><span style={{ color: C.saffron }}>{inr(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE: ORDER SUCCESS
══════════════════════════════════════════════════════════════ */
function OrderSuccessPage({ orderId, cart, setPage, setCart }) {
  const [confettis] = useState(() => Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    dur: 2 + Math.random() * 2,
    color: [C.saffron, C.gold, C.teal, "#E8D44D", "#E84D7A"][Math.floor(Math.random() * 5)],
    size: 8 + Math.random() * 8,
  })));

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const est = new Date(); est.setDate(est.getDate() + 5);
  const estDate = est.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 5%", position: "relative", overflow: "hidden" }}>
      <style>{`
        .success-card { background: white; border: 1px solid ${C.border}; border-radius: 24px; padding: 48px 40px; max-width: 540px; width: 100%; text-align: center; box-shadow: 0 20px 60px ${C.shadow}; }
        .success-icon { width: 90px; height: 90px; border-radius: 50%; background: ${C.greenL}; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; font-size: 44px; }
        .success-title { font-family:'Cormorant Garamond',serif; font-size: 34px; font-weight: 700; color: ${C.text}; margin-bottom: 10px; }
        .success-sub { color: ${C.muted}; font-size: 15px; line-height: 1.7; margin-bottom: 28px; }
        .order-id-box { background: ${C.cream}; border-radius: 12px; padding: 16px; margin-bottom: 28px; }
        .order-id-label { font-size: 11px; color: ${C.muted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .order-id-val { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; color: ${C.saffron}; letter-spacing: 1px; }
        .timeline { text-align: left; margin-bottom: 28px; }
        .tl-item { display: flex; gap: 14px; margin-bottom: 16px; }
        .tl-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; margin-top: 2px; }
        .tl-dot.done { background: ${C.greenL}; }
        .tl-dot.next { background: ${C.cream}; border: 1.5px solid ${C.border}; }
        .tl-text strong { display: block; font-size: 14px; font-weight: 600; }
        .tl-text span { font-size: 12px; color: ${C.muted}; }
        .confetti-piece { position: absolute; border-radius: 2px; animation: confetti var(--dur) var(--delay) ease-in infinite; opacity: 0; }
        .wa-btn { display: flex; align-items: center; justify-content: center; gap: 8px;
          background: #25D366; color: white; border: none; border-radius: 10px; padding: 14px;
          font-size: 15px; font-weight: 600; width: 100%; margin-bottom: 10px; transition: transform .2s; }
        .wa-btn:hover { transform: translateY(-1px); }
      `}</style>

      {/* CONFETTI */}
      {confettis.map(c => (
        <div key={c.id} className="confetti-piece" style={{
          left: `${c.left}%`, top: "-20px", width: c.size, height: c.size,
          background: c.color, "--dur": `${c.dur}s`, "--delay": `${c.delay}s`
        }} />
      ))}

      <div className="success-card fade-up">
        <div className="success-icon">🎉</div>
        <h1 className="success-title">Order Placed!</h1>
        <p className="success-sub">
          Thank you for shopping with PriyaCrafts! Your order has been confirmed. You will receive a WhatsApp notification shortly.
        </p>

        <div className="order-id-box">
          <div className="order-id-label">Order ID</div>
          <div className="order-id-val">{orderId}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
            Total Paid: <strong style={{ color: C.text }}>{inr(total + Math.round(total * 0.05))}</strong>
          </div>
        </div>

        {/* TIMELINE */}
        <div className="timeline">
          {[
            { status: "done", icon: "✓", label: "Order Confirmed", sub: "Just now" },
            { status: "done", icon: "✓", label: "Payment Verified", sub: "Processing" },
            { status: "next", icon: "📦", label: "Packing & Dispatch", sub: "Within 24 hours" },
            { status: "next", icon: "🚚", label: "Out for Delivery", sub: "Expected by " + estDate },
          ].map((t, i) => (
            <div key={i} className="tl-item">
              <div className={`tl-dot ${t.status}`}>{t.icon}</div>
              <div className="tl-text">
                <strong>{t.label}</strong>
                <span>{t.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <button className="wa-btn">
          💬 Track on WhatsApp
        </button>
        <button className="btn-secondary" style={{ width: "100%", marginBottom: 10 }} onClick={() => setPage("dashboard")}>
          View My Orders
        </button>
        <button className="btn-primary" style={{ width: "100%" }} onClick={() => { setCart([]); setPage("home"); }}>
          Continue Shopping →
        </button>

        <div style={{ marginTop: 20, fontSize: 12, color: C.muted }}>
          Confirmation sent to your email & WhatsApp 📱
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE: LOGIN
══════════════════════════════════════════════════════════════ */
function LoginPage({ setPage, setUser }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [mode, setMode] = useState("phone"); // phone or email

  const sendOtp = () => { if (phone.length === 10) setOtpSent(true); };
  const login = () => { setUser({ name: "Priya Sharma", phone, email: email || "priya@example.com", avatar: "👩" }); setPage("dashboard"); };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${C.cream} 0%, ${C.saffronXL} 50%, ${C.tealL} 100%)`, padding: "40px 5%" }}>
      <style>{`
        .auth-card { background: white; border-radius: 24px; padding: 40px; max-width: 420px; width: 100%; box-shadow: 0 20px 60px ${C.shadow}; animation: fadeUp .5s ease; }
        .auth-logo { font-family:'Cormorant Garamond',serif; font-size: 28px; font-weight: 700; color: ${C.saffron}; text-align: center; margin-bottom: 6px; }
        .auth-logo span { color: ${C.teal}; }
        .auth-title { font-family:'Cormorant Garamond',serif; font-size: 26px; font-weight: 700; text-align: center; margin-bottom: 8px; }
        .auth-sub { font-size: 14px; color: ${C.muted}; text-align: center; margin-bottom: 28px; }
        .mode-toggle { display: flex; background: ${C.cream}; border-radius: 10px; padding: 4px; margin-bottom: 24px; }
        .mode-btn { flex: 1; padding: 9px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; background: transparent; color: ${C.muted}; }
        .mode-btn.active { background: white; color: ${C.saffron}; box-shadow: 0 2px 8px ${C.shadow}; }
        .otp-inputs { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }
        .otp-input { width: 52px; height: 56px; border: 1.5px solid ${C.border}; border-radius: 12px; text-align: center; font-size: 22px; font-weight: 700; outline: none; transition: border .2s; }
        .otp-input:focus { border-color: ${C.saffron}; }
        .social-row { display: flex; gap: 10px; }
        .social-btn { flex: 1; padding: 12px; border: 1.5px solid ${C.border}; border-radius: 10px; background: white; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all .2s; color: ${C.text}; }
        .social-btn:hover { border-color: ${C.saffron}; background: ${C.saffronXL}; }
        .divider-or { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .divider-or span { font-size: 12px; color: ${C.muted}; white-space: nowrap; }
        .divider-or::before, .divider-or::after { content:''; flex: 1; height: 1px; background: ${C.border}; }
        .phone-input-group { display: flex; gap: 0; }
        .phone-prefix { background: ${C.cream}; border: 1.5px solid ${C.border}; border-right: none; border-radius: 10px 0 0 10px; padding: 12px 14px; font-size: 15px; font-weight: 600; color: ${C.text}; }
        .phone-input-group .input { border-radius: 0 10px 10px 0; }
      `}</style>

      <div className="auth-card">
        <div className="auth-logo">Priya<span>Crafts</span></div>
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-sub">Sign in to your account to continue shopping</p>

        <div className="mode-toggle">
          <button className={`mode-btn ${mode === "phone" ? "active" : ""}`} onClick={() => setMode("phone")}>📱 Mobile OTP</button>
          <button className={`mode-btn ${mode === "email" ? "active" : ""}`} onClick={() => setMode("email")}>📧 Email</button>
        </div>

        {mode === "phone" ? (
          !otpSent ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Mobile Number</label>
                <div className="phone-input-group">
                  <span className="phone-prefix">🇮🇳 +91</span>
                  <input className="input" placeholder="Enter 10-digit mobile number" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/, ""))} />
                </div>
              </div>
              <button className="btn-primary" style={{ width: "100%", marginBottom: 16 }} onClick={sendOtp}>Send OTP →</button>
            </>
          ) : (
            <>
              <div style={{ textAlign: "center", fontSize: 14, color: C.muted, marginBottom: 20 }}>
                OTP sent to +91 {phone} · <span style={{ color: C.saffron, cursor: "pointer" }} onClick={() => setOtpSent(false)}>Change</span>
              </div>
              <div className="otp-inputs">
                {[0,1,2,3].map(i => (
                  <input key={i} className="otp-input" maxLength={1} type="number" />
                ))}
              </div>
              <div style={{ textAlign: "center", fontSize: 13, color: C.muted, marginBottom: 20 }}>
                Didn't receive? <span style={{ color: C.saffron, cursor: "pointer" }}>Resend OTP</span>
              </div>
              <button className="btn-primary" style={{ width: "100%", marginBottom: 16 }} onClick={login}>Verify & Login →</button>
            </>
          )
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Email Address</label>
              <input className="input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Password</label>
                <span style={{ fontSize: 12, color: C.saffron, cursor: "pointer" }}>Forgot Password?</span>
              </div>
              <input className="input" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ width: "100%", marginBottom: 16 }} onClick={login}>Sign In →</button>
          </>
        )}

        <div className="divider-or"><span>or continue with</span></div>
        <div className="social-row">
          <button className="social-btn" onClick={login}>🇬 Google</button>
          <button className="social-btn" onClick={login}>📘 Facebook</button>
          <button className="social-btn" onClick={login}>💬 WhatsApp</button>
        </div>

        <p style={{ textAlign: "center", fontSize: 14, color: C.muted, marginTop: 24 }}>
          Don't have an account? <span style={{ color: C.saffron, fontWeight: 600, cursor: "pointer" }} onClick={() => setPage("signup")}>Sign up free</span>
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE: SIGNUP
══════════════════════════════════════════════════════════════ */
function SignupPage({ setPage, setUser }) {
  const [form, setForm] = useState({ name:"", email:"", phone:"", pass:"", ref:"" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const signup = () => { setUser({ name: form.name || "New User", email: form.email, phone: form.phone, avatar: "👩" }); setPage("dashboard"); };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${C.tealL} 0%, ${C.ivory} 50%, ${C.saffronXL} 100%)`, padding: "40px 5%" }}>
      <div className="auth-card" style={{ maxWidth: 480, background: "white", borderRadius: 24, padding: 40, boxShadow: `0 20px 60px ${C.shadow}`, animation: "fadeUp .5s ease" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: C.saffron, textAlign: "center", marginBottom: 6 }}>
          Priya<span style={{ color: C.teal }}>Crafts</span>
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Create Account</h2>
        <p style={{ fontSize: 14, color: C.muted, textAlign: "center", marginBottom: 28 }}>Join 2.4 lakh+ shoppers & get ₹200 off your first order!</p>

        <div style={{ background: C.goldL, borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: C.brown, display: "flex", alignItems: "center", gap: 8 }}>
          🎁 <strong>Welcome offer:</strong> Use code WELCOME200 · Get ₹200 off on first order above ₹1499
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Full Name</label>
            <input className="input" placeholder="e.g. Priya Sharma" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Mobile</label>
            <input className="input" placeholder="10-digit number" maxLength={10} value={form.phone} onChange={e => set("phone", e.target.value.replace(/\D/, ""))} />
          </div>
        </div>
        {[["Email Address","email","email","your@email.com"],["Password","pass","password","Minimum 8 characters"]].map(([l, k, t, ph]) => (
          <div key={k} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{l}</label>
            <input className="input" type={t} placeholder={ph} value={form[k]} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Referral Code (Optional)</label>
          <input className="input" placeholder="Enter referral code" value={form.ref} onChange={e => set("ref", e.target.value)} />
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
          <input type="checkbox" defaultChecked style={{ marginTop: 2, accentColor: C.saffron }} />
          <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
            I agree to the <span style={{ color: C.saffron }}>Terms of Service</span> and <span style={{ color: C.saffron }}>Privacy Policy</span>. I consent to receiving WhatsApp updates about my orders.
          </span>
        </div>

        <button className="btn-primary" style={{ width: "100%", marginBottom: 14, fontSize: 16 }} onClick={signup}>
          Create My Account →
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          {[["🇬","Google"],["📘","Facebook"],["💬","WhatsApp"]].map(([ic, l]) => (
            <button key={l} onClick={signup} style={{ flex: 1, padding: "11px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: "white", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
              {ic} {l}
            </button>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 14, color: C.muted, marginTop: 20 }}>
          Already have an account? <span style={{ color: C.saffron, fontWeight: 600, cursor: "pointer" }} onClick={() => setPage("login")}>Sign in</span>
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE: CUSTOMER DASHBOARD
══════════════════════════════════════════════════════════════ */
function DashboardPage({ user, setUser, setPage }) {
  const [tab, setTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "", birthday: "", gender: "Female", language: "English" });

  const tabs = [
    { id: "overview", icon: "◈", label: "Overview" },
    { id: "orders", icon: "📦", label: "My Orders" },
    { id: "wishlist", icon: "❤️", label: "Wishlist" },
    { id: "addresses", icon: "📍", label: "Addresses" },
    { id: "profile", icon: "👤", label: "Profile" },
    { id: "wallet", icon: "💰", label: "Wallet & Coupons" },
    { id: "reviews", icon: "⭐", label: "My Reviews" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const getStatusColor = (status) => ({
    "Delivered": C.green, "In Transit": C.teal, "Processing": C.gold, "Cancelled": C.red
  }[status] || C.muted);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 5%", display: "grid", gridTemplateColumns: "240px 1fr", gap: 28, alignItems: "start" }}>
      <style>{`
        .dash-sidebar { background: white; border: 1px solid ${C.border}; border-radius: 20px; overflow: hidden; position: sticky; top: 90px; }
        .dash-profile-area { background: linear-gradient(135deg, ${C.saffron} 0%, ${C.gold} 100%); padding: 24px; text-align: center; }
        .dash-avatar { width: 70px; height: 70px; border-radius: 50%; background: rgba(255,255,255,.3); margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 36px; border: 3px solid rgba(255,255,255,.6); }
        .dash-username { font-family:'Cormorant Garamond',serif; font-size: 20px; font-weight: 700; color: white; }
        .dash-usersub { font-size: 12px; color: rgba(255,255,255,.75); margin-top: 2px; }
        .dash-nav { padding: 12px 0; }
        .dash-nav-item { display: flex; align-items: center; gap: 12px; padding: 11px 20px; cursor: pointer; transition: all .2s; font-size: 14px; font-weight: 500; color: ${C.muted}; }
        .dash-nav-item:hover { background: ${C.saffronXL}; color: ${C.saffron}; }
        .dash-nav-item.active { background: ${C.saffronXL}; color: ${C.saffron}; font-weight: 600; border-right: 3px solid ${C.saffron}; }
        .dash-nav-icon { font-size: 16px; width: 22px; text-align: center; }
        .dash-main { }
        .dash-header { font-family:'Cormorant Garamond',serif; font-size: 28px; font-weight: 700; margin-bottom: 24px; }
        .stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .stat-card { background: white; border: 1px solid ${C.border}; border-radius: 14px; padding: 18px; }
        .stat-card-icon { font-size: 28px; margin-bottom: 10px; }
        .stat-card-val { font-family:'Cormorant Garamond',serif; font-size: 24px; font-weight: 700; color: ${C.text}; }
        .stat-card-label { font-size: 12px; color: ${C.muted}; margin-top: 2px; }
        .dash-section { background: white; border: 1px solid ${C.border}; border-radius: 16px; padding: 22px; margin-bottom: 20px; }
        .dash-section h3 { font-family:'Cormorant Garamond',serif; font-size: 20px; font-weight: 700; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; }
        .order-card { border: 1px solid ${C.border}; border-radius: 14px; padding: 18px; margin-bottom: 14px; }
        .order-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
        .order-id { font-family:'JetBrains Mono',monospace; font-size: 13px; font-weight: 600; color: ${C.teal}; }
        .order-date { font-size: 12px; color: ${C.muted}; }
        .order-status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .order-items-row { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
        .order-thumb { width: 54px; height: 54px; border-radius: 10px; background: ${C.cream}; display: flex; align-items: center; justify-content: center; font-size: 28px; }
        .order-card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid ${C.border}; flex-wrap: wrap; gap: 8px; }
        .wish-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .wish-card { border: 1px solid ${C.border}; border-radius: 14px; overflow: hidden; }
        .wish-card-img { background: ${C.cream}; height: 140px; display: flex; align-items: center; justify-content: center; font-size: 60px; }
        .wish-card-body { padding: 12px; }
        .addr-card { border: 1px solid ${C.border}; border-radius: 14px; padding: 18px; margin-bottom: 14px; position: relative; }
        .addr-default-badge { position: absolute; top: 14px; right: 14px; background: ${C.tealL}; color: ${C.teal}; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
        .addr-type { font-weight: 700; font-size: 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
        .addr-text { font-size: 13px; color: ${C.muted}; line-height: 1.7; }
        .wallet-balance { background: linear-gradient(135deg, ${C.teal} 0%, ${C.tealD} 100%); border-radius: 16px; padding: 28px; color: white; margin-bottom: 20px; }
        .wallet-amount { font-family:'Cormorant Garamond',serif; font-size: 40px; font-weight: 700; }
        .coupon-card { border: 2px dashed ${C.border}; border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
        .coupon-code { font-family:'JetBrains Mono',monospace; font-size: 16px; font-weight: 700; color: ${C.saffron}; }
        .coupon-desc { font-size: 12px; color: ${C.muted}; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        @media(max-width:900px) { 
          .stat-cards { grid-template-columns: 1fr 1fr; }
          div[style*="grid-template-columns: 240px 1fr"] { grid-template-columns: 1fr !important; }
          .dash-sidebar { position: static; }
        }
        @media(max-width:600px) { .stat-cards { grid-template-columns: 1fr 1fr; } }
      `}</style>

      {/* SIDEBAR */}
      <div className="dash-sidebar">
        <div className="dash-profile-area">
          <div className="dash-avatar">{user?.avatar || "👤"}</div>
          <div className="dash-username">{user?.name}</div>
          <div className="dash-usersub">{user?.email}</div>
          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.75)" }}>⭐ Gold Member · 2,340 pts</div>
        </div>
        <nav className="dash-nav">
          {tabs.map(t => (
            <div key={t.id} className={`dash-nav-item ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              <span className="dash-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
          <div className="divider" style={{ margin: "8px 0" }} />
          <div className="dash-nav-item" onClick={() => { setUser(null); setPage("home"); }}>
            <span className="dash-nav-icon">🚪</span>
            <span>Sign Out</span>
          </div>
        </nav>
      </div>

      {/* MAIN */}
      <div className="dash-main">

        {/* OVERVIEW */}
        {tab === "overview" && (
          <>
            <h2 className="dash-header">Welcome back, {user?.name?.split(" ")[0]}! 👋</h2>
            <div className="stat-cards">
              {[["📦","3","Total Orders"],["❤️","2","Wishlist Items"],["💰","₹340","Wallet Balance"],["⭐","2,340","Reward Points"]].map(([ic, v, l]) => (
                <div key={l} className="stat-card">
                  <div className="stat-card-icon">{ic}</div>
                  <div className="stat-card-val">{v}</div>
                  <div className="stat-card-label">{l}</div>
                </div>
              ))}
            </div>

            {/* RECENT ORDER */}
            <div className="dash-section">
              <h3>Recent Orders <span style={{ fontSize: 14, color: C.saffron, cursor: "pointer", fontWeight: 500 }} onClick={() => setTab("orders")}>View All →</span></h3>
              {ORDERS.slice(0, 2).map(o => (
                <div key={o.id} className="order-card">
                  <div className="order-card-header">
                    <div>
                      <div className="order-id">{o.id}</div>
                      <div className="order-date">{o.date}</div>
                    </div>
                    <span className="order-status" style={{ background: getStatusColor(o.status) + "22", color: getStatusColor(o.status) }}>{o.status}</span>
                  </div>
                  <div className="order-items-row">
                    {o.items.map((it, i) => (
                      <div key={i} className="order-thumb">🥻</div>
                    ))}
                  </div>
                  <div className="order-card-footer">
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{inr(o.total)}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {o.status === "Delivered" && <button className="btn-secondary" style={{ padding: "7px 14px", fontSize: 12 }}>Write Review</button>}
                      {o.status === "In Transit" && <button className="btn-teal" style={{ padding: "7px 14px", fontSize: 12 }}>Track Order</button>}
                      <button className="btn-secondary" style={{ padding: "7px 14px", fontSize: 12 }}>View Details</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* LOYALTY */}
            <div className="dash-section">
              <h3>Loyalty Points</h3>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div style={{ flex: 1, background: C.goldL, borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 13, color: C.gold, fontWeight: 600, marginBottom: 4 }}>Available Points</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: C.brown }}>2,340 pts</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Worth ₹234 · Valid till Dec 2026</div>
                </div>
                <div style={{ flex: 1, background: C.tealL, borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 13, color: C.teal, fontWeight: 600, marginBottom: 4 }}>Next Tier: Platinum</div>
                  <div style={{ background: C.border, borderRadius: 20, height: 8, marginBottom: 8, overflow: "hidden" }}>
                    <div style={{ background: C.teal, height: "100%", width: "46%", borderRadius: 20 }} />
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>2,660 pts more to reach Platinum</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ORDERS */}
        {tab === "orders" && (
          <>
            <h2 className="dash-header">My Orders</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {["All","Delivered","In Transit","Processing","Cancelled"].map(f => (
                <span key={f} className="tag active" style={{ padding: "6px 16px" }}>{f}</span>
              ))}
            </div>
            {ORDERS.map(o => (
              <div key={o.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <div className="order-id">{o.id}</div>
                    <div className="order-date">Ordered on {o.date}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Tracking: {o.tracking}</div>
                  </div>
                  <span className="order-status" style={{ background: getStatusColor(o.status) + "22", color: getStatusColor(o.status) }}>{o.status}</span>
                </div>
                {o.items.map((it, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                    <div className="order-thumb">🥻</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{it.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>Qty: {it.qty} · {inr(it.price)}</div>
                    </div>
                  </div>
                ))}
                <div className="order-card-footer">
                  <div>
                    <span style={{ fontSize: 13, color: C.muted }}>Order Total: </span>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{inr(o.total)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {o.status === "Delivered" && (
                      <>
                        <button className="btn-secondary" style={{ padding: "7px 14px", fontSize: 12 }}>Return/Exchange</button>
                        <button className="btn-secondary" style={{ padding: "7px 14px", fontSize: 12 }}>Write Review</button>
                        <button className="btn-teal" style={{ padding: "7px 14px", fontSize: 12 }}>Buy Again</button>
                      </>
                    )}
                    {o.status === "In Transit" && (
                      <>
                        <button className="btn-teal" style={{ padding: "7px 14px", fontSize: 12 }}>🚚 Track Shipment</button>
                        <button style={{ padding: "7px 14px", fontSize: 12, background: C.goldL, color: C.gold, border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>💬 WhatsApp Update</button>
                      </>
                    )}
                    <button className="btn-secondary" style={{ padding: "7px 14px", fontSize: 12 }}>📄 Invoice</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* WISHLIST */}
        {tab === "wishlist" && (
          <>
            <h2 className="dash-header">My Wishlist</h2>
            <div className="wish-grid">
              {WISHLIST.map(p => (
                <div key={p.id} className="wish-card">
                  <div className="wish-card-img">{p.images[0]}</div>
                  <div className="wish-card-body">
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{p.name}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontWeight: 700 }}>{inr(p.price)}</span>
                      <span style={{ fontSize: 12, color: C.green }}>↓{disc(p.price, p.mrp)}%</span>
                    </div>
                    <button className="btn-primary" style={{ width: "100%", padding: "9px", fontSize: 13 }}>Move to Cart</button>
                  </div>
                </div>
              ))}
              <div className="wish-card" style={{ border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, cursor: "pointer", borderRadius: 14 }} onClick={() => setPage("home")}>
                <div style={{ textAlign: "center", color: C.muted }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>+</div>
                  <div style={{ fontSize: 13 }}>Add more items</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ADDRESSES */}
        {tab === "addresses" && (
          <>
            <h2 className="dash-header">My Addresses</h2>
            {[
              { type: "🏠 Home", addr: "Flat 4B, Sunshine Apartments, Andheri West, Mumbai – 400058, Maharashtra", phone: "+91 98765 43210", default: true },
              { type: "🏢 Office", addr: "B-204, Lotus Corporate Park, Goregaon East, Mumbai – 400063, Maharashtra", phone: "+91 98765 43210", default: false },
            ].map((a, i) => (
              <div key={i} className="addr-card">
                {a.default && <span className="addr-default-badge">✓ Default</span>}
                <div className="addr-type">{a.type}</div>
                <div className="addr-text">{a.addr}</div>
                <div className="addr-text">📞 {a.phone}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button className="btn-secondary" style={{ padding: "7px 16px", fontSize: 12 }}>Edit</button>
                  {!a.default && <button className="btn-secondary" style={{ padding: "7px 16px", fontSize: 12 }}>Set Default</button>}
                  {!a.default && <button style={{ padding: "7px 16px", fontSize: 12, background: C.redL, color: C.red, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Delete</button>}
                </div>
              </div>
            ))}
            <button className="btn-teal" style={{ marginTop: 8 }}>+ Add New Address</button>
          </>
        )}

        {/* PROFILE */}
        {tab === "profile" && (
          <>
            <h2 className="dash-header">My Profile</h2>
            <div className="dash-section">
              <h3>Personal Information <button className="btn-secondary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => setEditMode(!editMode)}>{editMode ? "Cancel" : "Edit"}</button></h3>
              <div className="form-row">
                {[["Full Name","name"],["Email","email"],["Mobile","phone"],["Birthday","birthday"]].map(([l, k]) => (
                  <div key={k}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{l}</label>
                    <input className="input" value={profile[k]} disabled={!editMode} onChange={e => setProfile(p => ({ ...p, [k]: e.target.value }))}
                      style={{ background: editMode ? "white" : C.cream, cursor: editMode ? "text" : "default" }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Gender</label>
                  <select className="input" value={profile.gender} disabled={!editMode} onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))} style={{ background: editMode ? "white" : C.cream }}>
                    {["Female","Male","Non-binary","Prefer not to say"].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Language</label>
                  <select className="input" value={profile.language} disabled={!editMode} onChange={e => setProfile(p => ({ ...p, language: e.target.value }))} style={{ background: editMode ? "white" : C.cream }}>
                    {["English","Hindi","Tamil","Telugu","Bengali","Marathi","Gujarati","Kannada"].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              {editMode && <button className="btn-primary" onClick={() => setEditMode(false)}>Save Changes</button>}
            </div>

            <div className="dash-section">
              <h3>Account Security</h3>
              {[["🔒","Password","Last changed 3 months ago"],["📱","Mobile OTP","Enabled · +91 98765 43210"],["📧","Email Verification","Verified ✓"]].map(([ic, l, s]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 20 }}>{ic}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{l}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{s}</div>
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ padding: "7px 14px", fontSize: 12 }}>Update</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* WALLET */}
        {tab === "wallet" && (
          <>
            <h2 className="dash-header">Wallet & Coupons</h2>
            <div className="wallet-balance">
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginBottom: 6 }}>Store Wallet Balance</div>
              <div className="wallet-amount">₹340.00</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 6 }}>Valid for all orders · No expiry</div>
              <button style={{ marginTop: 16, background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.4)", color: "white", padding: "10px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                + Add Money to Wallet
              </button>
            </div>
            <div className="dash-section">
              <h3>Available Coupons</h3>
              {[
                { code: "FESTIVE50", desc: "50% off on festive collection", min: "Min. ₹2000", exp: "Expires 31 Mar 2026" },
                { code: "NEWUSER10", desc: "10% off on all orders", min: "No minimum", exp: "Expires 28 Feb 2026" },
                { code: "FLAT200", desc: "Flat ₹200 off", min: "Min. ₹1500", exp: "Expires 15 Mar 2026" },
              ].map(c => (
                <div key={c.code} className="coupon-card">
                  <div style={{ flex: 1 }}>
                    <div className="coupon-code">{c.code}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{c.desc}</div>
                    <div className="coupon-desc">{c.min} · {c.exp}</div>
                  </div>
                  <button className="btn-secondary" style={{ padding: "8px 16px", fontSize: 12 }}>Apply</button>
                </div>
              ))}
            </div>

            <div className="dash-section">
              <h3>Transaction History</h3>
              {[
                { type: "credit", desc: "Order Refund · SS20231220-004", amt: "+₹899", date: "20 Dec 2025" },
                { type: "debit",  desc: "Used in Order · SS20240108-002", amt: "-₹100", date: "8 Jan 2026" },
                { type: "credit", desc: "Loyalty Points Cashback", amt: "+₹234", date: "12 Jan 2026" },
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: t.type === "credit" ? C.greenL : C.redL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      {t.type === "credit" ? "↑" : "↓"}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{t.desc}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{t.date}</div>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: t.type === "credit" ? C.green : C.red }}>{t.amt}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* REVIEWS */}
        {tab === "reviews" && (
          <>
            <h2 className="dash-header">My Reviews</h2>
            <div className="dash-section">
              <h3>Pending Reviews <span className="badge badge-saffron">1</span></h3>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🥻</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>Banarasi Silk Saree</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Delivered on 12 Jan 2026</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, fontSize: 28, marginBottom: 12, cursor: "pointer" }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: "#F59E0B" }}>★</span>)}
                </div>
                <textarea className="input" placeholder="Share your experience with this product..." rows={3} style={{ marginBottom: 12 }} />
                <button className="btn-primary" style={{ padding: "10px 24px" }}>Submit Review</button>
              </div>
            </div>

            <div className="dash-section">
              <h3>Your Reviews</h3>
              {[{ product: "Chanderi Cotton Kurti", rating: 5, date: "15 Nov 2025", text: "Beautiful fabric and excellent quality. The fitting was perfect and delivery was super fast!" }].map((r, i) => (
                <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ fontWeight: 600 }}>{r.product}</div>
                    <span className="badge badge-green">Published</span>
                  </div>
                  <div style={{ color: "#F59E0B", marginBottom: 8 }}>{"★".repeat(r.rating)}</div>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>{r.text}</p>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Posted on {r.date} · 12 people found this helpful</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <>
            <h2 className="dash-header">Settings</h2>
            <div className="dash-section">
              <h3>Notifications</h3>
              {[
                ["📦","Order Updates","Track your orders in real-time",true],
                ["💬","WhatsApp Notifications","Receive updates on +91 98765 43210",true],
                ["📧","Email Newsletters","New arrivals, offers & festive sales",true],
                ["🎁","Promotional Offers","Exclusive deals and discounts",false],
                ["⭐","Review Reminders","Remind me to review purchased items",true],
              ].map(([ic, l, s, def]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 22 }}>{ic}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{l}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{s}</div>
                    </div>
                  </div>
                  <div style={{
                    width: 46, height: 26, borderRadius: 13, cursor: "pointer", position: "relative", transition: "background .2s",
                    background: def ? C.saffron : C.border
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", background: "white", position: "absolute",
                      top: 3, left: def ? 23 : 3, transition: "left .2s",
                      boxShadow: "0 2px 4px rgba(0,0,0,.2)"
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="dash-section">
              <h3>Privacy & Data</h3>
              {[["Download My Data","Export all your account data as JSON"],["Delete Account","Permanently delete your account and all data"],["Clear Browsing History","Remove recently viewed products"]].map(([l, s]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{l}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{s}</div>
                  </div>
                  <button className="btn-secondary" style={{ padding: "7px 14px", fontSize: 12, color: l === "Delete Account" ? C.red : C.saffron, borderColor: l === "Delete Account" ? C.red : C.saffron }}>{l === "Delete Account" ? "Delete" : "Action"}</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   WISHLIST PAGE (simple)
══════════════════════════════════════════════════════════════ */
function WishlistPage({ setPage, addToCart, addToast, setCurrentProduct }) {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 5%" }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, marginBottom: 28 }}>❤️ My Wishlist</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 24 }}>
        {WISHLIST.map(p => (
          <ProductCard key={p.id} p={p} setPage={setPage} setCurrentProduct={setCurrentProduct}
            addToCart={addToCart} addToast={addToast} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("home");
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(PRODUCTS[0]);
  const [orderId, setOrderId] = useState("");
  const [toast, setToast] = useState("");

  const addToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  const addToCart = useCallback((product) => {
    setCart(c => {
      const ex = c.find(i => i.id === product.id);
      if (ex) return c.map(i => i.id === product.id ? { ...i, qty: i.qty + (product.qty || 1) } : i);
      return [...c, { ...product, qty: product.qty || 1 }];
    });
  }, []);

  // Scroll to top on page change
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <Header page={page} setPage={setPage} cart={cart} user={user} setUser={setUser} />

      <main style={{ minHeight: "60vh" }}>
        {page === "home"         && <HomePage setPage={setPage} setCurrentProduct={setCurrentProduct} addToCart={addToCart} addToast={addToast} />}
        {page === "product"      && <ProductDetailPage product={currentProduct} setPage={setPage} addToCart={addToCart} addToast={addToast} />}
        {page === "cart"         && <CartPage cart={cart} setCart={setCart} setPage={setPage} addToast={addToast} />}
        {page === "checkout"     && <CheckoutPage cart={cart} setPage={setPage} setOrderId={setOrderId} />}
        {page === "ordersuccess" && <OrderSuccessPage orderId={orderId} cart={cart} setPage={setPage} setCart={setCart} />}
        {page === "login"        && <LoginPage setPage={setPage} setUser={setUser} />}
        {page === "signup"       && <SignupPage setPage={setPage} setUser={setUser} />}
        {page === "dashboard"    && user && <DashboardPage user={user} setUser={setUser} setPage={setPage} />}
        {page === "dashboard"    && !user && <LoginPage setPage={setPage} setUser={setUser} />}
        {page === "wishlist"     && <WishlistPage setPage={setPage} addToCart={addToCart} addToast={addToast} setCurrentProduct={setCurrentProduct} />}
      </main>

      {/* FLOATING WHATSAPP */}
      <button className="floating-whatsapp" title="Chat on WhatsApp">💬</button>

      {/* TOAST */}
      <Toast msg={toast} />
    </>
  );
}
