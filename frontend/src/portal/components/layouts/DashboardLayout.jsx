import React, { useState } from "react";
import { useAuth } from "../../PortalApp";
import {
  LayoutDashboard, Building2, Users, CreditCard, Package,
  Plug, Globe, Bell, BarChart3, Shield, Settings, Store,
  ShoppingCart, Tag, UserCircle, Megaphone, Palette,
  FileText, Truck, LogOut, ChevronDown, Search, Zap,
  Menu, X
} from "lucide-react";

// ─── Nav configs per role ─────────────────────────────────────────────────────
const PLATFORM_NAV = [
  {
    section: "Overview",
    items: [
      { key: "dashboard",  icon: LayoutDashboard, label: "Dashboard" },
      { key: "tenants",    icon: Building2,       label: "Tenants",       badge: "3" },
      { key: "users",      icon: Users,           label: "Users" },
    ],
  },
  {
    section: "Commerce",
    items: [
      { key: "subscriptions", icon: CreditCard, label: "Subscriptions" },
      { key: "plans",         icon: Package,    label: "Plans & Pricing" },
      { key: "marketplace",   icon: Plug,       label: "App Marketplace" },
    ],
  },
  {
    section: "Platform",
    items: [
      { key: "domains",      icon: Globe,        label: "Domains" },
      { key: "notifications",icon: Bell,         label: "Notifications" },
      { key: "analytics",    icon: BarChart3,    label: "Analytics" },
      { key: "roles",        icon: Shield,       label: "Roles & Access" },
      { key: "settings",     icon: Settings,     label: "Settings" },
    ],
  },
];

const STORE_NAV = [
  {
    section: "Store",
    items: [
      { key: "dashboard",   icon: LayoutDashboard, label: "Dashboard" },
      { key: "orders",      icon: ShoppingCart,    label: "Orders",     badge: "12" },
      { key: "products",    icon: Package,         label: "Products" },
      { key: "collections", icon: Tag,             label: "Collections" },
      { key: "customers",   icon: UserCircle,      label: "Customers" },
    ],
  },
  {
    section: "Sales",
    items: [
      { key: "discounts",  icon: Tag,      label: "Discounts" },
      { key: "campaigns",  icon: Megaphone,label: "Email Campaigns" },
      { key: "analytics",  icon: BarChart3,label: "Analytics" },
    ],
  },
  {
    section: "Store Setup",
    items: [
      { key: "themes",   icon: Palette,   label: "Themes" },
      { key: "pages",    icon: FileText,  label: "Pages" },
      { key: "domains",  icon: Globe,     label: "Domains" },
      { key: "payments", icon: CreditCard,label: "Payments" },
      { key: "shipping", icon: Truck,     label: "Shipping" },
      { key: "settings", icon: Settings,  label: "Settings" },
    ],
  },
];

export default function DashboardLayout({ children, currentPage, onNavigate, onLogout }) {
  const { auth } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isPlatform = auth?.role === "platform_admin";
  const nav = isPlatform ? PLATFORM_NAV : STORE_NAV;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Store Header */}
      <div className={`px-4 py-5 border-b border-white/[0.07] ${!isPlatform ? "pb-4" : ""}`}>
        {isPlatform ? (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #2563eb, #06b6d4)" }}>
              <Store className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-extrabold text-[1.05rem] leading-tight tracking-tight"
                style={{ fontFamily: "Manrope, sans-serif" }}>SiteSellr</div>
              <div className="text-white/30 text-[9px] uppercase tracking-[0.1em] font-medium mt-0.5">Platform Admin</div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
                🛍
              </div>
              <div>
                <div className="text-white font-extrabold text-[0.92rem] leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                  {auth?.storeName}
                </div>
                <div className="text-white/40 text-[10px] mt-0.5">{auth?.storeDomain}</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
              style={{ background: "rgba(37,99,235,0.2)", borderColor: "rgba(37,99,235,0.3)", color: "#93c5fd" }}>
              <Zap className="w-2.5 h-2.5" /> {auth?.plan} Plan
            </span>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {nav.map(({ section, items }) => (
          <div key={section}>
            <div className="px-4 pt-4 pb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/20">
              {section}
            </div>
            {items.map(({ key, icon: Icon, label, badge }) => {
              const active = currentPage === key;
              return (
                <button
                  key={key}
                  onClick={() => { onNavigate(key); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 mx-2 rounded-xl text-sm font-medium transition-all duration-150 text-left group ${
                    active
                      ? "text-white border border-blue-500/30"
                      : "text-white/45 hover:text-white/85 hover:bg-white/[0.06]"
                  }`}
                  style={{
                    width: "calc(100% - 16px)",
                    ...(active ? { background: "rgba(37,99,235,0.22)" } : {})
                  }}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    active ? "bg-white/[0.12]" : "group-hover:bg-white/[0.07]"
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="flex-1 text-left">{label}</span>
                  {badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white leading-none">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] transition-colors group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: isPlatform ? "linear-gradient(135deg,#2563eb,#06b6d4)" : "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
            {auth?.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold leading-tight truncate">{auth?.name}</div>
            <div className="text-white/35 text-[10px] truncate">{auth?.email}</div>
          </div>
          <button onClick={onLogout}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400 ml-1"
            title="Sign out">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f0f4ff]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[255px] flex-col fixed top-0 left-0 bottom-0 z-50"
        style={{ background: isPlatform ? "#0f172a" : "#1e293b" }}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[255px] flex flex-col z-10"
            style={{ background: isPlatform ? "#0f172a" : "#1e293b" }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 lg:ml-[255px] flex flex-col min-h-screen">

        {/* Header */}
        <header className="h-[66px] bg-white border-b border-slate-200 flex items-center px-5 lg:px-7 gap-3 sticky top-0 z-40">
          <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          {/* Store live status (store owner only) */}
          {!isPlatform && (
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-slate-900 text-sm leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                {auth?.storeName}
              </span>
              <span className="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Store is live
              </span>
            </div>
          )}

          {/* Breadcrumb (platform only) */}
          {isPlatform && (
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500">
              <span>Platform</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800 font-semibold capitalize">{currentPage}</span>
            </div>
          )}

          <div className="flex-1" />

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-400 hover:border-blue-400 transition-colors cursor-text w-52">
            <Search className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{isPlatform ? "Search tenants..." : "Search..."}</span>
          </div>

          {/* Icon buttons */}
          <button className="relative w-9 h-9 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center hover:border-blue-400 transition-colors">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <button className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center hover:border-blue-400 transition-colors">
            <Zap className="w-4 h-4 text-slate-500" />
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold cursor-pointer"
            style={{ background: isPlatform ? "linear-gradient(135deg,#2563eb,#06b6d4)" : "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
            {auth?.initials}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-7 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
