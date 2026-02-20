import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { formatCurrency, formatNumber } from "../../lib/utils";
import { Calendar, Download, IndianRupee, ShoppingCart, Users, Percent } from "lucide-react";
import useActiveStore from "../../hooks/useActiveStore";
import api from "../../lib/api";

const colors = ["#2563EB", "#16A34A", "#F59E0B", "#7C3AED", "#DB2777", "#0D9488"];

const MetricCard = ({ title, value, icon: Icon }) => (
  <Card className="border-slate-200 dark:border-slate-800">
    <CardContent className="p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Analytics() {
  const { storeId } = useActiveStore();
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/stores/${storeId}/insights/analytics`, { params: { range } });
      setData(res.data || null);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, range]);

  const statusData = useMemo(
    () => (data?.statusBreakdown || []).map((x, idx) => ({ ...x, color: colors[idx % colors.length] })),
    [data]
  );

  if (!storeId) return <div className="p-6 text-sm text-amber-600">Store is not selected.</div>;

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400">Live performance metrics for your store.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40 rounded-lg">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last 1 year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-lg" onClick={load} disabled={loading}>
            <Download className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Revenue" value={formatCurrency(data?.metrics?.totalRevenue || 0)} icon={IndianRupee} />
        <MetricCard title="Orders" value={formatNumber(data?.metrics?.totalOrders || 0)} icon={ShoppingCart} />
        <MetricCard title="AOV" value={formatCurrency(data?.metrics?.avgOrderValue || 0)} icon={IndianRupee} />
        <MetricCard title="Customers" value={formatNumber(data?.metrics?.totalCustomers || 0)} icon={Users} />
        <MetricCard title="Conversion" value={`${data?.metrics?.conversionRate || 0}%`} icon={Percent} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
          <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.revenueSeries || []}>
                  <defs>
                    <linearGradient id="analyticsRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#analyticsRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader><CardTitle>Order Status Split</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3}>
                    {statusData.map((entry, idx) => <Cell key={`${entry.name}-${idx}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader><CardTitle>Top Products by Revenue</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data?.topProducts || []).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} interval={0} angle={-10} textAnchor="end" height={80} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <Tooltip formatter={(value) => [formatCurrency(value), "Revenue"]} />
                <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
