import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ScrollArea } from "../ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useTheme } from "../../context/ThemeContext";
import { cn } from "../../lib/utils";
import { notifications } from "../../lib/mock-data";
import useActiveStore from "../../hooks/useActiveStore";
import api, { setAuthToken } from "../../lib/api";
import { clearStoredTokens, getStoredRefreshToken } from "../../lib/session";
import {
  Store,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Palette,
  Percent,
  BarChart3,
  Settings,
  Building2,
  ShieldCheck,
  ClipboardList,
  ChevronLeft,
  Menu,
  Moon,
  Sun,
  Bell,
  Search,
  LogOut,
  User,
  HelpCircle,
  CreditCard,
  Truck,
  Globe,
  ChevronDown,
} from "lucide-react";

const sidebarItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin",
  },
  {
    title: "Products",
    icon: Package,
    path: "/admin/products",
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    path: "/admin/orders",
  },
  {
    title: "Customers",
    icon: Users,
    path: "/admin/customers",
  },
  {
    title: "Store Builder",
    icon: Palette,
    path: "/admin/store-builder",
  },
  {
    title: "Marketing",
    icon: Percent,
    path: "/admin/marketing",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    path: "/admin/analytics",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/admin/settings",
  },
  {
    title: "Merchants",
    icon: Building2,
    path: "/admin/merchants",
  },
  {
    title: "Platform RBAC",
    icon: ShieldCheck,
    path: "/admin/platform-rbac",
  },
  {
    title: "Audit Logs",
    icon: ClipboardList,
    path: "/admin/audit-logs",
  },
];

const SidebarContent = ({ collapsed, setCollapsed, onItemClick }) => {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-800",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <Link to="/admin" className="flex items-center gap-2" onClick={onItemClick}>
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-slate-900 dark:text-white">Sitesellr</span>
          )}
        </Link>
        {!collapsed && setCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="hidden lg:flex rounded-full h-8 w-8"
            data-testid="collapse-sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== "/admin" && location.pathname.startsWith(item.path));
            
            return (
              <TooltipProvider key={item.path} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.path}
                      onClick={onItemClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
                        collapsed && "justify-center px-2"
                      )}
                      data-testid={`sidebar-${item.title.toLowerCase().replace(" ", "-")}`}
                    >
                      <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-blue-600 dark:text-blue-400")} />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="font-medium">
                      {item.title}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Section */}
      <div className={cn(
        "p-4 border-t border-slate-200 dark:border-slate-800",
        collapsed && "px-2"
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                Admin User
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                admin@store.com
              </p>
            </div>
          </div>
        ) : (
          <Avatar className="h-9 w-9 mx-auto">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
};

export const DashboardLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { stores, storeId, setStoreId } = useActiveStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch (_) {
      // Ignore network/logout errors on client-side logout.
    } finally {
      clearStoredTokens();
      setAuthToken("");
      navigate("/auth/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 hidden lg:block",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <SidebarContent collapsed={collapsed} setCollapsed={setCollapsed} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent collapsed={false} onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        collapsed ? "lg:pl-[72px]" : "lg:pl-64"
      )}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            {/* Left Side */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-full"
                onClick={() => setMobileOpen(true)}
                data-testid="mobile-menu-toggle"
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Expand Sidebar (Desktop) */}
              {collapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:flex rounded-full"
                  onClick={() => setCollapsed(false)}
                  data-testid="expand-sidebar"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              )}

              {/* Search */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 w-80">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products, orders, customers..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  data-testid="header-search"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-slate-400 bg-white dark:bg-slate-700 rounded">
                  <span>⌘</span>K
                </kbd>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {stores.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="hidden md:flex rounded-full">
                      {stores.find((store) => store.id === storeId)?.name || "Select Store"}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {stores.map((store) => (
                      <DropdownMenuItem key={store.id} className="cursor-pointer" onClick={() => setStoreId(store.id)}>
                        {store.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {/* View Store */}
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center gap-2 rounded-full"
                data-testid="view-store"
              >
                <Globe className="w-4 h-4" />
                <span>View Store</span>
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
                data-testid="theme-toggle"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full relative" data-testid="notifications-btn">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <ScrollArea className="h-64">
                    {notifications.map((notification) => (
                      <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                          <span className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            notification.read ? "bg-slate-300 dark:bg-slate-600" : "bg-blue-500"
                          )} />
                          <span className="font-medium text-sm">{notification.title}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 pl-4">
                          {notification.message}
                        </p>
                        <span className="text-xs text-slate-400 pl-4">{notification.time}</span>
                      </DropdownMenuItem>
                    ))}
                  </ScrollArea>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-center text-sm text-blue-600 dark:text-blue-400 cursor-pointer">
                    View all notifications
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 rounded-full pr-2" data-testid="user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" />
                      <AvatarFallback>AD</AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>Admin User</span>
                      <span className="text-xs font-normal text-slate-500">admin@store.com</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/admin/settings")}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Help & Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
