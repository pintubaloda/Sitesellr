import { useEffect, useState } from "react";
import api from "../../lib/api";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --blue:#2563eb;--blue-dark:#1d4ed8;--blue-bg:#eff6ff;--blue-mid:#bfdbfe;
  --slate:#0f172a;--surface:#f8fafc;--surface2:#f1f5f9;
  --border:#e2e8f0;--border2:#cbd5e1;
  --text:#1e293b;--muted:#64748b;--light:#94a3b8;
  --green:#16a34a;--green-bg:#f0fdf4;
  --amber:#d97706;--amber-bg:#fffbeb;
  --red:#dc2626;--red-bg:#fef2f2;
  --purple:#7c3aed;--purple-bg:#f5f3ff;
  --r:10px;--r-sm:7px;--r-lg:14px;
  --shadow:0 1px 4px rgba(0,0,0,.08);
  --shadow-md:0 4px 20px rgba(0,0,0,.1);
  --shadow-lg:0 20px 60px rgba(0,0,0,.15);
}
body{font-family:'Outfit',sans-serif;background:var(--surface);color:var(--text);font-size:14px}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px}

/* LAYOUT */
.app{display:flex;min-height:100vh}
.sidebar{width:232px;background:var(--slate);flex-shrink:0;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;overflow-y:auto;z-index:100}
.main{margin-left:232px;flex:1;min-height:100vh;display:flex;flex-direction:column}
.topbar{height:56px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 24px;gap:12px;position:sticky;top:0;z-index:50}
.content{flex:1;padding:24px}

