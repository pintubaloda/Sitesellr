import { useState, useEffect, useRef } from "react";

// ─── DESIGN SYSTEM ───────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --primary: #2563EB;
    --primary-dark: #1d4ed8;
    --primary-light: #eff6ff;
    --accent: #0f172a;
    --surface: #f8fafc;
    --surface2: #f1f5f9;
    --border: #e2e8f0;
    --border-strong: #cbd5e1;
    --text: #1e293b;
    --text-muted: #64748b;
    --text-light: #94a3b8;
    --success: #16a34a;
    --success-bg: #f0fdf4;
    --warning: #d97706;
    --warning-bg: #fffbeb;
    --danger: #dc2626;
    --danger-bg: #fef2f2;
    --gold: #f59e0b;
    --purple: #7c3aed;
    --radius: 12px;
    --radius-sm: 8px;
    --radius-lg: 16px;
    --shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06);
    --shadow-md: 0 4px 16px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.06);
    --shadow-lg: 0 20px 60px rgba(0,0,0,.12), 0 8px 24px rgba(0,0,0,.08);
    --shadow-primary: 0 8px 32px rgba(37,99,235,.25);
  }

  body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--surface); color: var(--text); }

  /* ─ Scrollbar ─ */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 99px; }

  /* ─ Layout ─ */
  .app { display: flex; min-height: 100vh; }
  .sidebar { width: 240px; flex-shrink: 0; background: var(--accent); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 100; overflow-y: auto; }
  .main { margin-left: 240px; flex: 1; min-height: 100vh; display: flex; flex-direction: column; }
  .topbar { height: 60px; background: #fff; border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 28px; gap: 16px; position: sticky; top: 0; z-index: 50; }
  .content { flex: 1; padding: 28px; }

  /* ─ Sidebar ─ */
  .sb-logo { padding: 20px 20px 8px; }
  .sb-logo-text { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
  .sb-logo-sub { font-size: 10px; color: #64748b; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
  .sb-section { padding: 20px 12px 8px; }
  .sb-section-label { font-size: 10px; font-weight: 700; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; padding: 0 8px; margin-bottom: 4px; }
  .sb-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; cursor: pointer; transition: all .15s; font-size: 13.5px; font-weight: 500; color: #94a3b8; margin-bottom: 2px; }
  .sb-item:hover { background: rgba(255,255,255,.06); color: #e2e8f0; }
  .sb-item.active { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(37,99,235,.4); }
  .sb-item svg { opacity: .85; flex-shrink: 0; }
  .sb-badge { margin-left: auto; background: var(--gold); color: #000; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 99px; }
  .sb-divider { height: 1px; background: rgba(255,255,255,.06); margin: 8px 20px; }

  /* ─ Role switcher ─ */
  .role-switcher { margin: 12px; border-radius: 10px; overflow: hidden; background: rgba(255,255,255,.06); display: flex; }
  .role-btn { flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 600; color: #94a3b8; border: none; background: none; cursor: pointer; transition: all .15s; text-align: center; }
  .role-btn.active { background: var(--primary); color: #fff; border-radius: 8px; }

  /* ─ Cards ─ */
  .card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow); }
  .card-header { padding: 20px 24px 0; }
  .card-body { padding: 20px 24px; }
  .card-footer { padding: 16px 24px; border-top: 1px solid var(--border); background: var(--surface); border-radius: 0 0 var(--radius-lg) var(--radius-lg); }

  /* ─ Stat cards ─ */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow); }
  .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; font-size: 20px; }
  .stat-val { font-size: 26px; font-weight: 800; letter-spacing: -1px; color: var(--text); }
  .stat-label { font-size: 12px; color: var(--text-muted); font-weight: 500; margin-top: 2px; }
  .stat-delta { font-size: 11px; font-weight: 600; margin-top: 4px; }
  .stat-delta.up { color: var(--success); }
  .stat-delta.down { color: var(--danger); }

  /* ─ Marketplace grid ─ */
  .mkt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
  .mkt-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; transition: all .2s; cursor: pointer; box-shadow: var(--shadow); }
  .mkt-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: var(--primary); }
  .mkt-card.installed { border-color: var(--success); }
  .mkt-card-preview { height: 160px; display: flex; align-items: center; justify-content: center; font-size: 48px; position: relative; overflow: hidden; }
  .mkt-card-body { padding: 16px; }
  .mkt-card-name { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .mkt-card-desc { font-size: 12.5px; color: var(--text-muted); line-height: 1.5; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .mkt-card-footer { display: flex; align-items: center; justify-content: space-between; }
  .mkt-card-price { font-size: 14px; font-weight: 700; color: var(--text); }
  .mkt-card-price .mo { font-size: 11px; font-weight: 500; color: var(--text-muted); }
  .mkt-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 99px; letter-spacing: .3px; }
  .badge-free { background: #dcfce7; color: #15803d; }
  .badge-paid { background: #eff6ff; color: var(--primary); }
  .badge-installed { background: #dcfce7; color: #15803d; }
  .badge-pending { background: #fffbeb; color: var(--warning); }
  .badge-inactive { background: #f1f5f9; color: var(--text-muted); }
  .badge-active { background: #dcfce7; color: #15803d; }
  .badge-featured { background: linear-gradient(135deg, #f59e0b, #ef4444); color: #fff; }
  .badge-new { background: var(--primary); color: #fff; }
  .badge-category { background: var(--surface2); color: var(--text-muted); }

  /* ─ Tabs ─ */
  .tabs { display: flex; gap: 4px; background: var(--surface2); border-radius: 10px; padding: 4px; margin-bottom: 24px; }
  .tab { padding: 8px 18px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: none; color: var(--text-muted); transition: all .15s; }
  .tab.active { background: #fff; color: var(--primary); box-shadow: var(--shadow); }
  .tab:hover:not(.active) { color: var(--text); }

  /* ─ Buttons ─ */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: var(--radius-sm); font-size: 13.5px; font-weight: 600; cursor: pointer; border: none; transition: all .15s; white-space: nowrap; font-family: inherit; }
  .btn-primary { background: var(--primary); color: #fff; box-shadow: var(--shadow-primary); }
  .btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); }
  .btn-outline { background: #fff; color: var(--text); border: 1px solid var(--border-strong); }
  .btn-outline:hover { border-color: var(--primary); color: var(--primary); }
  .btn-success { background: var(--success); color: #fff; }
  .btn-danger { background: var(--danger); color: #fff; }
  .btn-ghost { background: none; color: var(--text-muted); }
  .btn-ghost:hover { background: var(--surface2); color: var(--text); }
  .btn-sm { padding: 6px 12px; font-size: 12.5px; border-radius: 7px; }
  .btn-lg { padding: 13px 28px; font-size: 15px; border-radius: var(--radius); }
  .btn:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }
  .btn-gold { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; box-shadow: 0 4px 16px rgba(245,158,11,.35); }
  .btn-gold:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(245,158,11,.4); }

  /* ─ Forms ─ */
  .form-group { margin-bottom: 18px; }
  .form-label { display: block; font-size: 12.5px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
  .form-label span { color: var(--danger); }
  .form-input { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: 13.5px; font-family: inherit; color: var(--text); background: #fff; transition: all .15s; outline: none; }
  .form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
  .form-input.error { border-color: var(--danger); }
  .form-hint { font-size: 11.5px; color: var(--text-muted); margin-top: 5px; }
  .form-error { font-size: 11.5px; color: var(--danger); margin-top: 5px; font-weight: 500; }
  .form-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
  .form-toggle { display: flex; align-items: center; gap: 10px; }
  .toggle { width: 42px; height: 24px; background: var(--border-strong); border-radius: 99px; position: relative; cursor: pointer; transition: all .2s; border: none; flex-shrink: 0; }
  .toggle.on { background: var(--primary); }
  .toggle::after { content:''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: #fff; border-radius: 99px; transition: all .2s; box-shadow: 0 1px 4px rgba(0,0,0,.2); }
  .toggle.on::after { left: 21px; }
  .toggle-label { font-size: 13.5px; font-weight: 500; color: var(--text); }
  .toggle-hint { font-size: 12px; color: var(--text-muted); }

  /* ─ Tables ─ */
  .table-wrap { overflow-x: auto; border-radius: var(--radius); border: 1px solid var(--border); }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  thead th { background: var(--surface2); padding: 12px 16px; text-align: left; font-size: 11.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .7px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  tbody td { padding: 14px 16px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: var(--surface); }
  .td-name { font-weight: 600; }
  .td-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted); }

  /* ─ Modal ─ */
  .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: #fff; border-radius: var(--radius-lg); max-width: 680px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); animation: slideUp .2s ease; }
  .modal-lg { max-width: 860px; }
  .modal-header { padding: 24px 28px 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .modal-body { padding: 24px 28px; }
  .modal-footer { padding: 18px 28px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; background: var(--surface); border-radius: 0 0 var(--radius-lg) var(--radius-lg); }
  .modal-close { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--surface2); cursor: pointer; display: grid; place-items: center; color: var(--text-muted); flex-shrink: 0; transition: all .15s; }
  .modal-close:hover { background: var(--border); color: var(--text); }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

  /* ─ Page detail modal ─ */
  .app-detail-grid { display: grid; grid-template-columns: 1fr 280px; gap: 24px; }
  .app-hero { height: 200px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; font-size: 80px; margin-bottom: 20px; }
  .app-meta-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
  .app-meta-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .app-meta-row:last-child { border-bottom: none; }
  .app-meta-label { color: var(--text-muted); font-weight: 500; }
  .app-meta-val { font-weight: 600; color: var(--text); }
  .feature-list { list-style: none; }
  .feature-list li { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 13.5px; color: var(--text); }
  .feature-list li::before { content: '✓'; color: var(--success); font-weight: 700; flex-shrink: 0; }

  /* ─ Purchase flow ─ */
  .purchase-steps { display: flex; align-items: center; gap: 0; margin-bottom: 28px; }
  .purchase-step { display: flex; align-items: center; gap: 8px; }
  .step-num { width: 28px; height: 28px; border-radius: 99px; display: grid; place-items: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
  .step-num.done { background: var(--success); color: #fff; }
  .step-num.active { background: var(--primary); color: #fff; }
  .step-num.pending { background: var(--border); color: var(--text-muted); }
  .step-label { font-size: 12.5px; font-weight: 600; }
  .step-label.active { color: var(--primary); }
  .step-label.pending { color: var(--text-muted); }
  .step-connector { flex: 1; height: 2px; background: var(--border); margin: 0 8px; min-width: 20px; }
  .step-connector.done { background: var(--success); }

  /* ─ Plan selector ─ */
  .plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .plan-card { border: 2px solid var(--border); border-radius: var(--radius); padding: 16px; cursor: pointer; transition: all .15s; text-align: center; position: relative; }
  .plan-card:hover { border-color: var(--primary); }
  .plan-card.selected { border-color: var(--primary); background: var(--primary-light); }
  .plan-card.popular::before { content: 'POPULAR'; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--gold); color: #000; font-size: 9px; font-weight: 800; padding: 3px 10px; border-radius: 99px; letter-spacing: 1px; }
  .plan-name { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .plan-price { font-size: 22px; font-weight: 800; color: var(--primary); letter-spacing: -1px; }
  .plan-price span { font-size: 13px; font-weight: 500; color: var(--text-muted); }
  .plan-features { font-size: 11.5px; color: var(--text-muted); margin-top: 8px; line-height: 1.6; }

  /* ─ Checkout ─ */
  .checkout-summary { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
  .checkout-line { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 13.5px; }
  .checkout-line.total { border-top: 1px solid var(--border); margin-top: 8px; padding-top: 14px; font-weight: 700; font-size: 15px; }
  .checkout-line.discount { color: var(--success); }
  .payment-methods { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
  .pm-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: 2px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; font-weight: 600; transition: all .15s; background: #fff; }
  .pm-btn.selected { border-color: var(--primary); background: var(--primary-light); color: var(--primary); }
  .pm-btn:hover { border-color: var(--primary); }

  /* ─ Category filter ─ */
  .cat-filter { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  .cat-btn { padding: 6px 14px; border-radius: 99px; font-size: 12.5px; font-weight: 600; border: 1.5px solid var(--border); background: #fff; cursor: pointer; transition: all .15s; color: var(--text-muted); }
  .cat-btn:hover { border-color: var(--primary); color: var(--primary); }
  .cat-btn.active { border-color: var(--primary); background: var(--primary); color: #fff; }

  /* ─ Search ─ */
  .search-bar { position: relative; flex: 1; max-width: 380px; }
  .search-bar input { width: 100%; padding: 9px 14px 9px 38px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 13.5px; font-family: inherit; background: var(--surface); color: var(--text); outline: none; transition: all .15s; }
  .search-bar input:focus { border-color: var(--primary); background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
  .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }

  /* ─ Section header ─ */
  .section-title { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
  .section-sub { font-size: 13.5px; color: var(--text-muted); margin-top: 4px; }
  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }

  /* ─ Toast ─ */
  .toast-container { position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 10px; z-index: 2000; }
  .toast { background: var(--accent); color: #fff; padding: 14px 18px; border-radius: var(--radius); display: flex; align-items: center; gap: 10px; font-size: 13.5px; font-weight: 500; box-shadow: var(--shadow-lg); animation: toastIn .2s ease; min-width: 280px; }
  .toast.success { background: var(--success); }
  .toast.error { background: var(--danger); }
  @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

  /* ─ Platform config form ─ */
  .config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .config-section { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 22px; margin-bottom: 20px; }
  .config-section-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .tier-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  .tier-table th { background: var(--surface2); padding: 10px 14px; text-align: left; font-size: 11.5px; font-weight: 700; color: var(--text-muted); border-bottom: 1px solid var(--border); }
  .tier-table td { padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
  .tier-table tr:last-child td { border-bottom: none; }

  /* ─ Installed apps grid ─ */
  .installed-app { display: flex; align-items: center; gap: 14px; padding: 16px; border-bottom: 1px solid var(--border); }
  .installed-app:last-child { border-bottom: none; }
  .installed-app-icon { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; font-size: 22px; flex-shrink: 0; }
  .installed-app-info { flex: 1; }
  .installed-app-name { font-size: 14px; font-weight: 700; color: var(--text); }
  .installed-app-desc { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }
  .installed-app-actions { display: flex; align-items: center; gap: 8px; }

  /* ─ Revenue chart ─ */
  .rev-bar-wrap { display: flex; align-items: flex-end; gap: 8px; height: 100px; padding-top: 8px; }
  .rev-bar { flex: 1; background: var(--primary-light); border-radius: 6px 6px 0 0; position: relative; transition: all .3s; min-width: 0; }
  .rev-bar:hover { background: var(--primary); }
  .rev-bar-label { font-size: 10px; color: var(--text-muted); text-align: center; margin-top: 4px; }

  /* ─ Tag input ─ */
  .tag-input { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); min-height: 44px; align-items: center; cursor: text; }
  .tag { background: var(--primary-light); color: var(--primary); font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 99px; display: flex; align-items: center; gap: 6px; }
  .tag-x { cursor: pointer; font-size: 14px; line-height: 1; color: var(--primary); }

  /* ─ Misc ─ */
  .divider { height: 1px; background: var(--border); margin: 20px 0; }
  .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
  .empty-state .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .empty-state h3 { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .spinner { width: 20px; height: 20px; border: 2.5px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .avatar { width: 32px; height: 32px; border-radius: 8px; background: var(--primary); color: #fff; font-size: 13px; font-weight: 700; display: grid; place-items: center; }
  .flex { display: flex; }
  .flex-col { display: flex; flex-direction: column; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .gap-8 { gap: 8px; }
  .gap-12 { gap: 12px; }
  .gap-16 { gap: 16px; }
  .gap-24 { gap: 24px; }
  .mb-4 { margin-bottom: 4px; }
  .mb-8 { margin-bottom: 8px; }
  .mb-12 { margin-bottom: 12px; }
  .mb-16 { margin-bottom: 16px; }
  .mb-20 { margin-bottom: 20px; }
  .mb-24 { margin-bottom: 24px; }
  .text-sm { font-size: 12.5px; }
  .text-xs { font-size: 11.5px; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .text-muted { color: var(--text-muted); }
  .text-success { color: var(--success); }
  .text-danger { color: var(--danger); }
  .text-primary { color: var(--primary); }
  .text-right { text-align: right; }
  .w-full { width: 100%; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .info-box { padding: 14px 16px; border-radius: var(--radius-sm); font-size: 13px; display: flex; align-items: flex-start; gap: 10px; margin-bottom: 16px; }
  .info-box.info { background: var(--primary-light); border: 1px solid #bfdbfe; color: var(--primary-dark); }
  .info-box.warning { background: var(--warning-bg); border: 1px solid #fcd34d; color: #92400e; }
  .info-box.success { background: var(--success-bg); border: 1px solid #bbf7d0; color: #166534; }
  .credential-field { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; }
  .star-rating { display: flex; gap: 2px; color: var(--gold); font-size: 13px; }
  .review-count { font-size: 12px; color: var(--text-muted); margin-left: 6px; }
`;

// ─── DATA ────────────────────────────────────────────────────────────────────

const MARKETPLACE_APPS = [
  // PAYMENT GATEWAYS
  { id: 'pg-razorpay', category: 'Payment Gateway', name: 'Razorpay', emoji: '💳', color: '#0ea5e9',
    tagline: 'India\'s most popular payment gateway', desc: 'Accept UPI, cards, net banking, wallets & EMI. Instant settlement with the lowest failure rates.',
    rating: 4.8, reviews: 2341, featured: true,
    pricing: [
      { id: 'starter', name: 'Starter', price: 0, label: 'Free', txnFee: '2.5% per txn', features: ['UPI & Wallets', 'Cards', 'Net Banking', 'Basic Dashboard'] },
      { id: 'growth', name: 'Growth', price: 999, label: '₹999/mo', txnFee: '1.8% per txn', features: ['Everything in Starter', 'EMI options', 'Instant Refunds', 'Advanced Analytics', 'Priority Support'], popular: true },
      { id: 'enterprise', name: 'Enterprise', price: 2999, label: '₹2,999/mo', txnFee: '1.2% per txn', features: ['Custom fee negotiation', 'Dedicated manager', 'White-label checkout', 'API webhooks', 'SLA guarantee'] },
    ],
    credentials: ['Key ID', 'Key Secret', 'Webhook Secret'],
    features: ['UPI & QR Code payments', 'All Indian bank net banking', 'EMI on 6-24 months', 'International cards', 'Instant refunds', 'Real-time webhooks', 'Payment analytics dashboard', 'PCI-DSS Level 1 certified'],
    webhook: true, testMode: true, tags: ['UPI', 'EMI', 'Cards', 'Wallets'] },

  { id: 'pg-payu', category: 'Payment Gateway', name: 'PayU', emoji: '🏦', color: '#f59e0b',
    tagline: 'Trusted by 500,000+ merchants', desc: 'Complete payment suite with UPI Autopay, BNPL, and smart routing for maximum conversion.',
    rating: 4.5, reviews: 1876,
    pricing: [
      { id: 'basic', name: 'Basic', price: 0, label: 'Free', txnFee: '2.8% per txn', features: ['UPI', 'Cards', 'Net Banking'] },
      { id: 'pro', name: 'Pro', price: 1499, label: '₹1,499/mo', txnFee: '1.9% per txn', features: ['Everything in Basic', 'BNPL', 'UPI Autopay', 'Smart routing'], popular: true },
      { id: 'custom', name: 'Custom', price: null, label: 'Contact Sales', txnFee: 'Negotiated', features: ['Volume discounts', 'Custom integration', 'Dedicated support'] },
    ],
    credentials: ['Merchant Key', 'Salt', 'Webhook Hash Key'],
    features: ['UPI Autopay (subscriptions)', 'Buy Now Pay Later', 'Smart routing', 'Anti-fraud engine', 'Multi-bank EMI', 'International payments'],
    tags: ['UPI Autopay', 'BNPL', 'Cards'] },

  { id: 'pg-cashfree', category: 'Payment Gateway', name: 'Cashfree', emoji: '⚡', color: '#10b981',
    tagline: 'Fastest growing payment platform', desc: 'Sub-2 second UPI payments, instant payouts, and split payments for marketplaces.',
    rating: 4.7, reviews: 1203,
    pricing: [
      { id: 'free', name: 'Starter', price: 0, label: 'Free', txnFee: '2.5% per txn', features: ['UPI', 'Cards', 'Wallets'] },
      { id: 'pro', name: 'Pro', price: 799, label: '₹799/mo', txnFee: '1.75% per txn', features: ['Instant payouts', 'Split payments', 'Subscription billing', 'Priority routing'], popular: true },
    ],
    credentials: ['App ID', 'Secret Key'],
    features: ['Sub-2 second UPI', 'Instant payouts', 'Split payment (marketplace)', 'Subscription billing', 'QR code payments', 'Pay later options'],
    tags: ['Fast UPI', 'Payouts', 'Subscriptions'] },

  { id: 'pg-paytm', category: 'Payment Gateway', name: 'PayTM', emoji: '🔵', color: '#00baf2',
    tagline: 'PayTM ecosystem integration', desc: 'Leverage 300M PayTM users with wallet, UPI, and bank transfer. Best for consumer apps.',
    rating: 4.3, reviews: 987,
    pricing: [
      { id: 'std', name: 'Standard', price: 0, label: 'Free', txnFee: '1.99% per txn', features: ['PayTM Wallet', 'UPI', 'Cards', 'Net Banking'] },
      { id: 'biz', name: 'Business', price: 1299, label: '₹1,299/mo', txnFee: '1.5% per txn', features: ['All in Standard', 'PayTM Postpaid', 'EMI', 'Smart checkout'], popular: true },
    ],
    credentials: ['Merchant ID (MID)', 'Merchant Key', 'Website', 'Industry Type'],
    features: ['300M PayTM user base', 'PayTM Postpaid BNPL', 'UPI intent flow', 'EMI options', 'Cashback campaigns'],
    tags: ['Wallet', 'UPI', 'BNPL'] },

  { id: 'pg-ccavenue', category: 'Payment Gateway', name: 'CCAvenue', emoji: '🌐', color: '#ef4444',
    tagline: 'Pioneer Indian payment gateway', desc: '200+ payment options, multi-currency, fraud detection. Ideal for high-volume international merchants.',
    rating: 4.1, reviews: 654,
    pricing: [
      { id: 'std', name: 'Standard', price: 1200, label: '₹1,200/mo', txnFee: '2% per txn', features: ['All domestic methods', 'Multi-currency', 'Fraud protection'] },
      { id: 'pro', name: 'Pro', price: 3500, label: '₹3,500/mo', txnFee: '1.5% per txn', features: ['200+ payment options', 'Priority support', 'Custom routing', 'Advanced fraud shield'] },
    ],
    credentials: ['Merchant ID', 'Access Code', 'Working Key'],
    features: ['200+ payment options', 'Multi-currency support', 'Advanced fraud detection', 'Recurring billing', 'International cards'],
    tags: ['International', 'Multi-currency', 'Cards'] },

  // SHIPPING
  { id: 'sh-shiprocket', category: 'Shipping', name: 'Shiprocket', emoji: '🚀', color: '#f97316',
    tagline: '#1 Shipping aggregator in India', desc: 'Automate shipping across 17+ courier partners. Best rate picker, NDR management & branded tracking.',
    rating: 4.6, reviews: 3102, featured: true,
    pricing: [
      { id: 'lite', name: 'Lite', price: 0, label: 'Free', features: ['5 shipments/month', 'Manual booking', 'Basic tracking'] },
      { id: 'essential', name: 'Essential', price: 999, label: '₹999/mo', features: ['Unlimited shipments', 'Auto-assign carrier', 'Branded tracking', 'NDR management', 'Weight reconciliation'], popular: true },
      { id: 'growth', name: 'Growth', price: 2999, label: '₹2,999/mo', features: ['All Essential', 'Return portal', 'COD remittance', 'Multi-warehouse', 'Priority support'] },
    ],
    credentials: ['Email', 'Password', 'Source Channel ID'],
    features: ['17+ courier partners', 'Auto-assign best carrier', 'Branded tracking page', 'NDR management', 'COD remittance', 'Return portal', 'Weight reconciliation', 'Multi-warehouse'],
    tags: ['Pan-India', 'COD', 'Returns', 'Multi-carrier'] },

  { id: 'sh-delhivery', category: 'Shipping', name: 'Delhivery', emoji: '📦', color: '#d946ef',
    tagline: 'India\'s largest logistics network', desc: 'Direct carrier integration with 18,000+ pincodes, B2B & B2C, with real-time tracking.',
    rating: 4.4, reviews: 1567,
    pricing: [
      { id: 'std', name: 'Standard', price: 500, label: '₹500/mo', features: ['B2C shipments', 'Real-time tracking', 'COD support'] },
      { id: 'pro', name: 'Pro', price: 1999, label: '₹1,999/mo', features: ['B2B + B2C', 'Pickup scheduling', 'Return management', 'API access', 'Weight reconciliation'], popular: true },
    ],
    credentials: ['Client ID', 'Client Secret'],
    features: ['18,500+ pincodes', 'B2B + B2C logistics', 'Real-time tracking', 'Pickup scheduling', 'COD remittance', 'Returns management'],
    tags: ['Pan-India', 'B2B', 'COD'] },

  { id: 'sh-bluedart', category: 'Shipping', name: 'BlueDart', emoji: '🔵', color: '#1d4ed8',
    tagline: 'Premium express delivery', desc: 'Premium courier for high-value, time-sensitive shipments with guaranteed delivery windows.',
    rating: 4.7, reviews: 892,
    pricing: [
      { id: 'std', name: 'Standard', price: 800, label: '₹800/mo', features: ['Express delivery', 'Airway bill generation', 'Basic tracking'] },
      { id: 'pro', name: 'Pro', price: 2200, label: '₹2,200/mo', features: ['Guaranteed windows', 'Bulk booking', 'Real-time tracking', 'Sunday delivery', 'Priority API'], popular: true },
    ],
    credentials: ['License Key', 'Login ID', 'Password'],
    features: ['Guaranteed delivery', 'Sunday delivery', 'High-value shipments', 'Airway bill API', 'Real-time POD'],
    tags: ['Premium', 'Express', 'High-value'] },

  { id: 'sh-ecomexpress', category: 'Shipping', name: 'Ecom Express', emoji: '🟢', color: '#16a34a',
    tagline: 'COD specialist for e-commerce', desc: 'Built for D2C brands. Best COD collection rates, fast remittance, and tier-2/3 city coverage.',
    rating: 4.3, reviews: 743,
    pricing: [
      { id: 'basic', name: 'Basic', price: 0, label: 'Free trial 30d', features: ['COD shipping', 'Basic tracking', 'Return pickup'] },
      { id: 'standard', name: 'Standard', price: 699, label: '₹699/mo', features: ['All Basic', 'Faster COD remittance', 'NDR automation', 'Last-mile coverage'], popular: true },
    ],
    credentials: ['AWB Username', 'AWB Password', 'Pickup Location ID'],
    features: ['COD specialist', 'Fast COD remittance (T+3)', 'Tier-2/3 coverage', 'NDR automation', 'Return pickup'],
    tags: ['COD', 'Tier-2/3', 'D2C'] },

  // EMAIL & MARKETING
  { id: 'em-mailchimp', category: 'Email & Marketing', name: 'Mailchimp', emoji: '🐵', color: '#ffe01b',
    tagline: 'Marketing automation platform', desc: 'Email campaigns, automations, and audience management for growing stores.',
    rating: 4.5, reviews: 2103,
    pricing: [
      { id: 'free', name: 'Free', price: 0, label: 'Free', features: ['500 contacts', '1,000 emails/mo', 'Basic templates'] },
      { id: 'essentials', name: 'Essentials', price: 499, label: '₹499/mo', features: ['5,000 contacts', '50,000 emails', 'A/B testing', 'Remove branding'], popular: true },
      { id: 'standard', name: 'Standard', price: 1299, label: '₹1,299/mo', features: ['100k contacts', 'Automations', 'Retargeting', 'Custom templates'] },
    ],
    credentials: ['API Key', 'Audience ID'],
    features: ['Drag-drop email builder', 'Automated flows', 'A/B testing', 'Audience segmentation', 'Purchase trigger emails'],
    tags: ['Email', 'Automation', 'Campaigns'] },

  { id: 'em-whatsapp', category: 'Email & Marketing', name: 'WhatsApp Business API', emoji: '💬', color: '#25d366',
    tagline: 'Reach customers on WhatsApp', desc: 'Order confirmations, shipping updates, and promotional messages via WhatsApp API.',
    rating: 4.8, reviews: 1876, featured: true,
    pricing: [
      { id: 'starter', name: 'Starter', price: 799, label: '₹799/mo', features: ['1,000 conversations/mo', 'Order notifications', 'Shipping alerts'] },
      { id: 'growth', name: 'Growth', price: 2499, label: '₹2,499/mo', features: ['10,000 conversations', 'Broadcasts', 'Chatbot flows', 'Cart recovery'], popular: true },
    ],
    credentials: ['Phone Number ID', 'Access Token', 'Verify Token'],
    features: ['Order confirmation', 'Shipping updates', 'Cart abandonment', 'Broadcast campaigns', 'Chatbot builder', 'Two-way messaging'],
    tags: ['WhatsApp', 'Notifications', 'Marketing'] },

  { id: 'em-sendinblue', category: 'Email & Marketing', name: 'Brevo (Sendinblue)', emoji: '📧', color: '#0092ff',
    tagline: 'Email + SMS + WhatsApp', desc: 'All-in-one marketing platform with email, SMS, and push notifications in one dashboard.',
    rating: 4.4, reviews: 834,
    pricing: [
      { id: 'free', name: 'Free', price: 0, label: 'Free', features: ['300 emails/day', 'Unlimited contacts', 'SMS credits separate'] },
      { id: 'starter', name: 'Starter', price: 999, label: '₹999/mo', features: ['20,000 emails/mo', 'SMS marketing', 'No daily limit', 'A/B testing'], popular: true },
    ],
    credentials: ['API Key'],
    features: ['Email + SMS + Push', 'Transaction emails', 'Marketing automation', 'CRM integration', 'Landing pages'],
    tags: ['Email', 'SMS', 'Multi-channel'] },

  // ANALYTICS
  { id: 'an-ga4', category: 'Analytics', name: 'Google Analytics 4', emoji: '📊', color: '#ff6b35',
    tagline: 'Industry-standard analytics', desc: 'Track every customer journey, conversion funnel, and revenue attribution with GA4.',
    rating: 4.6, reviews: 4521,
    pricing: [
      { id: 'free', name: 'Free', price: 0, label: 'Free', features: ['Unlimited tracking', 'All reports', 'BigQuery export', 'Funnel analysis'] },
    ],
    credentials: ['Measurement ID (G-XXXXXXXX)'],
    features: ['Event-based tracking', 'Conversion funnels', 'Revenue attribution', 'Audience building', 'BigQuery export', 'Real-time reports'],
    tags: ['Free', 'Ecommerce', 'Funnels'] },

  { id: 'an-fb-pixel', category: 'Analytics', name: 'Meta Pixel', emoji: '🎯', color: '#1877f2',
    tagline: 'Facebook & Instagram retargeting', desc: 'Track conversions and build custom audiences for Meta ads. Essential for Indian D2C brands.',
    rating: 4.7, reviews: 3201,
    pricing: [
      { id: 'free', name: 'Free', price: 0, label: 'Free', features: ['Conversion tracking', 'Custom audiences', 'Catalog sync', 'Dynamic ads'] },
    ],
    credentials: ['Pixel ID', 'Conversions API Access Token'],
    features: ['Purchase tracking', 'Add to cart events', 'Custom audiences', 'Dynamic product ads', 'Conversions API'],
    tags: ['Free', 'Facebook', 'Instagram', 'Ads'] },

  // CUSTOMER SUPPORT
  { id: 'cs-freshdesk', category: 'Customer Support', name: 'Freshdesk', emoji: '🎧', color: '#00b388',
    tagline: 'Customer support helpdesk', desc: 'Manage customer queries from email, WhatsApp, chat in one unified inbox.',
    rating: 4.5, reviews: 1102,
    pricing: [
      { id: 'free', name: 'Free', price: 0, label: 'Free', features: ['10 agents', 'Email tickets', 'Basic reports'] },
      { id: 'growth', name: 'Growth', price: 1499, label: '₹1,499/mo', features: ['Unlimited agents', 'WhatsApp + Chat', 'Automations', 'SLA management'], popular: true },
    ],
    credentials: ['API Key', 'Domain (subdomain.freshdesk.com)'],
    features: ['Unified inbox', 'WhatsApp integration', 'Ticket automation', 'CSAT surveys', 'Knowledge base'],
    tags: ['Helpdesk', 'WhatsApp', 'Chat'] },

  { id: 'cs-intercom', category: 'Customer Support', name: 'Intercom', emoji: '💭', color: '#6366f1',
    tagline: 'Conversational customer platform', desc: 'Live chat, chatbots, and proactive messaging to convert and support customers.',
    rating: 4.6, reviews: 876,
    pricing: [
      { id: 'starter', name: 'Starter', price: 2499, label: '₹2,499/mo', features: ['Live chat', 'Basic chatbot', 'Inbox'] },
      { id: 'pro', name: 'Pro', price: 6999, label: '₹6,999/mo', features: ['Advanced chatbots', 'Product tours', 'Custom bots', 'A/B testing'], popular: true },
    ],
    credentials: ['App ID', 'Access Token'],
    features: ['Live chat widget', 'Custom chatbots', 'Proactive messages', 'User segmentation', 'Product tours'],
    tags: ['Live Chat', 'Chatbot', 'Proactive'] },
];

const CATEGORIES = ['All', 'Payment Gateway', 'Shipping', 'Email & Marketing', 'Analytics', 'Customer Support'];

const CAT_ICONS = {
  'Payment Gateway': '💳',
  'Shipping': '📦',
  'Email & Marketing': '📣',
  'Analytics': '📊',
  'Customer Support': '🎧',
};

// ─── UTILITY ─────────────────────────────────────────────────────────────────

const fmt = (n) => n === null ? 'Custom' : n === 0 ? 'Free' : `₹${n.toLocaleString('en-IN')}`;

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const Icon = ({ name, size = 16 }) => {
  const icons = {
    dashboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    store: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    apps: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0112 2a10 10 0 01-7.07 2.93M4.93 4.93A10 10 0 002 12a10 10 0 002.93 7.07M19.07 19.07A10 10 0 0122 12a10 10 0 00-2.93-7.07"/></svg>,
    revenue: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    theme: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
    info: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    lock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    copy: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
    arrow: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    tag: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    eye: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    toggle: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"/><circle cx="8" cy="12" r="3"/></svg>,
    analytics: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  };
  return icons[name] || null;
};

const Toast = ({ toasts }) => (
  <div className="toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`toast ${t.type || ''}`}>
        {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
        {t.msg}
      </div>
    ))}
  </div>
);

const StarRating = ({ rating }) => (
  <span className="star-rating">
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ color: i <= Math.round(rating) ? '#f59e0b' : '#e2e8f0' }}>★</span>
    ))}
  </span>
);

// ─── PURCHASE FLOW MODAL ──────────────────────────────────────────────────────

const PurchaseModal = ({ app, onClose, onInstall, toast }) => {
  const [step, setStep] = useState(1); // 1=select plan, 2=credentials, 3=billing, 4=success
  const [selectedPlan, setSelectedPlan] = useState(app.pricing?.[app.pricing.findIndex(p=>p.popular)] || app.pricing?.[0]);
  const [payMethod, setPayMethod] = useState('upi');
  const [creds, setCreds] = useState({});
  const [testMode, setTestMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isFree = !selectedPlan?.price;

  const validateCreds = () => {
    const e = {};
    (app.credentials || []).forEach(c => {
      if (!creds[c] || creds[c].trim() === '') e[c] = 'This field is required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1) { setStep(isFree ? 2 : 3); }
    else if (step === 2) { if (validateCreds()) setStep(isFree ? 4 : 3); }
    else if (step === 3) { handlePurchase(); }
  };

  const handlePurchase = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep(4); }, 1600);
  };

  const handleFinish = () => { onInstall(app, selectedPlan, creds, testMode); onClose(); };

  const STEPS = isFree
    ? [{ n: 1, label: 'Plan' }, { n: 2, label: 'Configure' }, { n: 4, label: 'Done' }]
    : [{ n: 1, label: 'Plan' }, { n: 3, label: 'Payment' }, { n: 2, label: 'Configure' }, { n: 4, label: 'Done' }];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{app.category} / {app.name}</div>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>
              {step === 4 ? '🎉 Installation Complete!' : `Install ${app.name}`}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>

        <div className="modal-body">
          {/* Steps */}
          {step !== 4 && (
            <div className="purchase-steps mb-24">
              {STEPS.map((s, i) => {
                const isActive = s.n === step;
                const isDone = s.n < step || (step === 4);
                return (
                  <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                    <div className="purchase-step">
                      <div className={`step-num ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                        {isDone ? <Icon name="check" size={12}/> : i + 1}
                      </div>
                      <span className={`step-label ${isActive ? 'active' : 'pending'}`}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className={`step-connector ${isDone ? 'done' : ''}`}/>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 1: Plan Selection */}
          {step === 1 && (
            <div>
              <div className="mb-16" style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                Choose a plan that fits your store's needs. You can upgrade or downgrade anytime.
              </div>
              <div className="plan-grid">
                {app.pricing.map(plan => (
                  <div key={plan.id} className={`plan-card ${selectedPlan?.id === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
                    onClick={() => setSelectedPlan(plan)}>
                    <div className="plan-name">{plan.name}</div>
                    <div className="plan-price">{fmt(plan.price)}{plan.price > 0 && <span>/mo</span>}</div>
                    {plan.txnFee && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{plan.txnFee}</div>}
                    <div className="plan-features">{plan.features.join(' · ')}</div>
                    {selectedPlan?.id === plan.id && (
                      <div style={{ marginTop: 10, color: 'var(--primary)', fontSize: 12, fontWeight: 700 }}>
                        ✓ Selected
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {selectedPlan && (
                <div className="info-box info" style={{ marginTop: 16 }}>
                  <Icon name="info" size={16}/>
                  <span><strong>{selectedPlan.name}</strong> plan selected. {selectedPlan.price ? `Billed ₹${selectedPlan.price.toLocaleString('en-IN')}/month to your platform account.` : 'This plan is free to use.'}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Credentials */}
          {step === 2 && (
            <div>
              <div className="info-box info mb-16">
                <Icon name="lock" size={16}/>
                <span>API credentials are encrypted at rest using KMS. They are never exposed in frontend responses or logs.</span>
              </div>
              {app.webhook && (
                <div className="form-group">
                  <label className="form-label">Webhook URL (auto-generated, copy to your gateway)</label>
                  <div className="credential-field">
                    <span>https://api.sitesellr.com/webhooks/{app.id}/{'{store-id}'}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => toast('Webhook URL copied!')}><Icon name="copy" size={13}/></button>
                  </div>
                </div>
              )}
              {(app.credentials || []).map(cred => (
                <div className="form-group" key={cred}>
                  <label className="form-label">{cred} <span>*</span></label>
                  <input className={`form-input ${errors[cred] ? 'error' : ''}`} type="password"
                    placeholder={`Enter ${cred}`}
                    value={creds[cred] || ''}
                    onChange={e => { setCreds({...creds, [cred]: e.target.value}); setErrors({...errors, [cred]: null}); }}
                  />
                  {errors[cred] && <div className="form-error">{errors[cred]}</div>}
                </div>
              ))}
              {app.testMode && (
                <div className="form-group">
                  <div className="form-toggle">
                    <button className={`toggle ${testMode ? 'on' : ''}`} onClick={() => setTestMode(!testMode)}/>
                    <div>
                      <div className="toggle-label">Test Mode {testMode ? 'ON' : 'OFF'}</div>
                      <div className="toggle-hint">Enable test mode to verify integration before going live. A banner will show on your store in test mode.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Billing / Payment */}
          {step === 3 && (
            <div>
              <div className="checkout-summary mb-20">
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Order Summary</div>
                <div className="checkout-line">
                  <span>{app.name} — {selectedPlan?.name}</span>
                  <span>₹{(selectedPlan?.price || 0).toLocaleString('en-IN')}/mo</span>
                </div>
                <div className="checkout-line" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  <span>GST (18%)</span>
                  <span>₹{Math.round((selectedPlan?.price || 0) * 0.18).toLocaleString('en-IN')}</span>
                </div>
                <div className="checkout-line total">
                  <span>Total today</span>
                  <span style={{ color: 'var(--primary)' }}>₹{Math.round((selectedPlan?.price || 0) * 1.18).toLocaleString('en-IN')}/mo</span>
                </div>
              </div>

              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Payment Method</div>
              <div className="payment-methods mb-20">
                {[{id:'upi',label:'UPI',emoji:'📱'},{id:'card',label:'Credit Card',emoji:'💳'},{id:'netbanking',label:'Net Banking',emoji:'🏦'},{id:'wallet',label:'Wallet',emoji:'👛'}].map(pm => (
                  <button key={pm.id} className={`pm-btn ${payMethod === pm.id ? 'selected' : ''}`} onClick={() => setPayMethod(pm.id)}>
                    {pm.emoji} {pm.label}
                  </button>
                ))}
              </div>

              {payMethod === 'upi' && (
                <div className="form-group">
                  <label className="form-label">UPI ID</label>
                  <input className="form-input" placeholder="yourname@upi" />
                </div>
              )}
              {payMethod === 'card' && (
                <div className="grid-2">
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Card Number</label>
                    <input className="form-input" placeholder="1234 5678 9012 3456" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry</label>
                    <input className="form-input" placeholder="MM/YY" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV</label>
                    <input className="form-input" placeholder="•••" type="password"/>
                  </div>
                </div>
              )}

              <div className="info-box warning">
                <Icon name="info" size={16}/>
                <span>You will be charged ₹{Math.round((selectedPlan?.price||0)*1.18).toLocaleString('en-IN')} now, then monthly on this date. Cancel anytime from your App Store settings.</span>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 72, marginBottom: 16 }}>{app.emoji}</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{app.name} is ready!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                {app.name} has been installed and configured for your store. 
                {app.testMode && testMode ? ' Test mode is active — remember to switch to live mode before accepting real orders.' : ' Your integration is live and ready.'}
              </p>
              <div style={{ background: 'var(--success-bg)', border: '1px solid #bbf7d0', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 20, display: 'inline-block', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 8, fontSize: 13 }}>✅ Installation Checklist</div>
                {['App installed & activated', 'API credentials saved (encrypted)', 'Webhook endpoint registered', ...(testMode ? ['Test mode enabled'] : ['Live mode active'])].map(item => (
                  <div key={item} style={{ fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Icon name="check" size={13}/> {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step !== 4 && (
            <>
              <button className="btn btn-outline" onClick={onClose}>Cancel</button>
              {step > 1 && step !== 4 && (
                <button className="btn btn-outline" onClick={() => setStep(s => s === 2 && !isFree ? 1 : s - 1)}>← Back</button>
              )}
              <button className="btn btn-primary" onClick={handleNext} disabled={loading || !selectedPlan}>
                {loading ? <><span className="spinner"/>&nbsp;Processing...</> :
                  step === 3 ? `Pay ₹${Math.round((selectedPlan?.price||0)*1.18).toLocaleString('en-IN')}` :
                  step === 2 ? 'Save & Continue →' : 'Continue →'
                }
              </button>
            </>
          )}
          {step === 4 && (
            <button className="btn btn-primary btn-lg" onClick={handleFinish}>
              Go to App Settings <Icon name="arrow" size={15}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── APP DETAIL MODAL ─────────────────────────────────────────────────────────

const AppDetailModal = ({ app, installedApps, onClose, onInstall, onUninstall, toast }) => {
  const [showPurchase, setShowPurchase] = useState(false);
  const installed = installedApps.find(a => a.id === app.id);

  if (showPurchase) return <PurchaseModal app={app} onClose={() => setShowPurchase(false)} onInstall={onInstall} toast={toast}/>;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="flex items-center gap-12">
            <div style={{ width: 56, height: 56, borderRadius: 14, background: app.color + '22', display: 'grid', placeItems: 'center', fontSize: 28, flexShrink: 0 }}>
              {app.emoji}
            </div>
            <div>
              <div className="flex items-center gap-8 mb-4">
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>{app.name}</h2>
                {app.featured && <span className="mkt-badge badge-featured">⭐ Featured</span>}
                {installed && <span className="mkt-badge badge-installed">✓ Installed</span>}
              </div>
              <div className="flex items-center gap-8">
                <StarRating rating={app.rating}/>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{app.rating}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({app.reviews.toLocaleString()} reviews)</span>
                <span className="mkt-badge badge-category">{app.category}</span>
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>

        <div className="modal-body">
          <div className="app-detail-grid">
            <div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>{app.desc}</p>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>What's included</div>
                <ul className="feature-list">
                  {app.features.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Pricing Plans</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {app.pricing.map(plan => (
                    <div key={plan.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: plan.popular ? 'var(--primary-light)' : 'var(--surface)' }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{plan.name}</span>
                        {plan.popular && <span className="mkt-badge badge-new" style={{ marginLeft: 8 }}>Popular</span>}
                        {plan.txnFee && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{plan.txnFee}</span>}
                      </div>
                      <span style={{ fontWeight: 800, color: plan.popular ? 'var(--primary)' : 'var(--text)', fontSize: 14 }}>
                        {fmt(plan.price)}{plan.price > 0 ? '/mo' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="app-meta-card">
                <div className="app-meta-row">
                  <span className="app-meta-label">Category</span>
                  <span className="app-meta-val">{app.category}</span>
                </div>
                <div className="app-meta-row">
                  <span className="app-meta-label">Rating</span>
                  <span className="app-meta-val">{app.rating}/5</span>
                </div>
                <div className="app-meta-row">
                  <span className="app-meta-label">Reviews</span>
                  <span className="app-meta-val">{app.reviews.toLocaleString()}</span>
                </div>
                <div className="app-meta-row">
                  <span className="app-meta-label">Starting at</span>
                  <span className="app-meta-val" style={{ color: 'var(--primary)' }}>
                    {app.pricing[0].price === 0 ? 'Free' : `₹${app.pricing[0].price.toLocaleString('en-IN')}/mo`}
                  </span>
                </div>
                {installed && (
                  <>
                    <div className="app-meta-row">
                      <span className="app-meta-label">Status</span>
                      <span className="app-meta-val text-success">✓ Active</span>
                    </div>
                    <div className="app-meta-row">
                      <span className="app-meta-label">Plan</span>
                      <span className="app-meta-val">{installed.plan?.name}</span>
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: 12 }}>
                {installed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="btn btn-outline w-full" onClick={() => { onClose(); toast(`Opening ${app.name} settings...`); }}>
                      <Icon name="settings" size={14}/> Configure Settings
                    </button>
                    <button className="btn btn-ghost w-full" style={{ color: 'var(--danger)', fontSize: 12.5 }}
                      onClick={() => { onUninstall(app.id); onClose(); }}>
                      <Icon name="trash" size={13}/> Uninstall App
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-primary w-full btn-lg" onClick={() => setShowPurchase(true)}>
                    Install {app.name} <Icon name="arrow" size={15}/>
                  </button>
                )}
              </div>

              {app.tags && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>TAGS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {app.tags.map(t => <span key={t} className="tag" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>{t}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PLATFORM OWNER: APP MANAGER ─────────────────────────────────────────────

const PlatformAppManager = ({ toast }) => {
  const [apps, setApps] = useState(MARKETPLACE_APPS.map(a => ({
    ...a,
    status: a.featured ? 'active' : Math.random() > 0.2 ? 'active' : 'inactive',
    totalRevenue: Math.floor(Math.random() * 500000 + 50000),
    installs: Math.floor(Math.random() * 500 + 20),
    commissionPct: 20,
  })));
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [editApp, setEditApp] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = apps.filter(a =>
    (catFilter === 'All' || a.category === catFilter) &&
    (a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleStatus = (id) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' } : a));
    const app = apps.find(a => a.id === id);
    toast(`${app.name} ${app.status === 'active' ? 'deactivated' : 'activated'}`, 'success');
  };

  const toggleFeatured = (id) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, featured: !a.featured } : a));
    const app = apps.find(a => a.id === id);
    toast(`${app.name} ${app.featured ? 'removed from' : 'added to'} featured`, 'success');
  };

  const totalRevenue = apps.reduce((s, a) => s + a.totalRevenue, 0);
  const totalInstalls = apps.reduce((s, a) => s + a.installs, 0);
  const activeApps = apps.filter(a => a.status === 'active').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-title">App Marketplace Management</div>
          <div className="section-sub">Control which apps are available, set pricing & commission rates</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={15}/> Add New App
        </button>
      </div>

      <div className="stats-grid">
        {[
          { icon: '🏪', label: 'Total Apps', val: apps.length, delta: '+2 this month', trend: 'up', color: '#eff6ff' },
          { icon: '✅', label: 'Active Apps', val: activeApps, delta: `${apps.length - activeApps} inactive`, trend: 'up', color: '#f0fdf4' },
          { icon: '📦', label: 'Total Installs', val: totalInstalls.toLocaleString(), delta: '+128 this month', trend: 'up', color: '#fdf4ff' },
          { icon: '💰', label: 'Platform Revenue', val: `₹${(totalRevenue/100000).toFixed(1)}L`, delta: '+18% vs last month', trend: 'up', color: '#fffbeb' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-val">{s.val}</div>
              <div className="stat-label">{s.label}</div>
              <div className={`stat-delta ${s.trend}`}>{s.delta}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <div className="flex items-center gap-12 mb-16" style={{ flexWrap: 'wrap' }}>
            <div className="search-bar">
              <span className="search-icon"><Icon name="search" size={15}/></span>
              <input placeholder="Search apps..." value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <div className="cat-filter" style={{ marginBottom: 0 }}>
              {CATEGORIES.map(c => (
                <button key={c} className={`cat-btn ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)}>
                  {CAT_ICONS[c] || ''} {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="table-wrap" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
          <table>
            <thead>
              <tr>
                <th>App</th><th>Category</th><th>Base Price</th><th>Commission</th><th>Installs</th><th>Revenue</th><th>Status</th><th>Featured</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(app => (
                <tr key={app.id}>
                  <td>
                    <div className="flex items-center gap-10">
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: app.color + '22', display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}>{app.emoji}</div>
                      <div>
                        <div className="td-name">{app.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>★ {app.rating} ({app.reviews.toLocaleString()})</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="mkt-badge badge-category">{app.category}</span></td>
                  <td>{app.pricing[0].price === 0 ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>Free</span> : `₹${app.pricing[0].price.toLocaleString()}/mo`}</td>
                  <td>
                    <div className="flex items-center gap-6">
                      <input style={{ width: 50, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, textAlign: 'center' }}
                        type="number" value={app.commissionPct}
                        onChange={e => setApps(prev => prev.map(a => a.id === app.id ? {...a, commissionPct: parseInt(e.target.value)||0} : a))}
                      />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                    </div>
                  </td>
                  <td>{app.installs}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{(app.totalRevenue/1000).toFixed(0)}K</td>
                  <td>
                    <button className={`toggle ${app.status === 'active' ? 'on' : ''}`} onClick={() => toggleStatus(app.id)} title="Toggle active"/>
                  </td>
                  <td>
                    <button className={`toggle ${app.featured ? 'on' : ''}`} style={{ '--primary': '#f59e0b' }} onClick={() => toggleFeatured(app.id)} title="Toggle featured"/>
                  </td>
                  <td>
                    <div className="flex items-center gap-6">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditApp(app)} title="Edit pricing"><Icon name="tag" size={14}/></button>
                      <button className="btn btn-ghost btn-sm" title="View installs"><Icon name="eye" size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Pricing Modal */}
      {editApp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditApp(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Edit Pricing — {editApp.name}</h2>
              <button className="modal-close" onClick={() => setEditApp(null)}><Icon name="x" size={16}/></button>
            </div>
            <div className="modal-body">
              {editApp.pricing.map((plan, idx) => (
                <div key={plan.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 12 }}>
                  <div className="flex items-center justify-between mb-12">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{plan.name} Plan</div>
                    {plan.popular && <span className="mkt-badge badge-new">Popular</span>}
                  </div>
                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Monthly Price (₹)</label>
                      <input className="form-input" type="number" defaultValue={plan.price || 0}
                        onChange={e => {
                          const newApps = apps.map(a => a.id === editApp.id ? {
                            ...a, pricing: a.pricing.map((p, i) => i === idx ? {...p, price: parseInt(e.target.value)||0} : p)
                          } : a);
                          setApps(newApps);
                          setEditApp(newApps.find(a => a.id === editApp.id));
                        }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Transaction Fee (%)</label>
                      <input className="form-input" type="text" defaultValue={plan.txnFee || 'N/A'}/>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                    <div className="form-toggle">
                      <button className={`toggle ${plan.popular ? 'on' : ''}`} onClick={() => {
                        const newApps = apps.map(a => a.id === editApp.id ? {
                          ...a, pricing: a.pricing.map((p, i) => ({...p, popular: i === idx ? !p.popular : false}))
                        } : a);
                        setApps(newApps);
                        setEditApp(newApps.find(a => a.id === editApp.id));
                      }}/>
                      <span className="toggle-label">Mark as Popular</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setEditApp(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { toast(`${editApp.name} pricing updated`, 'success'); setEditApp(null); }}>
                Save Pricing
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Add New App to Marketplace</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}><Icon name="x" size={16}/></button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">App Name <span>*</span></label><input className="form-input" placeholder="e.g. Shiprocket"/></div>
                <div className="form-group"><label className="form-label">Category <span>*</span></label>
                  <select className="form-input form-select">
                    {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Emoji Icon</label><input className="form-input" placeholder="🚀"/></div>
                <div className="form-group"><label className="form-label">Brand Color</label><input className="form-input" type="color" defaultValue="#2563EB"/></div>
              </div>
              <div className="form-group"><label className="form-label">Tagline</label><input className="form-input" placeholder="Short description shown on the card"/></div>
              <div className="form-group"><label className="form-label">Full Description</label><textarea className="form-input" rows="3" placeholder="Detailed description shown in app detail page..." style={{ resize: 'vertical' }}/></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Starting Price (₹/mo)</label><input className="form-input" type="number" placeholder="0 for free"/></div>
                <div className="form-group"><label className="form-label">Commission Rate (%)</label><input className="form-input" type="number" defaultValue="20"/></div>
              </div>
              <div className="form-group">
                <div className="form-toggle">
                  <button className="toggle on"/><span className="toggle-label">Active on publish</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { toast('App added to marketplace!', 'success'); setShowAdd(false); }}>Add App</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── STORE OWNER: APP STORE ───────────────────────────────────────────────────

const StoreAppStore = ({ toast }) => {
  const [installedApps, setInstalledApps] = useState([
    { ...MARKETPLACE_APPS[0], plan: MARKETPLACE_APPS[0].pricing[1], status: 'active', testMode: true, installedAt: '2025-01-15', creds: {} },
    { ...MARKETPLACE_APPS[5], plan: MARKETPLACE_APPS[5].pricing[1], status: 'active', testMode: false, installedAt: '2025-01-10', creds: {} },
    { ...MARKETPLACE_APPS[11], plan: MARKETPLACE_APPS[11].pricing[0], status: 'active', testMode: false, installedAt: '2024-12-20', creds: {} },
  ]);
  const [activeTab, setActiveTab] = useState('explore');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [selectedApp, setSelectedApp] = useState(null);

  const handleInstall = (app, plan, creds, testMode) => {
    setInstalledApps(prev => [...prev.filter(a => a.id !== app.id), { ...app, plan, creds, testMode, status: 'active', installedAt: new Date().toISOString().split('T')[0] }]);
    toast(`${app.name} installed successfully!`, 'success');
  };

  const handleUninstall = (id) => {
    const app = installedApps.find(a => a.id === id);
    setInstalledApps(prev => prev.filter(a => a.id !== id));
    toast(`${app?.name} uninstalled`, '');
  };

  const filtered = MARKETPLACE_APPS.filter(a =>
    (catFilter === 'All' || a.category === catFilter) &&
    (a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase()) || (a.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase())))
  );

  const featured = MARKETPLACE_APPS.filter(a => a.featured);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-title">App Store</div>
          <div className="section-sub">Extend your store with payment gateways, shipping, marketing & more</div>
        </div>
        <div className="flex items-center gap-8">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{installedApps.length} installed</span>
        </div>
      </div>

      <div className="tabs">
        {[{id:'explore',label:'Explore Apps'},{id:'installed',label:`My Apps (${installedApps.length})`}].map(t => (
          <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'explore' && (
        <>
          {/* Featured */}
          {catFilter === 'All' && !search && (
            <div className="mb-24">
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>⭐ Featured Apps</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {featured.map(app => {
                  const inst = installedApps.find(a => a.id === app.id);
                  return (
                    <div key={app.id} className="card" style={{ cursor: 'pointer', border: `1.5px solid ${app.color}33`, overflow: 'hidden' }}
                      onClick={() => setSelectedApp(app)}>
                      <div style={{ background: app.color + '18', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: 36 }}>{app.emoji}</div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15 }}>{app.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.category}</div>
                        </div>
                        {inst && <span className="mkt-badge badge-installed" style={{ marginLeft: 'auto' }}>✓ Installed</span>}
                      </div>
                      <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <StarRating rating={app.rating}/>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{app.reviews.toLocaleString()} reviews</span>
                        </div>
                        <div style={{ fontWeight: 700, color: app.pricing[0].price === 0 ? 'var(--success)' : 'var(--primary)' }}>
                          {fmt(app.pricing[0].price)}{app.pricing[0].price > 0 ? '/mo' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-12 mb-16" style={{ flexWrap: 'wrap' }}>
            <div className="search-bar">
              <span className="search-icon"><Icon name="search" size={15}/></span>
              <input placeholder="Search apps, categories, tags..." value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="cat-filter">
            {CATEGORIES.map(c => (
              <button key={c} className={`cat-btn ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)}>
                {CAT_ICONS[c] || ''} {c}
              </button>
            ))}
          </div>

          {/* App Grid */}
          {catFilter !== 'All' && (
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>{CAT_ICONS[catFilter]} {catFilter}</div>
          )}
          <div className="mkt-grid">
            {filtered.map(app => {
              const inst = installedApps.find(a => a.id === app.id);
              const lowestPrice = app.pricing.reduce((m, p) => p.price === 0 ? 0 : (m === 0 ? 0 : Math.min(m, p.price || Infinity)), Infinity);
              return (
                <div key={app.id} className={`mkt-card ${inst ? 'installed' : ''}`} onClick={() => setSelectedApp(app)}>
                  <div className="mkt-card-preview" style={{ background: app.color + '18' }}>
                    <span style={{ fontSize: 56 }}>{app.emoji}</span>
                    <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {app.featured && <span className="mkt-badge badge-featured">⭐ Featured</span>}
                      {inst && <span className="mkt-badge badge-installed">✓ Installed</span>}
                    </div>
                  </div>
                  <div className="mkt-card-body">
                    <div className="flex items-center gap-8 mb-4">
                      <div className="mkt-card-name">{app.name}</div>
                    </div>
                    <div className="flex items-center gap-6 mb-8">
                      <StarRating rating={app.rating}/>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.rating} ({app.reviews.toLocaleString()})</span>
                    </div>
                    <div className="mkt-card-desc">{app.desc}</div>
                    {app.tags && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                        {app.tags.slice(0, 3).map(t => <span key={t} className="mkt-badge badge-category">{t}</span>)}
                      </div>
                    )}
                    <div className="mkt-card-footer">
                      <div className="mkt-card-price">
                        {lowestPrice === 0
                          ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>Free</span>
                          : <span>From ₹{lowestPrice.toLocaleString('en-IN')}<span className="mo">/mo</span></span>
                        }
                      </div>
                      {inst
                        ? <span className="mkt-badge badge-installed" style={{ fontSize: 12 }}>✓ Active</span>
                        : <span className="mkt-badge badge-new">Install</span>
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'installed' && (
        <div>
          {installedApps.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No apps installed yet</h3>
              <p style={{ fontSize: 13.5 }}>Browse the app store to add payment, shipping & marketing tools.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setActiveTab('explore')}>Browse Apps</button>
            </div>
          ) : (
            <>
              {/* Installed list by category */}
              {CATEGORIES.slice(1).map(cat => {
                const catApps = installedApps.filter(a => a.category === cat);
                if (!catApps.length) return null;
                return (
                  <div key={cat} className="card mb-20">
                    <div className="card-header" style={{ paddingBottom: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {CAT_ICONS[cat]} {cat}
                        <span style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-muted)' }}>· {catApps.length} app{catApps.length>1?'s':''}</span>
                      </div>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                      {catApps.map(app => (
                        <div key={app.id} className="installed-app">
                          <div className="installed-app-icon" style={{ background: app.color + '22', fontSize: 22 }}>{app.emoji}</div>
                          <div className="installed-app-info">
                            <div className="installed-app-name">{app.name}</div>
                            <div className="installed-app-desc">
                              {app.plan?.name} plan · {app.plan?.price ? `₹${app.plan.price.toLocaleString('en-IN')}/mo` : 'Free'}
                              {app.testMode && <span className="mkt-badge badge-pending" style={{ marginLeft: 8 }}>Test Mode</span>}
                            </div>
                          </div>
                          <div className="installed-app-actions">
                            {app.testMode && (
                              <button className="btn btn-outline btn-sm" style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}
                                onClick={() => { setInstalledApps(prev => prev.map(a => a.id === app.id ? {...a, testMode: false} : a)); toast(`${app.name} switched to Live mode`, 'success'); }}>
                                Switch to Live
                              </button>
                            )}
                            <button className="btn btn-outline btn-sm" onClick={() => setSelectedApp(app)}>Configure</button>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleUninstall(app.id)}>
                              <Icon name="trash" size={13}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Recommendations */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>💡 Recommended for you</div>
                <div className="mkt-grid">
                  {MARKETPLACE_APPS.filter(a => !installedApps.find(i => i.id === a.id)).slice(0, 3).map(app => (
                    <div key={app.id} className="mkt-card" onClick={() => setSelectedApp(app)}>
                      <div className="mkt-card-preview" style={{ background: app.color + '18', height: 100 }}>
                        <span style={{ fontSize: 40 }}>{app.emoji}</span>
                      </div>
                      <div className="mkt-card-body" style={{ padding: 12 }}>
                        <div className="mkt-card-name" style={{ fontSize: 14 }}>{app.name}</div>
                        <div className="mkt-card-desc" style={{ fontSize: 12, marginBottom: 8 }}>{app.tagline}</div>
                        <div className="mkt-card-footer">
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                            {app.pricing[0].price === 0 ? 'Free' : `From ₹${app.pricing[0].price.toLocaleString()}/mo`}
                          </div>
                          <span className="mkt-badge badge-new">Install</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {selectedApp && (
        <AppDetailModal
          app={selectedApp}
          installedApps={installedApps}
          onClose={() => setSelectedApp(null)}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
          toast={(msg, type) => toast(msg, type)}
        />
      )}
    </div>
  );
};

// ─── STORE OWNER: INSTALLED APP SETTINGS ─────────────────────────────────────

const AppSettings = ({ toast }) => {
  const [installedApps] = useState([
    { ...MARKETPLACE_APPS[0], plan: MARKETPLACE_APPS[0].pricing[1], testMode: true, status: 'active' },
    { ...MARKETPLACE_APPS[5], plan: MARKETPLACE_APPS[5].pricing[1], testMode: false, status: 'active' },
    { ...MARKETPLACE_APPS[11], plan: MARKETPLACE_APPS[11].pricing[0], testMode: false, status: 'active' },
  ]);
  const [selected, setSelected] = useState(installedApps[0]);
  const [testMode, setTestMode] = useState(selected.testMode);
  const [cred1, setCred1] = useState('rzp_test_••••••••••••••••');
  const [cred2, setCred2] = useState('••••••••••••••••••••••••••••••');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-title">App Settings</div>
          <div className="section-sub">Configure your installed apps and API credentials</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        {/* Sidebar */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-body" style={{ padding: 8 }}>
            {installedApps.map(app => (
              <div key={app.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: selected.id === app.id ? 'var(--primary-light)' : 'transparent', border: selected.id === app.id ? '1px solid #bfdbfe' : '1px solid transparent', marginBottom: 4 }}
                onClick={() => { setSelected(app); setTestMode(app.testMode); }}>
                <span style={{ fontSize: 20 }}>{app.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: selected.id === app.id ? 'var(--primary)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{app.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Config panel */}
        <div>
          <div className="config-section">
            <div className="config-section-title">
              <span style={{ fontSize: 24 }}>{selected.emoji}</span>
              {selected.name} — {selected.plan?.name} Plan
              {testMode && <span className="mkt-badge badge-pending" style={{ marginLeft: 8 }}>Test Mode</span>}
            </div>

            <div className="info-box info mb-16">
              <Icon name="info" size={16}/>
              <span>Plan: <strong>{selected.plan?.name}</strong> · {selected.plan?.price ? `₹${selected.plan?.price.toLocaleString('en-IN')}/mo` : 'Free'} · Renews on 15th every month</span>
            </div>

            <div className="form-group">
              <div className="form-toggle">
                <button className={`toggle ${testMode ? 'on' : ''}`} onClick={() => { setTestMode(!testMode); toast(`${selected.name} switched to ${!testMode ? 'Test' : 'Live'} mode`, 'success'); }}/>
                <div>
                  <div className="toggle-label">Test Mode {testMode ? 'ON' : 'OFF'}</div>
                  <div className="toggle-hint">{testMode ? '⚠️ In test mode — real transactions will not be processed. Switch to Live before accepting orders.' : '✅ Live mode — real transactions are being processed.'}</div>
                </div>
              </div>
            </div>

            <div className="divider"/>

            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="lock" size={14}/> API Credentials
            </div>
            <div className="grid-2">
              {(selected.credentials || ['API Key', 'Secret Key']).map((cred, i) => (
                <div className="form-group" key={cred}>
                  <label className="form-label">{cred}</label>
                  <div className="credential-field">
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {i === 0 ? cred1 : cred2}
                    </span>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => toast('Copied!', 'success')}>
                      <Icon name="copy" size={12}/>
                    </button>
                  </div>
                  <div className="form-hint" style={{ marginTop: 4 }}>
                    <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => toast('Edit credential mode')}>✏️ Update credential</button>
                  </div>
                </div>
              ))}
            </div>

            {selected.webhook && (
              <div className="form-group">
                <label className="form-label">Webhook Endpoint URL</label>
                <div className="credential-field">
                  <span>https://api.sitesellr.com/webhooks/{selected.id}/{'store-abc123'}</span>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => toast('Webhook URL copied!', 'success')}>
                    <Icon name="copy" size={12}/>
                  </button>
                </div>
                <div className="form-hint">Add this URL to your {selected.name} dashboard under Webhooks/Notifications.</div>
              </div>
            )}

            <div className="divider"/>
            <div className="flex items-center justify-between">
              <button className="btn btn-ghost" style={{ color: 'var(--danger)', fontSize: 13 }}>
                <Icon name="trash" size={13}/> Uninstall App
              </button>
              <div className="flex gap-8">
                <button className="btn btn-outline" onClick={() => toast('Settings saved!', 'success')}>Save Changes</button>
                <button className="btn btn-primary" onClick={() => toast(`Testing ${selected.name} connection...`, 'success')}>Test Connection</button>
              </div>
            </div>
          </div>

          {/* Billing history */}
          <div className="config-section">
            <div className="config-section-title"><Icon name="revenue" size={16}/> Billing History</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th>Invoice</th></tr></thead>
                <tbody>
                  {[
                    { date: '2025-02-01', desc: `${selected.name} — ${selected.plan?.name}`, amt: selected.plan?.price || 0, status: 'Paid' },
                    { date: '2025-01-01', desc: `${selected.name} — ${selected.plan?.name}`, amt: selected.plan?.price || 0, status: 'Paid' },
                    { date: '2024-12-01', desc: `${selected.name} — ${selected.plan?.name}`, amt: selected.plan?.price || 0, status: 'Paid' },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td className="td-mono">{row.date}</td>
                      <td>{row.desc}</td>
                      <td style={{ fontWeight: 600 }}>{row.amt === 0 ? '—' : `₹${(row.amt * 1.18).toLocaleString('en-IN')}`}</td>
                      <td><span className="mkt-badge badge-installed">{row.status}</span></td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => toast('Downloading invoice...')}><Icon name="copy" size={12}/> PDF</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

const Dashboard = ({ role, toast }) => {
  const isPlatform = role === 'platform';

  const revData = [62, 78, 55, 88, 95, 71, 108, 125, 99, 142, 155, 178];
  const maxRev = Math.max(...revData);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-title">
            {isPlatform ? 'Platform Dashboard' : 'Store Dashboard'}
          </div>
          <div className="section-sub">
            {isPlatform ? 'Overview of all tenants, app revenue, and marketplace performance' : 'Welcome back! Your store health at a glance.'}
          </div>
        </div>
        {!isPlatform && <button className="btn btn-primary"><Icon name="apps" size={14}/> Browse Apps</button>}
      </div>

      <div className="stats-grid">
        {(isPlatform ? [
          { icon: '🏪', label: 'Active Stores', val: '2,341', delta: '+48 this month', trend: 'up', color: '#eff6ff' },
          { icon: '💰', label: 'App Revenue (MRR)', val: '₹18.4L', delta: '+22% vs last month', trend: 'up', color: '#f0fdf4' },
          { icon: '📦', label: 'App Installs', val: '14,892', delta: '+892 this month', trend: 'up', color: '#fdf4ff' },
          { icon: '⭐', label: 'Avg App Rating', val: '4.6/5', delta: 'Based on 12,341 reviews', trend: 'up', color: '#fffbeb' },
        ] : [
          { icon: '🛒', label: 'Total Orders', val: '1,284', delta: '+38 this week', trend: 'up', color: '#eff6ff' },
          { icon: '💰', label: 'Revenue (MTD)', val: '₹4.2L', delta: '+18% vs last month', trend: 'up', color: '#f0fdf4' },
          { icon: '📦', label: 'Apps Installed', val: '3', delta: '2 active, 1 test mode', trend: 'up', color: '#fdf4ff' },
          { icon: '🚀', label: 'Shipments Today', val: '47', delta: 'Shiprocket: 41 · Delhivery: 6', trend: 'up', color: '#fffbeb' },
        ]).map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-val">{s.val}</div>
              <div className="stat-label">{s.label}</div>
              <div className={`stat-delta ${s.trend}`}>{s.delta}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div style={{ fontWeight: 700, fontSize: 14 }}>Monthly Revenue</div>
          </div>
          <div className="card-body">
            <div className="rev-bar-wrap">
              {revData.map((v, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="rev-bar" style={{ height: `${(v/maxRev)*90}px`, width: '100%' }} title={`₹${v}K`}/>
                  <div className="rev-bar-label">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>{isPlatform ? 'Top Revenue Apps' : 'My Apps Status'}</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {(isPlatform ? MARKETPLACE_APPS.slice(0,5) : MARKETPLACE_APPS.slice(0,3)).map((app, i) => (
              <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 24 }}>{app.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{app.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{app.category}</div>
                </div>
                {isPlatform
                  ? <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--success)' }}>₹{(Math.random()*50+10).toFixed(0)}K</div>
                  : <span className="mkt-badge badge-installed">Active</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isPlatform && (
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>⚠️ Action Required</div>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <div className="info-box warning">
              <Icon name="info" size={16}/>
              <span><strong>Razorpay is in Test Mode.</strong> You cannot accept real payments. <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }} onClick={() => toast('Navigate to App Settings → Razorpay to switch modes')}>Switch to Live →</button></span>
            </div>
            <div className="info-box info">
              <Icon name="info" size={16}/>
              <span><strong>WhatsApp Business API not installed.</strong> Reach 300M+ WhatsApp users with order updates. <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }} onClick={() => toast('Browse App Store → Email & Marketing')}>Install now →</button></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PLATFORM REVENUE PAGE ────────────────────────────────────────────────────

const PlatformRevenue = ({ toast }) => {
  const data = MARKETPLACE_APPS.map(a => ({
    ...a,
    revenue: Math.floor(Math.random() * 400000 + 10000),
    installs: Math.floor(Math.random() * 400 + 20),
    commission: 20,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-title">Revenue & Analytics</div>
          <div className="section-sub">Track app marketplace revenue, commissions, and store subscription metrics</div>
        </div>
        <button className="btn btn-outline" onClick={() => toast('Exporting CSV...')}><Icon name="copy" size={14}/> Export CSV</button>
      </div>
      <div className="stats-grid">
        {[
          { icon: '💰', label: 'Total MRR', val: '₹18.4L', color: '#eff6ff' },
          { icon: '📊', label: 'Commission Revenue', val: '₹3.7L', color: '#f0fdf4' },
          { icon: '📈', label: 'YTD App Revenue', val: '₹1.8Cr', color: '#fdf4ff' },
          { icon: '🏪', label: 'Paying Stores', val: '1,842', color: '#fffbeb' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.color }}>{s.icon}</div>
            <div><div className="stat-val">{s.val}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead><tr><th>App</th><th>Category</th><th>Installs</th><th>MRR</th><th>Commission %</th><th>Your Share</th><th>Top Plan</th></tr></thead>
              <tbody>
                {data.sort((a,b) => b.revenue - a.revenue).map((app, i) => (
                  <tr key={app.id}>
                    <td>
                      <div className="flex items-center gap-10">
                        <span style={{ fontSize: 20 }}>{app.emoji}</span>
                        <div className="td-name">{app.name}</div>
                      </div>
                    </td>
                    <td><span className="mkt-badge badge-category">{app.category}</span></td>
                    <td>{app.installs}</td>
                    <td style={{ fontWeight: 600 }}>₹{(app.revenue/1000).toFixed(0)}K</td>
                    <td>
                      <input style={{ width: 50, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, textAlign: 'center' }} type="number" defaultValue={app.commission}/>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>%</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{(app.revenue * 0.2 / 1000).toFixed(0)}K</td>
                    <td>{app.pricing.find(p=>p.popular)?.name || app.pricing[0].name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function StoreBuilderV1() {
  const [role, setRole] = useState('store'); // 'platform' | 'store'
  const [page, setPage] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  const showToast = (msg, type = '') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const platformNav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'app-manager', label: 'App Marketplace', icon: 'apps', badge: '16' },
    { id: 'revenue', label: 'Revenue', icon: 'revenue' },
    { id: 'users', label: 'Tenants', icon: 'users' },
    { id: 'theme-builder', label: 'Theme Builder', icon: 'theme', route: '/store-builder-theme' },
    { id: 'settings-builder', label: 'Settings Builder', icon: 'settings', route: '/store-builder-settings' },
  ];

  const storeNav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'app-store', label: 'App Store', icon: 'apps', badge: 'NEW' },
    { id: 'app-settings', label: 'App Settings', icon: 'settings' },
    { id: 'theme', label: 'Theme & Design', icon: 'theme' },
    { id: 'theme-builder', label: 'Theme Builder', icon: 'theme', route: '/store-builder-theme' },
    { id: 'settings-builder', label: 'Settings Builder', icon: 'settings', route: '/store-builder-settings' },
  ];

  const nav = role === 'platform' ? platformNav : storeNav;

  const renderPage = () => {
    if (page === 'dashboard') return <Dashboard role={role} toast={showToast}/>;
    if (role === 'platform') {
      if (page === 'app-manager') return <PlatformAppManager toast={showToast}/>;
      if (page === 'revenue') return <PlatformRevenue toast={showToast}/>;
      if (page === 'users') return <div className="empty-state"><div className="empty-icon">🏪</div><h3>Tenant Management</h3><p>Full tenant CRUD module — included in main spec</p></div>;
    }
    if (role === 'store') {
      if (page === 'app-store') return <StoreAppStore toast={showToast}/>;
      if (page === 'app-settings') return <AppSettings toast={showToast}/>;
      if (page === 'theme') return <div className="empty-state"><div className="empty-icon">🎨</div><h3>Theme & Design</h3><p>Layout builder — covered in the main spec document</p></div>;
    }
    return null;
  };

  // Reset to appropriate page when role switches
  const switchRole = (r) => { setRole(r); setPage('dashboard'); };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-logo-text">Sitesellr</div>
            <div className="sb-logo-sub">Admin Panel</div>
          </div>

          <div className="role-switcher">
            <button className={`role-btn ${role === 'platform' ? 'active' : ''}`} onClick={() => switchRole('platform')}>Platform</button>
            <button className={`role-btn ${role === 'store' ? 'active' : ''}`} onClick={() => switchRole('store')}>Store Owner</button>
          </div>

          <div className="sb-section">
            <div className="sb-section-label">{role === 'platform' ? 'Platform' : 'My Store'}</div>
            {nav.map(item => (
              <div
                key={item.id}
                className={`sb-item ${page === item.id ? 'active' : ''}`}
                onClick={() => {
                  if (item.route) {
                    window.location.assign(item.route);
                    return;
                  }
                  setPage(item.id);
                }}
              >
                <Icon name={item.icon} size={16}/>
                {item.label}
                {item.badge && <span className="sb-badge">{item.badge}</span>}
              </div>
            ))}
          </div>

          <div className="sb-divider"/>

          <div className="sb-section">
            <div className="sb-section-label">Account</div>
            <div className="sb-item">
              <Icon name="settings" size={16}/>Settings
            </div>
            <div className="sb-item">
              <Icon name="logout" size={16}/>Logout
            </div>
          </div>

          <div style={{ padding: '12px 20px', marginTop: 'auto' }}>
            <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar">{role === 'platform' ? 'PO' : 'SO'}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                    {role === 'platform' ? 'Platform Owner' : 'Store Owner'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {role === 'platform' ? 'admin@sitesellr.com' : 'store@example.com'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <div className="topbar">
            <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--text-muted)' }}>
              {role === 'platform' ? '🌐 Platform Admin' : '🛍️ Krishna Textiles Store'}
            </div>
            <div className="search-bar" style={{ maxWidth: 260 }}>
              <span className="search-icon"><Icon name="search" size={14}/></span>
              <input placeholder="Search..." style={{ fontSize: 13 }}/>
            </div>
            <div className="avatar">{role === 'platform' ? 'PO' : 'KT'}</div>
          </div>

          <div className="content">
            {renderPage()}
          </div>
        </main>

        <Toast toasts={toasts}/>
      </div>
    </>
  );
}
