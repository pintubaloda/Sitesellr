import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import MerchantOps from "./MerchantOps";
import PlatformRbac from "./PlatformRbac";
import AuditLogs from "./AuditLogs";
import PlatformModule from "./PlatformModule";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --primary:#2563EB;--primary-dark:#1d4ed8;--primary-light:#eff6ff;--primary-mid:#bfdbfe;
  --accent:#0f172a;
  --surface:#f8fafc;--surface2:#f1f5f9;--surface3:#e2e8f0;
  --border:#e2e8f0;--border-strong:#cbd5e1;
  --text:#1e293b;--muted:#64748b;--light:#94a3b8;
  --success:#16a34a;--success-bg:#f0fdf4;--success-light:#bbf7d0;
  --warning:#d97706;--warning-bg:#fffbeb;
  --danger:#dc2626;--danger-bg:#fef2f2;
  --gold:#f59e0b;--purple:#7c3aed;
  --r:10px;--r-sm:7px;--r-lg:14px;--r-xl:18px;
  --shadow:0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.05);
  --shadow-md:0 4px 16px rgba(0,0,0,.09),0 2px 8px rgba(0,0,0,.06);
  --shadow-lg:0 20px 60px rgba(0,0,0,.12),0 8px 24px rgba(0,0,0,.08);
  --shadow-primary:0 8px 32px rgba(37,99,235,.22);
}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--surface);color:var(--text);font-size:14px;line-height:1.5}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:99px}
::-webkit-scrollbar-thumb:hover{background:var(--muted)}

/* ── APP LAYOUT ── */
.app{display:flex;min-height:100vh}
.sidebar{width:232px;background:#fff;flex-shrink:0;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;overflow-y:auto;z-index:100;border-right:1px solid var(--border)}
.main{margin-left:232px;flex:1;min-height:100vh;display:flex;flex-direction:column}
.topbar{height:56px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 24px;gap:12px;position:sticky;top:0;z-index:50}
.content{flex:1;padding:28px}

/* ── SIDEBAR (white, no background) ── */
.sb-logo{padding:18px 18px 10px;display:flex;align-items:center;gap:10px}
.sb-logo-icon{width:32px;height:32px;background:var(--primary);border-radius:9px;display:grid;place-items:center;flex-shrink:0}
.sb-logo-icon svg{color:#fff}
.sb-wordmark{font-size:17px;font-weight:800;color:var(--accent);letter-spacing:-.5px}
.sb-sub{font-size:10px;color:var(--light);font-weight:600;letter-spacing:1.5px;text-transform:uppercase}
.sb-section{padding:14px 10px 4px}
.sb-section-label{font-size:10px;font-weight:700;color:var(--light);letter-spacing:1.5px;text-transform:uppercase;padding:0 8px;margin-bottom:4px}
.sb-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:all .15s;font-size:13px;font-weight:500;color:var(--muted);margin-bottom:1px;text-decoration:none}
.sb-item:hover{background:var(--primary-light);color:var(--primary)}
.sb-item.active{background:var(--primary-light);color:var(--primary);font-weight:600}
.sb-item svg{flex-shrink:0;opacity:.8}
.sb-item.active svg{opacity:1}
.sb-badge{margin-left:auto;background:var(--gold);color:#000;font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px}
.sb-badge.new{background:var(--primary);color:#fff}
.sb-divider{height:1px;background:var(--border);margin:8px 16px}
.sb-user{padding:10px 12px;margin-top:auto;border-top:1px solid var(--border)}
.sb-user-card{padding:10px 11px;border-radius:9px;display:flex;align-items:center;gap:9px;background:var(--surface);border:1px solid var(--border)}
.sb-avatar{width:30px;height:30px;border-radius:8px;background:var(--primary);color:#fff;font-size:12px;font-weight:700;display:grid;place-items:center;flex-shrink:0}

/* ── ROLE TOGGLE ── */
.role-toggle{display:flex;gap:2px;margin:8px 10px 4px;background:var(--surface2);border-radius:9px;padding:3px}
.role-btn{flex:1;padding:6px 4px;font-size:11px;font-weight:600;color:var(--muted);border:none;background:none;cursor:pointer;border-radius:7px;transition:.15s;font-family:inherit;text-align:center}
.role-btn.active{background:var(--primary);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.3)}

/* ── TOPBAR ── */
.tb-breadcrumb{flex:1;font-size:13px;font-weight:600;color:var(--muted)}
.tb-breadcrumb span{color:var(--text)}
.search-bar{position:relative;max-width:260px}
.search-bar input{width:100%;padding:8px 13px 8px 36px;border:1.5px solid var(--border);border-radius:9px;font-size:13px;font-family:inherit;background:var(--surface);color:var(--text);outline:none;transition:.15s}
.search-bar input:focus{border-color:var(--primary);background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
.search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--light)}

/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--r-sm);font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s;font-family:inherit;white-space:nowrap}
.btn-primary{background:var(--primary);color:#fff;box-shadow:var(--shadow-primary)}
.btn-primary:hover{background:var(--primary-dark);transform:translateY(-1px)}
.btn-outline{background:#fff;border:1.5px solid var(--border-strong);color:var(--text)}
.btn-outline:hover{border-color:var(--primary);color:var(--primary)}
.btn-ghost{background:none;color:var(--muted)}
.btn-ghost:hover{background:var(--surface2);color:var(--text)}
.btn-success{background:var(--success);color:#fff}
.btn-danger{background:var(--danger);color:#fff}
.btn-gold{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;box-shadow:0 4px 14px rgba(245,158,11,.3)}
.btn-sm{padding:5px 11px;font-size:12px;border-radius:6px}
.btn-lg{padding:11px 24px;font-size:14px}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none!important}

/* ── CARDS ── */
.card{background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow)}
.card-header{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px}
.card-title{font-size:14px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px}
.card-body{padding:20px}
.card-footer{padding:13px 20px;border-top:1px solid var(--border);background:var(--surface);border-radius:0 0 var(--r-lg) var(--r-lg);display:flex;justify-content:flex-end;gap:8px}

/* ── STAT CARDS ── */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:22px}
.stat-card{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:18px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow)}
.stat-icon{width:44px;height:44px;border-radius:10px;display:grid;place-items:center;flex-shrink:0;font-size:18px}
.stat-val{font-size:22px;font-weight:800;letter-spacing:-.8px;color:var(--text)}
.stat-label{font-size:12px;color:var(--muted);font-weight:500;margin-top:1px}
.stat-delta{font-size:11px;font-weight:600;margin-top:3px}
.stat-delta.up{color:var(--success)}
.stat-delta.down{color:var(--danger)}

/* ── PAGE HEADER ── */
.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:22px;flex-wrap:wrap}
.page-title{font-size:21px;font-weight:800;color:var(--text);letter-spacing:-.5px}
.page-sub{font-size:13px;color:var(--muted);margin-top:3px}

/* ── TABS ── */
.tabs{display:flex;gap:2px;background:var(--surface2);border-radius:9px;padding:3px;margin-bottom:20px;width:fit-content}
.tab{padding:7px 16px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:none;color:var(--muted);transition:.15s;font-family:inherit}
.tab.active{background:#fff;color:var(--primary);box-shadow:var(--shadow)}
.tab:hover:not(.active){color:var(--text)}

/* ── FORMS ── */
.form-group{margin-bottom:16px}
.form-label{display:block;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px}
.form-label .req{color:var(--danger)}
.form-input{width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:13.5px;font-family:inherit;color:var(--text);background:#fff;outline:none;transition:.15s}
.form-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.08)}
.form-input.err{border-color:var(--danger)}
.form-hint{font-size:11.5px;color:var(--muted);margin-top:4px}
.form-err{font-size:11.5px;color:var(--danger);margin-top:4px;font-weight:500}
.form-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--r-sm);margin-bottom:10px;gap:10px}
.toggle-info{flex:1}
.toggle-info-label{font-size:13px;font-weight:600;color:var(--text)}
.toggle-info-sub{font-size:11.5px;color:var(--muted);margin-top:1px}
.toggle-switch{width:38px;height:22px;border-radius:99px;border:none;cursor:pointer;position:relative;transition:.2s;flex-shrink:0}
.toggle-switch.on{background:var(--primary)}
.toggle-switch.off{background:var(--border-strong)}
.toggle-switch::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.toggle-switch.on::after{left:19px}

/* ── TABLE ── */
.table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:var(--r)}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{background:var(--surface2);padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;border-bottom:1px solid var(--border);white-space:nowrap}
tbody td{padding:12px 14px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover td{background:var(--surface)}
.td-bold{font-weight:600}
.td-mono{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--muted)}

