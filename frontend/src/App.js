import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

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
          <Route path="/onboarding" element={<Navigate to="/auth/register" replace />} />
          
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
