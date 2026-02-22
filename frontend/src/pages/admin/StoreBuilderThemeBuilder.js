import { useState, useRef, useCallback } from "react";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --blue:#2563eb;--blue-dark:#1d4ed8;--blue-bg:#eff6ff;
  --slate:#0f172a;--surface:#f8fafc;--surface2:#f1f5f9;
  --border:#e2e8f0;--border2:#cbd5e1;
  --text:#1e293b;--muted:#64748b;--light:#94a3b8;
  --green:#16a34a;--green-bg:#f0fdf4;
  --amber:#d97706;--amber-bg:#fffbeb;
  --red:#dc2626;--red-bg:#fef2f2;
  --r:10px;--r-sm:6px;--r-lg:14px;
  --shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04);
  --shadow-md:0 4px 16px rgba(0,0,0,.1);
  --shadow-lg:0 20px 60px rgba(0,0,0,.15);
}
body{font-family:'DM Sans',sans-serif;background:var(--surface);color:var(--text);font-size:14px}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px}

/* LAYOUT */
.builder{display:grid;grid-template-columns:260px 1fr 300px;height:100vh;overflow:hidden}
.builder.nav-mode{grid-template-columns:260px 1fr 340px}
.panel{background:#fff;border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
.panel-r{border-right:none;border-left:1px solid var(--border)}
.panel-header{padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0}
.panel-title{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.panel-scroll{flex:1;overflow-y:auto;padding:12px}

/* TOP BAR */
.topbar{height:52px;background:var(--slate);display:flex;align-items:center;padding:0 16px;gap:10px;flex-shrink:0}
.tb-logo{font-weight:800;color:#fff;font-size:15px;letter-spacing:-.3px;margin-right:8px}
.tb-divider{width:1px;height:20px;background:rgba(255,255,255,.15)}
.tb-store{font-size:12.5px;color:#94a3b8;font-weight:500}
.tb-spacer{flex:1}
.tb-device{display:flex;gap:4px;background:rgba(255,255,255,.08);border-radius:8px;padding:3px}
.tb-dev-btn{padding:5px 10px;border-radius:6px;border:none;background:none;cursor:pointer;color:#94a3b8;font-size:12px;transition:.15s}
.tb-dev-btn.active{background:rgba(255,255,255,.15);color:#fff}
.tb-status{font-size:11.5px;color:#94a3b8;font-weight:500}
.tb-status span{color:#4ade80}
.btn{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:var(--r-sm);font-size:13px;font-weight:600;cursor:pointer;border:none;transition:.15s;font-family:inherit}
.btn-primary{background:var(--blue);color:#fff;box-shadow:0 4px 12px rgba(37,99,235,.3)}
.btn-primary:hover{background:var(--blue-dark)}
.btn-ghost{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.15)}
.btn-ghost:hover{background:rgba(255,255,255,.18)}
.btn-sm{padding:5px 10px;font-size:12px}
.btn-outline{background:#fff;border:1.5px solid var(--border2);color:var(--text)}
.btn-outline:hover{border-color:var(--blue);color:var(--blue)}
.btn-danger{background:var(--red);color:#fff}
.btn-success{background:var(--green);color:#fff}

/* SECTION LIST (left panel) */
.sec-palette{display:flex;flex-direction:column;gap:6px}
.sec-palette-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px dashed var(--border2);border-radius:var(--r-sm);cursor:grab;transition:.15s;user-select:none;background:#fff}
.sec-palette-item:hover{border-color:var(--blue);background:var(--blue-bg);color:var(--blue)}
.sec-palette-item:active{cursor:grabbing}
.sec-icon{font-size:18px;flex-shrink:0}
.sec-label{font-size:12.5px;font-weight:600}

/* CANVAS (center) */
.canvas-wrap{flex:1;display:flex;flex-direction:column;background:var(--surface);overflow:hidden}
.canvas-outer{flex:1;overflow-y:auto;display:flex;justify-content:center;padding:20px;background:var(--surface)}
.canvas-frame{background:#fff;border-radius:var(--r-lg);box-shadow:var(--shadow-lg);overflow:hidden;transition:width .3s ease;width:100%}
.canvas-frame.tablet{max-width:768px}
.canvas-frame.mobile{max-width:375px}
.canvas-status{display:flex;align-items:center;justify-content:center;gap:8px;padding:8px;background:var(--slate);font-size:11.5px;color:#64748b;flex-shrink:0}

/* SECTION CARDS in canvas */
.section-card{position:relative;border:2px solid transparent;transition:.15s;cursor:pointer}
.section-card:hover{border-color:var(--blue)}
.section-card.selected{border-color:var(--blue);box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.section-card.dragging{opacity:.4}
.section-card.drag-over{border-top:3px solid var(--blue)}
.section-actions{position:absolute;top:8px;right:8px;display:none;gap:4px;z-index:10}
.section-card:hover .section-actions,.section-card.selected .section-actions{display:flex}
.section-action-btn{width:28px;height:28px;border-radius:6px;border:none;cursor:pointer;display:grid;place-items:center;font-size:13px;transition:.15s}
.sa-move{background:var(--slate);color:#fff}
.sa-del{background:var(--red);color:#fff}
.sa-dupe{background:var(--blue);color:#fff}
.section-label-badge{position:absolute;top:8px;left:8px;background:var(--slate);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;letter-spacing:.5px;display:none;z-index:10}
.section-card.selected .section-label-badge,.section-card:hover .section-label-badge{display:block}
.drag-placeholder{height:4px;background:var(--blue);border-radius:2px;margin:2px 0;transition:.15s}
.empty-canvas{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;border:2px dashed var(--border2);border-radius:var(--r);margin:20px;color:var(--muted);gap:8px}
.empty-canvas-icon{font-size:36px}

/* SECTION RENDERERS */
.s-hero{background:linear-gradient(135deg,#1e293b 0%,#374151 100%);padding:80px 40px;color:#fff;text-align:center;position:relative;overflow:hidden}
.s-hero::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")}
.s-hero h1{font-size:clamp(24px,4vw,48px);font-weight:800;margin-bottom:12px;line-height:1.1}
.s-hero p{font-size:clamp(13px,2vw,18px);opacity:.8;margin-bottom:24px;max-width:500px;margin-left:auto;margin-right:auto}
.s-hero-btn{display:inline-block;background:var(--blue);color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px}
.s-hero-sub{display:inline-block;background:rgba(255,255,255,.1);color:#fff;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-left:10px}
.s-products{padding:40px;background:#fff}
.s-products h2{font-size:clamp(18px,3vw,28px);font-weight:800;margin-bottom:24px;text-align:center;color:var(--slate)}
.s-product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px}
.s-product-card{border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
.s-product-img{height:120px;display:flex;align-items:center;justify-content:center;font-size:36px}
.s-product-info{padding:10px 12px}
.s-product-name{font-size:13px;font-weight:600;color:var(--slate);margin-bottom:4px}
.s-product-price{font-size:13px;font-weight:700;color:var(--blue)}
.s-announcement{background:var(--slate);color:#fff;text-align:center;padding:10px;font-size:13px;font-weight:500}
.s-trust{background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:20px 40px;display:flex;justify-content:center;gap:40px;flex-wrap:wrap}
.s-trust-item{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--muted)}
.s-trust-icon{font-size:20px}
.s-testimonials{padding:40px;background:var(--surface)}
.s-testimonials h2{font-size:22px;font-weight:800;text-align:center;margin-bottom:24px}
.s-testi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.s-testi-card{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:16px}
.s-testi-stars{color:#f59e0b;font-size:12px;margin-bottom:6px}
.s-testi-text{font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:10px}
.s-testi-author{font-size:12px;font-weight:700;color:var(--slate)}
.s-categories{padding:40px;background:#fff}
.s-categories h2{font-size:22px;font-weight:800;text-align:center;margin-bottom:24px}
.s-cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:12px}
.s-cat-item{text-align:center;padding:16px 8px;border:1px solid var(--border);border-radius:var(--r);cursor:pointer;transition:.15s}
.s-cat-item:hover{border-color:var(--blue);background:var(--blue-bg)}
.s-cat-icon{font-size:28px;margin-bottom:6px}
.s-cat-label{font-size:11.5px;font-weight:600;color:var(--slate)}
.s-banner{padding:40px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;text-align:center}
.s-banner h2{font-size:clamp(20px,4vw,36px);font-weight:800;margin-bottom:8px}
.s-banner p{font-size:14px;opacity:.9;margin-bottom:20px}
.s-banner-btn{background:#fff;color:#ef4444;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block}
.s-video{padding:40px;background:var(--surface);text-align:center}
.s-video-placeholder{width:100%;max-width:560px;height:200px;background:var(--slate);border-radius:var(--r);margin:0 auto;display:flex;align-items:center;justify-content:center;color:#fff;font-size:40px}
.s-newsletter{padding:40px;background:var(--slate);text-align:center;color:#fff}
.s-newsletter h2{font-size:22px;font-weight:800;margin-bottom:8px}
.s-newsletter p{color:#94a3b8;margin-bottom:20px;font-size:14px}
.s-nl-form{display:flex;gap:8px;max-width:400px;margin:0 auto}
.s-nl-input{flex:1;padding:10px 14px;border-radius:8px;border:none;font-size:13px}
.s-nl-btn{background:var(--blue);color:#fff;padding:10px 18px;border-radius:8px;border:none;font-weight:700;font-size:13px;cursor:pointer}

/* RIGHT PANEL - Settings */
.settings-panel{display:flex;flex-direction:column;height:100%}
.sp-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--muted);gap:8px;padding:20px;text-align:center}
.sp-empty-icon{font-size:40px}
.field-group{margin-bottom:14px}
.field-label{font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;display:block}
.field-input{width:100%;padding:8px 11px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:13px;font-family:inherit;color:var(--text);outline:none;transition:.15s}
.field-input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
.field-textarea{resize:vertical;min-height:70px}
.field-color{height:38px;padding:2px 4px;cursor:pointer;width:100%}
.field-range{width:100%}
.field-toggle{display:flex;align-items:center;justify-content:space-between;padding:8px 11px;border:1.5px solid var(--border);border-radius:var(--r-sm)}
.toggle-pill{width:38px;height:22px;border-radius:99px;border:none;cursor:pointer;position:relative;transition:.2s;flex-shrink:0}
.toggle-pill.on{background:var(--blue)}
.toggle-pill.off{background:var(--border2)}
.toggle-pill::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.toggle-pill.on::after{left:19px}
.field-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
.sp-section-name{font-size:15px;font-weight:800;color:var(--slate);margin-bottom:4px;display:flex;align-items:center;gap:8px}
.sp-section-type{font-size:11px;font-weight:600;color:var(--muted);background:var(--surface2);padding:2px 8px;border-radius:99px}
.divider-sm{height:1px;background:var(--border);margin:14px 0}

/* VERSION HISTORY */
.version-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:6px;cursor:pointer;transition:.15s}
.version-item:hover{border-color:var(--blue);background:var(--blue-bg)}
.version-item.live{border-color:var(--green);background:var(--green-bg)}
.v-num{width:32px;height:32px;border-radius:8px;background:var(--surface2);display:grid;place-items:center;font-size:12px;font-weight:800;color:var(--muted);flex-shrink:0}
.version-item.live .v-num{background:var(--green);color:#fff}

/* NAVIGATION BUILDER */
.nav-tree{display:flex;flex-direction:column;gap:4px}
.nav-item{border:1px solid var(--border);border-radius:var(--r-sm);overflow:hidden}
.nav-item-row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#fff;cursor:pointer;transition:.15s}
.nav-item-row:hover{background:var(--surface)}
.nav-drag{cursor:grab;color:var(--light);font-size:16px}
.nav-label{flex:1;font-size:13px;font-weight:600}
.nav-type-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;background:var(--surface2);color:var(--muted)}
.nav-children{padding:4px 4px 4px 28px;background:var(--surface);display:flex;flex-direction:column;gap:4px}
.nav-child-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--r-sm);background:#fff;font-size:12.5px}
.nav-add-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border:1.5px dashed var(--border2);border-radius:var(--r-sm);cursor:pointer;color:var(--muted);font-size:12.5px;font-weight:600;transition:.15s}
.nav-add-btn:hover{border-color:var(--blue);color:var(--blue);background:var(--blue-bg)}

/* STATIC PAGE EDITOR */
.page-editor{display:flex;flex-direction:column;height:100%;padding:16px}
.page-list-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:6px;cursor:pointer;transition:.15s}
.page-list-item:hover,.page-list-item.active{border-color:var(--blue);background:var(--blue-bg)}
.page-status{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.page-status.published{background:var(--green)}
.page-status.draft{background:var(--amber)}
.page-status.hidden{background:var(--light)}
.wysiwyg{border:1.5px solid var(--border);border-radius:var(--r-sm);overflow:hidden}
.wysiwyg-toolbar{display:flex;gap:2px;padding:6px 8px;background:var(--surface2);border-bottom:1px solid var(--border);flex-wrap:wrap}
.wysiwyg-btn{padding:4px 8px;border:none;background:none;cursor:pointer;border-radius:4px;font-size:12px;color:var(--text);font-family:inherit;transition:.1s}
.wysiwyg-btn:hover{background:var(--border)}
.wysiwyg-btn.active{background:var(--blue);color:#fff}
.wysiwyg-content{padding:16px;min-height:200px;font-size:14px;line-height:1.7;color:var(--text);outline:none}

/* THEME SETTINGS (Design Tokens) */
.theme-settings{padding:12px}
.token-section{margin-bottom:20px}
.token-section-title{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.color-swatch{display:flex;align-items:center;gap:8px;padding:6px 0}
.color-preview{width:28px;height:28px;border-radius:6px;border:1px solid var(--border);flex-shrink:0}
.font-preview{padding:8px 11px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:15px;margin-bottom:6px}

/* TABS */
.tabs-row{display:flex;background:var(--surface2);border-radius:8px;padding:3px;gap:2px;margin-bottom:14px}
.tab{padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:none;color:var(--muted);transition:.15s;font-family:inherit}
.tab.active{background:#fff;color:var(--blue);box-shadow:var(--shadow)}

/* TOAST */
.toast-wrap{position:fixed;bottom:20px;right:20px;display:flex;flex-direction:column;gap:8px;z-index:9999}
.toast{background:var(--slate);color:#fff;padding:11px 16px;border-radius:var(--r);font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px;box-shadow:var(--shadow-lg);animation:tin .2s ease;min-width:240px}
.toast.success{background:var(--green)}
.toast.warn{background:var(--amber)}
@keyframes tin{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:#fff;border-radius:var(--r-lg);max-width:520px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:var(--shadow-lg);animation:mup .2s ease}
@keyframes mup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.modal-header{padding:20px 22px 0;display:flex;align-items:flex-start;justify-content:space-between}
.modal-body{padding:18px 22px}
.modal-footer{padding:14px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px}
.modal-close{width:28px;height:28px;border-radius:6px;border:none;background:var(--surface2);cursor:pointer;display:grid;place-items:center;color:var(--muted)}
.modal-close:hover{background:var(--border)}

/* MISC */
.chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700}
.chip-live{background:var(--green-bg);color:var(--green)}
.chip-draft{background:var(--amber-bg);color:var(--amber)}
.chip-new{background:var(--blue-bg);color:var(--blue)}
.badge{background:var(--blue);color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px}
.info-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px}
.info-row:last-child{border:none}
.info-key{color:var(--muted);font-weight:500}
.info-val{font-weight:600}
`;

// ─── SECTION DEFINITIONS ─────────────────────────────────────────────────────
const SECTION_TYPES = [
  { type:'announcement', label:'Announcement Bar', emoji:'📢', defaultProps:{ text:'🔥 Sale Live! Use code SAVE20 for 20% off · Free shipping above ₹999', bg:'#0f172a', color:'#fff' }},
  { type:'hero', label:'Hero Banner', emoji:'🖼️', defaultProps:{ headline:'Welcome to Our Store', subtext:'Discover amazing products at great prices', btnText:'Shop Now', btnUrl:'#', btnStyle:'primary', showSecondBtn:true, secondBtnText:'View Collections', bg:'#1e293b' }},
  { type:'categories', label:'Category Grid', emoji:'🗂️', defaultProps:{ title:'Shop by Category', items:[{icon:'👗',label:'Fashion'},{icon:'📱',label:'Electronics'},{icon:'💍',label:'Jewellery'},{icon:'🏠',label:'Home Decor'},{icon:'💄',label:'Beauty'},{icon:'👟',label:'Footwear'}] }},
  { type:'products', label:'Featured Products', emoji:'🛍️', defaultProps:{ title:'Featured Products', columns:4, items:[{name:'Kanjivaram Silk Saree',price:'₹4,999',emoji:'👗'},{name:'Brass Diya Set',price:'₹899',emoji:'🪔'},{name:'Cotton Kurta',price:'₹1,299',emoji:'👕'},{name:'Jute Bag',price:'₹599',emoji:'👜'}] }},
  { type:'banner', label:'Promo Banner', emoji:'🎯', defaultProps:{ headline:'Diwali Sale — Up to 70% Off!', subtext:'Shop our biggest festival sale. Limited time.', btnText:'Grab Deals', gradient:'#f59e0b,#ef4444' }},
  { type:'trust', label:'Trust Badges', emoji:'🛡️', defaultProps:{ items:[{icon:'🚚',label:'Free Delivery above ₹999'},{icon:'🔄',label:'Easy 30-Day Returns'},{icon:'🔒',label:'100% Secure Payments'},{icon:'💳',label:'COD Available'},{icon:'⭐',label:'4.8/5 Customer Rating'}] }},
  { type:'testimonials', label:'Testimonials', emoji:'💬', defaultProps:{ title:'What Our Customers Say', items:[{text:'"Absolutely love the quality! Will definitely order again."',author:'Priya Sharma',city:'Mumbai',stars:5},{text:'"Fast delivery and beautiful packaging. Highly recommended!"',author:'Rahul Verma',city:'Delhi',stars:5},{text:'"Perfect gift for my mom. She loved it!"',author:'Anjali Nair',city:'Bangalore',stars:4}] }},
  { type:'video', label:'Video Section', emoji:'🎬', defaultProps:{ title:'Our Story', placeholder:'▶' }},
  { type:'newsletter', label:'Newsletter Signup', emoji:'📧', defaultProps:{ headline:'Stay in the Loop', subtext:'Get exclusive deals, new arrivals & festival offers.', placeholder:'Enter your email', btnText:'Subscribe' }},
];

const SECTION_SCHEMA = {
  announcement:[ { key:'text', label:'Announcement Text', type:'text' }, { key:'bg', label:'Background Color', type:'color' }, { key:'color', label:'Text Color', type:'color' } ],
  hero:[ { key:'headline', label:'Headline', type:'text' }, { key:'subtext', label:'Subtext', type:'textarea' }, { key:'btnText', label:'Button Text', type:'text' }, { key:'btnUrl', label:'Button URL', type:'text' }, { key:'showSecondBtn', label:'Show Second Button', type:'toggle' }, { key:'secondBtnText', label:'Second Button Text', type:'text' }, { key:'bg', label:'Background Color', type:'color' } ],
  categories:[ { key:'title', label:'Section Title', type:'text' } ],
  products:[ { key:'title', label:'Section Title', type:'text' }, { key:'columns', label:'Columns', type:'select', options:['2','3','4'] } ],
  banner:[ { key:'headline', label:'Headline', type:'text' }, { key:'subtext', label:'Subtext', type:'text' }, { key:'btnText', label:'Button Text', type:'text' } ],
  trust:[], video:[ { key:'title', label:'Title', type:'text' } ],
  newsletter:[ { key:'headline', label:'Headline', type:'text' }, { key:'subtext', label:'Subtext', type:'text' }, { key:'btnText', label:'Button Text', type:'text' } ],
  testimonials:[ { key:'title', label:'Section Title', type:'text' } ],
};

// ─── SECTION RENDERER ─────────────────────────────────────────────────────────
function SectionRenderer({ sec }) {
  const p = sec.props;
  if (sec.type === 'announcement') return <div className="s-announcement" style={{ background: p.bg, color: p.color }}>{p.text}</div>;
  if (sec.type === 'hero') return (
    <div className="s-hero" style={{ background: p.bg }}>
      <h1>{p.headline}</h1><p>{p.subtext}</p>
      <div><span className="s-hero-btn">{p.btnText}</span>{p.showSecondBtn && <span className="s-hero-sub">{p.secondBtnText}</span>}</div>
    </div>
  );
  if (sec.type === 'categories') return (
    <div className="s-categories"><h2>{p.title}</h2>
      <div className="s-cat-grid">{(p.items||[]).map((c,i)=>(<div key={i} className="s-cat-item"><div className="s-cat-icon">{c.icon}</div><div className="s-cat-label">{c.label}</div></div>))}</div>
    </div>
  );
  if (sec.type === 'products') return (
    <div className="s-products"><h2>{p.title}</h2>
      <div className="s-product-grid" style={{ gridTemplateColumns:`repeat(${p.columns||4},1fr)` }}>{(p.items||[]).map((item,i)=>(<div key={i} className="s-product-card"><div className="s-product-img" style={{ background:'#f8fafc' }}>{item.emoji}</div><div className="s-product-info"><div className="s-product-name">{item.name}</div><div className="s-product-price">{item.price}</div></div></div>))}</div>
    </div>
  );
  if (sec.type === 'banner') return (
    <div className="s-banner" style={{ background:`linear-gradient(135deg,${p.gradient||'#f59e0b,#ef4444'})` }}>
      <h2>{p.headline}</h2><p>{p.subtext}</p><span className="s-banner-btn">{p.btnText}</span>
    </div>
  );
  if (sec.type === 'trust') return (
    <div className="s-trust">{(p.items||[]).map((t,i)=>(<div key={i} className="s-trust-item"><span className="s-trust-icon">{t.icon}</span>{t.label}</div>))}</div>
  );
  if (sec.type === 'testimonials') return (
    <div className="s-testimonials"><h2>{p.title}</h2>
      <div className="s-testi-grid">{(p.items||[]).map((t,i)=>(<div key={i} className="s-testi-card"><div className="s-testi-stars">{'★'.repeat(t.stars)}</div><div className="s-testi-text">{t.text}</div><div className="s-testi-author">{t.author} · {t.city}</div></div>))}</div>
    </div>
  );
  if (sec.type === 'video') return (
    <div className="s-video"><h2 style={{ marginBottom:16 }}>{p.title}</h2><div className="s-video-placeholder">{p.placeholder||'▶'}</div></div>
  );
  if (sec.type === 'newsletter') return (
    <div className="s-newsletter"><h2>{p.headline}</h2><p>{p.subtext}</p>
      <div className="s-nl-form"><input className="s-nl-input" placeholder={p.placeholder}/><button className="s-nl-btn">{p.btnText}</button></div>
    </div>
  );
  return <div style={{ padding:20, background:'#f1f5f9', textAlign:'center', color:'#64748b' }}>[{sec.type}]</div>;
}

// ─── FIELD RENDERER ───────────────────────────────────────────────────────────
function FieldRenderer({ field, value, onChange }) {
  if (field.type === 'text') return <input className="field-input" value={value||''} onChange={e=>onChange(e.target.value)} placeholder={field.label}/>;
  if (field.type === 'textarea') return <textarea className="field-input field-textarea" value={value||''} onChange={e=>onChange(e.target.value)}/>;
  if (field.type === 'color') return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <input type="color" className="field-input field-color" style={{ width:44, padding:'2px 4px', height:36 }} value={value||'#000000'} onChange={e=>onChange(e.target.value)}/>
      <input className="field-input" style={{ flex:1 }} value={value||''} onChange={e=>onChange(e.target.value)} placeholder="#000000"/>
    </div>
  );
  if (field.type === 'toggle') return (
    <div className="field-toggle">
      <span style={{ fontSize:13 }}>{field.label}</span>
      <button className={`toggle-pill ${value?'on':'off'}`} onClick={()=>onChange(!value)}/>
    </div>
  );
  if (field.type === 'select') return (
    <select className="field-input field-select" value={value||field.options[0]} onChange={e=>onChange(e.target.value)}>
      {field.options.map(o=><option key={o}>{o}</option>)}
    </select>
  );
  if (field.type === 'range') return <input type="range" className="field-range" min={field.min||0} max={field.max||100} value={value||50} onChange={e=>onChange(e.target.value)}/>;
  return null;
}

// ─── NAVIGATION BUILDER ───────────────────────────────────────────────────────
function NavigationBuilder({ toast }) {
  const [menus, setMenus] = useState({
    main: [
      { id:1, label:'Home', type:'page', url:'/', children:[] },
      { id:2, label:'Shop', type:'collection', url:'/collections', children:[
        { id:21, label:'Sarees', url:'/collections/sarees' },
        { id:22, label:'Kurtas', url:'/collections/kurtas' },
        { id:23, label:'Jewellery', url:'/collections/jewellery' },
      ]},
      { id:3, label:'About Us', type:'page', url:'/pages/about', children:[] },
      { id:4, label:'Contact', type:'page', url:'/pages/contact', children:[] },
    ],
    footer1: [
      { id:5, label:'About Us', type:'page', url:'/pages/about', children:[] },
      { id:6, label:'FAQ', type:'page', url:'/pages/faq', children:[] },
    ],
    footer2: [
      { id:7, label:'Privacy Policy', type:'page', url:'/pages/privacy', children:[] },
      { id:8, label:'Return Policy', type:'page', url:'/pages/returns', children:[] },
      { id:9, label:'Shipping Info', type:'page', url:'/pages/shipping', children:[] },
    ],
  });
  const [activeMenu, setActiveMenu] = useState('main');
  const [addModal, setAddModal] = useState(null);
  const [newItem, setNewItem] = useState({ label:'', type:'page', url:'' });

  const addItem = (parentId=null) => {
    const item = { id: Date.now(), ...newItem, children:[] };
    setMenus(prev => {
      const updated = prev[activeMenu].map(m => {
        if (parentId && m.id === parentId) return { ...m, children:[...m.children, { id:item.id, label:item.label, url:item.url }] };
        return m;
      });
      return { ...prev, [activeMenu]: parentId ? updated : [...updated, item] };
    });
    setAddModal(null); setNewItem({ label:'', type:'page', url:'' });
    toast('Menu item added', 'success');
  };

  const removeItem = (id, parentId=null) => {
    setMenus(prev => {
      if (!parentId) return { ...prev, [activeMenu]: prev[activeMenu].filter(m=>m.id!==id) };
      return { ...prev, [activeMenu]: prev[activeMenu].map(m => m.id===parentId ? {...m, children:m.children.filter(c=>c.id!==id)} : m) };
    });
    toast('Item removed');
  };

  const menuItems = menus[activeMenu] || [];
  const typeColors = { page:'#eff6ff', collection:'#f0fdf4', url:'#fffbeb' };
  const typeText = { page:'#1d4ed8', collection:'#15803d', url:'#92400e' };

  return (
    <div style={{ padding:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontWeight:800, fontSize:15 }}>Navigation Builder</div>
        <button className="btn btn-primary btn-sm" onClick={()=>{ toast('Navigation saved!','success'); }}>Save</button>
      </div>

      <div className="tabs-row mb-16">
        {[{id:'main',label:'Main Menu'},{id:'footer1',label:'Footer Col 1'},{id:'footer2',label:'Footer Col 2'}].map(m=>(
          <button key={m.id} className={`tab ${activeMenu===m.id?'active':''}`} onClick={()=>setActiveMenu(m.id)}>{m.label}</button>
        ))}
      </div>

      <div className="nav-tree">
        {menuItems.map(item=>(
          <div key={item.id} className="nav-item">
            <div className="nav-item-row">
              <span className="nav-drag">⠿</span>
              <span className="nav-label">{item.label}</span>
              <span className="nav-type-badge" style={{ background:typeColors[item.type], color:typeText[item.type] }}>{item.type}</span>
              <button className="btn btn-sm" style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'2px 4px' }} onClick={()=>setAddModal({type:'child', parentId:item.id})}>+</button>
              <button className="btn btn-sm" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', padding:'2px 4px' }} onClick={()=>removeItem(item.id)}>×</button>
            </div>
            {item.children?.length > 0 && (
              <div className="nav-children">
                {item.children.map(child=>(
                  <div key={child.id} className="nav-child-item">
                    <span style={{ fontSize:12, color:'var(--light)', marginRight:4 }}>└</span>
                    <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{child.label}</span>
                    <span style={{ fontSize:11.5, color:'var(--muted)' }}>{child.url}</span>
                    <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', marginLeft:8 }} onClick={()=>removeItem(child.id, item.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="nav-add-btn" onClick={()=>setAddModal({type:'top'})}>+ Add Menu Item</div>
      </div>

      {addModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setAddModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div style={{ fontWeight:800 }}>{addModal.type==='child'?'Add Sub-item':'Add Menu Item'}</div>
              <button className="modal-close" onClick={()=>setAddModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="field-group"><label className="field-label">Label</label><input className="field-input" placeholder="e.g. Sarees" value={newItem.label} onChange={e=>setNewItem({...newItem,label:e.target.value})}/></div>
              <div className="field-group"><label className="field-label">Type</label>
                <select className="field-input field-select" value={newItem.type} onChange={e=>setNewItem({...newItem,type:e.target.value})}>
                  <option value="page">Page</option><option value="collection">Collection</option><option value="url">Custom URL</option>
                </select>
              </div>
              <div className="field-group"><label className="field-label">URL</label><input className="field-input" placeholder="/pages/about" value={newItem.url} onChange={e=>setNewItem({...newItem,url:e.target.value})}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setAddModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={()=>addItem(addModal.parentId)}>Add Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STATIC PAGE EDITOR ───────────────────────────────────────────────────────
function StaticPageEditor({ toast }) {
  const [pages, setPages] = useState([
    { id:1, title:'About Us', slug:'about', status:'published', body:'<p>Welcome to our store. We are passionate about bringing you the best products at the best prices.</p><h2>Our Mission</h2><p>To make quality products accessible to everyone across India.</p>' },
    { id:2, title:'Contact Us', slug:'contact', status:'published', body:'<p>Get in touch with us for any queries.</p>' },
    { id:3, title:'Privacy Policy', slug:'privacy', status:'published', body:'<p>Your privacy matters to us. This policy explains how we collect and use your data.</p>' },
    { id:4, title:'Return Policy', slug:'returns', status:'draft', body:'<p>We offer 30-day easy returns on all products.</p>' },
    { id:5, title:'Shipping Info', slug:'shipping', status:'published', body:'<p>We deliver across India within 3-7 business days.</p>' },
  ]);
  const [selected, setSelected] = useState(pages[0]);
  const [seoOpen, setSeoOpen] = useState(false);
  const [newPage, setNewPage] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const update = (key, val) => {
    const updated = { ...selected, [key]: val };
    setSelected(updated);
    setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const createPage = () => {
    const p = { id: Date.now(), title: newTitle, slug: newTitle.toLowerCase().replace(/\s+/g,'-'), status:'draft', body:'' };
    setPages(prev => [...prev, p]);
    setSelected(p); setNewPage(false); setNewTitle('');
    toast('Page created', 'success');
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', height:'calc(100vh - 52px)' }}>
      {/* Page List */}
      <div style={{ borderRight:'1px solid var(--border)', padding:12, display:'flex', flexDirection:'column', gap:4, overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, padding:'0 4px' }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px' }}>Pages</span>
          <button className="btn btn-primary btn-sm" onClick={()=>setNewPage(true)}>+</button>
        </div>
        {pages.map(p=>(
          <div key={p.id} className={`page-list-item ${selected?.id===p.id?'active':''}`} onClick={()=>setSelected(p)}>
            <div className={`page-status ${p.status}`}/>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>{p.title}</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>/{p.slug}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Editor */}
      {selected && (
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <input className="field-input" style={{ flex:1, fontSize:18, fontWeight:800, border:'none', padding:'4px 0', outline:'none', maxWidth:400 }} value={selected.title} onChange={e=>update('title',e.target.value)}/>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <select className="field-input field-select" style={{ width:'auto' }} value={selected.status} onChange={e=>update('status',e.target.value)}>
                <option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option>
              </select>
              <button className="btn btn-outline btn-sm" onClick={()=>setSeoOpen(true)}>SEO</button>
              <button className="btn btn-primary btn-sm" onClick={()=>{ update('status','published'); toast('Page saved & published','success'); }}>Publish</button>
            </div>
          </div>
          <div style={{ fontSize:12, color:'var(--muted)' }}>URL: yourstore.com/pages/{selected.slug}</div>

          {/* WYSIWYG */}
          <div className="wysiwyg">
            <div className="wysiwyg-toolbar">
              {['B','I','U','H1','H2','H3','Quote','Link','Image','Bullet','Number'].map(f=>(
                <button key={f} className="wysiwyg-btn" onClick={()=>toast(`Format: ${f}`)}>{f}</button>
              ))}
            </div>
            <div className="wysiwyg-content" contentEditable suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: selected.body }}
              onBlur={e=>update('body',e.currentTarget.innerHTML)}/>
          </div>
        </div>
      )}

      {/* SEO Modal */}
      {seoOpen && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setSeoOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <div style={{ fontWeight:800, fontSize:16 }}>SEO Settings — {selected?.title}</div>
              <button className="modal-close" onClick={()=>setSeoOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="field-group"><label className="field-label">Meta Title</label><input className="field-input" placeholder="Page title for search engines" defaultValue={selected?.title}/><div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Recommended: 50–60 characters</div></div>
              <div className="field-group"><label className="field-label">Meta Description</label><textarea className="field-input field-textarea" placeholder="Brief description for search engines (150–160 chars)" style={{ minHeight:80 }}/></div>
              <div className="field-group"><label className="field-label">URL Slug</label>
                <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                  <span style={{ padding:'8px 10px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRight:'none', borderRadius:'6px 0 0 6px', fontSize:12, color:'var(--muted)', whiteSpace:'nowrap' }}>/pages/</span>
                  <input className="field-input" style={{ borderRadius:'0 6px 6px 0' }} value={selected?.slug} onChange={e=>update('slug',e.target.value)}/>
                </div>
              </div>
              <div className="field-group"><label className="field-label">OG Image URL</label><input className="field-input" placeholder="https://cdn.yourstore.com/og-image.jpg"/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setSeoOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={()=>{ toast('SEO settings saved','success'); setSeoOpen(false); }}>Save SEO</button>
            </div>
          </div>
        </div>
      )}

      {newPage && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setNewPage(false)}>
          <div className="modal">
            <div className="modal-header"><div style={{ fontWeight:800 }}>Create New Page</div><button className="modal-close" onClick={()=>setNewPage(false)}>×</button></div>
            <div className="modal-body">
              <div className="field-group"><label className="field-label">Page Title</label><input className="field-input" placeholder="e.g. About Us" value={newTitle} onChange={e=>setNewTitle(e.target.value)} autoFocus/></div>
              {newTitle && <div style={{ fontSize:12, color:'var(--muted)' }}>URL: /pages/{newTitle.toLowerCase().replace(/\s+/g,'-')}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setNewPage(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!newTitle.trim()} onClick={createPage}>Create Page</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── THEME SETTINGS PANEL ─────────────────────────────────────────────────────
function ThemeSettingsPanel({ toast }) {
  const [tokens, setTokens] = useState({
    colorPrimary:'#2563eb', colorAccent:'#0f172a', colorSurface:'#f8fafc', colorText:'#1e293b',
    colorSuccess:'#16a34a', colorWarning:'#d97706',
    fontHeading:'DM Sans', fontBody:'DM Sans',
    logoUrl:'', faviconUrl:'', headerStyle:'fixed', footerStyle:'dark',
    borderRadius:'10', buttonStyle:'rounded',
  });

  const set = (k,v) => setTokens(t=>({...t,[k]:v}));
  const fonts = ['DM Sans','Poppins','Nunito','Playfair Display','Merriweather','Lato','Raleway','Josefin Sans'];

  return (
    <div style={{ padding:14, overflowY:'auto', height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontWeight:800, fontSize:15 }}>Theme Settings</div>
        <button className="btn btn-primary btn-sm" onClick={()=>toast('Theme settings saved!','success')}>Save</button>
      </div>

      {/* Logo */}
      <div className="token-section">
        <div className="token-section-title">Logo & Identity</div>
        <div className="field-group"><label className="field-label">Logo URL</label>
          <input className="field-input" placeholder="https://cdn.yourstore.com/logo.png" value={tokens.logoUrl} onChange={e=>set('logoUrl',e.target.value)}/>
        </div>
        <div className="field-group"><label className="field-label">Favicon URL</label>
          <input className="field-input" placeholder="https://cdn.yourstore.com/favicon.ico" value={tokens.faviconUrl} onChange={e=>set('faviconUrl',e.target.value)}/>
        </div>
      </div>

      {/* Colors */}
      <div className="token-section">
        <div className="token-section-title">Brand Colors</div>
        {[['colorPrimary','Primary Color'],['colorAccent','Accent / Dark'],['colorSurface','Surface / Background'],['colorText','Body Text'],['colorSuccess','Success'],['colorWarning','Warning']].map(([k,label])=>(
          <div key={k} className="color-swatch">
            <div className="color-preview" style={{ background:tokens[k] }}/>
            <span style={{ fontSize:12.5, fontWeight:500, flex:1 }}>{label}</span>
            <input type="color" style={{ width:32, height:28, padding:2, border:'1px solid var(--border)', borderRadius:4, cursor:'pointer' }} value={tokens[k]} onChange={e=>set(k,e.target.value)}/>
            <input className="field-input" style={{ width:90, fontSize:12, padding:'4px 8px' }} value={tokens[k]} onChange={e=>set(k,e.target.value)}/>
          </div>
        ))}
      </div>

      {/* Typography */}
      <div className="token-section">
        <div className="token-section-title">Typography</div>
        <div className="field-group">
          <label className="field-label">Heading Font</label>
          <div className="font-preview" style={{ fontFamily:tokens.fontHeading }}>Store Heading — Aa</div>
          <select className="field-input field-select" value={tokens.fontHeading} onChange={e=>set('fontHeading',e.target.value)}>
            {fonts.map(f=><option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label className="field-label">Body Font</label>
          <div className="font-preview" style={{ fontFamily:tokens.fontBody }}>Body text preview — Aa</div>
          <select className="field-input field-select" value={tokens.fontBody} onChange={e=>set('fontBody',e.target.value)}>
            {fonts.map(f=><option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Layout */}
      <div className="token-section">
        <div className="token-section-title">Layout & Style</div>
        <div className="field-group"><label className="field-label">Header Style</label>
          <select className="field-input field-select" value={tokens.headerStyle} onChange={e=>set('headerStyle',e.target.value)}>
            <option value="fixed">Fixed (sticky on scroll)</option><option value="static">Static</option><option value="transparent">Transparent hero</option>
          </select>
        </div>
        <div className="field-group"><label className="field-label">Footer Style</label>
          <select className="field-input field-select" value={tokens.footerStyle} onChange={e=>set('footerStyle',e.target.value)}>
            <option value="dark">Dark</option><option value="light">Light</option><option value="minimal">Minimal</option>
          </select>
        </div>
        <div className="field-group"><label className="field-label">Border Radius</label>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="range" className="field-range" min={0} max={20} value={tokens.borderRadius} onChange={e=>set('borderRadius',e.target.value)}/>
            <span style={{ fontSize:12, color:'var(--muted)', minWidth:30 }}>{tokens.borderRadius}px</span>
          </div>
        </div>
        <div className="field-group"><label className="field-label">Button Style</label>
          <select className="field-input field-select" value={tokens.buttonStyle} onChange={e=>set('buttonStyle',e.target.value)}>
            <option value="rounded">Rounded</option><option value="pill">Pill</option><option value="sharp">Sharp corners</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── VERSION HISTORY PANEL ────────────────────────────────────────────────────
function VersionPanel({ onClose, toast }) {
  const versions = [
    { v:7, date:'Today, 2:41 PM', label:'Current Draft', sections:9, live:false },
    { v:6, date:'Today, 11:20 AM', label:'Published', sections:8, live:true },
    { v:5, date:'Yesterday, 4:10 PM', label:'Pre-sale update', sections:8, live:false },
    { v:4, date:'Jan 30, 3:00 PM', label:'Diwali layout', sections:7, live:false },
    { v:3, date:'Jan 22, 1:00 PM', label:'Initial design', sections:5, live:false },
  ];
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div style={{ fontWeight:800, fontSize:16 }}>Version History</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {versions.map(v=>(
            <div key={v.v} className={`version-item ${v.live?'live':''}`}>
              <div className="v-num">v{v.v}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{v.label}</div>
                <div style={{ fontSize:11.5, color:'var(--muted)' }}>{v.date} · {v.sections} sections</div>
              </div>
              {v.live && <span className="chip chip-live">LIVE</span>}
              {!v.live && <button className="btn btn-outline btn-sm" onClick={()=>{ toast(`Rolled back to v${v.v}`,'success'); onClose(); }}>Restore</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN BUILDER ─────────────────────────────────────────────────────────────
export default function ThemeBuilder() {
  const [mode, setMode] = useState('builder'); // builder | navigation | pages | theme-settings
  const [device, setDevice] = useState('desktop');
  const [sections, setSections] = useState([
    { id:'s1', type:'announcement', props:{ text:'🔥 Grand Sale! Use code SAVE20 for 20% off · Free shipping above ₹999', bg:'#0f172a', color:'#fff' }},
    { id:'s2', type:'hero', props:{ headline:'Discover Indian Craftsmanship', subtext:'Handpicked sarees, kurtas, and jewellery from the finest artisans across India.', btnText:'Shop Collection', btnUrl:'#', btnStyle:'primary', showSecondBtn:true, secondBtnText:'View Lookbook', bg:'#1e293b' }},
    { id:'s3', type:'trust', props:{ items:[{icon:'🚚',label:'Free Delivery above ₹999'},{icon:'🔄',label:'30-Day Easy Returns'},{icon:'🔒',label:'Secure Payments'},{icon:'💳',label:'COD Available'},{icon:'⭐',label:'4.8/5 Rating'}] }},
    { id:'s4', type:'categories', props:{ title:'Shop by Category', items:[{icon:'👗',label:'Sarees'},{icon:'👕',label:'Kurtas'},{icon:'💍',label:'Jewellery'},{icon:'🏠',label:'Home Decor'},{icon:'💄',label:'Beauty'},{icon:'👟',label:'Footwear'}] }},
    { id:'s5', type:'products', props:{ title:'Featured Products', columns:4, items:[{name:'Kanjivaram Silk Saree',price:'₹4,999',emoji:'👗'},{name:'Brass Diya Set',price:'₹899',emoji:'🪔'},{name:'Cotton Kurta',price:'₹1,299',emoji:'👕'},{name:'Jute Bag',price:'₹599',emoji:'👜'}] }},
    { id:'s6', type:'banner', props:{ headline:'Diwali Sale — Up to 70% Off!', subtext:'Biggest festival sale of the year. Shop before it ends!', btnText:'Shop Now', gradient:'#f59e0b,#ef4444' }},
    { id:'s7', type:'testimonials', props:{ title:'Loved by 50,000+ Customers', items:[{text:'"Quality is amazing! Exactly as described."',author:'Priya S.',city:'Mumbai',stars:5},{text:'"Super fast delivery and beautiful packaging!"',author:'Rahul V.',city:'Delhi',stars:5},{text:'"My go-to store for festive shopping."',author:'Anjali N.',city:'Bangalore',stars:5}] }},
    { id:'s8', type:'newsletter', props:{ headline:'Get Exclusive Offers', subtext:'Join 50,000+ subscribers for deals, new arrivals & festival offers.', placeholder:'Enter your email', btnText:'Subscribe' }},
  ]);
  const [selected, setSelected] = useState('s2');
  const [toasts, setToasts] = useState([]);
  const [isDraft, setIsDraft] = useState(true);
  const [showVersions, setShowVersions] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [rightTab, setRightTab] = useState('section'); // section | theme

  const toast = (msg, type='') => {
    const id = Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3000);
  };

  const addSection = (type) => {
    const def = SECTION_TYPES.find(s=>s.type===type);
    const newSec = { id:`s${Date.now()}`, type, props:{ ...def.defaultProps } };
    setSections(p=>[...p, newSec]);
    setSelected(newSec.id);
    toast(`${def.label} added`,'success');
  };

  const removeSection = (id) => { setSections(p=>p.filter(s=>s.id!==id)); if(selected===id) setSelected(null); toast('Section removed'); };
  const duplicateSection = (id) => {
    const sec = sections.find(s=>s.id===id);
    const dup = { ...sec, id:`s${Date.now()}`, props:{...sec.props} };
    setSections(p=>{ const idx=p.findIndex(s=>s.id===id); const n=[...p]; n.splice(idx+1,0,dup); return n; });
    setSelected(dup.id); toast('Section duplicated','success');
  };
  const moveSection = (id, dir) => {
    setSections(p=>{ const idx=p.findIndex(s=>s.id===id); if((dir==='up'&&idx===0)||(dir==='down'&&idx===p.length-1)) return p; const n=[...p]; [n[idx],n[dir==='up'?idx-1:idx+1]]=[n[dir==='up'?idx-1:idx+1],n[idx]]; return n; });
  };
  const updateProp = (id, key, val) => {
    setSections(p=>p.map(s=>s.id===id?{...s,props:{...s.props,[key]:val}}:s));
  };

  const publish = () => { setIsDraft(false); toast('Layout published successfully!','success'); };

  const selectedSec = sections.find(s=>s.id===selected);
  const selectedDef = SECTION_TYPES.find(t=>t.type===selectedSec?.type);
  const schema = SECTION_SCHEMA[selectedSec?.type] || [];

  // Drag
  const onDragStart = (id) => setDragId(id);
  const onDragOver = (e, id) => { e.preventDefault(); setDragOver(id); };
  const onDrop = (e, targetId) => {
    e.preventDefault();
    if(!dragId || dragId===targetId) { setDragId(null); setDragOver(null); return; }
    setSections(prev=>{
      const arr=[...prev]; const from=arr.findIndex(s=>s.id===dragId); const to=arr.findIndex(s=>s.id===targetId);
      const [item]=arr.splice(from,1); arr.splice(to,0,item); return arr;
    });
    setDragId(null); setDragOver(null);
  };
  const onDragEnd = () => { setDragId(null); setDragOver(null); };

  // Palette drop
  const onPaletteDragStart = (e, type) => { e.dataTransfer.setData('section-type', type); };
  const onCanvasDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('section-type');
    if(type) addSection(type);
  };

  return (
    <>
      <style>{CSS}</style>
      {/* TOP BAR */}
      <div className="topbar">
        <div className="tb-logo">Sitesellr</div>
        <div className="tb-divider"/>
        <div className="tb-store">Krishna Textiles</div>
        <div className="tb-divider"/>
        {[{id:'builder',label:'🏗️ Builder'},{id:'navigation',label:'🔗 Navigation'},{id:'pages',label:'📄 Pages'},{id:'theme-settings',label:'🎨 Theme'}].map(m=>(
          <button key={m.id} className="btn btn-ghost btn-sm" style={{ background:mode===m.id?'rgba(255,255,255,.18)':'transparent', fontSize:12 }} onClick={()=>setMode(m.id)}>{m.label}</button>
        ))}
        <div className="tb-spacer"/>
        {mode==='builder' && (
          <>
            <div className="tb-device">
              {[{id:'desktop',icon:'🖥'},{id:'tablet',icon:'📱'},{id:'mobile',icon:'📲'}].map(d=>(
                <button key={d.id} className={`tb-dev-btn ${device===d.id?'active':''}`} onClick={()=>setDevice(d.id)}>{d.icon}</button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowVersions(true)}>📋 History</button>
          </>
        )}
        <div className="tb-status">{isDraft?<><span>●</span> Draft</>:<><span style={{color:'#4ade80'}}>●</span> Live</>}</div>
        {mode==='builder' && <button className="btn btn-primary btn-sm" onClick={publish}>🚀 Publish</button>}
      </div>

      {/* MODES */}
      {mode === 'navigation' && <NavigationBuilder toast={toast}/>}
      {mode === 'pages' && <StaticPageEditor toast={toast}/>}
      {mode === 'theme-settings' && (
        <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', height:'calc(100vh - 52px)' }}>
          <div style={{ borderRight:'1px solid var(--border)', overflowY:'auto' }}><ThemeSettingsPanel toast={toast}/></div>
          <div style={{ padding:40, background:'var(--surface)', display:'flex', flexDirection:'column', gap:16, alignItems:'center', overflowY:'auto' }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:8, alignSelf:'flex-start' }}>Live Preview</div>
            <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 20px 60px rgba(0,0,0,.15)', width:'100%', maxWidth:700, overflow:'hidden' }}>
              <SectionRenderer sec={{ type:'announcement', props:{ text:'🔥 Sale! Free shipping above ₹999', bg:'#0f172a', color:'#fff' }}}/>
              <SectionRenderer sec={{ type:'hero', props:{ headline:'Your Brand Here', subtext:'Custom colors, fonts, and style applied live.', btnText:'Shop Now', showSecondBtn:false, bg:'#1e293b' }}}/>
              <SectionRenderer sec={{ type:'trust', props:{ items:[{icon:'🚚',label:'Free Delivery'},{icon:'🔒',label:'Secure Pay'},{icon:'🔄',label:'Easy Returns'}] }}}/>
            </div>
          </div>
        </div>
      )}

      {/* BUILDER MODE */}
      {mode === 'builder' && (
        <div className={`builder`}>
          {/* LEFT — Section Palette */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Sections — Drag to Add</div>
            </div>
            <div className="panel-scroll">
              <div className="sec-palette">
                {SECTION_TYPES.map(s=>(
                  <div key={s.type} className="sec-palette-item" draggable
                    onDragStart={e=>onPaletteDragStart(e,s.type)}
                    onClick={()=>addSection(s.type)}>
                    <span className="sec-icon">{s.emoji}</span>
                    <span className="sec-label">{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="divider-sm"/>
              <div style={{ fontWeight:700, fontSize:11.5, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Section Order</div>
              {sections.map((sec,i)=>{
                const def = SECTION_TYPES.find(t=>t.type===sec.type);
                return (
                  <div key={sec.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 8px', borderRadius:6, cursor:'pointer', background:selected===sec.id?'var(--blue-bg)':'transparent', border:`1px solid ${selected===sec.id?'#bfdbfe':'transparent'}`, marginBottom:2 }} onClick={()=>setSelected(sec.id)}>
                    <span style={{ fontSize:14 }}>{def?.emoji}</span>
                    <span style={{ fontSize:12, fontWeight:600, flex:1, color:selected===sec.id?'var(--blue)':'var(--text)' }}>{def?.label}</span>
                    <div style={{ display:'flex', gap:2 }}>
                      <button style={{ border:'none', background:'none', cursor:'pointer', color:'var(--muted)', fontSize:12, padding:'2px 3px' }} onClick={e=>{e.stopPropagation();moveSection(sec.id,'up')}} disabled={i===0}>↑</button>
                      <button style={{ border:'none', background:'none', cursor:'pointer', color:'var(--muted)', fontSize:12, padding:'2px 3px' }} onClick={e=>{e.stopPropagation();moveSection(sec.id,'down')}} disabled={i===sections.length-1}>↓</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENTER — Canvas */}
          <div className="canvas-wrap">
            <div className="canvas-outer" onDrop={onCanvasDrop} onDragOver={e=>e.preventDefault()}>
              <div className={`canvas-frame ${device}`}>
                {sections.length === 0 && (
                  <div className="empty-canvas">
                    <div className="empty-canvas-icon">🖼️</div>
                    <div style={{ fontWeight:700 }}>Canvas is empty</div>
                    <div style={{ fontSize:12.5 }}>Drag sections from the left panel or click to add</div>
                  </div>
                )}
                {sections.map(sec=>(
                  <div key={sec.id}
                    className={`section-card ${selected===sec.id?'selected':''} ${dragId===sec.id?'dragging':''} ${dragOver===sec.id?'drag-over':''}`}
                    onClick={()=>setSelected(sec.id)}
                    draggable onDragStart={()=>onDragStart(sec.id)} onDragOver={e=>onDragOver(e,sec.id)} onDrop={e=>onDrop(e,sec.id)} onDragEnd={onDragEnd}>
                    <div className="section-label-badge">{SECTION_TYPES.find(t=>t.type===sec.type)?.label}</div>
                    <div className="section-actions">
                      <button className="section-action-btn sa-move" title="Drag to move">⠿</button>
                      <button className="section-action-btn sa-dupe" title="Duplicate" onClick={e=>{e.stopPropagation();duplicateSection(sec.id)}}>⧉</button>
                      <button className="section-action-btn sa-del" title="Delete" onClick={e=>{e.stopPropagation();removeSection(sec.id)}}>✕</button>
                    </div>
                    <SectionRenderer sec={sec}/>
                  </div>
                ))}
              </div>
            </div>
            <div className="canvas-status">
              <span>📐 {device.charAt(0).toUpperCase()+device.slice(1)} Preview</span>
              <span>·</span><span>{sections.length} sections</span>
              <span>·</span><span style={{ color:isDraft?'#f59e0b':'#4ade80' }}>{isDraft?'⚠ Unsaved changes':'✓ Live'}</span>
            </div>
          </div>

          {/* RIGHT — Settings Panel */}
          <div className="panel panel-r">
            <div className="panel-header">
              <div className="tabs-row" style={{ margin:0 }}>
                <button className={`tab ${rightTab==='section'?'active':''}`} onClick={()=>setRightTab('section')}>Section</button>
                <button className={`tab ${rightTab==='theme'?'active':''}`} onClick={()=>setRightTab('theme')}>Theme</button>
              </div>
            </div>

            {rightTab === 'theme' && (
              <div style={{ flex:1, overflowY:'auto' }}><ThemeSettingsPanel toast={toast}/></div>
            )}

            {rightTab === 'section' && (
              <div className="settings-panel">
                {!selectedSec ? (
                  <div className="sp-empty">
                    <div className="sp-empty-icon">👆</div>
                    <div style={{ fontWeight:700, fontSize:14 }}>Select a section</div>
                    <div style={{ fontSize:12.5 }}>Click any section on the canvas to edit its settings</div>
                  </div>
                ) : (
                  <div className="panel-scroll">
                    <div className="sp-section-name">
                      <span>{selectedDef?.emoji}</span>
                      {selectedDef?.label}
                      <span className="sp-section-type">{selectedSec.type}</span>
                    </div>
                    <div className="divider-sm"/>
                    {schema.length === 0 && (
                      <div style={{ color:'var(--muted)', fontSize:12.5, padding:'8px 0' }}>This section has no configurable fields. Edit items directly on the canvas.</div>
                    )}
                    {schema.map(field=>(
                      <div key={field.key} className="field-group">
                        {field.type !== 'toggle' && <label className="field-label">{field.label}</label>}
                        <FieldRenderer field={field} value={selectedSec.props[field.key]} onChange={val=>updateProp(selectedSec.id, field.key, val)}/>
                      </div>
                    ))}
                    <div className="divider-sm"/>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <button className="btn btn-outline btn-sm" onClick={()=>duplicateSection(selectedSec.id)}>⧉ Duplicate</button>
                      <button className="btn btn-sm btn-danger" onClick={()=>removeSection(selectedSec.id)}>✕ Remove</button>
                    </div>
                    <div className="divider-sm"/>
                    <div style={{ fontWeight:700, fontSize:11.5, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Section Info</div>
                    <div className="info-row"><span className="info-key">ID</span><span className="info-val" style={{ fontFamily:'DM Mono', fontSize:11 }}>{selectedSec.id}</span></div>
                    <div className="info-row"><span className="info-key">Type</span><span className="info-val">{selectedSec.type}</span></div>
                    <div className="info-row"><span className="info-key">Position</span><span className="info-val">{sections.findIndex(s=>s.id===selectedSec.id)+1} of {sections.length}</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showVersions && <VersionPanel onClose={()=>setShowVersions(false)} toast={toast}/>}

      <div className="toast-wrap">
        {toasts.map(t=><div key={t.id} className={`toast ${t.type}`}>{t.type==='success'?'✅':t.type==='warn'?'⚠️':'ℹ️'} {t.msg}</div>)}
      </div>
    </>
  );
}
