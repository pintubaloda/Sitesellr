import React, { useState } from "react";
import { useAuth } from "../../PortalApp";
import {
  Store, Building2, Mail, Lock, Eye, EyeOff,
  TrendingUp, Users, ShoppingBag, ArrowRight,
  Shield, Zap, Globe
} from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [role, setRole] = useState("platform_admin");
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    login({ email, password, role })
      .catch((err) => {
        const message = err?.response?.data?.error || "Login failed. Check credentials.";
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const stats = [
    { value: "12K+", label: "Active Stores" },
    { value: "99.9%", label: "Uptime SLA" },
    { value: "₹4.2Cr", label: "GMV Today" },
  ];

  const features = [
    { icon: Shield, text: "Enterprise-grade security & compliance" },
    { icon: Zap,    text: "Instant store provisioning in seconds" },
    { icon: Globe,  text: "Multi-tenant architecture at scale" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: "linear-gradient(145deg, #1e40af 0%, #2563eb 45%, #3b82f6 75%, #06b6d4 100%)" }}>

        {/* Background orbs */}
        <div className="absolute top-[-150px] right-[-150px] w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, white, transparent)" }} />
        <div className="absolute bottom-[-100px] left-[-100px] w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, white, transparent)" }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/25"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}>
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-extrabold text-xl tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
              SiteSellr
            </div>
            <div className="text-white/50 text-[10px] uppercase tracking-widest font-medium">Commerce Platform</div>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold mb-6 border border-white/20"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)" }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Multi-Tenant Commerce Platform
          </div>
          <h1 className="font-extrabold text-white leading-tight mb-5 tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(1.9rem, 3vw, 2.7rem)" }}>
            Build & manage<br />
            <span className="text-white/55">stores at scale</span>
          </h1>
          <p className="text-white/70 text-[15px] leading-relaxed max-w-md mb-10">
            One platform to launch thousands of online stores. Role-based access, powerful tenant management, and enterprise analytics.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mb-10">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <div className="text-white font-extrabold text-2xl leading-none mb-1"
                  style={{ fontFamily: "Manrope, sans-serif" }}>{value}</div>
                <div className="text-white/55 text-xs">{label}</div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.12)" }}>
                  <Icon className="w-4 h-4 text-white/80" />
                </div>
                <span className="text-white/70 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live activity cards */}
        <div className="relative z-10 space-y-2.5">
          {[
            { icon: "📦", title: "New store created", sub: "TechMart India • 2 min ago" },
            { icon: "💰", title: "Subscription renewed — ₹4,999/mo", sub: "FashionHub • 5 min ago" },
          ].map(({ icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/20"
              style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.12)" }}>{icon}</div>
              <div>
                <div className="text-white text-sm font-semibold leading-tight">{title}</div>
                <div className="text-white/50 text-xs mt-0.5">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 py-12 lg:px-16">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>SiteSellr</span>
          </div>

          <div className="mb-8">
            <h2 className="font-extrabold text-slate-900 mb-2 tracking-tight"
              style={{ fontFamily: "Manrope, sans-serif", fontSize: "1.85rem" }}>
              Welcome back 👋
            </h2>
            <p className="text-slate-500 text-[15px] leading-relaxed">
              Sign in to your portal. Your dashboard adapts based on your role.
            </p>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 mb-7">
            {[
              { key: "platform_admin", icon: Building2, label: "Platform Admin" },
              { key: "store_owner",    icon: Store,     label: "Store Owner" },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setRole(key)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  role === key
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={role === "platform_admin" ? "admin@sitesellr.com" : "owner@mystore.com"}
                  className="w-full h-12 pl-10 pr-4 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-slate-900 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-800">Password</label>
                <a href="#" className="text-xs font-semibold text-blue-600 hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-11 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-slate-900 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" />
              <span className="text-sm text-slate-500">Remember me for 30 days</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold text-[15px] text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70"
              style={{
                fontFamily: "Manrope, sans-serif",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                boxShadow: "0 4px 15px rgba(37,99,235,0.35)"
              }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
            {error ? <p className="text-xs text-red-600 mt-2">{error}</p> : null}
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or continue with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* SSO */}
          <button className="w-full h-11 rounded-xl border-[1.5px] border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center gap-2.5 text-sm font-semibold text-slate-700 transition-all duration-200">
            <Shield className="w-4 h-4 text-slate-500" />
            Single Sign-On (SSO)
          </button>

          <p className="text-center mt-7 text-sm text-slate-500">
            New to SiteSellr?{" "}
            <a href="#" className="font-semibold text-blue-600 hover:underline">Request access</a>
          </p>
        </div>
      </div>
    </div>
  );
}
