import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import api from "../../lib/api";

const CONTENT = {
  payments: { title: "Payments & Transactions", endpoint: "/platform/owner/payments" },
  billing: { title: "Billing & Subscriptions", endpoint: "/platform/owner/billing" },
  plugins: { title: "Plugin / App Marketplace", endpoint: "/platform/owner/plugins" },
  api: { title: "API & Integrations", endpoint: "/platform/owner/api-integrations" },
  risk: { title: "Risk / Fraud Monitoring", endpoint: "/platform/owner/risk" },
  config: { title: "Platform Configuration", endpoint: "/platform/owner/config" },
  domains: { title: "Domains & SSL (Platform)", endpoint: "/platform/owner/domains" },
  reports: { title: "Reporting & Intelligence", endpoint: "/platform/owner/reports" },
};

const Metric = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="text-xl font-semibold mt-1">{value}</p>
  </div>
);

export default function PlatformModule({ moduleKey = "reports" }) {
  const module = CONTENT[moduleKey] || CONTENT.reports;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [configForm, setConfigForm] = useState({
    paymentGatewayProvider: "default",
    taxGstPercent: "18",
    featureFlagsJson: "{}",
    limitsJson: "{}",
    communicationProvider: "smtp",
    regionRulesJson: "{}",
  });
  const [apiConfigForm, setApiConfigForm] = useState({
    globalDisable: "false",
    defaultRateLimitRpm: "120",
    versionPolicy: "v1",
  });
  const [domainsConfigForm, setDomainsConfigForm] = useState({
    cloudflareApiToken: "",
    cloudflareZoneId: "",
    platformBaseDomain: "",
    platformIngressHost: "",
    sslIssuerCommand: "",
    sslContactEmail: "",
    sslRequireMarketplacePurchase: "true",
    acmeClient: "certbot",
    acmeChallengeMethod: "dns-01",
    acmeDirectoryUrl: "https://acme-v02.api.letsencrypt.org/directory",
  });
  const [cloudflareTestResult, setCloudflareTestResult] = useState("");
  const [sslTestResult, setSslTestResult] = useState("");
  const [zones, setZones] = useState([]);
  const [planForm, setPlanForm] = useState({
    name: "",
    code: "",
    pricePerMonth: "0",
    trialDays: "14",
    maxStores: "1",
    maxProducts: "1000",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(module.endpoint);
      setData(res.data || {});
      if (moduleKey === "config") {
        setConfigForm((prev) => ({ ...prev, ...(res.data || {}) }));
      }
      if (moduleKey === "api") {
        setApiConfigForm((prev) => ({ ...prev, ...(res.data?.config || {}) }));
      }
      if (moduleKey === "domains") {
        setDomainsConfigForm((prev) => ({ ...prev, ...(res.data?.config || {}) }));
        setZones([]);
        setCloudflareTestResult("");
        setSslTestResult("");
      }
    } catch (err) {
      setError(err?.response?.status === 403 ? "You are not authorized." : "Could not load module data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey]);

  const savePlatformConfig = async () => {
    setError("");
    setMessage("");
    try {
      await api.put("/platform/owner/config", configForm);
      setMessage("Platform configuration saved.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save configuration.");
    }
  };

  const saveApiConfig = async () => {
    setError("");
    setMessage("");
    try {
      await api.put("/platform/owner/api-integrations/config", apiConfigForm);
      setMessage("API configuration saved.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save API configuration.");
    }
  };

  const saveDomainsConfig = async () => {
    setError("");
    setMessage("");
    try {
      await api.put("/platform/owner/domains/config", domainsConfigForm);
      setMessage("Domains/SSL configuration saved.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save Domains/SSL configuration.");
    }
  };

  const testCloudflare = async () => {
    setError("");
    setMessage("");
    setCloudflareTestResult("");
    try {
      const payload = { apiToken: (domainsConfigForm.cloudflareApiToken || "").trim() };
      const [testRes, zonesRes] = await Promise.all([
        api.post("/platform/owner/domains/test-cloudflare", payload),
        api.get("/platform/owner/domains/cloudflare-zones"),
      ]);
      setCloudflareTestResult(testRes?.data?.message || "Cloudflare token validated.");
      setZones(zonesRes?.data?.zones || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "Cloudflare connection test failed.");
      setZones([]);
    }
  };

  const testSslProvider = async () => {
    setError("");
    setMessage("");
    setSslTestResult("");
    try {
      const res = await api.post("/platform/owner/domains/test-ssl", { provider: "letsencrypt" });
      if (res?.data?.success) {
        setSslTestResult(`SSL provider ready (${res?.data?.provider}, ${res?.data?.executable || "command"}).`);
      } else {
        setSslTestResult(res?.data?.message || "SSL provider is not fully ready.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "SSL provider test failed.");
    }
  };

  const createPlan = async () => {
    setError("");
    setMessage("");
    try {
      await api.post("/platform/billing-plans", {
        name: planForm.name.trim(),
        code: planForm.code.trim().toLowerCase(),
        pricePerMonth: Number(planForm.pricePerMonth),
        trialDays: Number(planForm.trialDays),
        maxStores: Number(planForm.maxStores),
        maxProducts: Number(planForm.maxProducts),
        maxVariantsPerProduct: 100,
        maxCategories: 100,
        maxPaymentGateways: 1,
        allowedGatewayTypesJson: "[]",
        codEnabled: true,
        smsEnabled: false,
        smsQuotaMonthly: 0,
        emailEnabled: true,
        emailQuotaMonthly: 5000,
        whatsappEnabled: false,
        whatsappFeaturesTier: "none",
        maxPluginsInstalled: 2,
        allowedPluginTiersJson: "[]",
        paidPluginsAllowed: false,
        allowedThemeTier: "free",
        maxThemeInstalls: 1,
        premiumThemeAccess: false,
        capabilitiesJson: "{}",
        isActive: true,
      });
      setPlanForm({ name: "", code: "", pricePerMonth: "0", trialDays: "14", maxStores: "1", maxProducts: "1000" });
      setMessage("Billing plan created.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not create plan.");
    }
  };

  const toggleKillSwitch = async () => {
    setError("");
    setMessage("");
    try {
      const next = !data?.killSwitch;
      await api.put("/platform/owner/plugins/kill-switch", { enabled: next });
      setMessage(`Plugin kill switch is now ${next ? "ON" : "OFF"}.`);
      await load();
    } catch {
      setError("Could not update plugin kill switch.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{module.title}</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Platform-owner control surface backed by live backend APIs.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}

      {moduleKey === "payments" ? (
        <>
          <div className="grid md:grid-cols-5 gap-3">
            <Metric label="Total Transactions" value={data?.totalTransactions ?? 0} />
            <Metric label="Paid" value={data?.paidTransactions ?? 0} />
            <Metric label="Pending" value={data?.pendingTransactions ?? 0} />
            <Metric label="Refunded" value={data?.refundedTransactions ?? 0} />
            <Metric label="Success %" value={`${data?.paymentSuccessRate ?? 0}%`} />
          </div>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.recent || []).map((row) => (
                <div key={row.id} className="text-sm border rounded p-2">
                  <p className="font-medium">{row.merchantName} · {row.storeName}</p>
                  <p className="text-slate-500">{row.currency} {row.total} · {row.paymentStatus}</p>
                </div>
              ))}
              {!loading && (data?.recent || []).length === 0 ? <p className="text-sm text-slate-500">No transactions found.</p> : null}
            </CardContent>
          </Card>
        </>
      ) : null}

      {moduleKey === "billing" ? (
        <>
          <div className="grid md:grid-cols-4 gap-3">
            <Metric label="Total Subscriptions" value={data?.totalSubscriptions ?? 0} />
            <Metric label="Active" value={data?.activeSubscriptions ?? 0} />
            <Metric label="Trial" value={data?.trialSubscriptions ?? 0} />
            <Metric label="Cancelled" value={data?.cancelledSubscriptions ?? 0} />
          </div>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Create Billing Plan</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              <Input placeholder="Plan Name" value={planForm.name} onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Code" value={planForm.code} onChange={(e) => setPlanForm((p) => ({ ...p, code: e.target.value }))} />
              <Input placeholder="Price" type="number" value={planForm.pricePerMonth} onChange={(e) => setPlanForm((p) => ({ ...p, pricePerMonth: e.target.value }))} />
              <Input placeholder="Trial Days" type="number" value={planForm.trialDays} onChange={(e) => setPlanForm((p) => ({ ...p, trialDays: e.target.value }))} />
              <Input placeholder="Max Stores" type="number" value={planForm.maxStores} onChange={(e) => setPlanForm((p) => ({ ...p, maxStores: e.target.value }))} />
              <Input placeholder="Max Products" type="number" value={planForm.maxProducts} onChange={(e) => setPlanForm((p) => ({ ...p, maxProducts: e.target.value }))} />
              <Button onClick={createPlan} disabled={!planForm.name.trim() || !planForm.code.trim()}>Create Plan</Button>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Plans</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.plans || []).map((row) => (
                <div key={row.id} className="text-sm border rounded p-2">
                  <p className="font-medium">{row.name} ({row.code})</p>
                  <p className="text-slate-500">INR {row.pricePerMonth}/mo · max products {row.maxProducts} · {row.isActive ? "active" : "inactive"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      {moduleKey === "plugins" ? (
        <>
          <div className="grid md:grid-cols-6 gap-3">
            <Metric label="Themes" value={data?.themesTotal ?? 0} />
            <Metric label="Active Themes" value={data?.themesActive ?? 0} />
            <Metric label="Featured Themes" value={data?.themesFeatured ?? 0} />
            <Metric label="Paid Themes" value={data?.paidThemes ?? 0} />
            <Metric label="Campaign Templates" value={data?.campaignTemplatesTotal ?? 0} />
            <Metric label="Active Campaigns" value={data?.campaignTemplatesActive ?? 0} />
          </div>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Plugin Kill Switch</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm">Global plugin kill switch state: <span className="font-semibold">{data?.killSwitch ? "ON" : "OFF"}</span></p>
              <Button variant="outline" onClick={toggleKillSwitch}>{data?.killSwitch ? "Turn OFF" : "Turn ON"}</Button>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Recent Campaign Payment Events</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.campaignEvents || []).map((row) => (
                <div key={row.id} className="text-sm border rounded p-2">
                  <p className="font-medium">{row.eventType} · {row.gateway} · {row.status}</p>
                  <p className="text-slate-500">{row.currency} {row.amount}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      {moduleKey === "api" ? (
        <>
          <div className="grid md:grid-cols-4 gap-3">
            <Metric label="Active Tokens" value={data?.activeTokens ?? 0} />
            <Metric label="Revoked Tokens" value={data?.revokedTokens ?? 0} />
            <Metric label="Failed Logins (24h)" value={data?.failedLogins24h ?? 0} />
            <Metric label="Top IP rows" value={(data?.topIps || []).length} />
          </div>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>API Governance Config</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Global Disable</Label>
                <Input value={apiConfigForm.globalDisable} onChange={(e) => setApiConfigForm((p) => ({ ...p, globalDisable: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Default Rate Limit RPM</Label>
                <Input value={apiConfigForm.defaultRateLimitRpm} onChange={(e) => setApiConfigForm((p) => ({ ...p, defaultRateLimitRpm: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Version Policy</Label>
                <Input value={apiConfigForm.versionPolicy} onChange={(e) => setApiConfigForm((p) => ({ ...p, versionPolicy: e.target.value }))} />
              </div>
              <Button onClick={saveApiConfig}>Save API Config</Button>
            </CardContent>
          </Card>
        </>
      ) : null}

      {moduleKey === "risk" ? (
        <>
          <div className="grid md:grid-cols-5 gap-3">
            <Metric label="Suspended Merchants" value={data?.suspendedMerchants ?? 0} />
            <Metric label="Expired Merchants" value={data?.expiredMerchants ?? 0} />
            <Metric label="Failed Logins (24h)" value={data?.failedLogins24h ?? 0} />
            <Metric label="Pending Approvals" value={data?.pendingApprovals ?? 0} />
            <Metric label="High Value Tx (24h)" value={data?.highValueTx24h ?? 0} />
          </div>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Risk Alerts</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.alerts || []).map((row, idx) => (
                <div key={`${row.message}-${idx}`} className="text-sm border rounded p-2">
                  <p className="font-medium uppercase">{row.severity}</p>
                  <p className="text-slate-600">{row.message}</p>
                </div>
              ))}
              {!loading && (data?.alerts || []).length === 0 ? <p className="text-sm text-slate-500">No active alerts.</p> : null}
            </CardContent>
          </Card>
        </>
      ) : null}

      {moduleKey === "config" ? (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader><CardTitle>Global Platform Configuration</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Input placeholder="Payment Gateway Provider" value={configForm.paymentGatewayProvider} onChange={(e) => setConfigForm((p) => ({ ...p, paymentGatewayProvider: e.target.value }))} />
            <Input placeholder="Tax GST Percent" value={configForm.taxGstPercent} onChange={(e) => setConfigForm((p) => ({ ...p, taxGstPercent: e.target.value }))} />
            <Input placeholder="Communication Provider" value={configForm.communicationProvider} onChange={(e) => setConfigForm((p) => ({ ...p, communicationProvider: e.target.value }))} />
            <Input placeholder="Feature Flags JSON" value={configForm.featureFlagsJson} onChange={(e) => setConfigForm((p) => ({ ...p, featureFlagsJson: e.target.value }))} />
            <Input placeholder="Limits JSON" value={configForm.limitsJson} onChange={(e) => setConfigForm((p) => ({ ...p, limitsJson: e.target.value }))} />
            <Input placeholder="Region Rules JSON" value={configForm.regionRulesJson} onChange={(e) => setConfigForm((p) => ({ ...p, regionRulesJson: e.target.value }))} />
            <Button onClick={savePlatformConfig}>Save Platform Config</Button>
          </CardContent>
        </Card>
      ) : null}

      {moduleKey === "domains" ? (
        <>
          <div className="grid md:grid-cols-6 gap-3">
            <Metric label="Subdomains" value={data?.summary?.totalSubdomains ?? 0} />
            <Metric label="Custom Domains" value={data?.summary?.totalCustomDomains ?? 0} />
            <Metric label="Verified Custom" value={data?.summary?.verifiedCustomDomains ?? 0} />
            <Metric label="SSL Active" value={data?.summary?.activeSslCustomDomains ?? 0} />
            <Metric label="SSL Pending" value={data?.summary?.pendingSslCustomDomains ?? 0} />
            <Metric label="Payment Required" value={data?.summary?.paymentRequiredSslCustomDomains ?? 0} />
          </div>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Subdomain Uniqueness Policy</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-300">{data?.subdomainPolicy}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Cloudflare + Let&apos;s Encrypt Configuration</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cloudflare API Token</Label>
                <Input
                  placeholder={data?.config?.cloudflareApiTokenMasked || "not set"}
                  value={domainsConfigForm.cloudflareApiToken}
                  onChange={(e) => setDomainsConfigForm((p) => ({ ...p, cloudflareApiToken: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cloudflare Zone ID</Label>
                <Input value={domainsConfigForm.cloudflareZoneId || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, cloudflareZoneId: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Platform Base Domain</Label>
                <Input value={domainsConfigForm.platformBaseDomain || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, platformBaseDomain: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Platform Ingress Host</Label>
                <Input value={domainsConfigForm.platformIngressHost || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, platformIngressHost: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>SSL Issuer Command</Label>
                <Input value={domainsConfigForm.sslIssuerCommand || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, sslIssuerCommand: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>SSL Contact Email</Label>
                <Input value={domainsConfigForm.sslContactEmail || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, sslContactEmail: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>ACME Client</Label>
                <Input value={domainsConfigForm.acmeClient || "certbot"} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, acmeClient: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>ACME Challenge Method</Label>
                <Input value={domainsConfigForm.acmeChallengeMethod || "dns-01"} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, acmeChallengeMethod: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>ACME Directory URL</Label>
                <Input value={domainsConfigForm.acmeDirectoryUrl || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, acmeDirectoryUrl: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Require SSL Marketplace Purchase</Label>
                <Input value={domainsConfigForm.sslRequireMarketplacePurchase || "true"} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, sslRequireMarketplacePurchase: e.target.value }))} />
              </div>
              <div className="md:col-span-2 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Runtime status: Cloudflare {data?.config?.runtime?.cloudflareConfigured ? "configured" : "missing"} · Let&apos;s Encrypt {data?.config?.runtime?.letsEncryptConfigured ? "configured" : "missing"}
                </p>
                <Button onClick={saveDomainsConfig}>Save Domain Config</Button>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button variant="outline" onClick={testCloudflare}>Test Cloudflare + Load Zones</Button>
                <Button variant="outline" onClick={testSslProvider}>Test SSL Provider Command</Button>
              </div>
              {cloudflareTestResult ? <p className="md:col-span-2 text-xs text-green-600">{cloudflareTestResult}</p> : null}
              {sslTestResult ? <p className="md:col-span-2 text-xs text-green-600">{sslTestResult}</p> : null}
              {zones.length > 0 ? (
                <div className="md:col-span-2 border rounded p-3">
                  <p className="text-sm font-semibold mb-2">Available Cloudflare Zones</p>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {zones.map((zone) => (
                      <button
                        key={zone.id}
                        type="button"
                        className="w-full text-left text-xs border rounded px-2 py-1 hover:bg-slate-50"
                        onClick={() => setDomainsConfigForm((p) => ({ ...p, cloudflareZoneId: zone.id }))}
                      >
                        {zone.name} ({zone.id})
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Tenant Subdomains</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.subdomains || []).map((row) => (
                <div key={row.id} className="text-sm border rounded p-2">
                  <p className="font-medium">{row.subdomain || "-"} · {row.name}</p>
                  <p className="text-slate-500">{row.merchantName}</p>
                </div>
              ))}
              {!loading && (data?.subdomains || []).length === 0 ? <p className="text-sm text-slate-500">No subdomains found.</p> : null}
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Custom Domains</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.customDomains || []).map((row) => (
                <div key={row.id} className="text-sm border rounded p-2">
                  <p className="font-medium">{row.hostname}</p>
                  <p className="text-slate-500">{row.merchantName} · {row.storeName}</p>
                  <p className="text-slate-500">dns: {row.dnsStatus} · verified: {String(row.isVerified)} · ssl: {row.sslStatus} · purchased: {String(row.sslPurchased)}</p>
                  {row.lastError ? <p className="text-red-600 text-xs">{row.lastError}</p> : null}
                </div>
              ))}
              {!loading && (data?.customDomains || []).length === 0 ? <p className="text-sm text-slate-500">No custom domains found.</p> : null}
            </CardContent>
          </Card>
        </>
      ) : null}

      {moduleKey === "reports" ? (
        <>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Revenue by Month (Paid)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.paidByMonth || []).map((row) => (
                <div key={row.key} className="text-sm border rounded p-2">
                  <p className="font-medium">{row.key}</p>
                  <p className="text-slate-500">Revenue: {row.revenue} · Tx: {row.transactions}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Merchant Growth</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.merchantsByMonth || []).map((row) => (
                <div key={row.key} className="text-sm border rounded p-2">
                  <p className="font-medium">{row.key}</p>
                  <p className="text-slate-500">New merchants: {row.count}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader><CardTitle>Security Events</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.securityEventsByMonth || []).map((row) => (
                <div key={row.key} className="text-sm border rounded p-2">
                  <p className="font-medium">{row.key}</p>
                  <p className="text-slate-500">Events: {row.count}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
