import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  dashboardStats,
  revenueData,
  salesByCategory,
  orders,
  activityLogs,
} from "../../lib/mock-data";
import { formatCurrency, formatNumber, formatDateTime, getInitials } from "../../lib/utils";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ShoppingCart,
  Users,
  Percent,
  ArrowRight,
  Package,
  CreditCard,
  UserPlus,
  Tag,
  Eye,
} from "lucide-react";
import { Link } from "react-router-dom";

const StatsCard = ({ title, value, change, icon: Icon, prefix = "", suffix = "" }) => {
  const isPositive = change >= 0;

  return (
    <Card className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow" data-testid={`stats-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <Badge
            variant="secondary"
            className={`${
              isPositive
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change)}%
          </Badge>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {prefix}{typeof value === "number" ? formatNumber(value) : value}{suffix}
        </p>
      </CardContent>
    </Card>
  );
};

const getStatusBadge = (status) => {
  const styles = {
    pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    processing: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    shipped: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    delivered: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    cancelled: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <Badge variant="secondary" className={styles[status] || styles.pending}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const activityIcons = {
  order: ShoppingCart,
  product: Package,
  customer: UserPlus,
  payment: CreditCard,
  discount: Tag,
};

export const Dashboard = () => {
  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Welcome back! Here's your store overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="7d">
            <SelectTrigger className="w-36 rounded-lg" data-testid="date-range-select">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">This year</SelectItem>
            </SelectContent>
          </Select>
          <Button className="rounded-lg bg-blue-600 hover:bg-blue-700" data-testid="download-report">
            Download Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Revenue"
          value={dashboardStats.totalRevenue}
          change={dashboardStats.revenueChange}
          icon={IndianRupee}
          prefix="₹"
        />
        <StatsCard
          title="Total Orders"
          value={dashboardStats.totalOrders}
          change={dashboardStats.ordersChange}
          icon={ShoppingCart}
        />
        <StatsCard
          title="Total Customers"
          value={dashboardStats.totalCustomers}
          change={dashboardStats.customersChange}
          icon={Users}
        />
        <StatsCard
          title="Conversion Rate"
          value={dashboardStats.conversionRate}
          change={dashboardStats.conversionChange}
          icon={Percent}
          suffix="%"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800" data-testid="revenue-chart">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Revenue Overview</CardTitle>
            <Select defaultValue="revenue">
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="orders">Orders</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94A3B8", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94A3B8", fontSize: 12 }}
                    tickFormatter={(value) => `₹${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value) => [formatCurrency(value), "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card className="border-slate-200 dark:border-slate-800" data-testid="category-chart">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {salesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`${value}%`, "Share"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {salesByCategory.map((category) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {category.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {category.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders & Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800" data-testid="recent-orders">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
            <Link to="/admin/orders">
              <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 5).map((order) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell>
                      <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
                        {order.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={order.customer.avatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(order.customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{order.customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="border-slate-200 dark:border-slate-800" data-testid="activity-feed">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
              <Eye className="w-4 h-4 mr-1" />
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLogs.map((log) => {
                const Icon = activityIcons[log.type] || Package;
                return (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {log.action}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {log.details}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{log.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