/* SIDEBAR */
.sb-logo{padding:20px 16px 8px}
.sb-wordmark{font-size:18px;font-weight:800;color:#fff;letter-spacing:-.4px}
.sb-sub{font-size:10px;color:#475569;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-top:2px}
.sb-section{padding:16px 10px 6px}
.sb-section-label{font-size:10px;font-weight:700;color:#475569;letter-spacing:1.5px;text-transform:uppercase;padding:0 8px;margin-bottom:4px}
.sb-item{display:flex;align-items:center;gap:9px;padding:8px 12px;border-radius:8px;cursor:pointer;transition:.15s;font-size:13px;font-weight:500;color:#94a3b8;margin-bottom:1px}
.sb-item:hover{background:rgba(255,255,255,.07);color:#e2e8f0}
.sb-item.active{background:var(--blue);color:#fff;box-shadow:0 4px 12px rgba(37,99,235,.35)}
.sb-item-icon{font-size:15px;flex-shrink:0}
.sb-badge{margin-left:auto;background:#f59e0b;color:#000;font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px}
.sb-divider{height:1px;background:rgba(255,255,255,.06);margin:8px 16px}
.sb-user{padding:12px 16px;margin-top:auto}
.sb-user-card{background:rgba(255,255,255,.06);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px}
.sb-avatar{width:30px;height:30px;border-radius:8px;background:var(--blue);color:#fff;font-size:12px;font-weight:700;display:grid;place-items:center;flex-shrink:0}

/* ROLE TOGGLE */
.role-toggle{display:flex;gap:2px;margin:10px 10px 4px;background:rgba(255,255,255,.06);border-radius:9px;padding:3px}
.role-btn{flex:1;padding:6px 4px;font-size:11px;font-weight:600;color:#64748b;border:none;background:none;cursor:pointer;border-radius:7px;transition:.15s;font-family:inherit;text-align:center}
.role-btn.active{background:var(--blue);color:#fff}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:5px;padding:8px 16px;border-radius:var(--r-sm);font-size:13px;font-weight:600;cursor:pointer;border:none;transition:.15s;font-family:inherit;white-space:nowrap}
.btn-primary{background:var(--blue);color:#fff;box-shadow:0 4px 12px rgba(37,99,235,.25)}
.btn-primary:hover{background:var(--blue-dark);transform:translateY(-1px)}
.btn-outline{background:#fff;border:1.5px solid var(--border2);color:var(--text)}
.btn-outline:hover{border-color:var(--blue);color:var(--blue)}
.btn-ghost{background:none;color:var(--muted)}
.btn-ghost:hover{background:var(--surface2);color:var(--text)}
.btn-danger{background:var(--red);color:#fff}
.btn-success{background:var(--green);color:#fff}
.btn-amber{background:var(--amber);color:#fff}
.btn-sm{padding:5px 11px;font-size:12px;border-radius:6px}
.btn-lg{padding:11px 24px;font-size:14px}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none!important}

/* CARDS */
.card{background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow)}
.card-header{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.card-header-title{font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px}
.card-body{padding:20px 22px}
.card-footer{padding:14px 22px;border-top:1px solid var(--border);background:var(--surface);border-radius:0 0 var(--r-lg) var(--r-lg);display:flex;justify-content:flex-end;gap:8px}

/* FORMS */
.form-group{margin-bottom:16px}
.form-label{display:block;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px}
.form-label .req{color:var(--red)}
.form-input{width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:13.5px;font-family:inherit;color:var(--text);background:#fff;outline:none;transition:.15s}
.form-input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
.form-input.err{border-color:var(--red)}
.form-hint{font-size:11.5px;color:var(--muted);margin-top:4px}
.form-err{font-size:11.5px;color:var(--red);margin-top:4px;font-weight:500}
.form-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 13px;border:1.5px solid var(--border);border-radius:var(--r-sm);margin-bottom:10px}
.toggle-info{flex:1}
.toggle-info-label{font-size:13px;font-weight:600;color:var(--text)}
.toggle-info-sub{font-size:12px;color:var(--muted);margin-top:1px}
.toggle-switch{width:40px;height:23px;border-radius:99px;border:none;cursor:pointer;position:relative;transition:.2s;flex-shrink:0}
.toggle-switch.on{background:var(--blue)}
.toggle-switch.off{background:var(--border2)}
.toggle-switch::after{content:'';position:absolute;top:3px;left:3px;width:17px;height:17px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.toggle-switch.on::after{left:20px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}

/* PAGE HEADER */
.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:22px;flex-wrap:wrap}
.page-title{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-.4px}
.page-sub{font-size:13px;color:var(--muted);margin-top:3px}

/* TABS */
.tabs{display:flex;gap:3px;background:var(--surface2);border-radius:9px;padding:3px;margin-bottom:20px}
.tab{padding:7px 16px;border-radius:7px;font-size:12.5px;font-weight:600;cursor:pointer;border:none;background:none;color:var(--muted);transition:.15s;font-family:inherit}
.tab.active{background:#fff;color:var(--blue);box-shadow:var(--shadow)}

/* TABLE */
.table-wrap{overflow-x:auto;border-radius:var(--r);border:1px solid var(--border)}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{background:var(--surface2);padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;border-bottom:1px solid var(--border);white-space:nowrap}
tbody td{padding:13px 14px;border-bottom:1px solid var(--border);vertical-align:middle}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover td{background:var(--surface)}
.td-bold{font-weight:600}
.td-mono{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--muted)}

/* STATS */
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px}
.stat-card{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;box-shadow:var(--shadow);display:flex;align-items:center;gap:14px}
.stat-icon{width:44px;height:44px;border-radius:11px;display:grid;place-items:center;font-size:20px;flex-shrink:0}
.stat-val{font-size:22px;font-weight:800;letter-spacing:-1px}
.stat-label{font-size:12px;color:var(--muted);font-weight:500;margin-top:1px}
.stat-delta{font-size:11px;font-weight:600;margin-top:3px}
.delta-up{color:var(--green)}
.delta-down{color:var(--red)}

/* BADGE / CHIP */
.badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700}
.b-green{background:var(--green-bg);color:var(--green)}
.b-blue{background:var(--blue-bg);color:var(--blue)}
.b-amber{background:var(--amber-bg);color:var(--amber)}
.b-red{background:var(--red-bg);color:var(--red)}
.b-gray{background:var(--surface2);color:var(--muted)}
.b-purple{background:var(--purple-bg);color:var(--purple)}

/* SHIPPING ZONE */
.zone-card{border:1.5px solid var(--border);border-radius:var(--r);margin-bottom:12px;overflow:hidden}
.zone-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface);cursor:pointer}
.zone-body{padding:14px 16px;border-top:1px solid var(--border)}
.rate-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)}
.rate-row:last-child{border-bottom:none}
.rate-icon{font-size:16px;flex-shrink:0}
.add-rate-btn{display:flex;align-items:center;gap:6px;padding:7px 0;font-size:12.5px;font-weight:600;color:var(--blue);cursor:pointer;border:none;background:none;font-family:inherit}

/* AUDIT LOG */
.audit-row{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)}
.audit-row:last-child{border-bottom:none}
.audit-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:5px}
.audit-action{font-size:13px;font-weight:600;color:var(--text)}
.audit-meta{font-size:12px;color:var(--muted);margin-top:2px}
.audit-entity{font-family:'JetBrains Mono',monospace;font-size:11px;background:var(--surface2);padding:1px 6px;border-radius:4px;color:var(--muted)}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:#fff;border-radius:var(--r-lg);max-width:560px;width:100%;max-height:88vh;overflow-y:auto;box-shadow:var(--shadow-lg);animation:mup .2s ease}
.modal-lg{max-width:720px}
@keyframes mup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.modal-header{padding:20px 24px 0;display:flex;align-items:flex-start;justify-content:space-between}
.modal-body{padding:18px 24px}
.modal-footer{padding:14px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;background:var(--surface);border-radius:0 0 var(--r-lg) var(--r-lg)}
.modal-close{width:28px;height:28px;border-radius:6px;border:none;background:var(--surface2);cursor:pointer;display:grid;place-items:center;color:var(--muted);font-size:16px}
.modal-close:hover{background:var(--border)}

/* TOAST */
.toast-wrap{position:fixed;bottom:20px;right:20px;display:flex;flex-direction:column;gap:8px;z-index:9999}
.toast{background:var(--slate);color:#fff;padding:11px 16px;border-radius:var(--r);font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px;box-shadow:var(--shadow-lg);animation:tin .2s ease;min-width:250px}
.toast.success{background:var(--green)}.toast.error{background:var(--red)}.toast.warn{background:var(--amber)}
@keyframes tin{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}

/* MISC */
.divider{height:1px;background:var(--border);margin:16px 0}
.section-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:7px}
.info-box{padding:12px 14px;border-radius:var(--r-sm);font-size:12.5px;display:flex;align-items:flex-start;gap:9px;margin-bottom:14px;line-height:1.5}
.info-blue{background:var(--blue-bg);border:1px solid var(--blue-mid);color:#1e40af}
.info-amber{background:var(--amber-bg);border:1px solid #fcd34d;color:#92400e}
.info-green{background:var(--green-bg);border:1px solid #bbf7d0;color:#166534}
.info-red{background:var(--red-bg);border:1px solid #fecaca;color:#991b1b}
.step-up-banner{background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border-radius:var(--r);padding:14px 18px;display:flex;align-items:center;gap:12px;margin-bottom:16px}
.impersonate-banner{position:fixed;top:0;left:0;right:0;background:#f59e0b;color:#000;font-size:13px;font-weight:700;text-align:center;padding:8px;z-index:9999;display:flex;align-items:center;justify-content:center;gap:12px}
.credential-field{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 13px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);display:flex;align-items:center;justify-content:space-between}
.empty-state{text-align:center;padding:48px 20px;color:var(--muted)}
.empty-icon{font-size:40px;margin-bottom:10px}
.search-bar{position:relative}
.search-bar input{padding:8px 12px 8px 34px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:13px;font-family:inherit;width:100%;outline:none;transition:.15s}
.search-bar input:focus{border-color:var(--blue)}
.search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:14px}
.upload-zone{border:2px dashed var(--border2);border-radius:var(--r);padding:24px;text-align:center;cursor:pointer;transition:.15s}
.upload-zone:hover{border-color:var(--blue);background:var(--blue-bg)}
.color-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)}
.color-row:last-child{border-bottom:none}
.color-swatch{width:28px;height:28px;border-radius:6px;border:1px solid var(--border);flex-shrink:0}
`;

// ─── STORE SETTINGS MODULE ────────────────────────────────────────────────────
function StoreSettings({ toast, context }) {
  const [tab, setTab] = useState('identity');
  const [store, setStore] = useState({
    name:'Krishna Textiles', tagline:'Premium Indian Fabrics Since 1984',
    email:'hello@krishnatextiles.com', phone:'+91 98765 43210',
    whatsapp:'+91 98765 43210', whatsappWidget:true,
    gst:'27AAPFK0532C1ZN', pan:'AAPFK0532C',
    address:'12, Textile Market, Raviwar Peth', city:'Pune', state:'Maharashtra', pincode:'411002', country:'India',
    instagram:'https://instagram.com/krishnatextiles', facebook:'', youtube:'', twitter:'',
    language:'en', currency:'INR', timezone:'Asia/Kolkata',
    metaTitle:'Krishna Textiles — Premium Indian Fabrics', metaDescription:'Shop handloom sarees, silk fabrics, and traditional textiles from Pune.',
    colorPrimary:'#2563eb', colorAccent:'#0f172a', colorSurface:'#f8fafc',
    status:1, wholesaleEnabled:false, subdomain:'',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setStore(s=>({...s,[k]:v}));

  useEffect(() => {
    const load = async () => {
      if (!context?.storeId) return;
      setLoading(true);
      try {
        const res = await api.get(`/stores/${context.storeId}`);
        const row = res.data || {};
        setStore((prev) => ({
          ...prev,
          name: row.name || prev.name,
          currency: row.currency || prev.currency,
          timezone: row.timezone || prev.timezone,
          status: typeof row.status === "number" ? row.status : prev.status,
          wholesaleEnabled: !!row.isWholesaleEnabled,
          subdomain: row.subdomain || "",
        }));
      } catch (err) {
        toast(err?.response?.data?.error || "Could not load store settings.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [context?.storeId, toast]);

  const saveStore = async () => {
    if (!context?.storeId) {
      toast("Store is not selected.", "error");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/stores/${context.storeId}`, {
        name: store.name,
        subdomain: store.subdomain || null,
        currency: store.currency || "INR",
        timezone: store.timezone || "Asia/Kolkata",
        status: Number(store.status || 1),
        isWholesaleEnabled: !!store.wholesaleEnabled,
      });
      toast('Settings saved!','success');
    } catch (err) {
      toast(err?.response?.data?.error || "Could not save store settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Store Settings</div><div className="page-sub">Manage your store identity, contact, legal & SEO</div></div>
        <button className="btn btn-primary" onClick={saveStore} disabled={saving || loading}>{saving ? "Saving..." : "Save All Changes"}</button>
      </div>

      <div className="tabs">
        {[{id:'identity',label:'🏪 Identity'},{id:'contact',label:'📞 Contact & Legal'},{id:'branding',label:'🎨 Branding'},{id:'seo',label:'🔍 SEO'},{id:'regional',label:'🌏 Regional'}].map(t=>(
          <button key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab==='identity' && (
        <div className="card card-body">
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Store Name <span className="req">*</span></label><input className="form-input" value={store.name} onChange={e=>set('name',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Tagline</label><input className="form-input" value={store.tagline} onChange={e=>set('tagline',e.target.value)}/></div>
          </div>
          <div className="section-title" style={{marginTop:8}}>🖼️ Logo & Favicon</div>
          <div className="grid-2">
            <div>
              <div className="upload-zone" onClick={()=>toast('Upload dialog (connect to media API)')}>
                <div style={{fontSize:36,marginBottom:8}}>🖼️</div>
                <div style={{fontSize:13,fontWeight:600,color:'var(--muted)'}}>Upload Logo</div>
                <div style={{fontSize:12,color:'var(--light)',marginTop:4}}>PNG, SVG · Max 2MB · Recommended: 200×60px</div>
              </div>
            </div>
            <div>
              <div className="upload-zone" onClick={()=>toast('Upload dialog (connect to media API)')}>
                <div style={{fontSize:36,marginBottom:8}}>🔖</div>
                <div style={{fontSize:13,fontWeight:600,color:'var(--muted)'}}>Upload Favicon</div>
                <div style={{fontSize:12,color:'var(--light)',marginTop:4}}>ICO, PNG · Max 512KB · 32×32px</div>
              </div>
            </div>
          </div>
          <div className="divider"/>
          <div className="section-title">📱 Social Links</div>
          <div className="grid-2">
            {[['instagram','Instagram URL'],['facebook','Facebook URL'],['youtube','YouTube Channel'],['twitter','X (Twitter) URL']].map(([k,l])=>(
              <div key={k} className="form-group"><label className="form-label">{l}</label><input className="form-input" placeholder={`https://${k}.com/yourstore`} value={store[k]} onChange={e=>set(k,e.target.value)}/></div>
            ))}
          </div>
        </div>
      )}

      {tab==='contact' && (
        <div className="card card-body">
          <div className="section-title">📞 Contact Information</div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Contact Email <span className="req">*</span></label><input className="form-input" type="email" value={store.email} onChange={e=>set('email',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Phone Number</label><input className="form-input" value={store.phone} onChange={e=>set('phone',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">WhatsApp Number</label><input className="form-input" value={store.whatsapp} onChange={e=>set('whatsapp',e.target.value)}/></div>
          </div>
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-info-label">WhatsApp Chat Widget</div>
              <div className="toggle-info-sub">Show WhatsApp float button on storefront — great for Indian customers</div>
            </div>
            <button className={`toggle-switch ${store.whatsappWidget?'on':'off'}`} onClick={()=>set('whatsappWidget',!store.whatsappWidget)}/>
          </div>
          <div className="divider"/>
          <div className="section-title">🏢 Store Address</div>
          <div className="form-group"><label className="form-label">Street Address</label><input className="form-input" value={store.address} onChange={e=>set('address',e.target.value)}/></div>
          <div className="grid-3">
            <div className="form-group"><label className="form-label">City</label><input className="form-input" value={store.city} onChange={e=>set('city',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">State</label>
              <select className="form-input form-select" value={store.state} onChange={e=>set('state',e.target.value)}>
                {['Andhra Pradesh','Delhi','Gujarat','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Pincode</label><input className="form-input" value={store.pincode} onChange={e=>set('pincode',e.target.value)}/></div>
          </div>
          <div className="divider"/>
          <div className="section-title">📜 Legal / Tax</div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">GSTIN</label><input className="form-input" placeholder="27AAPFK0532C1ZN" value={store.gst} onChange={e=>set('gst',e.target.value)}/><div className="form-hint">Format: 2-digit state code + PAN + entity code + Z + check digit</div></div>
            <div className="form-group"><label className="form-label">PAN Number</label><input className="form-input" placeholder="AAPFK0532C" value={store.pan} onChange={e=>set('pan',e.target.value)}/></div>
          </div>
          <div className="info-box info-blue"><span>ℹ️</span><span>Your GSTIN is shown on invoices and order receipts. Make sure it matches your GST registration exactly.</span></div>
        </div>
      )}

      {tab==='branding' && (
        <div className="card card-body">
          <div className="section-title">🎨 Brand Colors</div>
          <div className="info-box info-blue"><span>ℹ️</span><span>These override your theme's default colors. Changes apply instantly to your storefront.</span></div>
          {[['colorPrimary','Primary Color (buttons, links, highlights)'],['colorAccent','Accent / Dark (headers, footers)'],['colorSurface','Surface / Background']].map(([k,l])=>(
            <div key={k} className="color-row">
              <div className="color-swatch" style={{background:store[k]}}/>
              <span style={{flex:1,fontSize:13,fontWeight:500}}>{l}</span>
              <input type="color" style={{width:36,height:30,padding:2,border:'1px solid var(--border)',borderRadius:6,cursor:'pointer'}} value={store[k]} onChange={e=>set(k,e.target.value)}/>
              <input className="form-input" style={{width:100,fontSize:12,padding:'5px 8px'}} value={store[k]} onChange={e=>set(k,e.target.value)}/>
            </div>
          ))}
          <div className="divider"/>
          <div className="section-title">✍️ Typography</div>
          <div className="grid-2">
            {[['fontHeading','Heading Font'],['fontBody','Body Font']].map(([k,l])=>(
              <div key={k} className="form-group"><label className="form-label">{l}</label>
                <select className="form-input form-select">
                  {['DM Sans','Poppins','Nunito','Lato','Raleway','Playfair Display','Merriweather','Josefin Sans'].map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='seo' && (
        <div className="card card-body">
          <div className="section-title">🔍 Store SEO</div>
          <div className="form-group"><label className="form-label">Meta Title <span className="req">*</span></label><input className="form-input" value={store.metaTitle} onChange={e=>set('metaTitle',e.target.value)}/><div className="form-hint">{store.metaTitle.length}/60 characters · Recommended: 50–60</div></div>
          <div className="form-group"><label className="form-label">Meta Description</label><textarea className="form-input" rows={3} style={{resize:'vertical'}} value={store.metaDescription} onChange={e=>set('metaDescription',e.target.value)}/><div className="form-hint">{store.metaDescription.length}/160 characters</div></div>
          <div className="form-group"><label className="form-label">Social / OG Image</label>
            <div className="upload-zone" style={{padding:16}} onClick={()=>toast('Upload OG image')}>
              <div style={{fontSize:24,marginBottom:4}}>🖼️</div>
              <div style={{fontSize:12.5,color:'var(--muted)'}}>Upload OG image (1200×630px recommended)</div>
            </div>
          </div>
          <div className="divider"/>
          <div className="section-title">🔗 Storefront URLs</div>
          <div className="form-group"><label className="form-label">Store Subdomain</label>
            <div style={{display:'flex',alignItems:'center',gap:0}}>
              <input className="form-input" style={{borderRadius:'7px 0 0 7px',zIndex:1}} placeholder="krishnatextiles"/><span style={{padding:'9px 12px',background:'var(--surface2)',border:'1.5px solid var(--border)',borderLeft:'none',borderRadius:'0 7px 7px 0',fontSize:13,color:'var(--muted)',whiteSpace:'nowrap'}}>.sitesellr.com</span>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Custom Domain</label><input className="form-input" placeholder="www.krishnatextiles.com"/><div className="form-hint">Point your domain's CNAME to shops.sitesellr.com. SSL provisioned automatically.</div></div>
        </div>
      )}

      {tab==='regional' && (
        <div className="card card-body">
          <div className="grid-3">
            <div className="form-group"><label className="form-label">Language</label>
              <select className="form-input form-select" value={store.language} onChange={e=>set('language',e.target.value)}>
                {[['en','English'],['hi','Hindi'],['ta','Tamil'],['te','Telugu'],['bn','Bengali'],['mr','Marathi'],['gu','Gujarati'],['kn','Kannada']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Currency</label>
              <select className="form-input form-select"><option value="INR">INR — Indian Rupee (₹)</option></select>
              <div className="form-hint">Currency is locked to INR for Indian payment gateways.</div>
            </div>
            <div className="form-group"><label className="form-label">Timezone</label>
              <select className="form-input form-select" value={store.timezone} onChange={e=>set('timezone',e.target.value)}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
              </select>
            </div>
          </div>
          <div className="divider"/>
          <div className="section-title">⚙️ Store Preferences</div>
          {[{k:'codEnabled',l:'Cash on Delivery (COD)',sub:'Allow customers to pay cash on delivery'},
            {k:'guestCheckout',l:'Guest Checkout',sub:'Allow orders without account registration'},
            {k:'reviewsEnabled',l:'Product Reviews',sub:'Allow customers to leave product reviews'},
            {k:'wishlistEnabled',l:'Wishlist',sub:'Let customers save products to wishlist'},
            {k:'compareEnabled',l:'Product Comparison',sub:'Allow comparing up to 4 products'},
          ].map(({k,l,sub})=>(
            <div key={k} className="toggle-row">
              <div className="toggle-info"><div className="toggle-info-label">{l}</div><div className="toggle-info-sub">{sub}</div></div>
              <button className={`toggle-switch ${store[k]!==false?'on':'off'}`} onClick={()=>set(k,!store[k])}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SHIPPING CONFIG MODULE ───────────────────────────────────────────────────
function ShippingConfig({ toast }) {
  const [zones, setZones] = useState([
    { id:1, name:'All India', coverage:'All States', expanded:true, rates:[
      { id:11, name:'Standard (5-7 days)', price:60, type:'flat', codAvailable:true },
      { id:12, name:'Express (1-2 days)', price:199, type:'flat', codAvailable:false },
      { id:13, name:'Free Shipping', price:0, type:'above', threshold:999, codAvailable:true },
    ]},
    { id:2, name:'Metro Cities', coverage:'Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune', expanded:false, rates:[
      { id:21, name:'Same Day', price:299, type:'flat', codAvailable:false },
      { id:22, name:'Next Day', price:149, type:'flat', codAvailable:true },
    ]},
    { id:3, name:'Northeast & J&K', coverage:'Assam, Meghalaya, Manipur, Nagaland, Sikkim, J&K', expanded:false, rates:[
      { id:31, name:'Standard (7-10 days)', price:120, type:'flat', codAvailable:false },
    ]},
  ]);
  const [carriers, setCarriers] = useState([
    { id:'shiprocket', name:'Shiprocket', emoji:'🚀', status:'active', plan:'Essential', configured:true },
    { id:'delhivery', name:'Delhivery', emoji:'📦', status:'active', plan:'Pro', configured:true },
    { id:'bluedart', name:'BlueDart', emoji:'🔵', status:'inactive', plan:'—', configured:false },
    { id:'ecomexpress', name:'Ecom Express', emoji:'🟢', status:'inactive', plan:'—', configured:false },
  ]);
  const [addZone, setAddZone] = useState(false);
  const [addRate, setAddRate] = useState(null);
  const [newRate, setNewRate] = useState({ name:'', price:0, type:'flat', threshold:999 });
  const [newZoneName, setNewZoneName] = useState('');
  const [activeTab, setActiveTab] = useState('zones');

  const toggleZone = id => setZones(prev=>prev.map(z=>z.id===id?{...z,expanded:!z.expanded}:z));
  const removeRate = (zoneId, rateId) => setZones(prev=>prev.map(z=>z.id===zoneId?{...z,rates:z.rates.filter(r=>r.id!==rateId)}:z));
  const saveRate = (zoneId) => {
    const rate = { id:Date.now(), ...newRate, codAvailable:newRate.type==='flat' };
    setZones(prev=>prev.map(z=>z.id===zoneId?{...z,rates:[...z.rates,rate]}:z));
    setAddRate(null); setNewRate({ name:'', price:0, type:'flat', threshold:999 });
    toast('Rate added','success');
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Shipping Configuration</div><div className="page-sub">Manage shipping zones, rates, and carrier integrations</div></div>
        <button className="btn btn-primary" onClick={()=>toast('Shipping config saved!','success')}>Save</button>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab==='zones'?'active':''}`} onClick={()=>setActiveTab('zones')}>📦 Shipping Zones & Rates</button>
        <button className={`tab ${activeTab==='carriers'?'active':''}`} onClick={()=>setActiveTab('carriers')}>🚚 Carrier Integration</button>
      </div>

      {activeTab==='zones' && (
        <>
          {zones.map(zone=>(
            <div key={zone.id} className="zone-card">
              <div className="zone-header" onClick={()=>toggleZone(zone.id)}>
                <div>
                  <div style={{fontSize:14,fontWeight:700}}>{zone.name}</div>
                  <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{zone.coverage}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span className="badge b-blue">{zone.rates.length} rates</span>
                  <span style={{color:'var(--muted)',fontSize:16}}>{zone.expanded?'▲':'▼'}</span>
                </div>
              </div>
              {zone.expanded && (
                <div className="zone-body">
                  {zone.rates.map(rate=>(
                    <div key={rate.id} className="rate-row">
                      <span className="rate-icon">{rate.price===0?'🆓':rate.type==='above'?'🎁':'🚚'}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600}}>{rate.name}</div>
                        <div style={{fontSize:12,color:'var(--muted)'}}>
                          {rate.price===0?'Free':rate.type==='above'?`Free above ₹${rate.threshold}`:`₹${rate.price} flat`}
                          {rate.codAvailable && <span className="badge b-green" style={{marginLeft:6}}>COD</span>}
                        </div>
                      </div>
                      <input className="form-input" style={{width:80,padding:'5px 8px',fontSize:12}} type="number" defaultValue={rate.price} onChange={e=>{ const v=parseInt(e.target.value); setZones(prev=>prev.map(z=>z.id===zone.id?{...z,rates:z.rates.map(r=>r.id===rate.id?{...r,price:v}:r)}:z)); }}/>
                      <button className="btn btn-ghost btn-sm" style={{color:'var(--red)'}} onClick={()=>removeRate(zone.id,rate.id)}>✕</button>
                    </div>
                  ))}
                  {addRate===zone.id ? (
                    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:14,marginTop:10}}>
                      <div className="grid-2" style={{marginBottom:8}}>
                        <div className="form-group" style={{marginBottom:0}}><label className="form-label">Rate Name</label><input className="form-input" placeholder="e.g. Standard Delivery" value={newRate.name} onChange={e=>setNewRate(r=>({...r,name:e.target.value}))}/></div>
                        <div className="form-group" style={{marginBottom:0}}><label className="form-label">Type</label>
                          <select className="form-input form-select" value={newRate.type} onChange={e=>setNewRate(r=>({...r,type:e.target.value}))}>
                            <option value="flat">Flat Rate</option><option value="above">Free above amount</option><option value="weight">Weight-based</option>
                          </select>
                        </div>
                        <div className="form-group" style={{marginBottom:0}}><label className="form-label">Price (₹)</label><input className="form-input" type="number" value={newRate.price} onChange={e=>setNewRate(r=>({...r,price:parseInt(e.target.value)||0}))}/></div>
                        {newRate.type==='above' && <div className="form-group" style={{marginBottom:0}}><label className="form-label">Threshold (₹)</label><input className="form-input" type="number" value={newRate.threshold} onChange={e=>setNewRate(r=>({...r,threshold:parseInt(e.target.value)||0}))}/></div>}
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-primary btn-sm" onClick={()=>saveRate(zone.id)}>Add Rate</button>
                        <button className="btn btn-ghost btn-sm" onClick={()=>setAddRate(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="add-rate-btn" onClick={()=>setAddRate(zone.id)}>+ Add Rate</button>
                  )}
                </div>
              )}
            </div>
          ))}
          <button className="btn btn-outline" style={{width:'100%',justifyContent:'center',marginTop:4}} onClick={()=>setAddZone(true)}>+ Add Shipping Zone</button>
        </>
      )}

      {activeTab==='carriers' && (
        <div>
          <div className="info-box info-blue"><span>ℹ️</span><span>Carrier integrations are purchased through the <strong>App Store</strong>. Configure API credentials for installed carriers here.</span></div>
          {carriers.map(c=>(
            <div key={c.id} className="card" style={{marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px'}}>
                <span style={{fontSize:28}}>{c.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700}}>{c.name}</div>
                  <div style={{fontSize:12,color:'var(--muted)'}}>{c.configured?`Plan: ${c.plan}`:'Not installed — purchase from App Store'}</div>
                </div>
                <span className={`badge ${c.status==='active'?'b-green':'b-gray'}`}>{c.status==='active'?'Active':'Inactive'}</span>
                {c.configured
                  ? <button className="btn btn-outline btn-sm" onClick={()=>toast(`Opening ${c.name} settings`)}>Configure</button>
                  : <button className="btn btn-primary btn-sm" onClick={()=>toast('Navigate to App Store → Shipping')}>Install</button>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {addZone && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setAddZone(false)}>
          <div className="modal">
            <div className="modal-header"><div style={{fontWeight:800,fontSize:16}}>Add Shipping Zone</div><button className="modal-close" onClick={()=>setAddZone(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Zone Name <span className="req">*</span></label><input className="form-input" placeholder="e.g. South India" value={newZoneName} onChange={e=>setNewZoneName(e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Coverage</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,padding:10,border:'1.5px solid var(--border)',borderRadius:'var(--r-sm)',minHeight:44}}>
                  {['Tamil Nadu','Karnataka','Kerala','Andhra Pradesh','Telangana'].map(s=>(
                    <span key={s} style={{background:'var(--blue-bg)',color:'var(--blue)',fontSize:12,fontWeight:600,padding:'2px 8px',borderRadius:99}}>{s} ×</span>
                  ))}
                </div>
                <div className="form-hint">Select states/UTs to include in this zone</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setAddZone(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={()=>{ setZones(p=>[...p,{id:Date.now(),name:newZoneName,coverage:'Custom',expanded:true,rates:[]}]); setAddZone(false); toast('Zone added','success'); }}>Create Zone</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PLATFORM: TENANT MANAGEMENT ─────────────────────────────────────────────
function TenantManagement({ toast }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [impersonate, setImpersonate] = useState(null);
  const [suspendModal, setSuspendModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [storesRes] = await Promise.all([
          api.get("/stores"),
        ]);
        const rows = Array.isArray(storesRes.data) ? storesRes.data : [];
        setStores(rows.map((s) => ({
          id: s.id,
          name: s.name,
          owner: s.merchantName || "Merchant",
          email: s.merchantPrimaryDomain || "-",
          plan: "-",
          status: Number(s.status) === 1 ? "active" : Number(s.status) === 2 ? "suspended" : Number(s.status) === 0 ? "trial" : "inactive",
          revenue: "₹0",
          orders: 0,
          theme: "-",
          apps: 0,
          joined: s.createdAt ? String(s.createdAt).slice(0, 10) : "-",
          city: "-",
        })));
      } catch (err) {
        toast(err?.response?.data?.error || "Could not load tenants.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const statuses = { active:'b-green', trial:'b-blue', suspended:'b-red', inactive:'b-gray' };
  const filtered = stores.filter(s=>(filter==='all'||s.status===filter)&&(s.name.toLowerCase().includes(search.toLowerCase())||s.owner.toLowerCase().includes(search.toLowerCase())||String(s.city||"").toLowerCase().includes(search.toLowerCase())));

  return (
    <div>
      {impersonate && (
        <div className="impersonate-banner">
          ⚠️ Impersonating: <strong>{impersonate.name}</strong> as Store Owner
          <button className="btn btn-sm" style={{background:'rgba(0,0,0,.2)',color:'#000',border:'none'}} onClick={()=>{ setImpersonate(null); toast('Exited impersonation','success'); }}>Exit Impersonation ×</button>
        </div>
      )}

      <div className="page-header" style={{marginTop:impersonate?40:0}}>
        <div><div className="page-title">Tenant Management</div><div className="page-sub">{loading ? "Loading..." : `${stores.length} stores · ${stores.filter(s=>s.status==='active').length} active`}</div></div>
        <button className="btn btn-primary" onClick={()=>toast('Export initiated')}>📥 Export CSV</button>
      </div>

      <div className="stats-row">
        {[{icon:'🏪',l:'Total Stores',v:stores.length,c:'#eff6ff'},{icon:'✅',l:'Active',v:stores.filter(s=>s.status==='active').length,c:'#f0fdf4'},{icon:'🆓',l:'On Trial',v:stores.filter(s=>s.status==='trial').length,c:'#fffbeb'},{icon:'⛔',l:'Suspended',v:stores.filter(s=>s.status==='suspended').length,c:'#fef2f2'}].map(s=>(
          <div key={s.l} className="stat-card"><div className="stat-icon" style={{background:s.c}}>{s.icon}</div><div><div className="stat-val">{s.v}</div><div className="stat-label">{s.l}</div></div></div>
        ))}
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div className="card-header">
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',width:'100%'}}>
            <div className="search-bar" style={{flex:1,maxWidth:300}}>
              <span className="search-icon">🔍</span>
              <input placeholder="Search stores, owners, cities..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="tabs" style={{margin:0,flex:'none'}}>
              {['all','active','trial','suspended'].map(f=>(
                <button key={f} className={`tab ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="table-wrap" style={{border:'none',borderRadius:0,borderTop:'1px solid var(--border)'}}>
          <table>
            <thead><tr><th>Store</th><th>Plan</th><th>Status</th><th>Revenue</th><th>Orders</th><th>Theme</th><th>Apps</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(s=>(
                <tr key={s.id}>
                  <td>
                    <div className="td-bold">{s.name}</div>
                    <div style={{fontSize:12,color:'var(--muted)'}}>{s.owner} · {s.city}</div>
                  </td>
                  <td><span className="badge b-blue">{s.plan}</span></td>
                  <td><span className={`badge ${statuses[s.status]}`}>{s.status}</span></td>
                  <td className="td-bold" style={{color:'var(--green)'}}>{s.revenue}</td>
                  <td>{s.orders.toLocaleString()}</td>
                  <td style={{fontSize:12,color:'var(--muted)'}}>{s.theme}</td>
                  <td><span className="badge b-gray">{s.apps}</span></td>
                  <td className="td-mono">{s.joined}</td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn btn-outline btn-sm" onClick={()=>setDetailModal(s)}>View</button>
                      <button className="btn btn-sm" style={{background:'var(--amber-bg)',color:'var(--amber)',border:'none',fontWeight:700}} onClick={()=>{ setImpersonate(s); toast(`Impersonating ${s.name}`,'warn'); }}>🔍</button>
                      {s.status!=='suspended'
                        ? <button className="btn btn-ghost btn-sm" style={{color:'var(--red)'}} onClick={()=>setSuspendModal(s)}>⛔</button>
                        : <button className="btn btn-ghost btn-sm" style={{color:'var(--green)'}} onClick={()=>toast(`${s.name} reactivated`,'success')}>✅</button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Store Detail Modal */}
      {detailModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDetailModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div style={{fontWeight:800,fontSize:18}}>{detailModal.name}</div>
                <div style={{fontSize:13,color:'var(--muted)',marginTop:3}}>Store ID: <span style={{fontFamily:'JetBrains Mono',fontSize:12}}>{detailModal.id}</span></div>
              </div>
              <button className="modal-close" onClick={()=>setDetailModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{gap:20}}>
                <div>
                  <div className="section-title">Store Info</div>
                  {[['Owner',detailModal.owner],['Email',detailModal.email],['City',detailModal.city],['Plan',detailModal.plan],['Theme',detailModal.theme],['Joined',detailModal.joined]].map(([k,v])=>(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:13}}><span style={{color:'var(--muted)',fontWeight:500}}>{k}</span><span style={{fontWeight:600}}>{v}</span></div>
                  ))}
                </div>
                <div>
                  <div className="section-title">Performance</div>
                  {[['Total Revenue',detailModal.revenue],['Orders',detailModal.orders],['Apps Installed',detailModal.apps],['Status',detailModal.status]].map(([k,v])=>(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:13}}><span style={{color:'var(--muted)',fontWeight:500}}>{k}</span><span style={{fontWeight:600}}>{v}</span></div>
                  ))}
                  <div style={{marginTop:16}}>
                    <div className="section-title">Platform Actions</div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <button className="btn btn-outline" style={{justifyContent:'center'}} onClick={()=>{ setImpersonate(detailModal); setDetailModal(null); toast(`Impersonating ${detailModal.name}`,'warn'); }}>🔍 Impersonate Store Owner</button>
                      <button className="btn btn-outline" style={{justifyContent:'center'}} onClick={()=>toast('Force publish triggered','success')}>🚀 Force Publish Layout</button>
                      <button className="btn btn-outline" style={{justifyContent:'center',color:'var(--amber)',borderColor:'var(--amber)'}} onClick={()=>{ setSuspendModal(detailModal); setDetailModal(null); }}>⛔ Suspend Store</button>
                      <button className="btn btn-outline" style={{justifyContent:'center'}} onClick={()=>toast('Plan upgrade flow')}>⬆️ Override Plan</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setDetailModal(null)}>Close</button></div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setSuspendModal(null)}>
          <div className="modal">
            <div className="modal-header"><div style={{fontWeight:800,fontSize:16,color:'var(--red)'}}>⛔ Suspend Store</div><button className="modal-close" onClick={()=>setSuspendModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="info-box info-red"><span>⚠️</span><span>Suspending <strong>{suspendModal.name}</strong> will immediately make their storefront inaccessible. The store owner will be notified via email.</span></div>
              <div className="form-group"><label className="form-label">Suspension Reason <span className="req">*</span></label>
                <select className="form-input form-select"><option>Payment failure</option><option>Policy violation</option><option>Fraud detected</option><option>Owner request</option><option>Other</option></select>
              </div>
              <div className="form-group"><label className="form-label">Note (internal)</label><textarea className="form-input" rows={3} style={{resize:'vertical'}} placeholder="Internal note about this suspension..."/></div>
              <div className="toggle-row">
                <div className="toggle-info"><div className="toggle-info-label">Scheduled Suspension</div><div className="toggle-info-sub">Suspend at a future date instead of immediately</div></div>
                <button className="toggle-switch off"/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setSuspendModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={()=>{ toast(`${suspendModal.name} suspended`,'error'); setSuspendModal(null); }}>⛔ Suspend Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PLATFORM: AUDIT LOG ─────────────────────────────────────────────────────
function AuditLog({ toast }) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/audit-logs?page=1&pageSize=100");
        const rows = Array.isArray(res.data?.items) ? res.data.items : [];
        setLogs(rows.map((x) => ({
          id: x.id,
          action: x.action,
          actor: x.userId || "system",
          actorRole: x.platformRole || x.storeRole || "user",
          store: x.storeId ? String(x.storeId).slice(0, 8) : null,
          entity: x.action || "-",
          entityId: x.id,
          ip: x.clientIp || "-",
          at: x.createdAt ? String(x.createdAt).replace("T", " ").slice(0, 19) : "-",
          severity: x.action?.includes("suspend") || x.action?.includes("security") ? "critical" : "normal",
          old: null,
          new: x.details || null,
        })));
      } catch (err) {
        toast(err?.response?.data?.error || "Could not load audit logs.", "error");
      }
    };
    load();
  }, [toast]);

  const severityColor = { normal:'b-gray', high:'b-amber', critical:'b-red' };
  const actionColor = (a) => a.includes('suspend')||a.includes('delete')?'var(--red)':a.includes('publish')||a.includes('install')?'var(--green)':a.includes('impersonate')||a.includes('payment')?'var(--amber)':'var(--blue)';

  const filtered = logs.filter(l=>(actionFilter==='all'||l.severity===actionFilter)&&(l.action.includes(search.toLowerCase())||l.actor.toLowerCase().includes(search.toLowerCase())||(l.store||'').toLowerCase().includes(search.toLowerCase())));

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Audit Log</div><div className="page-sub">Immutable record of all sensitive platform actions</div></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-outline" onClick={()=>toast('Exporting audit log...')}>📥 Export</button>
        </div>
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div className="card-header">
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',width:'100%'}}>
            <div className="search-bar" style={{flex:1,maxWidth:320}}>
              <span className="search-icon">🔍</span>
              <input placeholder="Search action, actor, store..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="tabs" style={{margin:0}}>
              {['all','normal','high','critical'].map(f=>(
                <button key={f} className={`tab ${actionFilter===f?'active':''}`} onClick={()=>setActionFilter(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="table-wrap" style={{border:'none',borderRadius:0,borderTop:'1px solid var(--border)'}}>
          <table>
            <thead><tr><th>Timestamp</th><th>Action</th><th>Actor</th><th>Store</th><th>Entity</th><th>Severity</th><th>IP</th><th></th></tr></thead>
            <tbody>
              {filtered.map(log=>(
                <tr key={log.id}>
                  <td className="td-mono">{log.at}</td>
                  <td><span style={{fontFamily:'JetBrains Mono',fontSize:12,color:actionColor(log.action),fontWeight:600}}>{log.action}</span></td>
                  <td>
                    <div className="td-bold">{log.actor}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>{log.actorRole}</div>
                  </td>
                  <td style={{fontSize:12.5}}>{log.store||<span className="badge b-purple">Platform</span>}</td>
                  <td><span className="td-mono">{log.entity}</span></td>
                  <td><span className={`badge ${severityColor[log.severity]}`}>{log.severity}</span></td>
                  <td className="td-mono">{log.ip}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={()=>setDetail(log)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDetail(null)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div style={{fontWeight:800,fontSize:16}}>Audit Log Detail</div>
                <div style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--muted)',marginTop:4}}>{detail.id}</div>
              </div>
              <button className="modal-close" onClick={()=>setDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              {[['Action',detail.action],['Timestamp',detail.at],['Actor',`${detail.actor} (${detail.actorRole})`],['Store',detail.store||'Platform-level'],['Entity Type',detail.entity],['Entity ID',detail.entityId],['IP Address',detail.ip],['Severity',detail.severity]].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13,gap:12}}>
                  <span style={{color:'var(--muted)',fontWeight:500,whiteSpace:'nowrap'}}>{k}</span>
                  <span style={{fontWeight:600,fontFamily:k==='Action'||k==='Entity ID'||k==='IP Address'?'JetBrains Mono':'inherit',fontSize:k==='Action'||k==='Entity ID'?12:13,textAlign:'right'}}>{v}</span>
                </div>
              ))}
              {detail.old && <div style={{marginTop:12}}><div style={{fontSize:12,fontWeight:700,color:'var(--muted)',marginBottom:6}}>BEFORE</div><div className="credential-field"><pre style={{fontSize:11,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{JSON.stringify(detail.old,null,2)}</pre></div></div>}
              {detail.new && <div style={{marginTop:10}}><div style={{fontSize:12,fontWeight:700,color:'var(--muted)',marginBottom:6}}>AFTER</div><div className="credential-field"><pre style={{fontSize:11,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{JSON.stringify(detail.new,null,2)}</pre></div></div>}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setDetail(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PLATFORM GLOBAL SETTINGS ─────────────────────────────────────────────────
function PlatformSettings({ toast }) {
  const [settings, setSettings] = useState({
    defaultTheme:'bazaar', trialDays:14, maxStoresPerPlan:{starter:1,growth:3,pro:10,enterprise:999},
    storagePerPlan:{starter:1,growth:5,pro:20,enterprise:100},
    maintenanceMode:false, newSignupsEnabled:true, forceSSL:true,
    smtpHost:'smtp.sendgrid.net', smtpPort:'587', smtpUser:'apikey',
    supportEmail:'support@sitesellr.com', fromName:'Sitesellr',
    announcementText:'', announcementActive:false,
    razorpayMasterKey:'rzp_live_••••••••', razorpayMasterSecret:'••••••••••••',
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setSettings(s=>({...s,[k]:v}));

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/platform/owner/config");
        const d = res.data || {};
        setSettings((prev) => ({
          ...prev,
          smtpHost: d.communicationProvider || prev.smtpHost,
          supportEmail: d.communicationProvider || prev.supportEmail,
        }));
      } catch (err) {
        toast(err?.response?.data?.error || "Could not load platform settings.", "error");
      }
    };
    load();
  }, [toast]);

  const savePlatform = async () => {
    setSaving(true);
    try {
      await api.put("/platform/owner/config", {
        paymentGatewayProvider: "default",
        taxGstPercent: "18",
        featureFlagsJson: JSON.stringify({
          maintenanceMode: !!settings.maintenanceMode,
          newSignupsEnabled: !!settings.newSignupsEnabled,
          forceSSL: !!settings.forceSSL,
          announcementActive: !!settings.announcementActive,
          announcementText: settings.announcementText || "",
        }),
        limitsJson: JSON.stringify({
          trialDays: Number(settings.trialDays || 14),
          maxStoresPerPlan: settings.maxStoresPerPlan,
          storagePerPlan: settings.storagePerPlan,
        }),
        communicationProvider: settings.smtpHost || "smtp",
        regionRulesJson: "{}",
        corsOriginsCsv: "*",
      });
      toast('Platform settings saved!','success');
    } catch (err) {
      toast(err?.response?.data?.error || "Could not save platform settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Platform Settings</div><div className="page-sub">Global configuration for all tenants and the platform itself</div></div>
        <button className="btn btn-primary" onClick={savePlatform} disabled={saving}>{saving ? "Saving..." : "Save All"}</button>
      </div>

      {/* Announcement */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-header"><div className="card-header-title">📢 Global Announcement</div></div>
        <div className="card-body">
          <div className="toggle-row" style={{marginBottom:14}}>
            <div className="toggle-info"><div className="toggle-info-label">Show announcement to all store owners</div><div className="toggle-info-sub">Displays a banner at the top of every store admin panel</div></div>
            <button className={`toggle-switch ${settings.announcementActive?'on':'off'}`} onClick={()=>set('announcementActive',!settings.announcementActive)}/>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label className="form-label">Announcement Message</label><input className="form-input" placeholder="e.g. We're performing maintenance on Feb 25 from 2–4 AM IST." value={settings.announcementText} onChange={e=>set('announcementText',e.target.value)}/></div>
        </div>
      </div>

      {/* Plan Limits */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-header"><div className="card-header-title">📊 Plan Limits</div></div>
        <div className="card-body">
          <table className="tier-table" style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['Plan','Trial Days','Max Stores','Storage (GB)','Max Apps','Priority Support'].map(h=><th key={h} style={{padding:'10px 12px',background:'var(--surface2)',fontSize:11,fontWeight:700,color:'var(--muted)',textAlign:'left',borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
            <tbody>
              {[{plan:'Starter',trial:14,stores:1,storage:1,apps:5,support:false},
                {plan:'Growth',trial:14,stores:3,storage:5,apps:15,support:false},
                {plan:'Pro',trial:14,stores:10,storage:20,apps:999,support:true},
                {plan:'Enterprise',trial:30,stores:999,storage:100,apps:999,support:true},
              ].map((row,i)=>(
                <tr key={row.plan}>
                  {[row.plan,row.trial,row.stores,row.storage,row.apps===999?'Unlimited':row.apps].map((v,j)=>(
                    <td key={j} style={{padding:'11px 12px',borderBottom:'1px solid var(--border)',fontSize:13,background:i%2?'var(--surface)':'#fff'}}>
                      {j===0?<span className="badge b-blue">{v}</span>:
                       j<4?<input style={{width:80,padding:'4px 8px',border:'1px solid var(--border)',borderRadius:6,fontSize:12,textAlign:'center'}} defaultValue={v}/>:v}
                    </td>
                  ))}
                  <td style={{padding:'11px 12px',borderBottom:'1px solid var(--border)',background:i%2?'var(--surface)':'#fff'}}>
                    <button className={`toggle-switch ${row.support?'on':'off'}`} style={{width:36,height:21}}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-header"><div className="card-header-title">📧 Email Configuration (SMTP)</div></div>
        <div className="card-body">
          <div className="grid-2">
            <div className="form-group"><label className="form-label">SMTP Host</label><input className="form-input" value={settings.smtpHost} onChange={e=>set('smtpHost',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Port</label><input className="form-input" value={settings.smtpPort} onChange={e=>set('smtpPort',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Username / API Key</label><input className="form-input" value={settings.smtpUser} onChange={e=>set('smtpUser',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Password / API Secret</label><input className="form-input" type="password" placeholder="••••••••••"/></div>
            <div className="form-group"><label className="form-label">From Name</label><input className="form-input" value={settings.fromName} onChange={e=>set('fromName',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Support Email</label><input className="form-input" value={settings.supportEmail} onChange={e=>set('supportEmail',e.target.value)}/></div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={()=>toast('Test email sent to support@sitesellr.com','success')}>Send Test Email</button>
        </div>
      </div>

      {/* Platform Controls */}
      <div className="card">
        <div className="card-header"><div className="card-header-title">⚙️ Platform Controls</div></div>
        <div className="card-body">
          {[{k:'maintenanceMode',l:'Maintenance Mode',sub:'Temporarily take platform offline. Store storefronts will show maintenance page.',danger:true},
            {k:'newSignupsEnabled',l:'New Sign-ups',sub:'Allow new merchants to register on the platform.'},
            {k:'forceSSL',l:'Force HTTPS',sub:'Redirect all HTTP traffic to HTTPS across all stores.'},
          ].map(({k,l,sub,danger})=>(
            <div key={k} className="toggle-row" style={{border:`1.5px solid ${danger&&settings[k]?'var(--red)':'var(--border)'}`,background:danger&&settings[k]?'var(--red-bg)':'#fff'}}>
              <div className="toggle-info">
                <div className="toggle-info-label" style={{color:danger&&settings[k]?'var(--red)':'var(--text)'}}>{l}</div>
                <div className="toggle-info-sub">{sub}</div>
              </div>
              <button className={`toggle-switch ${settings[k]?'on':'off'}`} style={danger?{'--blue':'var(--red)'}:{}} onClick={()=>{
                if(danger&&!settings[k]) { if(window.confirm('Enable maintenance mode? All storefronts will go offline.')) set(k,true); } else set(k,!settings[k]);
              }}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── COMBINED APP ─────────────────────────────────────────────────────────────
export default function StoreBuilderSettingsPlatform() {
  const [role, setRole] = useState('store');
  const [page, setPage] = useState('store-settings');
  const [toasts, setToasts] = useState([]);
  const [context, setContext] = useState({ storeId: null, isPlatformOwner: false, isStoreUser: true });

  const toast = (msg, type='') => {
    const id = Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)), 3500);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [accessRes, storesRes] = await Promise.all([
          api.get("/auth/access"),
          api.get("/stores"),
        ]);
        const access = accessRes.data || {};
        const stores = Array.isArray(storesRes.data) ? storesRes.data : [];
        const selectedStoreId = access.currentStoreId || stores[0]?.id || null;
        if (selectedStoreId) {
          api.defaults.headers.common["X-Store-Id"] = selectedStoreId;
        }
        const isPlatformOwner = !!access.isPlatformOwner;
        setContext({
          storeId: selectedStoreId,
          isPlatformOwner,
          isStoreUser: !isPlatformOwner,
        });
        setRole(isPlatformOwner ? "platform" : "store");
        setPage(isPlatformOwner ? "tenants" : "store-settings");
      } catch {
        // Keep existing defaults when access bootstrap fails.
      }
    };
    load();
  }, []);

  const switchRole = (r) => { setRole(r); setPage(r==='store'?'store-settings':'tenants'); };

  const storeNav = [
    {id:'store-settings',label:'Store Settings',icon:'⚙️'},
    {id:'shipping',label:'Shipping & Zones',icon:'📦'},
  ];
  const platformNav = [
    {id:'tenants',label:'Tenant Management',icon:'🏪'},
    {id:'audit',label:'Audit Log',icon:'📋'},
    {id:'platform-settings',label:'Platform Settings',icon:'🔧'},
  ];
  const nav = role==='store'?storeNav:platformNav;

  const renderPage = () => {
    if(page==='store-settings') return <StoreSettings toast={toast} context={context}/>;
    if(page==='shipping') return <ShippingConfig toast={toast}/>;
    if(page==='tenants') return <TenantManagement toast={toast}/>;
    if(page==='audit') return <AuditLog toast={toast}/>;
    if(page==='platform-settings') return <PlatformSettings toast={toast}/>;
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <aside className="sidebar">
          <div className="sb-logo"><div className="sb-wordmark">Sitesellr</div><div className="sb-sub">Admin Panel</div></div>
          <div className="role-toggle">
            <button className={`role-btn ${role==='store'?'active':''}`} onClick={()=>switchRole('store')}>Store</button>
            <button className={`role-btn ${role==='platform'?'active':''}`} onClick={()=>switchRole('platform')}>Platform</button>
          </div>
          <div className="sb-section">
            <div className="sb-section-label">{role==='store'?'My Store':'Platform Admin'}</div>
            {nav.map(item=>(
              <div key={item.id} className={`sb-item ${page===item.id?'active':''}`} onClick={()=>setPage(item.id)}>
                <span className="sb-item-icon">{item.icon}</span>{item.label}
              </div>
            ))}
          </div>
          <div className="sb-divider"/>
          <div className="sb-section">
            <div className="sb-section-label">More</div>
            {role==='store' ? (
              <>
                <div className="sb-item" onClick={()=>toast('Navigate to App Store')}>📦 App Store</div>
                <div className="sb-item" onClick={()=>toast('Navigate to Theme Builder')}>🎨 Theme Builder</div>
              </>
            ) : (
              <div className="sb-item" onClick={()=>toast('Navigate to App Marketplace')}>🏪 App Marketplace</div>
            )}
          </div>
          <div className="sb-user">
            <div className="sb-user-card">
              <div className="sb-avatar">{role==='store'?'KT':'PO'}</div>
              <div>
                <div style={{fontSize:12.5,fontWeight:600,color:'#e2e8f0'}}>{role==='store'?'Krishna Textiles':'Platform Owner'}</div>
                <div style={{fontSize:11,color:'#475569'}}>{role==='store'?'store@krishnatextiles.com':'admin@sitesellr.com'}</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <span style={{flex:1,fontSize:13,fontWeight:600,color:'var(--muted)'}}>
              {role==='store'?'🛍️ Krishna Textiles':'🌐 Platform Administration'}
            </span>
            <span style={{fontSize:11.5,color:'var(--muted)'}}>Sitesellr v1.0</span>
          </div>
          <div className="content">{renderPage()}</div>
        </main>
      </div>
      <div className="toast-wrap">
        {toasts.map(t=><div key={t.id} className={`toast ${t.type}`}>{t.type==='success'?'✅':t.type==='error'?'❌':t.type==='warn'?'⚠️':'ℹ️'} {t.msg}</div>)}
      </div>
    </>
  );
}
