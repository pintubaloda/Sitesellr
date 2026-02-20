import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Megaphone, Layers, IndianRupee, MessageSquare, ShoppingBag } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import useActiveStore from "../../hooks/useActiveStore";
import api from "../../lib/api";

const MetricCard = ({ title, value, icon: Icon }) => (
  <Card className="border-slate-200 dark:border-slate-800">
    <CardContent className="p-5">
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

export default function Marketing() {
  const { storeId } = useActiveStore();
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/stores/${storeId}/insights/marketing`, { params: { range } });
      setData(res.data || null);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load marketing data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, range]);

  const purchaseTemplate = async (templateId) => {
    setMessage("");
    setError("");
    try {
      await api.post(`/stores/${storeId}/storefront/campaign-templates/${templateId}/purchase`);
      setMessage("Campaign template activated for your store.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not activate template.");
    }
  };

  if (!storeId) return <div className="p-6 text-sm text-amber-600">Store is not selected.</div>;

  return (
    <div className="space-y-6" data-testid="marketing-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Marketing</h1>
          <p className="text-slate-500 dark:text-slate-400">Live campaign subscriptions, spend, and template marketplace.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40 rounded-lg">
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
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/admin/store-builder">Open Builder</Link>
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Active Campaigns" value={data?.metrics?.activeCampaigns || 0} icon={Megaphone} />
        <MetricCard title="Paid Campaigns" value={data?.metrics?.paidCampaigns || 0} icon={ShoppingBag} />
        <MetricCard title="Marketing Spend" value={formatCurrency(data?.metrics?.marketingSpend || 0)} icon={IndianRupee} />
        <MetricCard title="Templates Available" value={data?.metrics?.templatesAvailable || 0} icon={Layers} />
        <MetricCard title="Quote Inquiries" value={data?.metrics?.quoteInquiries || 0} icon={MessageSquare} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader><CardTitle>Active Campaign Subscriptions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.subscriptions || []).map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{row.templateName}</p>
                  <Badge variant="secondary">{row.status}</Badge>
                </div>
                <p className="text-sm text-slate-500">{row.currency} {row.chargedAmount} · {row.billingStatus}</p>
              </div>
            ))}
            {!loading && (data?.subscriptions || []).length === 0 ? <p className="text-sm text-slate-500">No subscriptions yet.</p> : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader><CardTitle>Template Marketplace</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.templates || []).map((tpl) => (
              <div key={tpl.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{tpl.name}</p>
                    <p className="text-xs text-slate-500">{tpl.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{tpl.isPaid ? formatCurrency(tpl.price) : "Free"}</p>
                    {tpl.isFeatured ? <Badge variant="secondary">Featured</Badge> : null}
                  </div>
                </div>
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => purchaseTemplate(tpl.id)}>
                    Activate
                  </Button>
                </div>
              </div>
            ))}
            {!loading && (data?.templates || []).length === 0 ? <p className="text-sm text-slate-500">No templates available.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader><CardTitle>Recent Marketing Payment Events</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(data?.paymentEvents || []).map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{row.eventType}</p>
                <p className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">{row.currency} {row.amount}</p>
                <Badge variant="secondary">{row.status}</Badge>
              </div>
            </div>
          ))}
          {!loading && (data?.paymentEvents || []).length === 0 ? <p className="text-sm text-slate-500">No marketing payment events in selected range.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
