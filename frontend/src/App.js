import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AcceptInvite from "./pages/auth/AcceptInvite";

// Admin Pages
import DashboardLayout from "./components/layouts/DashboardLayout";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import Orders from "./pages/admin/Orders";
import Customers from "./pages/admin/Customers";
import StoreBuilder from "./pages/admin/StoreBuilder";
import Marketing from "./pages/admin/Marketing";
import Analytics from "./pages/admin/Analytics";
import Settings from "./pages/admin/Settings";
import Merchants from "./pages/admin/Merchants";
import PlatformRbac from "./pages/admin/PlatformRbac";
import AuditLogs from "./pages/admin/AuditLogs";
import MerchantOps from "./pages/admin/MerchantOps";
import PlatformThemes from "./pages/admin/PlatformThemes";
import StorefrontPublic from "./pages/storefront/StorefrontPublic";
import DomainsSsl from "./pages/admin/DomainsSsl";
import PlatformModule from "./pages/admin/PlatformModule";
import { getStoredAccessToken } from "./lib/session";

const ProtectedRoute = ({ children }) => {
  const token = getStoredAccessToken();
  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="sitesellr-theme">
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          
          {/* Auth Routes */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/accept-invite" element={<AcceptInvite />} />
          <Route path="/onboarding" element={<Navigate to="/auth/register" replace />} />
          <Route path="/s/:subdomain/*" element={<StorefrontPublic />} />
          
          {/* Admin Dashboard Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
            <Route path="customers" element={<Customers />} />
            <Route path="store-builder" element={<StoreBuilder />} />
            <Route path="marketing" element={<Marketing />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="merchants" element={<Merchants />} />
            <Route path="platform-rbac" element={<PlatformRbac />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="merchant-ops" element={<MerchantOps />} />
            <Route path="platform-themes" element={<PlatformThemes />} />
            <Route path="domains-ssl" element={<DomainsSsl />} />
            <Route path="platform-payments" element={<PlatformModule moduleKey="payments" />} />
            <Route path="platform-billing" element={<PlatformModule moduleKey="billing" />} />
            <Route path="platform-plugins" element={<PlatformModule moduleKey="plugins" />} />
            <Route path="platform-api" element={<PlatformModule moduleKey="api" />} />
            <Route path="platform-risk" element={<PlatformModule moduleKey="risk" />} />
            <Route path="platform-config" element={<PlatformModule moduleKey="config" />} />
            <Route path="platform-reports" element={<PlatformModule moduleKey="reports" />} />
          </Route>

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}

export default App;
