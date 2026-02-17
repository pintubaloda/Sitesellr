import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { revenueData, salesByCategory } from "../../lib/mock-data";
import { formatCurrency, formatNumber } from "../../lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  ShoppingCart,
  Eye,
  MousePointer,
} from "lucide-react";

const trafficData = [
  { name: "Mon", visitors: 2400, pageViews: 4800 },
  { name: "Tue", visitors: 1398, pageViews: 3200 },
  { name: "Wed", visitors: 9800, pageViews: 12000 },
  { name: "Thu", visitors: 3908, pageViews: 7800 },
  { name: "Fri", visitors: 4800, pageViews: 9600 },
  { name: "Sat", visitors: 3800, pageViews: 7600 },
  { name: "Sun", visitors: 4300, pageViews: 8600 },
];

const conversionData = [
  { name: "Week 1", rate: 2.4 },
  { name: "Week 2", rate: 2.8 },
  { name: "Week 3", rate: 3.1 },
  { name: "Week 4", rate: 2.9 },
];

const topProducts = [
  { name: "Premium Wireless Headphones", sales: 234, revenue: 1169766 },
  { name: "Organic Cotton T-Shirt", sales: 567, revenue: 509733 },
  { name: "Smart Watch Pro", sales: 189, revenue: 2456811 },
  { name: "Natural Face Serum", sales: 445, revenue: 578055 },
  { name: "Leather Wallet", sales: 156, revenue: 389844 },
];

const MetricCard = ({ title, value, change, icon: Icon, trend }) => {
  const isPositive = trend === "up";
  
  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}>
            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {change}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export const Analytics = () => {
  return (
    <div className="space-y-6" data-testid="analytics-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Track your store performance and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="30d">
            <SelectTrigger className="w-40 rounded-lg" data-testid="date-range-select">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">This year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-lg" data-testid="export-analytics">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Visitors"
          value="24,532"
          change="12.5%"
          icon={Users}
          trend="up"
        />
        <MetricCard
          title="Page Views"
          value="89,245"
          change="8.2%"
          icon={Eye}
          trend="up"
        />
        <MetricCard
          title="Conversion Rate"
          value="3.2%"
          change="0.4%"
          icon={MousePointer}
          trend="down"
        />
        <MetricCard
          title="Avg. Order Value"
          value={formatCurrency(2847)}
          change="5.1%"
          icon={ShoppingCart}
          trend="up"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-slate-200 dark:border-slate-800" data-testid="revenue-trends-chart">
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: "8px" }}
                    formatter={(value) => [formatCurrency(value), "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Traffic Chart */}
        <Card className="border-slate-200 dark:border-slate-800" data-testid="traffic-chart">
          <CardHeader>
            <CardTitle>Traffic Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: "8px" }}
                  />
                  <Bar dataKey="visitors" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pageViews" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sales by Category */}
        <Card className="border-slate-200 dark:border-slate-800" data-testid="category-breakdown-chart">
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {salesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, "Share"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {salesByCategory.map((category) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{category.name}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{category.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="border-slate-200 dark:border-slate-800" data-testid="conversion-chart">
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value) => [`${value}%`, "Rate"]} />
                  <Line type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2} dot={{ fill: "#10B981", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border-slate-200 dark:border-slate-800" data-testid="top-products-card">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-400">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {product.sales} sales
                    </p>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
