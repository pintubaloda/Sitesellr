import React, { useCallback, useEffect, useState } from "react";
import api, { setAuthToken } from "../lib/api";
import { clearStoredStoreId, clearStoredTokens, getStoredAccessToken, getStoredStoreId, getStoredRefreshToken, setStoredStoreId, setStoredTokens } from "../lib/session";
import "./portal.css";
import LoginPage from "./pages/auth/LoginPage";
import PlatformDashboard from "./pages/platform/PlatformDashboard";
import TenantManagement from "./pages/platform/TenantManagement";
import StoreDashboard from "./pages/store/StoreDashboard";
import StoreOrders from "./pages/store/StoreOrders";
import DashboardLayout from "./components/layouts/DashboardLayout";

export const AuthContext = React.createContext(null);

export function useAuth() {
  return React.useContext(AuthContext);
}

const buildAuthFromAccess = (access, profile = {}) => {
  const platform = !!access?.isPlatformOwner || !!access?.isPlatformStaff;
  return {
    role: platform ? "platform_admin" : "store_owner",
    name: profile?.name || profile?.email || "User",
    email: profile?.email || "",
    initials: (profile?.name || profile?.email || "U")
      .split(" ")
      .map((x) => x[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    storeName: access?.currentStoreName || "Store",
    storeDomain: access?.currentStoreName ? `${String(access.currentStoreName).toLowerCase().replace(/\s+/g, "-")}.sitesellr.com` : "",
    plan: "Pro",
  };
};

export default function PortalApp() {
  const [auth, setAuth] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [booting, setBooting] = useState(true);

  const loadSession = useCallback(async () => {
    const token = getStoredAccessToken();
    if (!token) {
      setAuth(null);
      setBooting(false);
      return;
    }
    setAuthToken(token);
    try {
      const [accessRes, meRes] = await Promise.all([
        api.get("/auth/access"),
        api.get("/auth/me").catch(() => ({ data: {} })),
      ]);
      const access = accessRes?.data || {};
      const profile = meRes?.data || {};
      if (access?.currentStoreId) {
        setStoredStoreId(access.currentStoreId);
        api.defaults.headers.common["X-Store-Id"] = access.currentStoreId;
      } else {
        const existingStoreId = getStoredStoreId();
        if (existingStoreId) api.defaults.headers.common["X-Store-Id"] = existingStoreId;
      }
      setAuth(buildAuthFromAccess(access, profile));
    } catch {
      clearStoredTokens();
      clearStoredStoreId();
      setAuthToken("");
      setAuth(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async ({ email, password }) => {
    const payload = { email: (email || "").trim().toLowerCase(), password };
    const res = await api.post("/auth/login", payload);
    const accessToken = res?.data?.access_token || res?.data?.token || "";
    const refreshToken = res?.data?.refresh_token || res?.data?.refreshToken || "";
    if (!accessToken) throw new Error("missing_token");
    setStoredTokens({ accessToken, refreshToken });
    setAuthToken(accessToken);
    const accessRes = await api.get("/auth/access");
    const meRes = await api.get("/auth/me").catch(() => ({ data: {} }));
    const access = accessRes?.data || {};
    if (access?.currentStoreId) {
      setStoredStoreId(access.currentStoreId);
      api.defaults.headers.common["X-Store-Id"] = access.currentStoreId;
    }
    setAuth(buildAuthFromAccess(access, meRes?.data || {}));
    setCurrentPage("dashboard");
  };

  const logout = async () => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) await api.post("/auth/logout", { refresh_token: refreshToken });
    } catch {
      // ignore
    } finally {
      clearStoredTokens();
      clearStoredStoreId();
      setAuthToken("");
      delete api.defaults.headers.common["X-Store-Id"];
      setAuth(null);
      setCurrentPage("dashboard");
    }
  };

  if (booting) return <div className="min-h-screen grid place-items-center text-slate-500">Loading portal...</div>;

  if (!auth) {
    return (
      <AuthContext.Provider value={{ auth, login, logout }}>
        <LoginPage />
      </AuthContext.Provider>
    );
  }

  const renderPage = () => {
    if (auth.role === "platform_admin") {
      switch (currentPage) {
        case "tenants": return <TenantManagement />;
        default: return <PlatformDashboard />;
      }
    }
    switch (currentPage) {
      case "orders": return <StoreOrders />;
      default: return <StoreDashboard />;
    }
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage} onLogout={logout}>
        {renderPage()}
      </DashboardLayout>
    </AuthContext.Provider>
  );
}
