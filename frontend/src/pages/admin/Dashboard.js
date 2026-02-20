import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { IndianRupee, ShoppingCart, Users, Percent, ArrowRight, Activity } from "lucide-react";
import { formatCurrency, formatNumber } from "../../lib/utils";
import useActiveStore from "../../hooks/useActiveStore";
import api from "../../lib/api";

const palette = ["#2563EB", "#16A34A", "#F59E0B", "#7C3AED", "#DB2777", "#0D9488"];

const StatsCard = ({ title, value, change, icon: Icon, prefix = "", suffix = "" }) => (
  <Card className="border-slate-200 dark:border-slate-800">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {change >= 0 ? "+" : ""}{change}%
        </Badge>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">
        {prefix}{typeof value === "number" ? formatNumber(value) : value}{suffix}
      </p>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const { storeId } = useActiveStore();
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/stores/${storeId}/insights/dashboard`, { params: { range } });
      setData(res.data || null);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, range]);

  const categorySplit = useMemo(
    () => (data?.categorySplit || []).map((x, idx) => ({ ...x, color: palette[idx % palette.length] })),
    [data]
  );

  if (!storeId) return <div className="p-6 text-sm text-amber-600">Store is not selected.</div>;

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Live store metrics and activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last 1 year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Revenue" value={data?.metrics?.totalRevenue || 0} change={data?.metrics?.revenueChange || 0} icon={IndianRupee} prefix="₹" />
        <StatsCard title="Total Orders" value={data?.metrics?.totalOrders || 0} change={data?.metrics?.ordersChange || 0} icon={ShoppingCart} />
        <StatsCard title="Total Customers" value={data?.metrics?.totalCustomers || 0} change={data?.metrics?.customersChange || 0} icon={Users} />
        <StatsCard title="Conversion Rate" value={data?.metrics?.conversionRate || 0} change={0} icon={Percent} suffix="%" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
          <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.revenueSeries || []}>
                  <defs>
                    <linearGradient id="dashRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#dashRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader><CardTitle>Catalog by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categorySplit} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value">
                    {categorySplit.map((entry, idx) => <Cell key={`${entry.name}-${idx}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link to="/admin/orders" className="text-sm text-blue-600 inline-flex items-center gap-1">View All <ArrowRight className="w-4 h-4" /></Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recentOrders || []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{String(row.id).slice(0, 8)}</TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{formatCurrency(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!loading && (data?.recentOrders || []).length === 0 ? <p className="p-4 text-sm text-slate-500">No orders in selected range.</p> : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.recentActivities || []).map((row) => (
              <div key={row.id} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{row.action}</p>
                  <p className="text-xs text-slate-500 truncate">{row.details || "-"}</p>
                </div>
              </div>
            ))}
            {!loading && (data?.recentActivities || []).length === 0 ? <p className="text-sm text-slate-500">No activity logs found.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