/* ── BADGES ── */
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;font-size:10.5px;font-weight:700;letter-spacing:.3px}
.badge-primary{background:var(--primary-light);color:var(--primary)}
.badge-success{background:var(--success-bg);color:var(--success)}
.badge-warning{background:var(--warning-bg);color:var(--warning)}
.badge-danger{background:var(--danger-bg);color:var(--danger)}
.badge-muted{background:var(--surface2);color:var(--muted)}
.badge-gold{background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff}
.badge-new{background:var(--primary);color:#fff}
.badge-live{background:var(--success-bg);color:var(--success);border:1px solid var(--success-light)}

/* ── MODAL ── */
.modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:#fff;border-radius:var(--r-xl);max-width:680px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg);animation:slideUp .2s ease}
.modal-lg{max-width:860px}
.modal-header{padding:22px 26px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.modal-title{font-size:18px;font-weight:800;color:var(--text)}
.modal-sub{font-size:12.5px;color:var(--muted);margin-top:3px}
.modal-body{padding:20px 26px}
.modal-footer{padding:16px 26px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;background:var(--surface);border-radius:0 0 var(--r-xl) var(--r-xl)}
.modal-close{width:30px;height:30px;border-radius:7px;border:none;background:var(--surface2);cursor:pointer;display:grid;place-items:center;color:var(--muted);transition:.15s;flex-shrink:0}
.modal-close:hover{background:var(--border);color:var(--text)}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}

/* ── MARKETPLACE CARDS ── */
.mkt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:18px}
.mkt-card{background:#fff;border:1.5px solid var(--border);border-radius:var(--r-lg);overflow:hidden;transition:all .2s;cursor:pointer;box-shadow:var(--shadow)}
.mkt-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-md);border-color:var(--primary-mid)}
.mkt-card.installed{border-color:var(--success);box-shadow:0 0 0 1px var(--success-light)}
.mkt-preview{height:140px;display:flex;align-items:center;justify-content:center;font-size:52px;position:relative}
.mkt-body{padding:14px 16px}
.mkt-name{font-size:14px;font-weight:700;color:var(--text);margin-bottom:3px}
.mkt-desc{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mkt-footer{display:flex;align-items:center;justify-content:space-between}
.mkt-price{font-size:13px;font-weight:700;color:var(--text)}
.mkt-tags{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}
.mkt-tag{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:99px;background:var(--surface2);color:var(--muted)}

/* ── INSTALLED APP ROW ── */
.installed-row{display:flex;align-items:center;gap:13px;padding:14px 18px;border-bottom:1px solid var(--border)}
.installed-row:last-child{border-bottom:none}
.installed-icon{width:44px;height:44px;border-radius:11px;display:grid;place-items:center;font-size:20px;flex-shrink:0}
.installed-info{flex:1;min-width:0}
.installed-name{font-size:13.5px;font-weight:700;color:var(--text)}
.installed-meta{font-size:12px;color:var(--muted);margin-top:1px}
.installed-actions{display:flex;align-items:center;gap:7px}

/* ── CATEGORY FILTER ── */
.cat-filter{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px}
.cat-btn{padding:6px 13px;border-radius:99px;font-size:12px;font-weight:600;border:1.5px solid var(--border);background:#fff;cursor:pointer;transition:.15s;color:var(--muted)}
.cat-btn:hover{border-color:var(--primary);color:var(--primary)}
.cat-btn.active{border-color:var(--primary);background:var(--primary);color:#fff}

/* ── PLAN CARDS ── */
.plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.plan-card{border:2px solid var(--border);border-radius:var(--r);padding:14px;cursor:pointer;transition:.15s;text-align:center;position:relative}
.plan-card:hover{border-color:var(--primary)}
.plan-card.selected{border-color:var(--primary);background:var(--primary-light)}
.plan-card.popular::before{content:'POPULAR';position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--gold);color:#000;font-size:9px;font-weight:800;padding:2px 10px;border-radius:99px;letter-spacing:1px}
.plan-name{font-size:12.5px;font-weight:700;color:var(--text);margin-bottom:5px}
.plan-price{font-size:20px;font-weight:800;color:var(--primary);letter-spacing:-.8px}
.plan-features{font-size:11px;color:var(--muted);margin-top:7px;line-height:1.6}

/* ── CHECKOUT ── */
.checkout-summary{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:18px}
.checkout-line{display:flex;justify-content:space-between;align-items:center;padding:7px 0;font-size:13px}
.checkout-line.total{border-top:1px solid var(--border);margin-top:7px;padding-top:12px;font-weight:700;font-size:14px}

/* ── PAYMENT METHODS ── */
.pm-grid{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
.pm-btn{display:flex;align-items:center;gap:7px;padding:9px 14px;border:2px solid var(--border);border-radius:var(--r-sm);cursor:pointer;font-size:12.5px;font-weight:600;transition:.15s;background:#fff;font-family:inherit}
.pm-btn.selected{border-color:var(--primary);background:var(--primary-light);color:var(--primary)}
.pm-btn:hover{border-color:var(--primary)}

/* ── STEP FLOW ── */
.steps{display:flex;align-items:center;margin-bottom:24px}
.step-item{display:flex;align-items:center;gap:7px}
.step-num{width:26px;height:26px;border-radius:99px;display:grid;place-items:center;font-size:11.5px;font-weight:700;flex-shrink:0}
.step-num.done{background:var(--success);color:#fff}
.step-num.active{background:var(--primary);color:#fff}
.step-num.pending{background:var(--border);color:var(--muted)}
.step-label{font-size:12px;font-weight:600}
.step-label.active{color:var(--primary)}
.step-label.pending{color:var(--muted)}
.step-connector{flex:1;height:2px;background:var(--border);margin:0 7px;min-width:16px}
.step-connector.done{background:var(--success)}

/* ── INFO BOXES ── */
.info-box{padding:12px 14px;border-radius:var(--r-sm);font-size:12.5px;display:flex;align-items:flex-start;gap:9px;margin-bottom:14px}
.info-box.info{background:var(--primary-light);border:1px solid var(--primary-mid);color:#1d4ed8}
.info-box.warning{background:var(--warning-bg);border:1px solid #fcd34d;color:#92400e}
.info-box.success{background:var(--success-bg);border:1px solid var(--success-light);color:#166534}
.info-box.danger{background:var(--danger-bg);border:1px solid #fca5a5;color:#991b1b}

/* ── TOAST ── */
.toast-container{position:fixed;bottom:22px;right:22px;display:flex;flex-direction:column;gap:8px;z-index:2000}
.toast{background:var(--accent);color:#fff;padding:12px 16px;border-radius:var(--r);display:flex;align-items:center;gap:9px;font-size:13px;font-weight:500;box-shadow:var(--shadow-lg);animation:toastIn .2s ease;min-width:260px}
.toast.success{background:var(--success)}
.toast.error{background:var(--danger)}
.toast.warning{background:var(--warning)}
@keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}

/* ── STAR RATING ── */
.star-rating{display:flex;gap:1px;font-size:12px}

/* ── MISC ── */
.divider{height:1px;background:var(--border);margin:18px 0}
.empty-state{text-align:center;padding:50px 20px;color:var(--muted)}
.empty-icon{font-size:44px;margin-bottom:10px}
.spinner{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.flex{display:flex}.flex-col{display:flex;flex-direction:column}
.items-center{align-items:center}.justify-between{justify-content:space-between}
.gap-6{gap:6px}.gap-8{gap:8px}.gap-10{gap:10px}.gap-12{gap:12px}.gap-16{gap:16px}
.mb-8{margin-bottom:8px}.mb-12{margin-bottom:12px}.mb-16{margin-bottom:16px}.mb-20{margin-bottom:20px}
.w-full{width:100%}
.text-sm{font-size:12.5px}.text-xs{font-size:11px}
.font-bold{font-weight:700}.font-semibold{font-weight:600}
.text-muted{color:var(--muted)}.text-success{color:var(--success)}.text-danger{color:var(--danger)}.text-primary{color:var(--primary)}
.credential-field{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);display:flex;align-items:center;justify-content:space-between;gap:8px}
.rev-bars{display:flex;align-items:flex-end;gap:6px;height:90px;padding-top:6px}
.rev-bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
.rev-bar{width:100%;background:var(--primary-light);border-radius:5px 5px 0 0;transition:all .3s}
.rev-bar:hover{background:var(--primary)}
.rev-label{font-size:10px;color:var(--muted)}

/* ── THEME BUILDER SPECIFIC ── */
.builder-layout{display:grid;grid-template-columns:240px 1fr 280px;height:calc(100vh - 56px);overflow:hidden}
.builder-panel{background:#fff;border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
.builder-panel-r{border-right:none;border-left:1px solid var(--border)}
.builder-panel-header{padding:12px 14px;border-bottom:1px solid var(--border);flex-shrink:0}
.builder-panel-title{font-size:10.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.builder-panel-scroll{flex:1;overflow-y:auto;padding:10px}
.canvas-wrap{flex:1;display:flex;flex-direction:column;background:var(--surface);overflow:hidden}
.canvas-outer{flex:1;overflow-y:auto;display:flex;justify-content:center;padding:18px;background:var(--surface2)}
.canvas-frame{background:#fff;border-radius:var(--r-lg);box-shadow:var(--shadow-lg);overflow:hidden;transition:width .3s;width:100%}
.canvas-frame.tablet{max-width:768px}
.canvas-frame.mobile{max-width:375px}
.canvas-bar{display:flex;align-items:center;justify-content:center;gap:8px;padding:7px;background:var(--accent);font-size:11px;color:#64748b;flex-shrink:0}
.section-card{position:relative;border:2px solid transparent;transition:.15s;cursor:pointer}
.section-card:hover{border-color:var(--primary)}
.section-card.selected{border-color:var(--primary);box-shadow:0 0 0 2px rgba(37,99,235,.1)}
.section-actions{position:absolute;top:7px;right:7px;display:none;gap:3px;z-index:10}
.section-card:hover .section-actions,.section-card.selected .section-actions{display:flex}
.sec-action-btn{width:26px;height:26px;border-radius:5px;border:none;cursor:pointer;display:grid;place-items:center;font-size:12px;transition:.15s}
.sa-del{background:var(--danger);color:#fff}
.sa-dup{background:var(--primary);color:#fff}
.sec-label-badge{position:absolute;top:7px;left:7px;background:var(--accent);color:#fff;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;display:none;z-index:10}
.section-card:hover .sec-label-badge,.section-card.selected .sec-label-badge{display:block}
.palette-item{display:flex;align-items:center;gap:9px;padding:9px 11px;border:1.5px dashed var(--border-strong);border-radius:var(--r-sm);cursor:grab;transition:.15s;user-select:none;background:#fff;margin-bottom:5px}
.palette-item:hover{border-color:var(--primary);background:var(--primary-light);color:var(--primary)}
.palette-emoji{font-size:16px;flex-shrink:0}
.palette-label{font-size:12px;font-weight:600}
.order-item{display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:6px;cursor:pointer;background:transparent;border:1px solid transparent;margin-bottom:1px;transition:.15s}
.order-item:hover{background:var(--surface2)}
.order-item.active{background:var(--primary-light);border-color:var(--primary-mid)}
.field-group{margin-bottom:12px}
.field-label{font-size:10.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;display:block}
.field-input{width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:13px;font-family:inherit;color:var(--text);outline:none;transition:.15s;background:#fff}
.field-input:focus{border-color:var(--primary);box-shadow:0 0 0 2px rgba(37,99,235,.08)}
.field-textarea{resize:vertical;min-height:65px}
.field-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 9px center}
.toggle-pill{width:36px;height:20px;border-radius:99px;border:none;cursor:pointer;position:relative;transition:.2s;flex-shrink:0}
.toggle-pill.on{background:var(--primary)}
.toggle-pill.off{background:var(--border-strong)}
.toggle-pill::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.toggle-pill.on::after{left:18px}
.color-swatch{display:flex;align-items:center;gap:7px;padding:5px 0}
.color-preview{width:26px;height:26px;border-radius:5px;border:1px solid var(--border);flex-shrink:0}
.nav-tree{display:flex;flex-direction:column;gap:4px}
.nav-node{border:1px solid var(--border);border-radius:var(--r-sm);overflow:hidden}
.nav-node-row{display:flex;align-items:center;gap:7px;padding:9px 11px;background:#fff;cursor:pointer;transition:.15s}
.nav-node-row:hover{background:var(--surface)}
.nav-drag{cursor:grab;color:var(--light);font-size:15px}
.nav-node-label{flex:1;font-size:13px;font-weight:600}
.nav-type-chip{font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px;background:var(--surface2);color:var(--muted)}
.nav-children{padding:3px 3px 3px 24px;background:var(--surface);display:flex;flex-direction:column;gap:3px}
.nav-child{display:flex;align-items:center;gap:7px;padding:7px 9px;border:1px solid var(--border);border-radius:var(--r-sm);background:#fff;font-size:12px}
.nav-add{display:flex;align-items:center;justify-content:center;gap:5px;padding:8px;border:1.5px dashed var(--border-strong);border-radius:var(--r-sm);cursor:pointer;color:var(--muted);font-size:12px;font-weight:600;transition:.15s;margin-top:4px}
.nav-add:hover{border-color:var(--primary);color:var(--primary);background:var(--primary-light)}
.page-list-item{display:flex;align-items:center;gap:9px;padding:9px 11px;border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:5px;cursor:pointer;transition:.15s}
.page-list-item:hover,.page-list-item.active{border-color:var(--primary);background:var(--primary-light)}
.page-status-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.wysiwyg{border:1.5px solid var(--border);border-radius:var(--r-sm);overflow:hidden}
.wysiwyg-toolbar{display:flex;gap:2px;padding:6px 8px;background:var(--surface2);border-bottom:1px solid var(--border);flex-wrap:wrap}
.wysiwyg-btn{padding:4px 7px;border:none;background:none;cursor:pointer;border-radius:4px;font-size:12px;color:var(--text);font-family:inherit;transition:.1s;font-weight:600}
.wysiwyg-btn:hover{background:var(--border)}
.wysiwyg-content{padding:14px;min-height:180px;font-size:14px;line-height:1.7;outline:none}
.version-item{display:flex;align-items:center;gap:9px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:5px;cursor:pointer;transition:.15s}
.version-item:hover{border-color:var(--primary);background:var(--primary-light)}
.version-item.live{border-color:var(--success);background:var(--success-bg)}
.v-num{width:30px;height:30px;border-radius:7px;background:var(--surface2);display:grid;place-items:center;font-size:11.5px;font-weight:800;color:var(--muted);flex-shrink:0}
.version-item.live .v-num{background:var(--success);color:#fff}
.theme-token-section{margin-bottom:18px}
.token-section-title{font-size:10.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border)}
.font-preview-box{padding:7px 10px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:14px;margin-bottom:5px}

/* ── SECTION RENDERERS ── */
.s-hero{background:linear-gradient(135deg,#1e293b,#374151);padding:72px 36px;color:#fff;text-align:center;position:relative}
.s-hero h1{font-size:clamp(22px,4vw,44px);font-weight:800;margin-bottom:10px;line-height:1.1}
.s-hero p{font-size:clamp(13px,2vw,17px);opacity:.8;margin-bottom:22px;max-width:460px;margin-left:auto;margin-right:auto}
.s-hero-cta{display:inline-flex;gap:10px;flex-wrap:wrap;justify-content:center}
.s-hero-btn{display:inline-block;background:var(--primary);color:#fff;padding:11px 24px;border-radius:8px;font-weight:700;font-size:13.5px}
.s-hero-sub{display:inline-block;background:rgba(255,255,255,.1);color:#fff;padding:11px 24px;border-radius:8px;font-weight:600;font-size:13.5px}
.s-ann{background:#0f172a;color:#fff;text-align:center;padding:9px;font-size:13px;font-weight:500}
.s-products{padding:36px;background:#fff}
.s-products h2{font-size:clamp(17px,3vw,26px);font-weight:800;margin-bottom:22px;text-align:center;color:var(--accent)}
.s-prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
.s-prod-card{border:1px solid var(--border);border-radius:var(--r);overflow:hidden;transition:.15s}
.s-prod-card:hover{box-shadow:var(--shadow-md)}
.s-prod-img{height:110px;display:flex;align-items:center;justify-content:center;font-size:34px;background:var(--surface)}
.s-prod-info{padding:9px 11px}
.s-prod-name{font-size:12.5px;font-weight:600;color:var(--accent);margin-bottom:3px}
.s-prod-price{font-size:13px;font-weight:700;color:var(--primary)}
.s-trust{background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:18px 36px;display:flex;justify-content:center;gap:36px;flex-wrap:wrap}
.s-trust-item{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--muted)}
.s-trust-icon{font-size:18px}
.s-testi{padding:36px;background:var(--surface)}
.s-testi h2{font-size:20px;font-weight:800;text-align:center;margin-bottom:20px}
.s-testi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.s-testi-card{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:14px}
.s-testi-stars{color:#f59e0b;font-size:11px;margin-bottom:5px}
.s-testi-text{font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:8px}
.s-testi-author{font-size:11.5px;font-weight:700;color:var(--accent)}
.s-cats{padding:36px;background:#fff}
.s-cats h2{font-size:20px;font-weight:800;text-align:center;margin-bottom:20px}
.s-cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px}
.s-cat-item{text-align:center;padding:14px 6px;border:1px solid var(--border);border-radius:var(--r);cursor:pointer;transition:.15s}
.s-cat-item:hover{border-color:var(--primary);background:var(--primary-light)}
.s-cat-icon{font-size:26px;margin-bottom:5px}
.s-cat-label{font-size:11px;font-weight:600;color:var(--accent)}
.s-banner{padding:36px;text-align:center;color:#fff}
.s-banner h2{font-size:clamp(18px,4vw,34px);font-weight:800;margin-bottom:7px}
.s-banner p{font-size:13.5px;opacity:.9;margin-bottom:18px}
.s-banner-btn{background:#fff;color:#ef4444;padding:11px 24px;border-radius:8px;font-weight:700;font-size:13.5px;display:inline-block}
.s-newsletter{padding:36px;background:var(--accent);text-align:center;color:#fff}
.s-newsletter h2{font-size:20px;font-weight:800;margin-bottom:7px}
.s-newsletter p{color:#94a3b8;margin-bottom:18px;font-size:13.5px}
.s-nl-form{display:flex;gap:7px;max-width:380px;margin:0 auto}
.s-nl-input{flex:1;padding:9px 13px;border-radius:7px;border:none;font-size:13px}
.s-nl-btn{background:var(--primary);color:#fff;padding:9px 16px;border-radius:7px;border:none;font-weight:700;font-size:13px;cursor:pointer}
.s-video{padding:36px;background:var(--surface);text-align:center}
.s-video-ph{width:100%;max-width:500px;height:180px;background:var(--accent);border-radius:var(--r);margin:12px auto 0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:36px}

/* ── SETTINGS PLATFORM ── */
.config-section{background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;margin-bottom:18px}
.config-section-title{font-size:13.5px;font-weight:700;color:var(--text);margin-bottom:14px;display:flex;align-items:center;gap:8px}
.tier-table{width:100%;border-collapse:collapse}
.tier-table th{background:var(--surface2);padding:9px 13px;text-align:left;font-size:11px;font-weight:700;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.5px}
.tier-table td{padding:11px 13px;border-bottom:1px solid var(--border);font-size:13px}
.tier-table tr:last-child td{border-bottom:none}

/* ── API NOTICE ── */
.api-details-page{max-width:900px;margin:0 auto;padding:24px 0}
`;

// ─── DATA ────────────────────────────────────────────────────────────────────

const APPS = [
  { id:'pg-razorpay', cat:'Payment Gateway', name:'Razorpay', emoji:'💳', color:'#0ea5e9', tagline:"India's most popular payment gateway", desc:'Accept UPI, cards, net banking, wallets & EMI. Instant settlement with lowest failure rates.', rating:4.8, reviews:2341, featured:true,
    pricing:[{id:'starter',name:'Starter',price:0,txnFee:'2.5% per txn',features:['UPI & Wallets','Cards','Net Banking','Basic Dashboard']},{id:'growth',name:'Growth',price:999,txnFee:'1.8% per txn',features:['Everything in Starter','EMI options','Instant Refunds','Advanced Analytics','Priority Support'],popular:true},{id:'ent',name:'Enterprise',price:2999,txnFee:'1.2% per txn',features:['Custom fee negotiation','Dedicated manager','White-label checkout','API webhooks']}],
    creds:['Key ID','Key Secret','Webhook Secret'], features:['UPI & QR Code','All Indian bank net banking','EMI 6-24 months','International cards','Instant refunds','Real-time webhooks','PCI-DSS Level 1'], webhook:true, testMode:true, tags:['UPI','EMI','Cards','Wallets'] },
  { id:'pg-payu', cat:'Payment Gateway', name:'PayU', emoji:'🏦', color:'#f59e0b', tagline:'Trusted by 500,000+ merchants', desc:'Complete payment suite with UPI Autopay, BNPL, and smart routing for maximum conversion.', rating:4.5, reviews:1876,
    pricing:[{id:'basic',name:'Basic',price:0,txnFee:'2.8% per txn',features:['UPI','Cards','Net Banking']},{id:'pro',name:'Pro',price:1499,txnFee:'1.9% per txn',features:['Everything in Basic','BNPL','UPI Autopay','Smart routing'],popular:true},{id:'custom',name:'Custom',price:null,txnFee:'Negotiated',features:['Volume discounts','Custom integration']}],
    creds:['Merchant Key','Salt','Webhook Hash Key'], features:['UPI Autopay subscriptions','Buy Now Pay Later','Smart routing','Anti-fraud engine','Multi-bank EMI'], tags:['UPI Autopay','BNPL','Cards'] },
  { id:'pg-cashfree', cat:'Payment Gateway', name:'Cashfree', emoji:'⚡', color:'#10b981', tagline:'Fastest growing payment platform', desc:'Sub-2 second UPI payments, instant payouts, and split payments for marketplaces.', rating:4.7, reviews:1203,
    pricing:[{id:'free',name:'Starter',price:0,txnFee:'2.5% per txn',features:['UPI','Cards','Wallets']},{id:'pro',name:'Pro',price:799,txnFee:'1.75% per txn',features:['Instant payouts','Split payments','Subscription billing'],popular:true}],
    creds:['App ID','Secret Key'], features:['Sub-2 second UPI','Instant payouts','Split payment marketplace','Subscription billing'], tags:['Fast UPI','Payouts','Subscriptions'] },
  { id:'sh-shiprocket', cat:'Shipping', name:'Shiprocket', emoji:'🚀', color:'#f97316', tagline:'#1 Shipping aggregator in India', desc:'Automate shipping across 17+ courier partners. Best rate picker, NDR management & branded tracking.', rating:4.6, reviews:3102, featured:true,
    pricing:[{id:'lite',name:'Lite',price:0,features:['5 shipments/month','Manual booking','Basic tracking']},{id:'essential',name:'Essential',price:999,features:['Unlimited shipments','Auto-assign carrier','Branded tracking','NDR management'],popular:true},{id:'growth',name:'Growth',price:2999,features:['All Essential','Return portal','COD remittance','Multi-warehouse']}],
    creds:['Email','Password','Source Channel ID'], features:['17+ courier partners','Auto-assign best carrier','Branded tracking page','NDR management','COD remittance','Return portal','Weight reconciliation'], tags:['Pan-India','COD','Returns','Multi-carrier'] },
  { id:'sh-delhivery', cat:'Shipping', name:'Delhivery', emoji:'📦', color:'#d946ef', tagline:"India's largest logistics network", desc:'Direct carrier integration with 18,000+ pincodes, B2B & B2C, with real-time tracking.', rating:4.4, reviews:1567,
    pricing:[{id:'std',name:'Standard',price:500,features:['B2C shipments','Real-time tracking','COD support']},{id:'pro',name:'Pro',price:1999,features:['B2B + B2C','Pickup scheduling','Return management','API access'],popular:true}],
    creds:['Client ID','Client Secret'], features:['18,500+ pincodes','B2B + B2C logistics','Real-time tracking','Pickup scheduling','Returns management'], tags:['Pan-India','B2B','COD'] },
  { id:'em-mailchimp', cat:'Email & Marketing', name:'Mailchimp', emoji:'🐵', color:'#ffe01b', tagline:'Marketing automation platform', desc:'Email campaigns, automations, and audience management for growing stores.', rating:4.5, reviews:2103,
    pricing:[{id:'free',name:'Free',price:0,features:['500 contacts','1,000 emails/mo','Basic templates']},{id:'ess',name:'Essentials',price:499,features:['5,000 contacts','50,000 emails','A/B testing'],popular:true},{id:'std',name:'Standard',price:1299,features:['100k contacts','Automations','Retargeting']}],
    creds:['API Key','Audience ID'], features:['Drag-drop email builder','Automated flows','A/B testing','Audience segmentation','Purchase trigger emails'], tags:['Email','Automation','Campaigns'] },
  { id:'em-whatsapp', cat:'Email & Marketing', name:'WhatsApp Business API', emoji:'💬', color:'#25d366', tagline:'Reach customers on WhatsApp', desc:'Order confirmations, shipping updates, and promotional messages via WhatsApp API.', rating:4.8, reviews:1876, featured:true,
    pricing:[{id:'starter',name:'Starter',price:799,features:['1,000 conversations/mo','Order notifications','Shipping alerts']},{id:'growth',name:'Growth',price:2499,features:['10,000 conversations','Broadcasts','Chatbot flows','Cart recovery'],popular:true}],
    creds:['Phone Number ID','Access Token','Verify Token'], features:['Order confirmation','Shipping updates','Cart abandonment','Broadcast campaigns','Chatbot builder','Two-way messaging'], tags:['WhatsApp','Notifications','Marketing'] },
  { id:'an-ga4', cat:'Analytics', name:'Google Analytics 4', emoji:'📊', color:'#ff6b35', tagline:'Industry-standard analytics', desc:'Track every customer journey, conversion funnel, and revenue attribution with GA4.', rating:4.6, reviews:4521,
    pricing:[{id:'free',name:'Free',price:0,features:['Unlimited tracking','All reports','BigQuery export','Funnel analysis']}],
    creds:['Measurement ID (G-XXXXXXXX)'], features:['Event-based tracking','Conversion funnels','Revenue attribution','Audience building','BigQuery export','Real-time reports'], tags:['Free','Ecommerce','Funnels'] },
  { id:'an-fbpx', cat:'Analytics', name:'Meta Pixel', emoji:'🎯', color:'#1877f2', tagline:'Facebook & Instagram retargeting', desc:'Track conversions and build custom audiences for Meta ads. Essential for Indian D2C brands.', rating:4.7, reviews:3201,
    pricing:[{id:'free',name:'Free',price:0,features:['Conversion tracking','Custom audiences','Catalog sync','Dynamic ads']}],
    creds:['Pixel ID','Conversions API Access Token'], features:['Purchase tracking','Add to cart events','Custom audiences','Dynamic product ads','Conversions API'], tags:['Free','Facebook','Instagram','Ads'] },
  { id:'cs-freshdesk', cat:'Customer Support', name:'Freshdesk', emoji:'🎧', color:'#00b388', tagline:'Customer support helpdesk', desc:'Manage customer queries from email, WhatsApp, chat in one unified inbox.', rating:4.5, reviews:1102,
    pricing:[{id:'free',name:'Free',price:0,features:['10 agents','Email tickets','Basic reports']},{id:'growth',name:'Growth',price:1499,features:['Unlimited agents','WhatsApp + Chat','Automations','SLA management'],popular:true}],
    creds:['API Key','Domain (subdomain.freshdesk.com)'], features:['Unified inbox','WhatsApp integration','Ticket automation','CSAT surveys','Knowledge base'], tags:['Helpdesk','WhatsApp','Chat'] },
  { id:'th-sitesellr-ecom-luxe', cat:'Theme', name:'Sitesellr Ecom Luxe', emoji:'🎨', color:'#E8650A', tagline:'Complete India-ready ecommerce storefront theme', desc:'Landing, PDP, cart, checkout, auth, and customer dashboard theme pack with saffron-teal premium styling.', rating:4.9, reviews:142,
    pricing:[{id:'free',name:'Free',price:0,features:['Theme preview','Read-only demo pages']},{id:'growth',name:'Growth',price:1499,features:['Full theme usage','Brand color controls','Page-level theme settings'],popular:true},{id:'pro',name:'Pro',price:2499,features:['Everything in Growth','Advanced layout variants','Priority theme updates']}],
    creds:['Theme License Key'], features:['Home + PLP + PDP','Cart + Checkout','Login + Signup','Customer dashboard pages','Color-token branding support'], tags:['Theme','Ecommerce','India','Checkout'], featured:true },
];

const CATEGORIES = ['All','Payment Gateway','Shipping','Email & Marketing','Analytics','Customer Support','Theme'];
const CAT_ICONS = { 'Payment Gateway':'💳','Shipping':'📦','Email & Marketing':'📣','Analytics':'📊','Customer Support':'🎧','Theme':'🎨' };

const SECTION_TYPES = [
  { type:'announcement', label:'Announcement Bar', emoji:'📢', default:{ text:'🔥 Sale Live! Use code SAVE20 for 20% off · Free shipping above ₹999', bg:'#0f172a', color:'#fff' }},
  { type:'hero', label:'Hero Banner', emoji:'🖼️', default:{ headline:'Discover Indian Craftsmanship', subtext:'Handpicked sarees, kurtas & jewellery from the finest artisans across India.', btnText:'Shop Collection', btnUrl:'#', showSecond:true, secondText:'View Lookbook', bg:'#1e293b' }},
  { type:'cats', label:'Category Grid', emoji:'🗂️', default:{ title:'Shop by Category', items:[{icon:'👗',label:'Sarees'},{icon:'👕',label:'Kurtas'},{icon:'💍',label:'Jewellery'},{icon:'🏠',label:'Home Decor'},{icon:'💄',label:'Beauty'},{icon:'👟',label:'Footwear'}] }},
  { type:'products', label:'Featured Products', emoji:'🛍️', default:{ title:'Featured Products', cols:4, items:[{name:'Kanjivaram Silk Saree',price:'₹4,999',emoji:'👗'},{name:'Brass Diya Set',price:'₹899',emoji:'🪔'},{name:'Cotton Kurta',price:'₹1,299',emoji:'👕'},{name:'Jute Bag',price:'₹599',emoji:'👜'}] }},
  { type:'banner', label:'Promo Banner', emoji:'🎯', default:{ headline:'Diwali Sale — Up to 70% Off!', subtext:'Shop our biggest festival sale. Limited time.', btnText:'Grab Deals', grad:'#f59e0b,#ef4444' }},
  { type:'trust', label:'Trust Badges', emoji:'🛡️', default:{ items:[{icon:'🚚',label:'Free Delivery above ₹999'},{icon:'🔄',label:'Easy 30-Day Returns'},{icon:'🔒',label:'100% Secure Payments'},{icon:'💳',label:'COD Available'},{icon:'⭐',label:'4.8/5 Customer Rating'}] }},
  { type:'testimonials', label:'Testimonials', emoji:'💬', default:{ title:'Loved by 50,000+ Customers', items:[{text:'"Absolutely love the quality! Will order again."',author:'Priya Sharma',city:'Mumbai',stars:5},{text:'"Fast delivery and beautiful packaging!"',author:'Rahul Verma',city:'Delhi',stars:5},{text:'"Perfect gift for my mom!"',author:'Anjali Nair',city:'Bangalore',stars:4}] }},
  { type:'newsletter', label:'Newsletter Signup', emoji:'📧', default:{ headline:'Get Exclusive Offers', subtext:'Join 50,000+ subscribers for deals & offers.', placeholder:'Enter your email', btnText:'Subscribe' }},
  { type:'video', label:'Video Section', emoji:'🎬', default:{ title:'Our Story', ph:'▶' }},
];

const SECTION_SCHEMA = {
  announcement:[{key:'text',label:'Text',type:'text'},{key:'bg',label:'Background',type:'color'},{key:'color',label:'Text Color',type:'color'}],
  hero:[{key:'headline',label:'Headline',type:'text'},{key:'subtext',label:'Subtext',type:'textarea'},{key:'btnText',label:'Button Text',type:'text'},{key:'btnUrl',label:'Button URL',type:'text'},{key:'showSecond',label:'Show 2nd Button',type:'toggle'},{key:'secondText',label:'2nd Button Text',type:'text'},{key:'bg',label:'Background Color',type:'color'}],
  cats:[{key:'title',label:'Section Title',type:'text'}],
  products:[{key:'title',label:'Section Title',type:'text'},{key:'cols',label:'Columns',type:'select',options:['2','3','4']}],
  banner:[{key:'headline',label:'Headline',type:'text'},{key:'subtext',label:'Subtext',type:'text'},{key:'btnText',label:'Button Text',type:'text'}],
  trust:[],
  testimonials:[{key:'title',label:'Section Title',type:'text'}],
  newsletter:[{key:'headline',label:'Headline',type:'text'},{key:'subtext',label:'Subtext',type:'text'},{key:'btnText',label:'Button Text',type:'text'}],
  video:[{key:'title',label:'Title',type:'text'}],
};

// ─── ICONS ───────────────────────────────────────────────────────────────────

const Icon = ({ name, size=15 }) => {
  const icons = {
    dashboard:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    store:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    apps:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
    settings:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0112 2a10 10 0 01-7.07 2.93M4.93 4.93A10 10 0 002 12a10 10 0 002.93 7.07M19.07 19.07A10 10 0 0122 12a10 10 0 00-2.93-7.07"/></svg>,
    revenue:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    users:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    theme:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>,
    x:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    search:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    plus:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    edit:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
    info:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    lock:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    copy:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
    arrow:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    star:<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    logout:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    tag:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    check:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    builder:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
    analytics:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    api:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  };
  return icons[name] || null;
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n) => n === null ? 'Contact Sales' : n === 0 ? 'Free' : `₹${n.toLocaleString('en-IN')}`;
const Stars = ({ r }) => <span className="star-rating">{[1,2,3,4,5].map(i=><span key={i} style={{color:i<=Math.round(r)?'#f59e0b':'#e2e8f0'}}>★</span>)}</span>;

// ─── TOAST ───────────────────────────────────────────────────────────────────
const Toast = ({ toasts }) => (
  <div className="toast-container">
    {toasts.map(t=><div key={t.id} className={`toast ${t.type||''}`}>{t.type==='success'?'✅':t.type==='error'?'❌':t.type==='warning'?'⚠️':'ℹ️'} {t.msg}</div>)}
  </div>
);

// ─── SECTION RENDERER ────────────────────────────────────────────────────────
function SectionRenderer({ sec }) {
  const p = sec.props;
  switch(sec.type) {
    case 'announcement': return <div className="s-ann" style={{background:p.bg,color:p.color}}>{p.text}</div>;
    case 'hero': return (
      <div className="s-hero" style={{background:p.bg}}>
        <h1>{p.headline}</h1><p>{p.subtext}</p>
        <div className="s-hero-cta"><span className="s-hero-btn">{p.btnText}</span>{p.showSecond&&<span className="s-hero-sub">{p.secondText}</span>}</div>
      </div>
    );
    case 'cats': return (
      <div className="s-cats"><h2>{p.title}</h2>
        <div className="s-cat-grid">{(p.items||[]).map((c,i)=><div key={i} className="s-cat-item"><div className="s-cat-icon">{c.icon}</div><div className="s-cat-label">{c.label}</div></div>)}</div>
      </div>
    );
    case 'products': return (
      <div className="s-products"><h2>{p.title}</h2>
        <div className="s-prod-grid" style={{gridTemplateColumns:`repeat(${p.cols||4},1fr)`}}>{(p.items||[]).map((item,i)=><div key={i} className="s-prod-card"><div className="s-prod-img">{item.emoji}</div><div className="s-prod-info"><div className="s-prod-name">{item.name}</div><div className="s-prod-price">{item.price}</div></div></div>)}</div>
      </div>
    );
    case 'banner': return (
      <div className="s-banner" style={{background:`linear-gradient(135deg,${p.grad||'#f59e0b,#ef4444'})`}}>
        <h2>{p.headline}</h2><p>{p.subtext}</p><span className="s-banner-btn">{p.btnText}</span>
      </div>
    );
    case 'trust': return (
      <div className="s-trust">{(p.items||[]).map((t,i)=><div key={i} className="s-trust-item"><span className="s-trust-icon">{t.icon}</span>{t.label}</div>)}</div>
    );
    case 'testimonials': return (
      <div className="s-testi"><h2>{p.title}</h2>
        <div className="s-testi-grid">{(p.items||[]).map((t,i)=><div key={i} className="s-testi-card"><div className="s-testi-stars">{'★'.repeat(t.stars)}</div><div className="s-testi-text">{t.text}</div><div className="s-testi-author">{t.author} · {t.city}</div></div>)}</div>
      </div>
    );
    case 'newsletter': return (
      <div className="s-newsletter"><h2>{p.headline}</h2><p>{p.subtext}</p>
        <div className="s-nl-form"><input className="s-nl-input" placeholder={p.placeholder}/><button className="s-nl-btn">{p.btnText}</button></div>
      </div>
    );
    case 'video': return (
      <div className="s-video"><h2>{p.title}</h2><div className="s-video-ph">{p.ph||'▶'}</div></div>
    );
    default: return <div style={{padding:20,textAlign:'center',color:'var(--muted)'}}>[{sec.type}]</div>;
  }
}

// ─── FIELD RENDERER ──────────────────────────────────────────────────────────
function FieldRenderer({ field, value, onChange }) {
  if(field.type==='text') return <input className="field-input" value={value||''} onChange={e=>onChange(e.target.value)} placeholder={field.label}/>;
  if(field.type==='textarea') return <textarea className="field-input field-textarea" value={value||''} onChange={e=>onChange(e.target.value)}/>;
  if(field.type==='color') return (
    <div className="flex items-center gap-8">
      <input type="color" style={{width:38,height:34,padding:'2px 4px',border:'1px solid var(--border)',borderRadius:5,cursor:'pointer'}} value={value||'#000000'} onChange={e=>onChange(e.target.value)}/>
      <input className="field-input" style={{flex:1}} value={value||''} onChange={e=>onChange(e.target.value)} placeholder="#000000"/>
    </div>
  );
  if(field.type==='toggle') return (
    <div className="flex items-center justify-between" style={{padding:'7px 10px',border:'1.5px solid var(--border)',borderRadius:7}}>
      <span style={{fontSize:13}}>{field.label}</span>
      <button className={`toggle-pill ${value?'on':'off'}`} onClick={()=>onChange(!value)}/>
    </div>
  );
  if(field.type==='select') return (
    <select className="field-input field-select" value={value||field.options[0]} onChange={e=>onChange(e.target.value)}>
      {field.options.map(o=><option key={o}>{o}</option>)}
    </select>
  );
  return null;
}

// ─── THEME SETTINGS ──────────────────────────────────────────────────────────
const DEFAULT_THEME_SETTINGS = { colorPrimary:'#2563eb',colorAccent:'#0f172a',colorSurface:'#f8fafc',colorText:'#1e293b',colorSuccess:'#16a34a',colorWarning:'#d97706',fontHeading:'Plus Jakarta Sans',fontBody:'Plus Jakarta Sans',headerStyle:'fixed',footerStyle:'dark',borderRadius:'10',buttonStyle:'rounded',logoUrl:'',faviconUrl:'' };

function ThemeSettings({ toast, value, onChange, onSave }) {
  const [t, setT] = useState({ ...DEFAULT_THEME_SETTINGS, ...(value || {}) });
  useEffect(() => {
    setT({ ...DEFAULT_THEME_SETTINGS, ...(value || {}) });
  }, [value]);
  const set = (k,v) => setT(prev=>({...prev,[k]:v}));
  useEffect(() => {
    if (onChange) onChange(t);
  }, [t, onChange]);
  const fonts = ['Plus Jakarta Sans','Poppins','Nunito','Playfair Display','Merriweather','Lato','Raleway','Josefin Sans'];
  return (
    <div style={{padding:14,overflowY:'auto',height:'100%'}}>
      <div className="flex items-center justify-between mb-16">
        <div style={{fontWeight:800,fontSize:14}}>Theme Settings</div>
        <button className="btn btn-primary btn-sm" onClick={()=>{ if (onSave) onSave(); else toast('Theme saved!','success'); }}>Save</button>
      </div>
      <div className="theme-token-section">
        <div className="token-section-title">Logo & Identity</div>
        <div className="field-group"><label className="field-label">Logo URL</label><input className="field-input" placeholder="https://cdn.yourstore.com/logo.png" value={t.logoUrl} onChange={e=>set('logoUrl',e.target.value)}/></div>
        <div className="field-group"><label className="field-label">Favicon URL</label><input className="field-input" placeholder="https://cdn.yourstore.com/favicon.ico" value={t.faviconUrl} onChange={e=>set('faviconUrl',e.target.value)}/></div>
      </div>
      <div className="theme-token-section">
        <div className="token-section-title">Brand Colors</div>
        {[['colorPrimary','Primary'],['colorAccent','Accent / Dark'],['colorSurface','Background'],['colorText','Body Text'],['colorSuccess','Success'],['colorWarning','Warning']].map(([k,label])=>(
          <div key={k} className="color-swatch">
            <div className="color-preview" style={{background:t[k]}}/>
            <span style={{fontSize:12.5,fontWeight:500,flex:1}}>{label}</span>
            <input type="color" style={{width:30,height:26,padding:2,border:'1px solid var(--border)',borderRadius:4,cursor:'pointer'}} value={t[k]} onChange={e=>set(k,e.target.value)}/>
            <input className="field-input" style={{width:84,fontSize:11.5,padding:'3px 7px'}} value={t[k]} onChange={e=>set(k,e.target.value)}/>
          </div>
        ))}
      </div>
      <div className="theme-token-section">
        <div className="token-section-title">Typography</div>
        {[['fontHeading','Heading Font'],['fontBody','Body Font']].map(([k,label])=>(
          <div className="field-group" key={k}>
            <label className="field-label">{label}</label>
            <div className="font-preview-box" style={{fontFamily:t[k]}}>Your Store — Aa Bb 123</div>
            <select className="field-input field-select" value={t[k]} onChange={e=>set(k,e.target.value)}>{fonts.map(f=><option key={f}>{f}</option>)}</select>
          </div>
        ))}
      </div>
      <div className="theme-token-section">
        <div className="token-section-title">Layout & Style</div>
        <div className="field-group"><label className="field-label">Header</label>
          <select className="field-input field-select" value={t.headerStyle} onChange={e=>set('headerStyle',e.target.value)}><option value="fixed">Fixed (sticky)</option><option value="static">Static</option><option value="transparent">Transparent hero</option></select>
        </div>
        <div className="field-group"><label className="field-label">Footer</label>
          <select className="field-input field-select" value={t.footerStyle} onChange={e=>set('footerStyle',e.target.value)}><option value="dark">Dark</option><option value="light">Light</option><option value="minimal">Minimal</option></select>
        </div>
        <div className="field-group"><label className="field-label">Border Radius: {t.borderRadius}px</label>
          <input type="range" style={{width:'100%'}} min={0} max={20} value={t.borderRadius} onChange={e=>set('borderRadius',e.target.value)}/>
        </div>
        <div className="field-group"><label className="field-label">Button Style</label>
          <select className="field-input field-select" value={t.buttonStyle} onChange={e=>set('buttonStyle',e.target.value)}><option value="rounded">Rounded</option><option value="pill">Pill</option><option value="sharp">Sharp</option></select>
        </div>
      </div>
    </div>
  );
}

// ─── NAVIGATION BUILDER ──────────────────────────────────────────────────────
function NavBuilder({ toast }) {
  const [menus, setMenus] = useState({
    main:[{id:1,label:'Home',type:'page',url:'/',children:[]},{id:2,label:'Shop',type:'collection',url:'/collections',children:[{id:21,label:'Sarees',url:'/collections/sarees'},{id:22,label:'Kurtas',url:'/collections/kurtas'}]},{id:3,label:'About Us',type:'page',url:'/pages/about',children:[]},{id:4,label:'Contact',type:'page',url:'/pages/contact',children:[]}],
    footer1:[{id:5,label:'About Us',type:'page',url:'/pages/about',children:[]},{id:6,label:'FAQ',type:'page',url:'/pages/faq',children:[]}],
    footer2:[{id:7,label:'Privacy Policy',type:'page',url:'/pages/privacy',children:[]},{id:8,label:'Return Policy',type:'page',url:'/pages/returns',children:[]}],
  });
  const [active, setActive] = useState('main');
  const [modal, setModal] = useState(null);
  const [item, setItem] = useState({label:'',type:'page',url:''});
  const typeColors = {page:'#eff6ff',collection:'#f0fdf4',url:'#fffbeb'};
  const typeText = {page:'#1d4ed8',collection:'#15803d',url:'#92400e'};
  const addItem = (parentId=null) => {
    const n = {id:Date.now(),...item,children:[]};
    setMenus(prev=>{
      const updated = prev[active].map(m=>parentId&&m.id===parentId?{...m,children:[...m.children,{id:n.id,label:n.label,url:n.url}]}:m);
      return {...prev,[active]:parentId?updated:[...updated,n]};
    });
    setModal(null); setItem({label:'',type:'page',url:''});
    toast('Menu item added','success');
  };
  const removeItem = (id,parentId=null) => {
    setMenus(prev=>{
      if(!parentId) return {...prev,[active]:prev[active].filter(m=>m.id!==id)};
      return {...prev,[active]:prev[active].map(m=>m.id===parentId?{...m,children:m.children.filter(c=>c.id!==id)}:m)};
    });
  };
  return (
    <div style={{padding:14}}>
      <div className="flex items-center justify-between mb-16">
        <div style={{fontWeight:800,fontSize:14}}>Navigation Builder</div>
        <button className="btn btn-primary btn-sm" onClick={()=>toast('Navigation saved!','success')}>Save</button>
      </div>
      <div className="tabs mb-16">
        {[{id:'main',label:'Main Menu'},{id:'footer1',label:'Footer 1'},{id:'footer2',label:'Footer 2'}].map(m=><button key={m.id} className={`tab ${active===m.id?'active':''}`} onClick={()=>setActive(m.id)}>{m.label}</button>)}
      </div>
      <div className="nav-tree">
        {(menus[active]||[]).map(it=>(
          <div key={it.id} className="nav-node">
            <div className="nav-node-row">
              <span className="nav-drag">⠿</span>
              <span className="nav-node-label">{it.label}</span>
              <span className="nav-type-chip" style={{background:typeColors[it.type],color:typeText[it.type]}}>{it.type}</span>
              <button style={{border:'none',background:'none',cursor:'pointer',color:'var(--muted)',padding:'2px 4px'}} onClick={()=>setModal({type:'child',parentId:it.id})}>+</button>
              <button style={{border:'none',background:'none',cursor:'pointer',color:'var(--danger)',padding:'2px 4px'}} onClick={()=>removeItem(it.id)}>×</button>
            </div>
            {it.children?.length>0&&<div className="nav-children">{it.children.map(ch=><div key={ch.id} className="nav-child"><span style={{fontSize:11,color:'var(--light)',marginRight:4}}>└</span><span style={{flex:1,fontSize:12.5,fontWeight:600}}>{ch.label}</span><span style={{fontSize:11.5,color:'var(--muted)'}}>{ch.url}</span><button style={{border:'none',background:'none',cursor:'pointer',color:'var(--danger)',marginLeft:7}} onClick={()=>removeItem(ch.id,it.id)}>×</button></div>)}</div>}
          </div>
        ))}
        <div className="nav-add" onClick={()=>setModal({type:'top'})}>+ Add Menu Item</div>
      </div>
      {modal&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}><div className="modal"><div className="modal-header"><div className="modal-title">Add {modal.type==='child'?'Sub-item':'Menu Item'}</div><button className="modal-close" onClick={()=>setModal(null)}><Icon name="x" size={14}/></button></div><div className="modal-body"><div className="form-group"><label className="form-label">Label</label><input className="form-input" placeholder="e.g. Sarees" value={item.label} onChange={e=>setItem({...item,label:e.target.value})}/></div><div className="form-group"><label className="form-label">Type</label><select className="form-input form-select" value={item.type} onChange={e=>setItem({...item,type:e.target.value})}><option value="page">Page</option><option value="collection">Collection</option><option value="url">Custom URL</option></select></div><div className="form-group"><label className="form-label">URL</label><input className="form-input" placeholder="/pages/about" value={item.url} onChange={e=>setItem({...item,url:e.target.value})}/></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={()=>addItem(modal.parentId)}>Add Item</button></div></div></div>}
    </div>
  );
}

// ─── STATIC PAGE EDITOR ──────────────────────────────────────────────────────
function PageEditor({ toast }) {
  const [pages, setPages] = useState([
    {id:1,title:'About Us',slug:'about',status:'published',body:'<p>Welcome to our store. We are passionate about bringing you the best products at the best prices.</p><h2>Our Mission</h2><p>To make quality products accessible to everyone across India.</p>'},
    {id:2,title:'Contact Us',slug:'contact',status:'published',body:'<p>Get in touch with us for any queries.</p>'},
    {id:3,title:'Privacy Policy',slug:'privacy',status:'published',body:'<p>Your privacy matters to us.</p>'},
    {id:4,title:'Return Policy',slug:'returns',status:'draft',body:'<p>We offer 30-day easy returns on all products.</p>'},
    {id:5,title:'Shipping Info',slug:'shipping',status:'published',body:'<p>We deliver across India within 3-7 business days.</p>'},
  ]);
  const [sel, setSel] = useState(pages[0]);
  const [seo, setSeo] = useState(false);
  const [newPage, setNewPage] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const update = (k,v) => { const u={...sel,[k]:v}; setSel(u); setPages(p=>p.map(x=>x.id===u.id?u:x)); };
  const statusColors = {published:'var(--success)',draft:'var(--warning)',hidden:'var(--light)'};
  return (
    <div style={{display:'grid',gridTemplateColumns:'220px 1fr',height:'calc(100vh - 52px)'}}>
      <div style={{borderRight:'1px solid var(--border)',padding:10,display:'flex',flexDirection:'column',gap:4,overflowY:'auto'}}>
        <div className="flex items-center justify-between" style={{padding:'4px 4px 8px'}}>
          <span style={{fontSize:10.5,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'1px'}}>Pages</span>
          <button className="btn btn-primary btn-sm" onClick={()=>setNewPage(true)}>+</button>
        </div>
        {pages.map(p=><div key={p.id} className={`page-list-item ${sel?.id===p.id?'active':''}`} onClick={()=>setSel(p)}><div className="page-status-dot" style={{background:statusColors[p.status]}}/><div><div style={{fontSize:13,fontWeight:600}}>{p.title}</div><div style={{fontSize:11,color:'var(--muted)'}}>/{p.slug}</div></div></div>)}
      </div>
      {sel&&<div style={{padding:20,display:'flex',flexDirection:'column',gap:14,overflowY:'auto'}}>
        <div className="flex items-center justify-between flex-wrap gap-8">
          <input style={{flex:1,fontSize:17,fontWeight:800,border:'none',outline:'none',maxWidth:380,fontFamily:'inherit',padding:'3px 0',color:'var(--text)'}} value={sel.title} onChange={e=>update('title',e.target.value)}/>
          <div className="flex gap-8 items-center">
            <select className="form-input form-select" style={{width:'auto'}} value={sel.status} onChange={e=>update('status',e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option></select>
            <button className="btn btn-outline btn-sm" onClick={()=>setSeo(true)}>SEO</button>
            <button className="btn btn-primary btn-sm" onClick={()=>{update('status','published');toast('Page published','success');}}>Publish</button>
          </div>
        </div>
        <div style={{fontSize:11.5,color:'var(--muted)'}}>URL: yourstore.com/pages/{sel.slug}</div>
        <div className="wysiwyg">
          <div className="wysiwyg-toolbar">{['B','I','U','H1','H2','H3','Quote','Link','Bullet','Number'].map(f=><button key={f} className="wysiwyg-btn" onClick={()=>toast(`Format: ${f}`)}>{f}</button>)}</div>
          <div className="wysiwyg-content" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{__html:sel.body}} onBlur={e=>update('body',e.currentTarget.innerHTML)}/>
        </div>
      </div>}
      {seo&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setSeo(false)}><div className="modal"><div className="modal-header"><div><div className="modal-title">SEO Settings</div><div className="modal-sub">{sel?.title}</div></div><button className="modal-close" onClick={()=>setSeo(false)}><Icon name="x" size={14}/></button></div><div className="modal-body"><div className="form-group"><label className="form-label">Meta Title</label><input className="form-input" placeholder="Page title for search engines" defaultValue={sel?.title}/><div className="form-hint">Recommended: 50–60 chars</div></div><div className="form-group"><label className="form-label">Meta Description</label><textarea className="form-input" rows="3" placeholder="Brief description (150–160 chars)" style={{resize:'vertical'}}/></div><div className="form-group"><label className="form-label">URL Slug</label><div className="flex items-center" style={{gap:0}}><span style={{padding:'8px 9px',background:'var(--surface2)',border:'1.5px solid var(--border)',borderRight:'none',borderRadius:'6px 0 0 6px',fontSize:11.5,color:'var(--muted)',whiteSpace:'nowrap'}}>/pages/</span><input className="form-input" style={{borderRadius:'0 6px 6px 0'}} value={sel?.slug} onChange={e=>update('slug',e.target.value)}/></div></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setSeo(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>{toast('SEO saved','success');setSeo(false);}}>Save SEO</button></div></div></div>}
      {newPage&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setNewPage(false)}><div className="modal"><div className="modal-header"><div className="modal-title">Create New Page</div><button className="modal-close" onClick={()=>setNewPage(false)}><Icon name="x" size={14}/></button></div><div className="modal-body"><div className="form-group"><label className="form-label">Page Title</label><input className="form-input" autoFocus placeholder="e.g. About Us" value={newTitle} onChange={e=>setNewTitle(e.target.value)}/>{newTitle&&<div className="form-hint">URL: /pages/{newTitle.toLowerCase().replace(/\s+/g,'-')}</div>}</div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setNewPage(false)}>Cancel</button><button className="btn btn-primary" disabled={!newTitle.trim()} onClick={()=>{const pg={id:Date.now(),title:newTitle,slug:newTitle.toLowerCase().replace(/\s+/g,'-'),status:'draft',body:''};setPages(p=>[...p,pg]);setSel(pg);setNewPage(false);setNewTitle('');toast('Page created','success');}}>Create</button></div></div></div>}
    </div>
  );
}

// ─── VERSION PANEL ───────────────────────────────────────────────────────────
function VersionPanel({ onClose, toast, versions, onRestore, loading, error }) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header"><div className="modal-title">Version History</div><button className="modal-close" onClick={onClose}><Icon name="x" size={14}/></button></div>
        <div className="modal-body">
          {loading && <div style={{color:'var(--muted)',fontSize:13}}>Loading versions...</div>}
          {!loading && versions.length === 0 && <div style={{color:'var(--muted)',fontSize:13}}>No versions yet.</div>}
          {!loading && versions.map(v=><div key={v.v} className={`version-item ${v.live?'live':''}`}><div className="v-num">v{v.v}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{v.label}</div><div style={{fontSize:11.5,color:'var(--muted)'}}>{v.date} · {v.sections} sections</div></div>{v.live?<span className="badge badge-success">LIVE</span>:<button className="btn btn-outline btn-sm" onClick={()=>onRestore(v.v)}>Restore</button>}</div>)}
          {error && <div style={{marginTop:10,color:'var(--danger)',fontSize:12.5}}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── THEME BUILDER ───────────────────────────────────────────────────────────
function ThemeBuilder({ toast, storeId }) {
  const [mode, setMode] = useState('builder');
  const [device, setDevice] = useState('desktop');
  const [sections, setSections] = useState([
    {id:'s1',type:'announcement',props:{text:'🔥 Grand Sale! Use code SAVE20 for 20% off · Free shipping above ₹999',bg:'#0f172a',color:'#fff'}},
    {id:'s2',type:'hero',props:{headline:'Discover Indian Craftsmanship',subtext:'Handpicked sarees, kurtas & jewellery from the finest artisans across India.',btnText:'Shop Collection',btnUrl:'#',showSecond:true,secondText:'View Lookbook',bg:'#1e293b'}},
    {id:'s3',type:'trust',props:{items:[{icon:'🚚',label:'Free Delivery above ₹999'},{icon:'🔄',label:'30-Day Easy Returns'},{icon:'🔒',label:'Secure Payments'},{icon:'💳',label:'COD Available'},{icon:'⭐',label:'4.8/5 Rating'}]}},
    {id:'s4',type:'cats',props:{title:'Shop by Category',items:[{icon:'👗',label:'Sarees'},{icon:'👕',label:'Kurtas'},{icon:'💍',label:'Jewellery'},{icon:'🏠',label:'Home Decor'},{icon:'💄',label:'Beauty'},{icon:'👟',label:'Footwear'}]}},
    {id:'s5',type:'products',props:{title:'Featured Products',cols:4,items:[{name:'Kanjivaram Silk Saree',price:'₹4,999',emoji:'👗'},{name:'Brass Diya Set',price:'₹899',emoji:'🪔'},{name:'Cotton Kurta',price:'₹1,299',emoji:'👕'},{name:'Jute Bag',price:'₹599',emoji:'👜'}]}},
    {id:'s6',type:'banner',props:{headline:'Diwali Sale — Up to 70% Off!',subtext:'Biggest festival sale of the year!',btnText:'Shop Now',grad:'#f59e0b,#ef4444'}},
    {id:'s7',type:'testimonials',props:{title:'Loved by 50,000+ Customers',items:[{text:'"Quality is amazing! Will order again."',author:'Priya S.',city:'Mumbai',stars:5},{text:'"Super fast delivery!"',author:'Rahul V.',city:'Delhi',stars:5},{text:'"My go-to store for festive shopping."',author:'Anjali N.',city:'Bangalore',stars:5}]}},
    {id:'s8',type:'newsletter',props:{headline:'Get Exclusive Offers',subtext:'Join 50,000+ subscribers for deals & festival offers.',placeholder:'Enter your email',btnText:'Subscribe'}},
  ]);
  const [selId, setSelId] = useState('s2');
  const [isDraft, setIsDraft] = useState(true);
  const [showVersions, setShowVersions] = useState(false);
  const [rightTab, setRightTab] = useState('section');
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [themeSettings, setThemeSettings] = useState(DEFAULT_THEME_SETTINGS);
  const [saveBusy, setSaveBusy] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [themeCatalog, setThemeCatalog] = useState([]);
  const [activeThemeId, setActiveThemeId] = useState("");
  const [activeThemeName, setActiveThemeName] = useState("Default Theme");

  const loadTheme = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await api.get(`/stores/${storeId}/theme`);
      const payload = res.data || {};
      const incomingSections = Array.isArray(payload.sections) ? payload.sections : [];
      if (incomingSections.length > 0) {
        setSections(incomingSections.map((s, idx) => ({
          id: String(s.id || `s${Date.now()}${idx}`),
          type: s.type || "hero",
          props: s.props || {},
        })));
        setSelId(String(incomingSections[0]?.id || "s2"));
        setIsDraft(false);
      }
      if (payload.settings && typeof payload.settings === "object") {
        setThemeSettings((prev) => ({ ...prev, ...payload.settings }));
      }
      if (payload.activeThemeId) setActiveThemeId(String(payload.activeThemeId));
      if (payload.activeTheme?.name) setActiveThemeName(String(payload.activeTheme.name));
      setError("");
    } catch (err) {
      setError(toErrorText(err, "Could not load theme data."));
    }
  }, [storeId]);

  const loadThemeCatalog = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await api.get(`/stores/${storeId}/themes`);
      const payload = res.data || {};
      const themes = Array.isArray(payload.themes) ? payload.themes : [];
      setThemeCatalog(themes);
      if (payload.activeThemeId) {
        setActiveThemeId(String(payload.activeThemeId));
        const matched = themes.find((t) => String(t.id) === String(payload.activeThemeId));
        if (matched?.name) setActiveThemeName(matched.name);
      }
    } catch (err) {
      setError(toErrorText(err, "Could not load theme catalog."));
    }
  }, [storeId]);

  const loadVersions = useCallback(async () => {
    if (!storeId) return;
    try {
      setVersionsLoading(true);
      const res = await api.get(`/stores/${storeId}/theme/versions`);
      const rows = Array.isArray(res.data) ? res.data : [];
      setVersions(rows.map((v) => ({
        v: Number(v.version),
        date: v.createdAt ? new Date(v.createdAt).toLocaleString() : "-",
        label: v.versionType === "published" ? "Published" : "Draft",
        sections: 0,
        live: String(v.versionType).toLowerCase() === "published",
      })));
      setError("");
    } catch (err) {
      setError(toErrorText(err, "Could not load version history."));
    } finally {
      setVersionsLoading(false);
    }
  }, [storeId]);

  const saveDraft = useCallback(async (notify = true) => {
    if (!storeId) {
      setError("Store is not selected.");
      return false;
    }
    try {
      setSaveBusy(true);
      await api.put(`/stores/${storeId}/theme`, {
        sectionsJson: JSON.stringify(sections),
        settingsJson: JSON.stringify(themeSettings),
      });
      setIsDraft(false);
      setError("");
      if (notify) toast("Theme draft saved.", "success");
      return true;
    } catch (err) {
      const message = toErrorText(err, "Could not save theme.");
      setError(message);
      toast(message, "error");
      return false;
    } finally {
      setSaveBusy(false);
    }
  }, [storeId, sections, themeSettings, toast]);

  const publishTheme = useCallback(async () => {
    const ok = await saveDraft(false);
    if (!ok || !storeId) return;
    try {
      setSaveBusy(true);
      await api.post(`/stores/${storeId}/theme/publish`);
      setIsDraft(false);
      toast("Layout published!", "success");
      await loadVersions();
    } catch (err) {
      const message = toErrorText(err, "Could not publish theme.");
      setError(message);
      toast(message, "error");
    } finally {
      setSaveBusy(false);
    }
  }, [saveDraft, storeId, toast, loadVersions]);

  const restoreVersion = useCallback(async (version) => {
    if (!storeId) return;
    try {
      await api.post(`/stores/${storeId}/theme/versions/${version}/restore`);
      await loadTheme();
      setShowVersions(false);
      toast(`Rolled back to v${version}`, "success");
    } catch (err) {
      const message = toErrorText(err, "Could not restore version.");
      setError(message);
      toast(message, "error");
    }
  }, [storeId, loadTheme, toast]);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  useEffect(() => {
    loadThemeCatalog();
  }, [loadThemeCatalog]);

  useEffect(() => {
    if (!showVersions) return;
    loadVersions();
  }, [showVersions, loadVersions]);

  const setActiveTheme = useCallback(async (themeId) => {
    if (!storeId || !themeId) return;
    try {
      setSaveBusy(true);
      await saveDraft(false);
      await api.put(`/stores/${storeId}/theme/active`, { themeId });
      const selected = themeCatalog.find((t) => String(t.id) === String(themeId));
      setActiveThemeId(String(themeId));
      if (selected?.name) setActiveThemeName(selected.name);
      await loadTheme();
      await loadVersions();
      toast(`Active theme changed to ${selected?.name || "selected theme"}.`, "success");
    } catch (err) {
      const apiError = err?.response?.data?.error;
      const requiredPlans = err?.response?.data?.details?.requiredPlans;
      const message = apiError === "theme_plan_upgrade_required"
        ? `Upgrade required to activate this theme${Array.isArray(requiredPlans) && requiredPlans.length ? ` (${requiredPlans.join(", ")})` : ""}.`
        : toErrorText(err, "Could not switch active theme.");
      setError(message);
      toast(message, "error");
    } finally {
      setSaveBusy(false);
    }
  }, [storeId, themeCatalog, loadTheme, loadVersions, saveDraft, toast]);

  const addSection = (type) => {
    const def = SECTION_TYPES.find(s=>s.type===type);
    const n = {id:`s${Date.now()}`,type,props:{...def.default}};
    setSections(p=>[...p,n]); setSelId(n.id);
    setIsDraft(true);
    toast(`${def.label} added`,'success');
  };
  const removeSection = (id) => { setSections(p=>p.filter(s=>s.id!==id)); if(selId===id) setSelId(null); setIsDraft(true); toast('Section removed'); };
  const duplicateSection = (id) => {
    const sec = sections.find(s=>s.id===id);
    const dup = {...sec,id:`s${Date.now()}`,props:{...sec.props}};
    setSections(p=>{const idx=p.findIndex(s=>s.id===id);const n=[...p];n.splice(idx+1,0,dup);return n;});
    setSelId(dup.id); setIsDraft(true); toast('Section duplicated','success');
  };
  const moveSection = (id,dir) => {
    setSections(p=>{const idx=p.findIndex(s=>s.id===id);if((dir==='up'&&idx===0)||(dir==='down'&&idx===p.length-1)) return p;const n=[...p];[n[idx],n[dir==='up'?idx-1:idx+1]]=[n[dir==='up'?idx-1:idx+1],n[idx]];return n;});
    setIsDraft(true);
  };
  const updateProp = (id,key,val) => { setSections(p=>p.map(s=>s.id===id?{...s,props:{...s.props,[key]:val}}:s)); setIsDraft(true); };

  const selSec = sections.find(s=>s.id===selId);
  const selDef = SECTION_TYPES.find(t=>t.type===selSec?.type);
  const schema = SECTION_SCHEMA[selSec?.type]||[];

  const onDragStart = (id) => setDragId(id);
  const onDragOver = (e,id) => { e.preventDefault(); setDragOver(id); };
  const onDrop = (e,targetId) => {
    e.preventDefault();
    if(!dragId||dragId===targetId){setDragId(null);setDragOver(null);return;}
    setSections(prev=>{const arr=[...prev];const from=arr.findIndex(s=>s.id===dragId);const to=arr.findIndex(s=>s.id===targetId);const [item]=arr.splice(from,1);arr.splice(to,0,item);return arr;});
    setDragId(null); setDragOver(null);
  };
  const onPaletteDragStart = (e,type) => e.dataTransfer.setData('section-type',type);
  const onCanvasDrop = (e) => { e.preventDefault(); const type=e.dataTransfer.getData('section-type'); if(type) addSection(type); };

  const MODES = [{id:'builder',icon:'🏗️',label:'Builder'},{id:'navigation',icon:'🔗',label:'Navigation'},{id:'pages',icon:'📄',label:'Pages'},{id:'theme-settings',icon:'🎨',label:'Theme'}];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 56px)'}}>
      {/* Mode bar */}
      <div style={{background:'var(--accent)',display:'flex',alignItems:'center',padding:'0 14px',gap:8,height:48,flexShrink:0}}>
        <div style={{fontWeight:800,color:'#fff',fontSize:14,marginRight:4}}>Sitesellr</div>
        <div style={{width:1,height:18,background:'rgba(255,255,255,.15)'}}/>
        <div style={{fontSize:11.5,color:'#94a3b8',fontWeight:500}}>Krishna Textiles · {activeThemeName}</div>
        <div style={{width:1,height:18,background:'rgba(255,255,255,.15)'}}/>
        {MODES.map(m=><button key={m.id} onClick={()=>setMode(m.id)} style={{padding:'5px 10px',borderRadius:6,border:'none',background:mode===m.id?'rgba(255,255,255,.18)':'transparent',cursor:'pointer',color:mode===m.id?'#fff':'#94a3b8',fontSize:12,fontFamily:'inherit',fontWeight:600}}>{m.icon} {m.label}</button>)}
        <div style={{flex:1}}/>
        {mode==='builder' && (
          <select
            value={activeThemeId}
            onChange={(e)=>setActiveTheme(e.target.value)}
            style={{height:30,padding:'4px 10px',borderRadius:7,border:'1px solid rgba(255,255,255,.2)',background:'rgba(15,23,42,.5)',color:'#e2e8f0',fontSize:12,fontFamily:'inherit',minWidth:220}}
            disabled={!storeId || saveBusy}
          >
            <option value="" style={{color:'#0f172a'}}>Select Active Theme</option>
            {themeCatalog.map((t)=><option key={t.id} value={t.id} style={{color:'#0f172a'}}>{t.name} · {t.category}</option>)}
          </select>
        )}
        {mode==='builder'&&<>
          <div style={{display:'flex',gap:3,background:'rgba(255,255,255,.08)',borderRadius:7,padding:'3px'}}>
            {[{id:'desktop',icon:'🖥'},{id:'tablet',icon:'📱'},{id:'mobile',icon:'📲'}].map(d=><button key={d.id} onClick={()=>setDevice(d.id)} style={{padding:'4px 9px',borderRadius:5,border:'none',background:device===d.id?'rgba(255,255,255,.18)':'transparent',cursor:'pointer',color:device===d.id?'#fff':'#94a3b8',fontSize:11,fontFamily:'inherit'}}>{d.icon}</button>)}
          </div>
          <button className="btn btn-ghost btn-sm" style={{color:'#94a3b8',border:'1px solid rgba(255,255,255,.15)'}} onClick={()=>setShowVersions(true)} disabled={!storeId}>📋 History</button>
          <button className="btn btn-ghost btn-sm" style={{color:'#94a3b8',border:'1px solid rgba(255,255,255,.15)'}} onClick={()=>saveDraft(true)} disabled={!storeId||saveBusy}>💾 Save</button>
        </>}
        <div style={{fontSize:11,color:'#94a3b8'}}>{isDraft?<><span style={{color:'#f59e0b'}}>●</span> Draft</>:<><span style={{color:'#4ade80'}}>●</span> Live</>}</div>
        {mode==='builder'&&<button className="btn btn-primary btn-sm" onClick={publishTheme} disabled={!storeId||saveBusy}>🚀 Publish</button>}
      </div>

      {mode==='navigation'&&<NavBuilder toast={toast}/>}
      {mode==='pages'&&<PageEditor toast={toast}/>}
      {mode==='theme-settings'&&(
        <div style={{display:'grid',gridTemplateColumns:'300px 1fr',flex:1,overflow:'hidden'}}>
          <div style={{borderRight:'1px solid var(--border)',overflowY:'auto'}}><ThemeSettings toast={toast} value={themeSettings} onChange={(next)=>{setThemeSettings(next);setIsDraft(true);}} onSave={()=>saveDraft(true)}/></div>
          <div style={{padding:36,background:'var(--surface2)',overflowY:'auto'}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:16}}>Live Preview</div>
            <div style={{background:'#fff',borderRadius:14,boxShadow:'0 20px 60px rgba(0,0,0,.14)',maxWidth:680,overflow:'hidden'}}>
              <SectionRenderer sec={{type:'announcement',props:{text:'🔥 Sale! Free shipping above ₹999',bg:'#0f172a',color:'#fff'}}}/>
              <SectionRenderer sec={{type:'hero',props:{headline:'Your Brand Here',subtext:'Custom colors, fonts & style applied live.',btnText:'Shop Now',showSecond:false,bg:'#1e293b'}}}/>
              <SectionRenderer sec={{type:'trust',props:{items:[{icon:'🚚',label:'Free Delivery'},{icon:'🔒',label:'Secure Pay'},{icon:'🔄',label:'Easy Returns'}]}}}/>
            </div>
          </div>
        </div>
      )}

      {mode==='builder'&&(
        <div className="builder-layout" style={{flex:1,overflow:'hidden'}}>
          {/* LEFT: Palette + Order */}
          <div className="builder-panel">
            <div className="builder-panel-header"><div className="builder-panel-title">Sections — Click or Drag</div></div>
            <div className="builder-panel-scroll">
              <div style={{marginBottom:10}}>
                {SECTION_TYPES.map(s=><div key={s.type} className="palette-item" draggable onDragStart={e=>onPaletteDragStart(e,s.type)} onClick={()=>addSection(s.type)}><span className="palette-emoji">{s.emoji}</span><span className="palette-label">{s.label}</span></div>)}
              </div>
              <div style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
              <div style={{fontSize:10.5,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:7}}>Section Order</div>
              {sections.map((sec,i)=>{
                const def=SECTION_TYPES.find(t=>t.type===sec.type);
                return <div key={sec.id} className={`order-item ${selId===sec.id?'active':''}`} onClick={()=>setSelId(sec.id)}>
                  <span style={{fontSize:13}}>{def?.emoji}</span>
                  <span style={{fontSize:11.5,fontWeight:600,flex:1,color:selId===sec.id?'var(--primary)':'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{def?.label}</span>
                  <div style={{display:'flex',gap:1}}>
                    <button style={{border:'none',background:'none',cursor:'pointer',color:'var(--muted)',fontSize:11,padding:'1px 3px'}} onClick={e=>{e.stopPropagation();moveSection(sec.id,'up')}} disabled={i===0}>↑</button>
                    <button style={{border:'none',background:'none',cursor:'pointer',color:'var(--muted)',fontSize:11,padding:'1px 3px'}} onClick={e=>{e.stopPropagation();moveSection(sec.id,'down')}} disabled={i===sections.length-1}>↓</button>
                  </div>
                </div>;
              })}
            </div>
          </div>

          {/* CENTER: Canvas */}
          <div className="canvas-wrap">
            <div className="canvas-outer" onDrop={onCanvasDrop} onDragOver={e=>e.preventDefault()}>
              <div className={`canvas-frame ${device}`}>
                {sections.length===0&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:300,border:'2px dashed var(--border-strong)',margin:20,borderRadius:'var(--r)',color:'var(--muted)',gap:8}}><div style={{fontSize:36}}>🖼️</div><div style={{fontWeight:700}}>Canvas is empty</div><div style={{fontSize:12}}>Click sections from the left or drag to add</div></div>}
                {sections.map(sec=>(
                  <div key={sec.id}
                    className={`section-card ${selId===sec.id?'selected':''} ${dragId===sec.id?'dragging':''} ${dragOver===sec.id?'drag-over':''}`}
                    onClick={()=>setSelId(sec.id)}
                    draggable onDragStart={()=>onDragStart(sec.id)} onDragOver={e=>onDragOver(e,sec.id)} onDrop={e=>onDrop(e,sec.id)} onDragEnd={()=>{setDragId(null);setDragOver(null);}}>
                    <div className="sec-label-badge">{SECTION_TYPES.find(t=>t.type===sec.type)?.label}</div>
                    <div className="section-actions">
                      <button className="sec-action-btn sa-dup" title="Duplicate" onClick={e=>{e.stopPropagation();duplicateSection(sec.id);}}>⧉</button>
                      <button className="sec-action-btn sa-del" title="Delete" onClick={e=>{e.stopPropagation();removeSection(sec.id);}}>✕</button>
                    </div>
                    <SectionRenderer sec={sec}/>
                  </div>
                ))}
              </div>
            </div>
            <div className="canvas-bar">
              <span>📐 {device.charAt(0).toUpperCase()+device.slice(1)} Preview</span>
              <span>·</span><span>{sections.length} sections</span>
              <span>·</span><span style={{color:isDraft?'#f59e0b':'#4ade80'}}>{isDraft?'⚠ Unsaved changes':'✓ Live'}</span>
            </div>
          </div>

          {/* RIGHT: Settings */}
          <div className="builder-panel builder-panel-r">
            <div className="builder-panel-header">
              <div className="tabs" style={{margin:0}}>
                <button className={`tab ${rightTab==='section'?'active':''}`} onClick={()=>setRightTab('section')}>Section</button>
                <button className={`tab ${rightTab==='theme'?'active':''}`} onClick={()=>setRightTab('theme')}>Theme</button>
              </div>
            </div>
            {rightTab==='theme'&&<div style={{flex:1,overflowY:'auto'}}><ThemeSettings toast={toast} value={themeSettings} onChange={(next)=>{setThemeSettings(next);setIsDraft(true);}} onSave={()=>saveDraft(true)}/></div>}
            {rightTab==='section'&&(
              <div style={{flex:1,overflowY:'auto'}}>
                {!selSec?<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--muted)',gap:8,padding:20,textAlign:'center'}}><div style={{fontSize:36}}>👆</div><div style={{fontWeight:700,fontSize:14}}>Select a section</div><div style={{fontSize:12}}>Click any section on the canvas to edit its settings</div></div>:(
                  <div style={{padding:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:10}}>
                      <span>{selDef?.emoji}</span>
                      <span style={{fontSize:14,fontWeight:800}}>{selDef?.label}</span>
                      <span style={{fontSize:10,fontWeight:600,color:'var(--muted)',background:'var(--surface2)',padding:'2px 7px',borderRadius:99}}>{selSec.type}</span>
                    </div>
                    <div style={{height:1,background:'var(--border)',marginBottom:12}}/>
                    {schema.length===0&&<div style={{color:'var(--muted)',fontSize:12,padding:'6px 0'}}>No configurable fields for this section.</div>}
                    {schema.map(field=><div key={field.key} className="field-group">{field.type!=='toggle'&&<label className="field-label">{field.label}</label>}<FieldRenderer field={field} value={selSec.props[field.key]} onChange={val=>updateProp(selSec.id,field.key,val)}/></div>)}
                    <div style={{height:1,background:'var(--border)',margin:'12px 0'}}/>
                    <div className="flex gap-6">
                      <button className="btn btn-outline btn-sm" onClick={()=>duplicateSection(selSec.id)}>⧉ Duplicate</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>removeSection(selSec.id)}>✕ Remove</button>
                    </div>
                    <div style={{height:1,background:'var(--border)',margin:'12px 0'}}/>
                    <div style={{fontSize:10.5,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:7}}>Info</div>
                    {[['ID',selSec.id],['Type',selSec.type],['Position',`${sections.findIndex(s=>s.id===selSec.id)+1} of ${sections.length}`]].map(([k,v])=>(
                      <div key={k} className="flex items-center justify-between" style={{padding:'5px 0',borderBottom:'1px solid var(--border)',fontSize:12.5}}><span style={{color:'var(--muted)',fontWeight:500}}>{k}</span><span style={{fontWeight:600,fontFamily:k==='ID'?'JetBrains Mono,monospace':'inherit',fontSize:k==='ID'?11:13}}>{v}</span></div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {error && <div style={{position:'absolute',bottom:14,left:14,color:'var(--danger)',fontSize:12.5,fontWeight:600}}>{error}</div>}
      {showVersions&&<VersionPanel onClose={()=>setShowVersions(false)} toast={toast} versions={versions} onRestore={restoreVersion} loading={versionsLoading} error={error}/>}
    </div>
  );
}

// ─── PURCHASE MODAL ──────────────────────────────────────────────────────────
function PurchaseModal({ app, onClose, onInstall, toast }) {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState(app.pricing?.find(p=>p.popular)||app.pricing?.[0]);
  const [payMethod, setPayMethod] = useState('upi');
  const [creds, setCreds] = useState({});
  const [testMode, setTestMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const isFree = !plan?.price;
  const STEPS = isFree?[{n:1,l:'Plan'},{n:2,l:'Configure'},{n:4,l:'Done'}]:[{n:1,l:'Plan'},{n:3,l:'Payment'},{n:2,l:'Configure'},{n:4,l:'Done'}];

  const validate = () => {
    const e={};
    (app.creds||[]).forEach(c=>{if(!creds[c]||!creds[c].trim())e[c]='Required';});
    setErrors(e); return Object.keys(e).length===0;
  };

  const handleNext = () => {
    if(step===1) setStep(isFree?2:3);
    else if(step===2){if(validate()){setLoading(true);setTimeout(()=>{setLoading(false);setStep(4);},1400);}}
    else if(step===3) setStep(2);
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:3}}>{app.cat} / {app.name}</div><div className="modal-title">{step===4?'🎉 Installation Complete!':`Install ${app.name}`}</div></div>
          <button className="modal-close" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div className="modal-body">
          {step!==4&&<div className="steps mb-16">
            {STEPS.map((s,i)=>{const isActive=s.n===step;const isDone=s.n<step;return (<div key={s.n} style={{display:'flex',alignItems:'center',flex:i<STEPS.length-1?1:'none'}}><div className="step-item"><div className={`step-num ${isDone?'done':isActive?'active':'pending'}`}>{isDone?<Icon name="check" size={11}/>:i+1}</div><span className={`step-label ${isActive?'active':'pending'}`}>{s.l}</span></div>{i<STEPS.length-1&&<div className={`step-connector ${isDone?'done':''}`}/>}</div>);})}
          </div>}

          {step===1&&<div>
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:14}}>Choose a plan. You can upgrade anytime.</p>
            <div className="plan-grid">
              {app.pricing.map(p=><div key={p.id} className={`plan-card ${plan?.id===p.id?'selected':''} ${p.popular?'popular':''}`} onClick={()=>setPlan(p)}>
                <div className="plan-name">{p.name}</div>
                <div className="plan-price">{fmt(p.price)}{p.price>0&&<span style={{fontSize:12,fontWeight:500,color:'var(--muted)'}}>/mo</span>}</div>
                {p.txnFee&&<div style={{fontSize:10.5,color:'var(--muted)',marginTop:3}}>{p.txnFee}</div>}
                <div className="plan-features">{p.features.join(' · ')}</div>
                {plan?.id===p.id&&<div style={{marginTop:8,color:'var(--primary)',fontSize:11.5,fontWeight:700}}>✓ Selected</div>}
              </div>)}
            </div>
            {plan&&<div className="info-box info" style={{marginTop:14}}>
              <Icon name="info" size={15}/><span><strong>{plan.name}</strong> — {plan.price?`Billed ₹${plan.price.toLocaleString('en-IN')}/month.`:'Free to use.'}</span>
            </div>}
          </div>}

          {step===2&&<div>
            <div className="info-box info"><Icon name="lock" size={15}/><span>API credentials are encrypted at rest. Never exposed in frontend responses.</span></div>
            {app.webhook&&<div className="form-group"><label className="form-label">Webhook URL (copy to your gateway)</label><div className="credential-field"><span>https://api.sitesellr.com/webhooks/{app.id}/&#123;store-id&#125;</span><button className="btn btn-ghost btn-sm" onClick={()=>toast('Webhook URL copied!')}><Icon name="copy" size={12}/></button></div></div>}
            {(app.creds||[]).map(cred=><div className="form-group" key={cred}><label className="form-label">{cred} <span style={{color:'var(--danger)'}}>*</span></label><input className={`form-input ${errors[cred]?'err':''}`} type="password" placeholder={`Enter ${cred}`} value={creds[cred]||''} onChange={e=>{setCreds({...creds,[cred]:e.target.value});setErrors({...errors,[cred]:null});}}/>{errors[cred]&&<div className="form-err">{errors[cred]}</div>}</div>)}
            {app.testMode&&<div className="toggle-row"><div className="toggle-info"><div className="toggle-info-label">Test Mode {testMode?'ON':'OFF'}</div><div className="toggle-info-sub">Enable to verify integration before going live.</div></div><button className={`toggle-switch ${testMode?'on':'off'}`} onClick={()=>setTestMode(!testMode)}/></div>}
          </div>}

          {step===3&&<div>
            <div className="checkout-summary mb-16">
              <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>Order Summary</div>
              <div className="checkout-line"><span>{app.name} — {plan?.name}</span><span>₹{(plan?.price||0).toLocaleString('en-IN')}/mo</span></div>
              <div className="checkout-line" style={{color:'var(--muted)',fontSize:12}}><span>GST (18%)</span><span>₹{Math.round((plan?.price||0)*.18).toLocaleString('en-IN')}</span></div>
              <div className="checkout-line total"><span>Total today</span><span style={{color:'var(--primary)'}}>₹{Math.round((plan?.price||0)*1.18).toLocaleString('en-IN')}/mo</span></div>
            </div>
            <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>Payment Method</div>
            <div className="pm-grid">
              {[{id:'upi',label:'UPI',emoji:'📱'},{id:'card',label:'Credit Card',emoji:'💳'},{id:'netbanking',label:'Net Banking',emoji:'🏦'},{id:'wallet',label:'Wallet',emoji:'👛'}].map(pm=><button key={pm.id} className={`pm-btn ${payMethod===pm.id?'selected':''}`} onClick={()=>setPayMethod(pm.id)}>{pm.emoji} {pm.label}</button>)}
            </div>
            {payMethod==='upi'&&<div className="form-group"><label className="form-label">UPI ID</label><input className="form-input" placeholder="yourname@upi"/></div>}
            {payMethod==='card'&&<div className="grid-2"><div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Card Number</label><input className="form-input" placeholder="1234 5678 9012 3456"/></div><div className="form-group"><label className="form-label">Expiry</label><input className="form-input" placeholder="MM/YY"/></div><div className="form-group"><label className="form-label">CVV</label><input className="form-input" placeholder="•••" type="password"/></div></div>}
            <div className="info-box warning"><Icon name="info" size={15}/><span>Billed ₹{Math.round((plan?.price||0)*1.18).toLocaleString('en-IN')}/month. Cancel anytime from App Settings.</span></div>
          </div>}

          {step===4&&<div style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:66,marginBottom:14}}>{app.emoji}</div>
            <h3 style={{fontSize:20,fontWeight:800,marginBottom:8}}>{app.name} is ready!</h3>
            <p style={{color:'var(--muted)',fontSize:13.5,marginBottom:22,lineHeight:1.6}}>{testMode?' Test mode active — switch to live before accepting real orders.':`${app.name} is live and ready to use.`}</p>
            <div style={{background:'var(--success-bg)',border:'1px solid var(--success-light)',borderRadius:'var(--r)',padding:'14px 18px',display:'inline-block',textAlign:'left'}}>
              <div style={{fontWeight:700,color:'var(--success)',marginBottom:7,fontSize:13}}>✅ Installation Checklist</div>
              {['App installed & activated','API credentials saved (encrypted)','Webhook endpoint registered',...(testMode?['Test mode enabled']:['Live mode active'])].map(it=><div key={it} style={{fontSize:12.5,color:'#166534',display:'flex',alignItems:'center',gap:7,marginBottom:3}}><Icon name="check" size={12}/> {it}</div>)}
            </div>
          </div>}
        </div>
        <div className="modal-footer">
          {step!==4&&<>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            {step>1&&<button className="btn btn-outline" onClick={()=>setStep(s=>s===2&&!isFree?3:s===3?1:s-1)}>← Back</button>}
            <button className="btn btn-primary" onClick={handleNext} disabled={loading||!plan}>
              {loading?<><span className="spinner"/> Processing...</>:step===3?`Pay ₹${Math.round((plan?.price||0)*1.18).toLocaleString('en-IN')}`:step===2?'Save & Continue →':'Continue →'}
            </button>
          </>}
          {step===4&&<button className="btn btn-primary btn-lg" onClick={()=>{onInstall(app,plan,creds,testMode);onClose();}}>Go to App Settings <Icon name="arrow" size={14}/></button>}
        </div>
      </div>
    </div>
  );
}

// ─── APP DETAIL MODAL ────────────────────────────────────────────────────────
function AppDetail({ app, installedApps, onClose, onInstall, onUninstall, toast }) {
  const [showPurchase, setShowPurchase] = useState(false);
  const installed = installedApps.find(a=>a.id===app.id);
  if(showPurchase) return <PurchaseModal app={app} onClose={()=>setShowPurchase(false)} onInstall={onInstall} toast={toast}/>;
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="flex items-center gap-12">
            <div style={{width:52,height:52,borderRadius:13,background:app.color+'22',display:'grid',placeItems:'center',fontSize:26,flexShrink:0}}>{app.emoji}</div>
            <div>
              <div className="flex items-center gap-8 mb-8"><h2 style={{fontSize:18,fontWeight:800}}>{app.name}</h2>{app.featured&&<span className="badge badge-gold">⭐ Featured</span>}{installed&&<span className="badge badge-success">✓ Installed</span>}</div>
              <div className="flex items-center gap-8"><Stars r={app.rating}/><span style={{fontSize:12.5,fontWeight:600}}>{app.rating}</span><span style={{fontSize:12,color:'var(--muted)'}}>({app.reviews.toLocaleString()} reviews)</span><span className="badge badge-muted">{app.cat}</span></div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div className="modal-body">
          <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:22}}>
            <div>
              <p style={{fontSize:13.5,color:'var(--muted)',lineHeight:1.7,marginBottom:18}}>{app.desc}</p>
              <div style={{fontWeight:700,fontSize:13,marginBottom:9}}>What's included</div>
              <ul style={{listStyle:'none',marginBottom:18}}>{app.features.map(f=><li key={f} style={{display:'flex',alignItems:'center',gap:9,padding:'5px 0',fontSize:13,color:'var(--text)'}}><span style={{color:'var(--success)',fontWeight:700,fontSize:13}}>✓</span>{f}</li>)}</ul>
              <div style={{fontWeight:700,fontSize:13,marginBottom:9}}>Pricing Plans</div>
              {app.pricing.map(p=><div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 13px',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',background:p.popular?'var(--primary-light)':'var(--surface)',marginBottom:7}}><div><span style={{fontWeight:700,fontSize:13}}>{p.name}</span>{p.popular&&<span className="badge badge-new" style={{marginLeft:8}}>Popular</span>}{p.txnFee&&<span style={{fontSize:11,color:'var(--muted)',marginLeft:8}}>{p.txnFee}</span>}</div><span style={{fontWeight:800,color:p.popular?'var(--primary)':'var(--text)',fontSize:13}}>{fmt(p.price)}{p.price>0?'/mo':''}</span></div>)}
            </div>
            <div>
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:18,marginBottom:12}}>
                {[['Category',app.cat],['Rating',`${app.rating}/5`],['Reviews',app.reviews.toLocaleString()],['Starting at',app.pricing[0].price===0?'Free':`₹${app.pricing[0].price.toLocaleString('en-IN')}/mo`],...(installed?[['Status','✓ Active'],['Plan',installed.plan?.name]]:[])].map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:13}}><span style={{color:'var(--muted)',fontWeight:500}}>{k}</span><span style={{fontWeight:600,color:k==='Status'?'var(--success)':k==='Starting at'?'var(--primary)':'var(--text)'}}>{v}</span></div>)}
              </div>
              {installed?(
                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  <button className="btn btn-outline w-full" onClick={()=>{onClose();toast(`Opening ${app.name} settings...`);}}>⚙️ Configure Settings</button>
                  <button className="btn btn-ghost w-full" style={{color:'var(--danger)',fontSize:12.5}} onClick={()=>{onUninstall(app.id);onClose();}}>🗑️ Uninstall App</button>
                </div>
              ):(
                <button className="btn btn-primary w-full btn-lg" onClick={()=>setShowPurchase(true)}>Install {app.name} <Icon name="arrow" size={14}/></button>
              )}
              {app.tags&&<div style={{marginTop:14}}><div style={{fontWeight:600,fontSize:11,color:'var(--muted)',marginBottom:7}}>TAGS</div><div className="flex flex-wrap gap-6">{app.tags.map(t=><span key={t} className="mkt-tag">{t}</span>)}</div></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STORE APP STORE ─────────────────────────────────────────────────────────
function StoreAppStore({ toast, storeId }) {
  const [installed, setInstalled] = useState([
    {...APPS[0],plan:APPS[0].pricing[1],testMode:true,status:'active',installedAt:'2025-01-15'},
    {...APPS[3],plan:APPS[3].pricing[1],testMode:false,status:'active',installedAt:'2025-01-10'},
    {...APPS[5],plan:APPS[5].pricing[0],testMode:false,status:'active',installedAt:'2024-12-20'},
  ]);
  const [tab, setTab] = useState('explore');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [selApp, setSelApp] = useState(null);
  const [error, setError] = useState("");
  const [storeSubdomain, setStoreSubdomain] = useState("demo");
  const [themeSlugToId, setThemeSlugToId] = useState({});

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!storeId) return;
      try {
        setError("");
        const res = await api.get(`/stores/${storeId}/insights/marketing`);
        if (!mounted) return;
        const subscriptions = Array.isArray(res.data?.subscriptions) ? res.data.subscriptions : [];
        if (!subscriptions.length) return;
        setInstalled((prev) => {
          const mapped = subscriptions.map((sub, idx) => {
            const templateName = String(sub.templateName || "").toLowerCase();
            const base = APPS.find((a) => templateName.includes(a.name.toLowerCase())) || APPS[idx % APPS.length];
            return {
              ...base,
              plan: base.pricing?.find((p) => p.price > 0) || base.pricing?.[0],
              testMode: false,
              status: sub.status || "active",
              installedAt: sub.purchasedAt || new Date().toISOString().slice(0, 10),
            };
          });
          return mapped.length ? mapped : prev;
        });
      } catch (err) {
        if (!mounted) return;
        setError(toErrorText(err, "Could not load installed apps."));
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [storeId]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!storeId) return;
      try {
        const [storeRes, themesRes] = await Promise.all([
          api.get(`/stores/${storeId}`),
          api.get(`/stores/${storeId}/themes`),
        ]);
        if (!mounted) return;
        const sub = String(storeRes?.data?.subdomain || "").trim().toLowerCase();
        setStoreSubdomain(sub || "demo");
        const rows = Array.isArray(themesRes?.data?.themes) ? themesRes.data.themes : [];
        const next = {};
        rows.forEach((row) => {
          const slug = String(row?.slug || "").trim().toLowerCase();
          const id = String(row?.id || "").trim();
          if (slug && id) next[slug] = id;
        });
        setThemeSlugToId(next);
      } catch {
        if (!mounted) return;
        setStoreSubdomain("demo");
        setThemeSlugToId({});
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [storeId]);

  const previewTheme = (app, e) => {
    e?.stopPropagation?.();
    if (!storeId) {
      toast("Select a store first.", "warning");
      return;
    }
    if (String(app?.cat || "").toLowerCase() !== "theme") return;
    const inferredSlug = String(app?.id || "").replace(/^th-/, "").trim().toLowerCase();
    const themeId = themeSlugToId[inferredSlug];
    if (!themeId) {
      toast("Theme is not imported in backend yet, preview unavailable.", "warning");
      return;
    }
    const sub = (storeSubdomain || "demo").trim().toLowerCase();
    const href = `/s/${encodeURIComponent(sub)}?storeId=${encodeURIComponent(storeId)}&previewThemeId=${encodeURIComponent(themeId)}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const handleInstall = (app,plan,creds,testMode) => {
    setInstalled(prev=>[...prev.filter(a=>a.id!==app.id),{...app,plan,creds,testMode,status:'active',installedAt:new Date().toISOString().split('T')[0]}]);
    toast(`${app.name} installed!`,'success');
  };
  const handleUninstall = (id) => { const a=installed.find(x=>x.id===id); setInstalled(p=>p.filter(x=>x.id!==id)); toast(`${a?.name} uninstalled`); };

  const filtered = APPS.filter(a=>(cat==='All'||a.cat===cat)&&(a.name.toLowerCase().includes(search.toLowerCase())||a.cat.toLowerCase().includes(search.toLowerCase())||(a.tags||[]).some(t=>t.toLowerCase().includes(search.toLowerCase()))));
  const featured = APPS.filter(a=>a.featured);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">App Store</div><div className="page-sub">Extend your store with payment, shipping, marketing & more</div></div>
        <div className="flex items-center gap-8"><span style={{fontSize:12.5,color:'var(--muted)'}}>{installed.length} installed</span></div>
      </div>
      <div className="tabs">
        {[{id:'explore',l:'Explore Apps'},{id:'installed',l:`My Apps (${installed.length})`}].map(t=><button key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.l}</button>)}
      </div>

      {tab==='explore'&&<>
        {cat==='All'&&!search&&<div style={{marginBottom:22}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>⭐ Featured Apps</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
            {featured.map(app=>{const inst=installed.find(a=>a.id===app.id);return(
              <div key={app.id} className="card" style={{cursor:'pointer',border:`1.5px solid ${app.color}33`,overflow:'hidden'}} onClick={()=>setSelApp(app)}>
                <div style={{background:app.color+'18',padding:'14px 18px',display:'flex',alignItems:'center',gap:10}}>
                  <div style={{fontSize:32}}>{app.emoji}</div>
                  <div><div style={{fontWeight:800,fontSize:14}}>{app.name}</div><div style={{fontSize:11.5,color:'var(--muted)'}}>{app.cat}</div></div>
                  {inst&&<span className="badge badge-success" style={{marginLeft:'auto'}}>✓ Installed</span>}
                </div>
                <div style={{padding:'10px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div><Stars r={app.rating}/><span style={{fontSize:11.5,color:'var(--muted)',marginLeft:5}}>{app.reviews.toLocaleString()} reviews</span></div>
                  <div className="flex items-center gap-6">
                    {app.cat === 'Theme' ? (
                      <button className="btn btn-outline btn-sm" onClick={(e)=>previewTheme(app,e)}>Preview</button>
                    ) : null}
                    <div style={{fontWeight:700,color:app.pricing[0].price===0?'var(--success)':'var(--primary)'}}>{app.pricing[0].price===0?'Free':`₹${app.pricing[0].price.toLocaleString()}/mo`}</div>
                  </div>
                </div>
              </div>
            );})}
          </div>
        </div>}

        <div className="flex items-center gap-10 mb-16" style={{flexWrap:'wrap'}}>
          <div className="search-bar" style={{maxWidth:340}}>
            <span className="search-icon"><Icon name="search" size={14}/></span>
            <input placeholder="Search apps, categories, tags..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
        <div className="cat-filter">
          {CATEGORIES.map(c=><button key={c} className={`cat-btn ${cat===c?'active':''}`} onClick={()=>setCat(c)}>{CAT_ICONS[c]||''} {c}</button>)}
        </div>

        <div className="mkt-grid">
          {filtered.map(app=>{
            const inst=installed.find(a=>a.id===app.id);
            const lowestPrice=app.pricing.reduce((m,p)=>p.price===0?0:(m===0?0:Math.min(m,p.price||Infinity)),Infinity);
            return(
              <div key={app.id} className={`mkt-card ${inst?'installed':''}`} onClick={()=>setSelApp(app)}>
                <div className="mkt-preview" style={{background:app.color+'18'}}>
                  <span style={{fontSize:50}}>{app.emoji}</span>
                  <div style={{position:'absolute',top:8,right:8,display:'flex',gap:5}}>
                    {app.featured&&<span className="badge badge-gold">⭐ Featured</span>}
                    {inst&&<span className="badge badge-success">✓ Installed</span>}
                  </div>
                </div>
                <div className="mkt-body">
                  <div className="flex items-center gap-6 mb-8"><div className="mkt-name">{app.name}</div></div>
                  <div className="flex items-center gap-6 mb-8"><Stars r={app.rating}/><span style={{fontSize:11.5,color:'var(--muted)'}}>{app.rating} ({app.reviews.toLocaleString()})</span></div>
                  <div className="mkt-desc">{app.desc}</div>
                  {app.tags&&<div className="mkt-tags">{app.tags.slice(0,3).map(t=><span key={t} className="mkt-tag">{t}</span>)}</div>}
                  <div className="mkt-footer">
                    <div className="mkt-price">{lowestPrice===0?<span style={{color:'var(--success)',fontWeight:700}}>Free</span>:<span>From ₹{lowestPrice.toLocaleString('en-IN')}<span style={{fontSize:11,fontWeight:500,color:'var(--muted)'}}>/mo</span></span>}</div>
                    <div className="flex items-center gap-6">
                      {app.cat === 'Theme' ? (
                        <button className="btn btn-outline btn-sm" onClick={(e)=>previewTheme(app,e)}>Preview</button>
                      ) : null}
                      {inst?<span className="badge badge-success">✓ Active</span>:<span className="badge badge-new">Install</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>}

      {tab==='installed'&&<div>
        {installed.length===0?<div className="empty-state"><div className="empty-icon">📦</div><h3 style={{fontWeight:700,fontSize:16,marginBottom:6}}>No apps installed</h3><p style={{fontSize:13}}>Browse the app store to add tools.</p><button className="btn btn-primary" style={{marginTop:14}} onClick={()=>setTab('explore')}>Browse Apps</button></div>:(
          <>
            {CATEGORIES.slice(1).map(c=>{
              const catApps=installed.filter(a=>a.cat===c);
              if(!catApps.length) return null;
              return(
                <div key={c} className="card mb-16">
                  <div className="card-header"><div className="card-title">{CAT_ICONS[c]} {c} <span style={{fontWeight:500,fontSize:12,color:'var(--muted)'}}>· {catApps.length} app{catApps.length>1?'s':''}</span></div></div>
                  <div style={{padding:0}}>
                    {catApps.map(app=><div key={app.id} className="installed-row">
                      <div className="installed-icon" style={{background:app.color+'22'}}>{app.emoji}</div>
                      <div className="installed-info"><div className="installed-name">{app.name}</div><div className="installed-meta">{app.plan?.name} · {app.plan?.price?`₹${app.plan.price.toLocaleString('en-IN')}/mo`:'Free'}{app.testMode&&<span className="badge badge-warning" style={{marginLeft:8}}>Test Mode</span>}</div></div>
                      <div className="installed-actions">
                        {app.testMode&&<button className="btn btn-outline btn-sm" style={{color:'var(--warning)',borderColor:'var(--warning)'}} onClick={()=>{setInstalled(p=>p.map(a=>a.id===app.id?{...a,testMode:false}:a));toast(`${app.name} → Live mode`,'success');}}>Go Live</button>}
                        <button className="btn btn-outline btn-sm" onClick={()=>setSelApp(app)}>Configure</button>
                        <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>handleUninstall(app.id)}><Icon name="trash" size={13}/></button>
                      </div>
                    </div>)}
                  </div>
                </div>
              );
            })}
            <div style={{marginTop:6}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>💡 Recommended for you</div>
              <div className="mkt-grid">
                {APPS.filter(a=>!installed.find(i=>i.id===a.id)).slice(0,3).map(app=><div key={app.id} className="mkt-card" onClick={()=>setSelApp(app)}><div className="mkt-preview" style={{background:app.color+'18',height:100}}><span style={{fontSize:38}}>{app.emoji}</span></div><div className="mkt-body" style={{padding:'11px 14px'}}><div className="mkt-name" style={{fontSize:13.5}}>{app.name}</div><div className="mkt-desc" style={{fontSize:11.5,marginBottom:7}}>{app.tagline}</div><div className="mkt-footer"><div style={{fontSize:12.5,fontWeight:700,color:'var(--primary)'}}>{app.pricing[0].price===0?'Free':`From ₹${app.pricing[0].price.toLocaleString()}/mo`}</div><div className="flex items-center gap-6">{app.cat==='Theme' ? <button className="btn btn-outline btn-sm" onClick={(e)=>previewTheme(app,e)}>Preview</button> : null}<span className="badge badge-new">Install</span></div></div></div></div>)}
              </div>
            </div>
          </>
        )}
      </div>}

      {selApp&&<AppDetail app={selApp} installedApps={installed} onClose={()=>setSelApp(null)} onInstall={handleInstall} onUninstall={handleUninstall} toast={(m,t)=>toast(m,t)}/>}
      {error && <div style={{marginTop:12,color:"var(--danger)",fontSize:12.5}}>{error}</div>}
    </div>
  );
}

// ─── APP SETTINGS (Store) ────────────────────────────────────────────────────
function AppSettings({ toast, storeId }) {
  const [apps] = useState([
    {...APPS[0],plan:APPS[0].pricing[1],testMode:true,status:'active'},
    {...APPS[3],plan:APPS[3].pricing[1],testMode:false,status:'active'},
    {...APPS[5],plan:APPS[5].pricing[0],testMode:false,status:'active'},
  ]);
  const [sel, setSel] = useState(apps[0]);
  const [testMode, setTestMode] = useState(apps[0].testMode);
  const [caps, setCaps] = useState(null);
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!storeId) return;
      try {
        setError("");
        const [capsRes, usageRes] = await Promise.all([
          api.get(`/stores/${storeId}/subscription/capabilities`),
          api.get(`/stores/${storeId}/subscription/usage`),
        ]);
        if (!mounted) return;
        setCaps(capsRes.data || null);
        setUsage(usageRes.data || null);
      } catch (err) {
        if (!mounted) return;
        setError(toErrorText(err, "Could not load store subscription settings."));
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [storeId]);

  return (
    <div>
      <div className="page-header"><div><div className="page-title">App Settings</div><div className="page-sub">Configure your installed apps and API credentials</div></div></div>
      <div style={{display:'grid',gridTemplateColumns:'210px 1fr',gap:18}}>
        <div className="card" style={{height:'fit-content'}}>
          <div style={{padding:8}}>
            {apps.map(app=><div key={app.id} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 11px',borderRadius:'var(--r-sm)',cursor:'pointer',background:sel.id===app.id?'var(--primary-light)':'transparent',border:sel.id===app.id?'1px solid var(--primary-mid)':'1px solid transparent',marginBottom:3}} onClick={()=>{setSel(app);setTestMode(app.testMode);}}>
              <span style={{fontSize:18}}>{app.emoji}</span>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:700,color:sel.id===app.id?'var(--primary)':'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{app.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{app.cat}</div></div>
            </div>)}
          </div>
        </div>
        <div>
          <div className="config-section">
            <div className="config-section-title"><span style={{fontSize:22}}>{sel.emoji}</span>{sel.name} — {sel.plan?.name} Plan{testMode&&<span className="badge badge-warning" style={{marginLeft:8}}>Test Mode</span>}</div>
            <div className="info-box info"><Icon name="info" size={14}/><span>Plan: <strong>{sel.plan?.name}</strong> · {sel.plan?.price?`₹${sel.plan?.price.toLocaleString('en-IN')}/mo`:'Free'} · Renews 15th monthly</span></div>
            <div className="toggle-row"><div className="toggle-info"><div className="toggle-info-label">Test Mode {testMode?'ON':'OFF'}</div><div className="toggle-info-sub">{testMode?'⚠️ Real transactions not processed. Switch live before accepting orders.':'✅ Live mode — real transactions active.'}</div></div><button className={`toggle-switch ${testMode?'on':'off'}`} onClick={()=>{setTestMode(!testMode);toast(`${sel.name} → ${!testMode?'Test':'Live'} mode`,'success');}}/></div>
            <div className="divider"/>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12,display:'flex',alignItems:'center',gap:7}}><Icon name="lock" size={13}/> API Credentials</div>
            <div className="grid-2">
              {(sel.creds||['API Key','Secret Key']).slice(0,4).map((cred,i)=><div className="form-group" key={cred}><label className="form-label">{cred}</label><div className="credential-field"><span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis'}}>{i===0?`${sel.id.includes('razorpay')?'rzp_test':'key'}_••••••••••••••••`:'••••••••••••••••••••'}</span><button className="btn btn-ghost btn-sm" style={{padding:'2px 5px'}} onClick={()=>toast('Copied!','success')}><Icon name="copy" size={11}/></button></div><button style={{background:'none',border:'none',color:'var(--primary)',fontSize:11.5,cursor:'pointer',fontWeight:600,padding:'3px 0'}} onClick={()=>toast('Edit credential mode')}>✏️ Update credential</button></div>)}
            </div>
            {sel.webhook&&<div className="form-group"><label className="form-label">Webhook Endpoint URL</label><div className="credential-field"><span>https://api.sitesellr.com/webhooks/{sel.id}/store-abc123</span><button className="btn btn-ghost btn-sm" style={{padding:'2px 5px'}} onClick={()=>toast('Webhook URL copied!','success')}><Icon name="copy" size={11}/></button></div><div className="form-hint">Add this URL to your {sel.name} dashboard → Webhooks.</div></div>}
            <div className="divider"/>
            <div className="flex items-center justify-between">
              <button className="btn btn-ghost" style={{color:'var(--danger)',fontSize:12.5}}><Icon name="trash" size={12}/> Uninstall</button>
              <div className="flex gap-8"><button className="btn btn-outline" onClick={()=>toast('Settings saved!','success')}>Save Changes</button><button className="btn btn-primary" onClick={()=>toast(`Testing ${sel.name} connection...`,'success')}>Test Connection</button></div>
            </div>
          </div>
          <div className="config-section">
            <div className="config-section-title"><Icon name="revenue" size={14}/> Billing History</div>
            <div className="table-wrap">
              <table><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th>Invoice</th></tr></thead>
              <tbody>{[{date:'2025-02-01'},{date:'2025-01-01'},{date:'2024-12-01'}].map((row,i)=><tr key={i}><td className="td-mono">{row.date}</td><td>{sel.name} — {sel.plan?.name}</td><td style={{fontWeight:600}}>{sel.plan?.price===0?'—':`₹${Math.round((sel.plan?.price||0)*1.18).toLocaleString('en-IN')}`}</td><td><span className="badge badge-success">Paid</span></td><td><button className="btn btn-ghost btn-sm" onClick={()=>toast('Downloading invoice...')}><Icon name="copy" size={11}/> PDF</button></td></tr>)}</tbody></table>
            </div>
          </div>
          {(caps || usage) && (
            <div className="config-section">
              <div className="config-section-title">Store Plan Capabilities</div>
              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Allowed Theme Tier</label>
                  <input className="form-input" value={caps?.allowedThemeTier || "-"} readOnly />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Max Plugins Installed</label>
                  <input className="form-input" value={String(caps?.maxPluginsInstalled ?? "-")} readOnly />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Current Products</label>
                  <input className="form-input" value={String(usage?.currentProducts ?? "-")} readOnly />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Current Gateways</label>
                  <input className="form-input" value={String(usage?.currentPaymentGateways ?? "-")} readOnly />
                </div>
              </div>
            </div>
          )}
          {error && <div style={{marginTop:12,color:"var(--danger)",fontSize:12.5}}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── PLATFORM APP MANAGER ────────────────────────────────────────────────────
function PlatformAppManager({ toast }) {
  const [apps, setApps] = useState(APPS.map(a=>({...a,status:a.featured?'active':Math.random()>.2?'active':'inactive',totalRevenue:Math.floor(Math.random()*500000+50000),installs:Math.floor(Math.random()*500+20),commissionPct:20})));
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [editApp, setEditApp] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [backendStats, setBackendStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const res = await api.get("/platform/owner/plugins");
        if (!mounted) return;
        setBackendStats(res.data || null);
      } catch (err) {
        if (!mounted) return;
        setError(toErrorText(err, "Could not load marketplace stats."));
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = apps.filter(a=>(catFilter==='All'||a.cat===catFilter)&&(a.name.toLowerCase().includes(search.toLowerCase())||a.cat.toLowerCase().includes(search.toLowerCase())));
  const totalRev = backendStats ? Number(backendStats.campaignEvents?.reduce((sum, ev) => sum + Number(ev.amount || 0), 0) || 0) : apps.reduce((s,a)=>s+a.totalRevenue,0);
  const totalInst = backendStats ? Number(backendStats.themesTotal || 0) + Number(backendStats.campaignTemplatesTotal || 0) : apps.reduce((s,a)=>s+a.installs,0);
  const activeCount = backendStats ? Number(backendStats.themesActive || 0) : apps.filter(a=>a.status==='active').length;

  return (
    <div>
      <div className="page-header"><div><div className="page-title">App Marketplace Management</div><div className="page-sub">Control which apps are available, set pricing & commission rates</div></div><button className="btn btn-primary" onClick={()=>setShowAdd(true)}><Icon name="plus" size={14}/> Add New App</button></div>
      <div className="stats-grid">
        {[{icon:'🏪',label:'Total Apps',val:apps.length,delta:'+2 this month',color:'#eff6ff'},{icon:'✅',label:'Active Apps',val:activeCount,delta:`${apps.length-activeCount} inactive`,color:'#f0fdf4'},{icon:'📦',label:'Total Installs',val:totalInst.toLocaleString(),delta:'+128 this month',color:'#fdf4ff'},{icon:'💰',label:'Platform Revenue',val:`₹${(totalRev/100000).toFixed(1)}L`,delta:'+18% vs last month',color:'#fffbeb'}].map(s=><div key={s.label} className="stat-card"><div className="stat-icon" style={{background:s.color}}>{s.icon}</div><div><div className="stat-val">{s.val}</div><div className="stat-label">{s.label}</div><div className="stat-delta up">{s.delta}</div></div></div>)}
      </div>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-10" style={{flexWrap:'wrap',flex:1}}>
            <div className="search-bar" style={{maxWidth:280}}><span className="search-icon"><Icon name="search" size={13}/></span><input placeholder="Search apps..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <div className="cat-filter" style={{marginBottom:0}}>{CATEGORIES.map(c=><button key={c} className={`cat-btn ${catFilter===c?'active':''}`} onClick={()=>setCatFilter(c)}>{CAT_ICONS[c]||''} {c}</button>)}</div>
          </div>
        </div>
        <div className="table-wrap" style={{borderRadius:0,border:'none',borderTop:'1px solid var(--border)'}}>
          <table>
            <thead><tr><th>App</th><th>Category</th><th>Base Price</th><th>Commission</th><th>Installs</th><th>Revenue</th><th>Status</th><th>Featured</th><th>Actions</th></tr></thead>
            <tbody>{filtered.map(app=><tr key={app.id}>
              <td><div className="flex items-center gap-10"><div style={{width:34,height:34,borderRadius:8,background:app.color+'22',display:'grid',placeItems:'center',fontSize:17,flexShrink:0}}>{app.emoji}</div><div><div className="td-bold">{app.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>★ {app.rating} ({app.reviews.toLocaleString()})</div></div></div></td>
              <td><span className="badge badge-muted">{app.cat}</span></td>
              <td>{app.pricing[0].price===0?<span style={{color:'var(--success)',fontWeight:600}}>Free</span>:`₹${app.pricing[0].price.toLocaleString()}/mo`}</td>
              <td><div className="flex items-center gap-5"><input style={{width:46,padding:'3px 7px',border:'1px solid var(--border)',borderRadius:5,fontSize:11.5,textAlign:'center'}} type="number" value={app.commissionPct} onChange={e=>setApps(p=>p.map(a=>a.id===app.id?{...a,commissionPct:parseInt(e.target.value)||0}:a))}/><span style={{fontSize:11.5,color:'var(--muted)'}}>%</span></div></td>
              <td>{app.installs}</td>
              <td style={{fontWeight:700,color:'var(--success)'}}>₹{(app.totalRevenue/1000).toFixed(0)}K</td>
              <td><button className={`toggle-switch ${app.status==='active'?'on':'off'}`} onClick={()=>{setApps(p=>p.map(a=>a.id===app.id?{...a,status:a.status==='active'?'inactive':'active'}:a));toast(`${app.name} ${app.status==='active'?'deactivated':'activated'}`,'success');}}/></td>
              <td><button className={`toggle-switch ${app.featured?'on':'off'}`} style={{'--primary':'#f59e0b'}} onClick={()=>{setApps(p=>p.map(a=>a.id===app.id?{...a,featured:!a.featured}:a));toast(`${app.name} featured ${app.featured?'removed':'added'}`,'success');}}/></td>
              <td><div className="flex items-center gap-5"><button className="btn btn-ghost btn-sm" onClick={()=>setEditApp(app)}><Icon name="tag" size={13}/></button></div></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>

      {editApp&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditApp(null)}><div className="modal"><div className="modal-header"><div><div className="modal-title">Edit Pricing — {editApp.name}</div></div><button className="modal-close" onClick={()=>setEditApp(null)}><Icon name="x" size={14}/></button></div><div className="modal-body">{editApp.pricing.map((plan,idx)=><div key={plan.id} style={{border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:14,marginBottom:10}}><div className="flex items-center justify-between mb-12"><div style={{fontWeight:700,fontSize:13.5}}>{plan.name} Plan</div>{plan.popular&&<span className="badge badge-new">Popular</span>}</div><div className="grid-2"><div className="form-group" style={{marginBottom:0}}><label className="form-label">Monthly Price (₹)</label><input className="form-input" type="number" defaultValue={plan.price||0} onChange={e=>{const newApps=apps.map(a=>a.id===editApp.id?{...a,pricing:a.pricing.map((p,i)=>i===idx?{...p,price:parseInt(e.target.value)||0}:p)}:a);setApps(newApps);setEditApp(newApps.find(a=>a.id===editApp.id));}}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label">Transaction Fee</label><input className="form-input" type="text" defaultValue={plan.txnFee||'N/A'}/></div></div></div>)}</div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setEditApp(null)}>Cancel</button><button className="btn btn-primary" onClick={()=>{toast(`${editApp.name} pricing updated`,'success');setEditApp(null);}}>Save Pricing</button></div></div></div>}

      {showAdd&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}><div className="modal"><div className="modal-header"><div className="modal-title">Add New App to Marketplace</div><button className="modal-close" onClick={()=>setShowAdd(false)}><Icon name="x" size={14}/></button></div><div className="modal-body"><div className="grid-2"><div className="form-group"><label className="form-label">App Name <span style={{color:'var(--danger)'}}>*</span></label><input className="form-input" placeholder="e.g. Shiprocket"/></div><div className="form-group"><label className="form-label">Category <span style={{color:'var(--danger)'}}>*</span></label><select className="form-input form-select">{CATEGORIES.slice(1).map(c=><option key={c}>{c}</option>)}</select></div><div className="form-group"><label className="form-label">Emoji Icon</label><input className="form-input" placeholder="🚀"/></div><div className="form-group"><label className="form-label">Brand Color</label><input className="form-input" type="color" defaultValue="#2563EB"/></div></div><div className="form-group"><label className="form-label">Tagline</label><input className="form-input" placeholder="Short description shown on the card"/></div><div className="form-group"><label className="form-label">Full Description</label><textarea className="form-input" rows="3" placeholder="Detailed description..." style={{resize:'vertical'}}/></div><div className="grid-2"><div className="form-group"><label className="form-label">Starting Price (₹/mo)</label><input className="form-input" type="number" placeholder="0 for free"/></div><div className="form-group"><label className="form-label">Commission Rate (%)</label><input className="form-input" type="number" defaultValue="20"/></div></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowAdd(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>{toast('App added to marketplace!','success');setShowAdd(false);}}>Add App</button></div></div></div>}
      {error && <div style={{marginTop:12,color:"var(--danger)",fontSize:12.5}}>{error}</div>}
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ role, toast, setPage, storeId }) {
  const isPlatform = role==="platform";
  const [apiState, setApiState] = useState({ loading: true, error: "", data: null });
  const revData = [62, 78, 55, 88, 95, 71, 108, 125, 99, 142, 155, 178];
  const maxRev = Math.max(...revData);
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setApiState({ loading: true, error: "", data: null });
        if (isPlatform) {
          const [payments, billing, plugins] = await Promise.all([
            api.get("/platform/owner/payments"),
            api.get("/platform/owner/billing"),
            api.get("/platform/owner/plugins"),
          ]);
          if (!mounted) return;
          setApiState({ loading: false, error: "", data: { payments: payments.data, billing: billing.data, plugins: plugins.data } });
          return;
        }
        if (!storeId) {
          setApiState({ loading: false, error: "Store is not selected.", data: null });
          return;
        }
        const [dashboardRes, marketingRes] = await Promise.all([
          api.get(`/stores/${storeId}/insights/dashboard`),
          api.get(`/stores/${storeId}/insights/marketing`),
        ]);
        if (!mounted) return;
        setApiState({ loading: false, error: "", data: { dashboard: dashboardRes.data, marketing: marketingRes.data } });
      } catch (err) {
        if (!mounted) return;
        setApiState({ loading: false, error: toErrorText(err, "Could not load dashboard data."), data: null });
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [isPlatform, storeId]);

  const platformCards = isPlatform
    ? [
        {
          icon: "🏪",
          label: "Active Stores",
          val: `${apiState.data?.billing?.activeSubscriptions ?? "0"}`,
          delta: `${apiState.data?.billing?.trialSubscriptions ?? 0} trials`,
          color: "#eff6ff",
        },
        {
          icon: "💰",
          label: "Gross Volume",
          val: `₹${Number(apiState.data?.payments?.grossVolume || 0).toFixed(0)}`,
          delta: `${apiState.data?.payments?.paymentSuccessRate || 0}% success`,
          color: "#f0fdf4",
        },
        {
          icon: "📦",
          label: "Themes",
          val: `${apiState.data?.plugins?.themesTotal ?? 0}`,
          delta: `${apiState.data?.plugins?.themesActive ?? 0} active`,
          color: "#fdf4ff",
        },
        {
          icon: "⭐",
          label: "Campaign Templates",
          val: `${apiState.data?.plugins?.campaignTemplatesTotal ?? 0}`,
          delta: `${apiState.data?.plugins?.campaignTemplatesActive ?? 0} active`,
          color: "#fffbeb",
        },
      ]
    : [
        {
          icon: "🛒",
          label: "Total Orders",
          val: `${apiState.data?.dashboard?.metrics?.totalOrders ?? 0}`,
          delta: `${apiState.data?.dashboard?.metrics?.ordersChange ?? 0}% change`,
          color: "#eff6ff",
        },
        {
          icon: "💰",
          label: "Revenue (MTD)",
          val: `₹${Number(apiState.data?.dashboard?.metrics?.totalRevenue || 0).toFixed(0)}`,
          delta: `${apiState.data?.dashboard?.metrics?.revenueChange ?? 0}% change`,
          color: "#f0fdf4",
        },
        {
          icon: "📦",
          label: "Templates",
          val: `${apiState.data?.marketing?.templates?.length ?? 0}`,
          delta: `${apiState.data?.marketing?.subscriptions?.length ?? 0} installed`,
          color: "#fdf4ff",
        },
        {
          icon: "🚀",
          label: "Active Campaigns",
          val: `${apiState.data?.marketing?.metrics?.activeCampaigns ?? 0}`,
          delta: `Spend ₹${Number(apiState.data?.marketing?.metrics?.marketingSpend || 0).toFixed(0)}`,
          color: "#fffbeb",
        },
      ];

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">{isPlatform?'Platform Dashboard':'Store Dashboard'}</div><div className="page-sub">{isPlatform?'Overview of all tenants, app revenue & marketplace performance':'Welcome back! Your store health at a glance.'}</div></div>
        {!isPlatform&&<button className="btn btn-primary" onClick={()=>setPage('app-store')}><Icon name="apps" size={14}/> Browse Apps</button>}
      </div>
      <div className="stats-grid">
        {platformCards.map(s=><div key={s.label} className="stat-card"><div className="stat-icon" style={{background:s.color}}>{s.icon}</div><div><div className="stat-val">{s.val}</div><div className="stat-label">{s.label}</div><div className="stat-delta up">{s.delta}</div></div></div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:18,marginBottom:18}}>
        <div className="card">
          <div className="card-header"><div className="card-title">Monthly Revenue</div><span className="badge badge-success">+28% YoY</span></div>
          <div className="card-body">
            <div className="rev-bars">
              {revData.map((v,i)=><div key={i} className="rev-bar-col"><div className="rev-bar" style={{height:`${(v/maxRev)*80}px`}} title={`₹${v}K`}/><div className="rev-label">{months[i]}</div></div>)}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">{isPlatform?'Top Revenue Apps':'My Apps Status'}</div></div>
          <div style={{padding:0}}>
            {(isPlatform?APPS.slice(0,5):APPS.slice(0,3)).map((app,i)=><div key={app.id} style={{display:'flex',alignItems:'center',gap:11,padding:'11px 18px',borderBottom:i<4?'1px solid var(--border)':'none'}}><span style={{fontSize:22}}>{app.emoji}</span><div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13}}>{app.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{app.cat}</div></div>{isPlatform?<div style={{fontWeight:700,fontSize:13,color:'var(--success)'}}>₹{(Math.random()*50+10).toFixed(0)}K</div>:<span className="badge badge-success">Active</span>}</div>)}
          </div>
        </div>
      </div>
      {!isPlatform&&<div className="card"><div className="card-header"><div className="card-title">⚠️ Action Required</div></div><div className="card-body"><div className="info-box warning"><Icon name="info" size={14}/><span><strong>Razorpay is in Test Mode.</strong> You cannot accept real payments. <button style={{background:'none',border:'none',color:'var(--primary)',fontWeight:700,cursor:'pointer',fontSize:13}} onClick={()=>setPage('app-settings')}>Switch to Live →</button></span></div><div className="info-box info"><Icon name="info" size={14}/><span><strong>WhatsApp Business API not installed.</strong> Reach 300M+ users with order updates. <button style={{background:'none',border:'none',color:'var(--primary)',fontWeight:700,cursor:'pointer',fontSize:13}} onClick={()=>setPage('app-store')}>Install now →</button></span></div></div></div>}
      {apiState.error && <div style={{marginTop:12,color:"var(--danger)",fontSize:12.5}}>{apiState.error}</div>}
    </div>
  );
}

// ─── PLATFORM REVENUE ────────────────────────────────────────────────────────
function PlatformRevenue({ toast }) {
  const [state, setState] = useState({ loading: true, error: "", reports: null, plugins: null });
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setState({ loading: true, error: "", reports: null, plugins: null });
        const [reportsRes, pluginsRes] = await Promise.all([
          api.get("/platform/owner/reports"),
          api.get("/platform/owner/plugins"),
        ]);
        if (!mounted) return;
        setState({ loading: false, error: "", reports: reportsRes.data || {}, plugins: pluginsRes.data || {} });
      } catch (err) {
        if (!mounted) return;
        setState({ loading: false, error: toErrorText(err, "Could not load revenue data."), reports: null, plugins: null });
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const reportRows = Array.isArray(state.reports?.paidByMonth) ? state.reports.paidByMonth : [];
  const data = APPS.map((a, idx) => ({
    ...a,
    revenue: Number(reportRows[idx % Math.max(reportRows.length, 1)]?.revenue || 0),
    installs: Math.floor(Math.random() * 400 + 20),
    commission: 20,
  }));
  const totalRevenue = reportRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
  const totalTransactions = reportRows.reduce((sum, row) => sum + Number(row.transactions || 0), 0);
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Revenue & Analytics</div><div className="page-sub">Track app marketplace revenue, commissions & store subscription metrics</div></div><button className="btn btn-outline" onClick={()=>toast('Exporting CSV...')}><Icon name="copy" size={13}/> Export CSV</button></div>
      <div className="stats-grid">{[{icon:'💰',label:'Total Revenue',val:`₹${totalRevenue.toFixed(0)}`,color:'#eff6ff'},{icon:'📊',label:'Commission Revenue',val:`₹${(totalRevenue*0.2).toFixed(0)}`,color:'#f0fdf4'},{icon:'📈',label:'Transactions',val:`${totalTransactions}`,color:'#fdf4ff'},{icon:'🏪',label:'Themes Active',val:`${state.plugins?.themesActive || 0}`,color:'#fffbeb'}].map(s=><div key={s.label} className="stat-card"><div className="stat-icon" style={{background:s.color}}>{s.icon}</div><div><div className="stat-val">{s.val}</div><div className="stat-label">{s.label}</div></div></div>)}</div>
      <div className="card">
        <div className="table-wrap" style={{border:'none',borderRadius:0}}>
          <table><thead><tr><th>App</th><th>Category</th><th>Installs</th><th>MRR</th><th>Commission %</th><th>Your Share</th></tr></thead>
          <tbody>{data.sort((a,b)=>b.revenue-a.revenue).map(app=><tr key={app.id}><td><div className="flex items-center gap-9"><span style={{fontSize:18}}>{app.emoji}</span><div className="td-bold">{app.name}</div></div></td><td><span className="badge badge-muted">{app.cat}</span></td><td>{app.installs}</td><td style={{fontWeight:600}}>₹{(app.revenue/1000).toFixed(0)}K</td><td><div className="flex items-center gap-5"><input style={{width:44,padding:'3px 6px',border:'1px solid var(--border)',borderRadius:5,fontSize:11.5,textAlign:'center'}} type="number" defaultValue={app.commission}/><span style={{fontSize:11,color:'var(--muted)'}}>%</span></div></td><td style={{fontWeight:700,color:'var(--success)'}}>₹{(app.revenue*.2/1000).toFixed(0)}K</td></tr>)}</tbody></table>
        </div>
      </div>
      {state.error && <div style={{marginTop:12,color:"var(--danger)",fontSize:12.5}}>{state.error}</div>}
    </div>
  );
}

// ─── PLATFORM SETTINGS ───────────────────────────────────────────────────────
function PlatformSettings({ toast }) {
  const [settings, setSettings] = useState({ platformName:'Sitesellr',platformDomain:'sitesellr.com',supportEmail:'support@sitesellr.com',enableTrials:true,trialDays:14,defaultCurrency:'INR',commissionRate:20,killSwitch:false,maintenanceMode:false,maxStoresPerMerchant:5,allowCustomDomains:true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const set = (k,v) => setSettings(p=>({...p,[k]:v}));
  const tiers = [{name:'Starter',price:'₹999/mo',products:100,categories:10,plugins:3,customDomain:false},{name:'Growth',price:'₹2,999/mo',products:1000,categories:50,plugins:10,customDomain:true},{name:'Pro',price:'₹7,999/mo',products:'Unlimited',categories:'Unlimited',plugins:'Unlimited',customDomain:true}];
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const [cfgRes, pluginsRes] = await Promise.all([
          api.get("/platform/owner/config"),
          api.get("/platform/owner/plugins"),
        ]);
        if (!mounted) return;
        setSettings((p) => ({
          ...p,
          supportEmail: cfgRes.data?.communicationProvider || p.supportEmail,
          killSwitch: Boolean(pluginsRes.data?.killSwitch),
          platformDomain: "sitesellr.com",
        }));
      } catch (err) {
        if (!mounted) return;
        setError(toErrorText(err, "Could not load platform settings."));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const savePlatform = async () => {
    try {
      setError("");
      await api.put("/platform/owner/config", {
        paymentGatewayProvider: settings.platformName || "default",
        taxGstPercent: String(settings.commissionRate || 18),
        featureFlagsJson: JSON.stringify({
          maintenanceMode: settings.maintenanceMode,
          enableTrials: settings.enableTrials,
          allowCustomDomains: settings.allowCustomDomains,
        }),
        limitsJson: JSON.stringify({
          maxStoresPerMerchant: settings.maxStoresPerMerchant,
          trialDays: settings.trialDays,
        }),
        communicationProvider: settings.supportEmail || "smtp",
        regionRulesJson: "{}",
        corsOriginsCsv: "*",
      });
      await api.put("/platform/owner/plugins/kill-switch", { enabled: settings.killSwitch });
      toast("Platform settings saved!", "success");
    } catch (err) {
      const message = toErrorText(err, "Could not save platform settings.");
      setError(message);
      toast(message, "error");
    }
  };
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Platform Settings</div><div className="page-sub">Configure global platform behavior, subscription tiers & billing</div></div><button className="btn btn-primary" onClick={savePlatform} disabled={loading}>Save Changes</button></div>
      <div className="grid-2">
        <div>
          <div className="config-section">
            <div className="config-section-title">🏢 Platform Identity</div>
            <div className="form-group"><label className="form-label">Platform Name</label><input className="form-input" value={settings.platformName} onChange={e=>set('platformName',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Platform Domain</label><input className="form-input" value={settings.platformDomain} onChange={e=>set('platformDomain',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Support Email</label><input className="form-input" type="email" value={settings.supportEmail} onChange={e=>set('supportEmail',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Default Currency</label><select className="form-input form-select" value={settings.defaultCurrency} onChange={e=>set('defaultCurrency',e.target.value)}><option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option></select></div>
          </div>
          <div className="config-section">
            <div className="config-section-title">⚙️ Store Limits</div>
            <div className="form-group"><label className="form-label">Max Stores per Merchant</label><input className="form-input" type="number" value={settings.maxStoresPerMerchant} onChange={e=>set('maxStoresPerMerchant',parseInt(e.target.value)||1)}/></div>
            <div className="form-group"><label className="form-label">Default Commission Rate (%)</label><input className="form-input" type="number" value={settings.commissionRate} onChange={e=>set('commissionRate',parseInt(e.target.value)||0)}/></div>
            <div className="toggle-row"><div className="toggle-info"><div className="toggle-info-label">Allow Custom Domains</div><div className="toggle-info-sub">Let stores use their own domains</div></div><button className={`toggle-switch ${settings.allowCustomDomains?'on':'off'}`} onClick={()=>set('allowCustomDomains',!settings.allowCustomDomains)}/></div>
          </div>
        </div>
        <div>
          <div className="config-section">
            <div className="config-section-title">🧪 Trial Settings</div>
            <div className="toggle-row"><div className="toggle-info"><div className="toggle-info-label">Enable Free Trials</div><div className="toggle-info-sub">New stores get a free trial period</div></div><button className={`toggle-switch ${settings.enableTrials?'on':'off'}`} onClick={()=>set('enableTrials',!settings.enableTrials)}/></div>
            <div className="form-group"><label className="form-label">Trial Duration (days)</label><input className="form-input" type="number" value={settings.trialDays} onChange={e=>set('trialDays',parseInt(e.target.value)||0)} disabled={!settings.enableTrials}/></div>
          </div>
          <div className="config-section">
            <div className="config-section-title">🚨 Emergency Controls</div>
            <div className="toggle-row" style={{borderColor:settings.killSwitch?'var(--danger)':'var(--border)',background:settings.killSwitch?'var(--danger-bg)':'#fff'}}><div className="toggle-info"><div className="toggle-info-label" style={{color:settings.killSwitch?'var(--danger)':'var(--text)'}}>Kill Switch</div><div className="toggle-info-sub">Disable all marketplace apps instantly</div></div><button className={`toggle-switch ${settings.killSwitch?'on':'off'}`} style={settings.killSwitch?{'--primary':'var(--danger)'}:{}} onClick={()=>{set('killSwitch',!settings.killSwitch);toast(settings.killSwitch?'Kill switch deactivated':'⚠️ Kill switch activated! All apps disabled.',settings.killSwitch?'success':'error');}}/></div>
            <div className="toggle-row"><div className="toggle-info"><div className="toggle-info-label">Maintenance Mode</div><div className="toggle-info-sub">Show maintenance page to all stores</div></div><button className={`toggle-switch ${settings.maintenanceMode?'on':'off'}`} onClick={()=>set('maintenanceMode',!settings.maintenanceMode)}/></div>
          </div>
          <div className="config-section">
            <div className="config-section-title">💼 Subscription Tiers</div>
            <div className="table-wrap">
              <table className="tier-table"><thead><tr><th>Tier</th><th>Price</th><th>Products</th><th>Plugins</th><th>Domain</th></tr></thead>
              <tbody>{tiers.map((t,i)=><tr key={i}><td style={{fontWeight:700}}>{t.name}</td><td style={{color:'var(--primary)',fontWeight:600}}>{t.price}</td><td>{t.products}</td><td>{t.plugins}</td><td>{t.customDomain?'✅':'—'}</td></tr>)}</tbody></table>
            </div>
          </div>
        </div>
      </div>
      {error && <div style={{marginTop:12,color:"var(--danger)",fontSize:12.5}}>{error}</div>}
    </div>
  );
}

// ─── PLATFORM TENANTS ────────────────────────────────────────────────────────
function PlatformTenants({ toast }) {
  const [tenants, setTenants] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const [storesRes, merchantsRes] = await Promise.all([api.get("/stores"), api.get("/merchants")]);
        if (!mounted) return;
        const stores = Array.isArray(storesRes.data) ? storesRes.data : [];
        const merchants = Array.isArray(merchantsRes.data) ? merchantsRes.data : [];
        const rows = merchants.map((m) => {
          const merchantStores = stores.filter((s) => s.merchantId === m.id);
          return {
            id: m.id,
            name: m.name,
            domain: m.primaryDomain || (merchantStores[0]?.subdomain ? `${merchantStores[0]?.subdomain}.sitesellr.com` : "-"),
            plan: "Growth",
            status: String(m.status || "").toLowerCase() || "active",
            stores: merchantStores.length,
            revenue: "₹0",
            joined: m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : "-",
          };
        });
        setTenants(rows);
      } catch (err) {
        if (!mounted) return;
        setError(toErrorText(err, "Could not load tenants."));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);
  const statusBadge = {active:'badge-success',trial:'badge-warning',suspended:'badge-danger'};
  return (
    <div>
      <div className="page-header"><div><div className="page-title">Tenant Management</div><div className="page-sub">Manage all merchants & their stores</div></div><button className="btn btn-primary"><Icon name="plus" size={13}/> Add Merchant</button></div>
      {loading && <div style={{marginBottom:12,color:"var(--muted)"}}>Loading tenants...</div>}
      <div className="stats-grid">{[{icon:'🏪',label:'Total Merchants',val:tenants.length,color:'#eff6ff'},{icon:'✅',label:'Active',val:tenants.filter(t=>t.status==='active').length,color:'#f0fdf4'},{icon:'🧪',label:'Trials',val:tenants.filter(t=>t.status==='trial').length,color:'#fffbeb'},{icon:'⛔',label:'Suspended',val:tenants.filter(t=>t.status==='suspended').length,color:'#fef2f2'}].map(s=><div key={s.label} className="stat-card"><div className="stat-icon" style={{background:s.color}}>{s.icon}</div><div><div className="stat-val">{s.val}</div><div className="stat-label">{s.label}</div></div></div>)}</div>
      <div className="card">
        <div className="table-wrap" style={{border:'none',borderRadius:0}}>
          <table><thead><tr><th>Merchant</th><th>Domain</th><th>Plan</th><th>Status</th><th>Stores</th><th>Revenue</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>{tenants.map(t=><tr key={t.id}><td><div className="td-bold">{t.name}</div></td><td><div className="td-mono">{t.domain}</div></td><td><span className="badge badge-primary">{t.plan}</span></td><td><span className={`badge ${statusBadge[t.status]}`}>{t.status}</span></td><td>{t.stores}</td><td style={{fontWeight:600,color:'var(--success)'}}>{t.revenue}</td><td className="td-mono">{t.joined}</td><td><div className="flex gap-6"><button className="btn btn-ghost btn-sm" onClick={()=>toast(`Viewing ${t.name}`)}><Icon name="edit" size={12}/></button>{t.status==='active'&&<button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>toast(`Suspended ${t.name}`,'warning')}>⛔</button>}</div></td></tr>)}</tbody></table>
        </div>
      </div>
      {error && <div style={{marginTop:12,color:"var(--danger)",fontSize:12.5}}>{error}</div>}
    </div>
  );
}

// ─── API REQUIREMENTS PAGE ───────────────────────────────────────────────────
function ApiRequirementsPage() {
  const apis = [
    {group:'Authentication',color:'#2563eb',endpoints:[{method:'GET',path:'/auth/access',desc:'Returns current user role, storeId, isPlatformOwner, userEmail',req:'JWT Bearer Token',res:'{ isPlatformOwner, currentStoreId, userEmail, permissions[] }'},{method:'POST',path:'/auth/login',desc:'Login and get access + refresh token',req:'{ email, password }',res:'{ accessToken, refreshToken, user }'},{method:'POST',path:'/auth/refresh',desc:'Refresh access token using refresh token',req:'{ refreshToken }',res:'{ accessToken }'}]},
    {group:'Stores & Merchants',color:'#16a34a',endpoints:[{method:'GET',path:'/stores',desc:'Get all stores for current user (or all if platform owner)',req:'Header: X-Store-Id',res:'Store[]'},{method:'GET',path:'/stores/:id',desc:'Get specific store details',req:'Path: storeId',res:'Store'},{method:'POST',path:'/stores',desc:'Create a new store',req:'{ name, subdomain, currency, ... }',res:'Store'},{method:'GET',path:'/merchants',desc:'Get all merchants (platform owner only)',req:'—',res:'Merchant[]'}]},
    {group:'Store Dashboard Insights',color:'#f97316',endpoints:[{method:'GET',path:'/stores/:id/insights/dashboard',desc:'Get store dashboard metrics (orders, revenue, customers)',req:'Path: storeId',res:'{ metrics: { totalRevenue, revenueChange, totalOrders, ordersChange, totalCustomers, conversionRate } }'},{method:'GET',path:'/stores/:id/insights/marketing',desc:'Get marketing stats and installed campaign templates',req:'Path: storeId',res:'{ metrics, templates[], subscriptions[] }'},{method:'GET',path:'/stores/:id/subscription/capabilities',desc:'Get store subscription limits & features',req:'Path: storeId',res:'{ allowedThemeTier, maxProducts, maxPluginsInstalled, ... }'},{method:'GET',path:'/stores/:id/subscription/usage',desc:'Get current usage vs limits',req:'Path: storeId',res:'{ currentProducts, currentCategories, currentPaymentGateways }'}]},
    {group:'Platform Owner APIs',color:'#7c3aed',endpoints:[{method:'GET',path:'/platform/owner/payments',desc:'Platform-wide payment transaction stats',req:'Platform owner JWT',res:'{ totalTransactions, grossVolume, paymentSuccessRate, paidTransactions }'},{method:'GET',path:'/platform/owner/billing',desc:'Active subscriptions, trials, MRR breakdown',req:'Platform owner JWT',res:'{ activeSubscriptions, trialSubscriptions, paidByMonth[] }'},{method:'GET',path:'/platform/owner/plugins',desc:'Marketplace plugins, themes, campaign templates overview',req:'Platform owner JWT',res:'{ themesTotal, themesActive, campaignTemplatesTotal, killSwitch }'},{method:'GET',path:'/platform/owner/reports',desc:'Revenue by month, top revenue apps',req:'Platform owner JWT',res:'{ paidByMonth: [{ key, revenue, transactions }] }'}]},
    {group:'App Marketplace (Plugins)',color:'#f59e0b',endpoints:[{method:'GET',path:'/marketplace/apps',desc:'List all marketplace apps with pricing',req:'—',res:'App[]'},{method:'POST',path:'/stores/:id/plugins/install',desc:'Install an app/plugin to a store',req:'{ appId, planId, credentials: {}, testMode }',res:'{ installation }'},{method:'DELETE',path:'/stores/:id/plugins/:appId',desc:'Uninstall an app from a store',req:'Path: storeId, appId',res:'{ success }'},{method:'GET',path:'/stores/:id/plugins',desc:'Get all installed plugins for a store',req:'Path: storeId',res:'Installation[]'},{method:'PATCH',path:'/stores/:id/plugins/:appId/mode',desc:'Switch plugin between test/live mode',req:'{ testMode: boolean }',res:'{ installation }'}]},
    {group:'Theme Builder',color:'#ec4899',endpoints:[{method:'GET',path:'/stores/:id/theme',desc:'Get current store theme layout (sections JSON)',req:'Path: storeId',res:'{ sections[], settings, version }'},{method:'PUT',path:'/stores/:id/theme',desc:'Save theme layout as draft',req:'{ sections[], settings }',res:'{ theme, version }'},{method:'POST',path:'/stores/:id/theme/publish',desc:'Publish current draft theme to live',req:'—',res:'{ theme, publishedAt }'},{method:'GET',path:'/stores/:id/theme/versions',desc:'Get version history',req:'Path: storeId',res:'Version[]'},{method:'POST',path:'/stores/:id/theme/versions/:v/restore',desc:'Restore a specific version',req:'Path: storeId, version',res:'{ theme }'}]},
    {group:'Navigation & Pages',color:'#0ea5e9',endpoints:[{method:'GET',path:'/stores/:id/navigation',desc:'Get all navigation menus (main, footer1, footer2)',req:'Path: storeId',res:'{ main[], footer1[], footer2[] }'},{method:'PUT',path:'/stores/:id/navigation',desc:'Save navigation menus',req:'{ main[], footer1[], footer2[] }',res:'{ navigation }'},{method:'GET',path:'/stores/:id/pages',desc:'Get all static pages',req:'Path: storeId',res:'Page[]'},{method:'POST',path:'/stores/:id/pages',desc:'Create a static page',req:'{ title, slug, body, status, seo }',res:'Page'},{method:'PUT',path:'/stores/:id/pages/:pageId',desc:'Update a static page',req:'{ title, body, status, seo }',res:'Page'}]},
    {group:'Payment Gateway Credentials',color:'#dc2626',endpoints:[{method:'POST',path:'/stores/:id/payment-gateways',desc:'Save encrypted payment gateway credentials',req:'{ gatewayId, credentials: {}, testMode, planId }',res:'{ gateway }'},{method:'GET',path:'/stores/:id/payment-gateways',desc:'List configured payment gateways (credentials masked)',req:'Path: storeId',res:'Gateway[]'},{method:'POST',path:'/stores/:id/payment-gateways/:gId/test',desc:'Test gateway connection',req:'—',res:'{ success, latency }'},{method:'DELETE',path:'/stores/:id/payment-gateways/:gId',desc:'Remove a payment gateway',req:'Path: storeId, gatewayId',res:'{ success }'}]},
  ];

  return (
    <div className="api-details-page">
      <div className="page-header">
        <div>
          <div className="page-title">🔌 Backend API Requirements</div>
          <div className="page-sub">All APIs needed to make the platform fully functional. Share this with your backend team.</div>
        </div>
        <button className="btn btn-outline" onClick={()=>{navigator.clipboard?.writeText(window.location.href);}}><Icon name="copy" size={13}/> Copy Page URL</button>
      </div>

      <div className="info-box info mb-20"><Icon name="info" size={15}/><span><strong>Base URL:</strong> All endpoints should be prefixed with your API base URL (e.g., <code>https://api.sitesellr.com/v1</code>). All requests require <code>Authorization: Bearer &lt;token&gt;</code> header unless specified.</span></div>

      {apis.map(group=>(
        <div key={group.group} className="config-section">
          <div className="config-section-title" style={{color:group.color}}>
            <span style={{width:10,height:10,borderRadius:'50%',background:group.color,display:'inline-block'}}/> {group.group}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {group.endpoints.map((ep,i)=>(
              <div key={i} style={{border:'1px solid var(--border)',borderRadius:'var(--r-sm)',overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--surface)'}}>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:5,background:ep.method==='GET'?'#dbeafe':ep.method==='POST'?'#dcfce7':ep.method==='PUT'?'#fef9c3':ep.method==='PATCH'?'#fdf4ff':'#fee2e2',color:ep.method==='GET'?'#1d4ed8':ep.method==='POST'?'#15803d':ep.method==='PUT'?'#92400e':ep.method==='PATCH'?'#7c3aed':'#dc2626'}}>{ep.method}</span>
                  <code style={{fontFamily:'JetBrains Mono,monospace',fontSize:12.5,fontWeight:500,color:'var(--text)'}}>{ep.path}</code>
                  <span style={{fontSize:12.5,color:'var(--muted)',flex:1}}>{ep.desc}</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,borderTop:'1px solid var(--border)'}}>
                  <div style={{padding:'8px 14px',borderRight:'1px solid var(--border)'}}><div style={{fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Request</div><code style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--text)'}}>{ep.req}</code></div>
                  <div style={{padding:'8px 14px'}}><div style={{fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Response</div><code style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--text)'}}>{ep.res}</code></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="config-section">
        <div className="config-section-title">🔐 Security Requirements</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {[['Credential Encryption','All API keys/secrets stored encrypted using KMS. Never returned in plain text.'],['Webhook Signature Verification','All incoming webhooks verified using HMAC-SHA256 signature.'],['Rate Limiting','API endpoints rate-limited per store (100 req/min standard, 10 req/min for auth).'],['X-Store-Id Header','After login, all store-specific requests must include X-Store-Id header.'],['Role-Based Access','Platform owner APIs blocked for store-level users. Middleware enforces scopes.'],['Credential Masking','GET endpoints return masked credentials (e.g., rzp_test_••••••••).']].map(([k,v])=>(
            <div key={k} style={{display:'flex',gap:10,padding:'9px 13px',border:'1px solid var(--border)',borderRadius:'var(--r-sm)'}}><span style={{color:'var(--success)',fontWeight:700,flexShrink:0}}>✓</span><div><div style={{fontWeight:600,fontSize:13}}>{k}</div><div style={{fontSize:12.5,color:'var(--muted)',marginTop:2}}>{v}</div></div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

const toErrorText = (err, fallback) =>
  err?.response?.data?.detail || err?.response?.data?.error || err?.message || fallback;

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function StoreBuilderV1() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState("store");
  const [page, setPage] = useState("dashboard");
  const [toasts, setToasts] = useState([]);
  const [access, setAccess] = useState({
    loading: true,
    error: "",
    isPlatformOwner: false,
    storeId: "",
    storeName: "",
    userEmail: "",
  });

  const showToast = useCallback((msg, type='') => {
    const id = Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  }, []);

  const platformNav = [
    {id:'dashboard',label:'PBAdmin',icon:'dashboard'},
    {id:'app-manager',label:'App Marketplace',icon:'apps',badge:'16'},
    {id:'revenue',label:'Revenue',icon:'revenue'},
    {id:'tenants',label:'Tenants',icon:'users'},
    {id:'platform-settings',label:'Settings',icon:'settings'},
    {id:'theme-builder',label:'Theme Builder',icon:'theme'},
    {id:'api-requirements',label:'API Requirements',icon:'api'},
    {id:'merchant-ops',label:'Merchant Ops',icon:'builder',route:'/pbadmin/merchant-ops'},
    {id:'platform-rbac',label:'Platform RBAC',icon:'lock',route:'/pbadmin/platform-rbac'},
    {id:'platform-payments',label:'Payments & Transactions',icon:'revenue',route:'/pbadmin/platform-payments'},
    {id:'platform-billing',label:'Billing & Subscriptions',icon:'tag',route:'/pbadmin/platform-billing'},
    {id:'platform-api',label:'API & Integrations',icon:'api',route:'/pbadmin/platform-api'},
    {id:'security-audit',label:'Audit Log',icon:'lock',route:'/pbadmin/audit-logs'},
    {id:'platform-risk',label:'Risk / Fraud Monitoring',icon:'info',route:'/pbadmin/platform-risk'},
    {id:'platform-config',label:'Platform Configuration',icon:'settings',route:'/pbadmin/platform-config'},
    {id:'platform-domains',label:'Domains & SSL (Platform)',icon:'store',route:'/pbadmin/platform-domains'},
    {id:'platform-reports',label:'Reporting & Intelligence',icon:'analytics',route:'/pbadmin/platform-reports'},
  ];
  const storeNav = [
    {id:'dashboard',label:'Dashboard',icon:'dashboard'},
    {id:'app-store',label:'App Store',icon:'apps',badge:'NEW'},
    {id:'app-settings',label:'App Settings',icon:'settings'},
    {id:'theme-builder',label:'Theme & Design',icon:'theme'},
    {id:'store-settings',label:'Store Settings',icon:'settings'},
    {id:'api-requirements',label:'API Requirements',icon:'api'},
  ];

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const accessRes = await api.get("/auth/access");
        const payload = accessRes.data || {};
        const isPlatformOwner = Boolean(payload.isPlatformOwner || payload.isPlatformStaff);
        let storeId = payload.currentStoreId || "";
        let storeName = payload.currentStoreName || "";
        if (!storeId) {
          try {
            const storesRes = await api.get("/stores");
            const stores = Array.isArray(storesRes.data) ? storesRes.data : [];
            if (stores.length > 0) {
              storeId = stores[0].id || "";
              storeName = stores[0].name || "";
            }
          } catch {
            // ignore fallback errors
          }
        }
        if (!mounted) return;
        setRole(isPlatformOwner ? "platform" : "store");
        setAccess({
          loading: false,
          error: "",
          isPlatformOwner,
          storeId,
          storeName,
          userEmail: payload.userEmail || "",
        });
      } catch (err) {
        if (!mounted) return;
        setAccess((p) => ({
          ...p,
          loading: false,
          error: toErrorText(err, "Could not load access context."),
        }));
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (access.loading) return;
    if (!access.isPlatformOwner) {
      navigate("/admin", { replace: true });
    }
  }, [access.loading, access.isPlatformOwner, navigate]);

  useEffect(() => {
    if (access.loading || !access.isPlatformOwner) return;
    const path = location.pathname.replace(/\/+$/, "");
    if (!path.startsWith("/pbadmin")) return;
    const slug = path.replace("/pbadmin", "").replace(/^\/+/, "");
    setPage(slug || "dashboard");
  }, [access.loading, access.isPlatformOwner, location.pathname]);

  useEffect(() => {
    if (role === "store" && page === "store-settings") {
      navigate("/admin/settings", { replace: true });
    }
  }, [role, page, navigate]);

  const nav = role === "platform" ? platformNav : storeNav;

  const renderPage = () => {
    if(page==='theme-builder') return <ThemeBuilder toast={showToast} storeId={access.storeId} />;
    if(page==='api-requirements') return <ApiRequirementsPage/>;
    if(page==='dashboard') return <Dashboard role={role} toast={showToast} setPage={setPage} storeId={access.storeId}/>;
    if(role==='platform') {
      if(page==='app-manager') return <PlatformAppManager toast={showToast}/>;
      if(page==='revenue') return <PlatformRevenue toast={showToast}/>;
      if(page==='tenants') return <PlatformTenants toast={showToast}/>;
      if(page==='platform-settings') return <PlatformSettings toast={showToast}/>;
      if(page==='merchant-ops') return <MerchantOps />;
      if(page==='platform-rbac') return <PlatformRbac />;
      if(page==='platform-payments') return <PlatformModule moduleKey="payments" />;
      if(page==='platform-billing') return <PlatformModule moduleKey="billing" />;
      if(page==='platform-api') return <PlatformModule moduleKey="api" />;
      if(page==='security-audit') return <AuditLogs />;
      if(page==='platform-risk') return <PlatformModule moduleKey="risk" />;
      if(page==='platform-config') return <PlatformModule moduleKey="config" />;
      if(page==='platform-domains') return <PlatformModule moduleKey="domains" />;
      if(page==='platform-reports') return <PlatformModule moduleKey="reports" />;
    }
    if(role==='store') {
      if(page==='app-store') return <StoreAppStore toast={showToast} storeId={access.storeId}/>;
      if(page==='app-settings') return <AppSettings toast={showToast} storeId={access.storeId}/>;
    }
    return <Dashboard role={role} toast={showToast} setPage={setPage} storeId={access.storeId}/>;
  };

  const breadcrumbs = {
    dashboard:'PBAdmin',
    'app-store':'App Store',
    'app-manager':'App Marketplace',
    'app-settings':'App Settings',
    'store-settings':'Store Settings',
    revenue:'Revenue & Analytics',
    tenants:'Tenant Management',
    'platform-settings':'Platform Settings',
    'theme-builder':'Theme Builder',
    'api-requirements':'API Requirements',
    'merchant-ops':'Merchant Ops',
    'platform-rbac':'Platform RBAC',
    'platform-payments':'Payments & Transactions',
    'platform-billing':'Billing & Subscriptions',
    'platform-api':'API & Integrations',
    'security-audit':'Audit Log',
    'platform-risk':'Risk / Fraud Monitoring',
    'platform-config':'Platform Configuration',
    'platform-domains':'Domains & SSL (Platform)',
    'platform-reports':'Reporting & Intelligence',
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-logo-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
            <div><div className="sb-wordmark">Sitesellr</div><div className="sb-sub">PBAdmin</div></div>
          </div>

          <div className="sb-section">
            <div className="sb-section-label">{role==='platform'?'Platform':'My Store'}</div>
            {nav.map(item=>(
              <div
                key={item.id}
                className={`sb-item ${page===item.id?'active':''}`}
                onClick={() => {
                  const nextPath = item.id === "dashboard" ? "/pbadmin" : `/pbadmin/${item.id}`;
                  navigate(nextPath);
                  setPage(item.id);
                }}
              >
                <Icon name={item.icon} size={14}/>
                {item.label}
                {item.badge&&<span className={`sb-badge ${item.badge==='NEW'?'new':''}`}>{item.badge}</span>}
              </div>
            ))}
          </div>

          <div className="sb-divider"/>
          <div className="sb-section">
            <div className="sb-section-label">Account</div>
            <div className="sb-item"><Icon name="logout" size={14}/> Logout</div>
          </div>

          <div className="sb-user">
            <div className="sb-user-card">
              <div className="sb-avatar">{role==='platform'?'PO':'SO'}</div>
              <div>
                <div style={{fontSize:12.5,fontWeight:700,color:'var(--text)'}}>{role==='platform'?'Platform Owner':'Store Owner'}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>{access.userEmail || (role==='platform'?'admin@sitesellr.com':'store@example.com')}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <div className="tb-breadcrumb">
              {role==='platform'?'🌐 Platform Admin':`🛍️ ${access.storeName || "My Store"}`} / <span>{breadcrumbs[page]||'Dashboard'}</span>
            </div>
            <div className="search-bar">
              <span className="search-icon"><Icon name="search" size={13}/></span>
              <input placeholder="Search..." style={{fontSize:13}}/>
            </div>
            <div className="sb-avatar" style={{width:34,height:34,borderRadius:9,fontSize:13}}>{role==='platform'?'PO':'KT'}</div>
          </div>

          {page==='theme-builder'
            ? <div style={{flex:1}}>{renderPage()}</div>
            : <div className="content">{renderPage()}</div>
          }
        </main>

        <Toast toasts={toasts}/>
      </div>
      {access.error && <div style={{position:"fixed",bottom:18,left:18,color:"var(--danger)",fontSize:12.5,fontWeight:600,zIndex:1200}}>{access.error}</div>}
    </>
  );
}
