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

// Inline status dot
const StatusDot = ({ ok }) => (
  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${ok ? "bg-green-500" : "bg-red-400"}`} />
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
    corsOriginsCsv: "*",
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
    sslPriceInr: "999",
    sslRequireMarketplacePurchase: "true",
    acmeClient: "certbot",
    acmeChallengeMethod: "dns-01",
    acmeDirectoryUrl: "https://acme-v02.api.letsencrypt.org/directory",
    originTlsMode: "cloudflare_origin_ca",
    originTlsIssuerCommand: "",
    originTlsCertPath: "",
    originTlsKeyPath: "",
    cloudflareOauthAuthorizeUrl: "https://dash.cloudflare.com/oauth2/auth",
    cloudflareOauthTokenUrl: "https://dash.cloudflare.com/oauth2/token",
    cloudflareOauthClientId: "",
    cloudflareOauthClientSecret: "",
    cloudflareOauthRedirectUri: "",
    cloudflareOauthScope: "zone:read dns_records:edit",
    cloudflareOauthPostConnectRedirect: "",
  });
  const [cloudflareTestResult, setCloudflareTestResult] = useState(null); // { ok, message }
  const [sslTestResult, setSslTestResult] = useState(null); // { ok, message }
  const [originTlsResult, setOriginTlsResult] = useState(null); // { ok, message }
  const [originTlsStatus, setOriginTlsStatus] = useState(null);
  const [zones, setZones] = useState([]);
  const [cfTesting, setCfTesting] = useState(false);
  const [sslTesting, setSslTesting] = useState(false);
  const [originTlsIssuing, setOriginTlsIssuing] = useState(false);
  const [domainsSaving, setDomainsSaving] = useState(false);
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
        const cfg = res.data?.config || {};
        setDomainsConfigForm((prev) => ({
          ...prev,
          ...cfg,
          // Never pre-fill the token field — only show masked hint via placeholder
          cloudflareApiToken: "",
          cloudflareOauthClientSecret: "",
        }));
        setZones([]);
        setCloudflareTestResult(null);
        setSslTestResult(null);
        setOriginTlsResult(null);
        setOriginTlsStatus(null);
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
    setError(""); setMessage("");
    try {
      await api.put("/platform/owner/config", configForm);
      setMessage("Platform configuration saved.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save configuration.");
    }
  };

  const saveApiConfig = async () => {
    setError(""); setMessage("");
    try {
      await api.put("/platform/owner/api-integrations/config", apiConfigForm);
      setMessage("API configuration saved.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save API configuration.");
    }
  };

  const saveDomainsConfig = async () => {
    setError(""); setMessage(""); setDomainsSaving(true);
    try {
      await api.put("/platform/owner/domains/config", domainsConfigForm);
      setMessage("Domains/SSL configuration saved.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save Domains/SSL configuration.");
    } finally {
      setDomainsSaving(false);
    }
  };

  const testCloudflare = async () => {
    setError(""); setMessage(""); setCloudflareTestResult(null); setCfTesting(true);
    try {
      const payload = { apiToken: (domainsConfigForm.cloudflareApiToken || "").trim() };
      const [testRes, zonesRes] = await Promise.all([
        api.post("/platform/owner/domains/test-cloudflare", payload),
        api.get("/platform/owner/domains/cloudflare-zones"),
      ]);
      setCloudflareTestResult({ ok: true, message: testRes?.data?.message || "Cloudflare token is valid." });
      setZones(zonesRes?.data?.zones || []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Cloudflare connection test failed.";
      setCloudflareTestResult({ ok: false, message: msg });
      setZones([]);
    } finally {
      setCfTesting(false);
    }
  };

  const testSslProvider = async () => {
    setError(""); setMessage(""); setSslTestResult(null); setSslTesting(true);
    try {
      const res = await api.post("/platform/owner/domains/test-ssl", { provider: "letsencrypt" });
      if (res?.data?.success) {
        setSslTestResult({ ok: true, message: `${res.data.provider} ready — '${res.data.executable}' found.` });
      } else {
        setSslTestResult({ ok: false, message: res?.data?.message || "SSL provider command not found or not configured." });
      }
    } catch (err) {
      setSslTestResult({ ok: false, message: err?.response?.data?.message || err?.response?.data?.error || "SSL provider test failed." });
    } finally {
      setSslTesting(false);
    }
  };

  const startCloudflareOAuth = async () => {
    setError(""); setMessage("");
    try {
      const res = await api.get("/platform/owner/domains/cloudflare-oauth/start");
      const url = res?.data?.url;
      if (!url) { setError("Cloudflare OAuth start URL is not available. Check OAuth config."); return; }
      window.location.href = url;
    } catch (err) {
      setError(err?.response?.data?.error || "Cloudflare OAuth connect failed to start.");
    }
  };

  const refreshOriginTlsStatus = async () => {
    setError("");
    try {
      const res = await api.get("/platform/owner/domains/origin-tls/status");
      setOriginTlsStatus(res.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "Could not load origin TLS status.");
    }
  };

  const issueOriginTls = async () => {
    setError(""); setMessage(""); setOriginTlsResult(null); setOriginTlsIssuing(true);
    try {
      const res = await api.post("/platform/owner/domains/origin-tls/issue");
      setOriginTlsResult({ ok: true, message: res?.data?.message || "Origin TLS issued/renewed." });
      await refreshOriginTlsStatus();
    } catch (err) {
      setOriginTlsResult({ ok: false, message: err?.response?.data?.message || err?.response?.data?.error || "Origin TLS issue failed." });
    } finally {
      setOriginTlsIssuing(false);
    }
  };

  const createPlan = async () => {
    setError(""); setMessage("");
    try {
      await api.post("/platform/billing-plans", {
        name: planForm.name.trim(),
        code: planForm.code.trim().toLowerCase(),
        pricePerMonth: Number(planForm.pricePerMonth),
        trialDays: Number(planForm.trialDays),
        maxStores: Number(planForm.maxStores),
        maxProducts: Number(planForm.maxProducts),
        maxVariantsPerProduct: 100, maxCategories: 100, maxPaymentGateways: 1,
        allowedGatewayTypesJson: "[]", codEnabled: true, smsEnabled: false,
        smsQuotaMonthly: 0, emailEnabled: true, emailQuotaMonthly: 5000,
        whatsappEnabled: false, whatsappFeaturesTier: "none", maxPluginsInstalled: 2,
        allowedPluginTiersJson: "[]", paidPluginsAllowed: false, allowedThemeTier: "free",
        maxThemeInstalls: 1, premiumThemeAccess: false, capabilitiesJson: "{}", isActive: true,
      });
      setPlanForm({ name: "", code: "", pricePerMonth: "0", trialDays: "14", maxStores: "1", maxProducts: "1000" });
      setMessage("Billing plan created.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not create plan.");
    }
  };

  const toggleKillSwitch = async () => {
    setError(""); setMessage("");
    try {
      const next = !data?.killSwitch;
      await api.put("/platform/owner/plugins/kill-switch", { enabled: next });
      setMessage(`Plugin kill switch is now ${next ? "ON" : "OFF"}.`);
      await load();
    } catch {
      setError("Could not update plugin kill switch.");
    }
  };

  const cfRuntime = data?.config?.runtime?.cloudflareConfigured;
  const leRuntime = data?.config?.runtime?.letsEncryptConfigured;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{module.title}</h1>
          <p className="text-slate-500 dark:text-slate-400">Platform-owner control surface backed by live backend APIs.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
      </div>

      {error ? <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">{error}</p> : null}
      {message ? <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-4 py-2">{message}</p> : null}

      {/* ── payments ─────────────────────────────────────────────────────────── */}
      {moduleKey === "payments" ? (
        <>
          <div className="grid md:grid-cols-5 gap-3">
            <Metric label="Total Transactions" value={data?.totalTransactions ?? 0} />
            <Metric label="Paid" value={data?.paidTransactions ?? 0} />
            <Metric label="Pending" value={data?.pendingTransactions ?? 0} />
            <Metric label="Refunded" value={data?.refundedTransactions ?? 0} />
            <Metric label="Success %" value={`${data?.paymentSuccessRate ?? 0}%`} />
          </div>
          <Card>
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

      {/* ── billing ──────────────────────────────────────────────────────────── */}
      {moduleKey === "billing" ? (
        <>
          <div className="grid md:grid-cols-4 gap-3">
            <Metric label="Total Subscriptions" value={data?.totalSubscriptions ?? 0} />
            <Metric label="Active" value={data?.activeSubscriptions ?? 0} />
            <Metric label="Trial" value={data?.trialSubscriptions ?? 0} />
            <Metric label="Cancelled" value={data?.cancelledSubscriptions ?? 0} />
          </div>
          <Card>
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
          <Card>
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

      {/* ── plugins ──────────────────────────────────────────────────────────── */}
      {moduleKey === "plugins" ? (
        <>
          <div className="grid md:grid-cols-6 gap-3">
            <Metric label="Themes" value={data?.themesTotal ?? 0} />
            <Metric label="Active Themes" value={data?.themesActive ?? 0} />
            <Metric label="Featured" value={data?.themesFeatured ?? 0} />
            <Metric label="Paid Themes" value={data?.paidThemes ?? 0} />
            <Metric label="Campaign Templates" value={data?.campaignTemplatesTotal ?? 0} />
            <Metric label="Active Campaigns" value={data?.campaignTemplatesActive ?? 0} />
          </div>
          <Card>
            <CardHeader><CardTitle>Plugin Kill Switch</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm">State: <span className="font-semibold">{data?.killSwitch ? "ON" : "OFF"}</span></p>
              <Button variant="outline" onClick={toggleKillSwitch}>{data?.killSwitch ? "Turn OFF" : "Turn ON"}</Button>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* ── api ──────────────────────────────────────────────────────────────── */}
      {moduleKey === "api" ? (
        <>
          <div className="grid md:grid-cols-4 gap-3">
            <Metric label="Active Tokens" value={data?.activeTokens ?? 0} />
            <Metric label="Revoked Tokens" value={data?.revokedTokens ?? 0} />
            <Metric label="Failed Logins (24h)" value={data?.failedLogins24h ?? 0} />
            <Metric label="Top IP rows" value={(data?.topIps || []).length} />
          </div>
          <Card>
            <CardHeader><CardTitle>API Governance Config</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Global Disable</Label><Input value={apiConfigForm.globalDisable} onChange={(e) => setApiConfigForm((p) => ({ ...p, globalDisable: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Default Rate Limit RPM</Label><Input value={apiConfigForm.defaultRateLimitRpm} onChange={(e) => setApiConfigForm((p) => ({ ...p, defaultRateLimitRpm: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Version Policy</Label><Input value={apiConfigForm.versionPolicy} onChange={(e) => setApiConfigForm((p) => ({ ...p, versionPolicy: e.target.value }))} /></div>
              <Button onClick={saveApiConfig}>Save API Config</Button>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* ── risk ─────────────────────────────────────────────────────────────── */}
      {moduleKey === "risk" ? (
        <>
          <div className="grid md:grid-cols-5 gap-3">
            <Metric label="Suspended Merchants" value={data?.suspendedMerchants ?? 0} />
            <Metric label="Expired Merchants" value={data?.expiredMerchants ?? 0} />
            <Metric label="Failed Logins (24h)" value={data?.failedLogins24h ?? 0} />
            <Metric label="Pending Approvals" value={data?.pendingApprovals ?? 0} />
            <Metric label="High Value Tx (24h)" value={data?.highValueTx24h ?? 0} />
          </div>
          <Card>
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

      {/* ── config ───────────────────────────────────────────────────────────── */}
      {moduleKey === "config" ? (
        <Card>
          <CardHeader><CardTitle>Global Platform Configuration</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Input placeholder="Payment Gateway Provider" value={configForm.paymentGatewayProvider} onChange={(e) => setConfigForm((p) => ({ ...p, paymentGatewayProvider: e.target.value }))} />
            <Input placeholder="Tax GST Percent" value={configForm.taxGstPercent} onChange={(e) => setConfigForm((p) => ({ ...p, taxGstPercent: e.target.value }))} />
            <Input placeholder="Communication Provider" value={configForm.communicationProvider} onChange={(e) => setConfigForm((p) => ({ ...p, communicationProvider: e.target.value }))} />
            <Input placeholder="Feature Flags JSON" value={configForm.featureFlagsJson} onChange={(e) => setConfigForm((p) => ({ ...p, featureFlagsJson: e.target.value }))} />
            <Input placeholder="CORS Origins CSV" value={configForm.corsOriginsCsv} onChange={(e) => setConfigForm((p) => ({ ...p, corsOriginsCsv: e.target.value }))} />
            <Button onClick={savePlatformConfig}>Save Platform Config</Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ── domains ──────────────────────────────────────────────────────────── */}
      {moduleKey === "domains" ? (
        <>
          {/* Summary metrics */}
          <div className="grid md:grid-cols-6 gap-3">
            <Metric label="Subdomains" value={data?.summary?.totalSubdomains ?? 0} />
            <Metric label="Custom Domains" value={data?.summary?.totalCustomDomains ?? 0} />
            <Metric label="Verified" value={data?.summary?.verifiedCustomDomains ?? 0} />
            <Metric label="SSL Active" value={data?.summary?.activeSslCustomDomains ?? 0} />
            <Metric label="SSL Pending" value={data?.summary?.pendingSslCustomDomains ?? 0} />
            <Metric label="Awaiting Payment" value={data?.summary?.paymentRequiredSslCustomDomains ?? 0} />
          </div>

          {/* Runtime readiness */}
          <Card>
            <CardHeader><CardTitle>Configuration Readiness</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm">
                <StatusDot ok={cfRuntime} />
                Cloudflare DNS: {cfRuntime ? "configured" : "not configured (api_token / zone_id / base_domain / ingress_host required)"}
              </p>
              <p className="text-sm mt-1">
                <StatusDot ok={leRuntime} />
                Let&apos;s Encrypt: {leRuntime ? "configured" : "not configured (ssl_issuer_command / contact_email required)"}
              </p>
            </CardContent>
          </Card>

          {/* Config form */}
          <Card>
            <CardHeader><CardTitle>Cloudflare + Let&apos;s Encrypt Configuration</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              {/* Cloudflare */}
              <div className="space-y-2">
                <Label>Cloudflare API Token</Label>
                <Input
                  type="password"
                  placeholder={data?.config?.cloudflareApiTokenMasked ? `Current: ${data.config.cloudflareApiTokenMasked}` : "Enter to set or update"}
                  value={domainsConfigForm.cloudflareApiToken}
                  onChange={(e) => setDomainsConfigForm((p) => ({ ...p, cloudflareApiToken: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Cloudflare Zone ID</Label>
                <Input value={domainsConfigForm.cloudflareZoneId || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, cloudflareZoneId: e.target.value }))} placeholder="auto-filled when zone selected below" />
              </div>
              <div className="space-y-2">
                <Label>Platform Base Domain</Label>
                <Input value={domainsConfigForm.platformBaseDomain || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, platformBaseDomain: e.target.value }))} placeholder="yourplatform.com" />
              </div>
              <div className="space-y-2">
                <Label>Platform Ingress Host</Label>
                <Input value={domainsConfigForm.platformIngressHost || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, platformIngressHost: e.target.value }))} placeholder="ingress.yourplatform.com" />
              </div>

              {/* Let's Encrypt */}
              <div className="md:col-span-2 pt-2 border-t">
                <p className="text-sm font-semibold mb-3">Let&apos;s Encrypt / ACME</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>SSL Issuer Command</Label>
                <Input value={domainsConfigForm.sslIssuerCommand || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, sslIssuerCommand: e.target.value }))} placeholder="certbot certonly --dns-cloudflare -d {domain} --email {email} --agree-tos --non-interactive" />
                <p className="text-xs text-slate-400">Supported placeholders: {"{domain}"} {"{email}"} {"{challenge}"} {"{acmeDirectory}"}</p>
              </div>
              <div className="space-y-2">
                <Label>SSL Contact Email</Label>
                <Input value={domainsConfigForm.sslContactEmail || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, sslContactEmail: e.target.value }))} placeholder="ssl@yourplatform.com" />
              </div>
              <div className="space-y-2">
                <Label>SSL Price (INR)</Label>
                <Input type="number" value={domainsConfigForm.sslPriceInr || "999"} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, sslPriceInr: e.target.value }))} />
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
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={domainsConfigForm.sslRequireMarketplacePurchase}
                  onChange={(e) => setDomainsConfigForm((p) => ({ ...p, sslRequireMarketplacePurchase: e.target.value }))}
                >
                  <option value="true">Yes (users must purchase)</option>
                  <option value="false">No (free for all users)</option>
                </select>
              </div>

              {/* Origin TLS */}
              <div className="md:col-span-2 pt-2 border-t">
                <p className="text-sm font-semibold mb-3">Origin TLS (Cloudflare → Origin Server)</p>
              </div>
              <div className="space-y-2">
                <Label>Origin TLS Mode</Label>
                <Input value={domainsConfigForm.originTlsMode || "cloudflare_origin_ca"} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, originTlsMode: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Origin TLS Issuer Command</Label>
                <Input value={domainsConfigForm.originTlsIssuerCommand || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, originTlsIssuerCommand: e.target.value }))} placeholder="your command with {host} {certPath} {keyPath} {mode}" />
              </div>
              <div className="space-y-2">
                <Label>Origin TLS Cert Path</Label>
                <Input value={domainsConfigForm.originTlsCertPath || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, originTlsCertPath: e.target.value }))} placeholder="/etc/ssl/origin.crt" />
              </div>
              <div className="space-y-2">
                <Label>Origin TLS Key Path</Label>
                <Input value={domainsConfigForm.originTlsKeyPath || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, originTlsKeyPath: e.target.value }))} placeholder="/etc/ssl/origin.key" />
              </div>

              {/* OAuth */}
              <div className="md:col-span-2 pt-2 border-t">
                <p className="text-sm font-semibold mb-3">Cloudflare OAuth Connect</p>
              </div>
              <div className="space-y-2">
                <Label>OAuth Authorize URL</Label>
                <Input value={domainsConfigForm.cloudflareOauthAuthorizeUrl || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, cloudflareOauthAuthorizeUrl: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>OAuth Token URL</Label>
                <Input value={domainsConfigForm.cloudflareOauthTokenUrl || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, cloudflareOauthTokenUrl: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>OAuth Client ID</Label>
                <Input value={domainsConfigForm.cloudflareOauthClientId || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, cloudflareOauthClientId: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>OAuth Client Secret</Label>
                <Input type="password" placeholder="Leave blank to keep existing" value={domainsConfigForm.cloudflareOauthClientSecret || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, cloudflareOauthClientSecret: e.target.value }))} autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label>OAuth Redirect URI</Label>
                <Input value={domainsConfigForm.cloudflareOauthRedirectUri || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, cloudflareOauthRedirectUri: e.target.value }))} placeholder="Auto-generated from current host if empty" />
              </div>
              <div className="space-y-2">
                <Label>OAuth Scope</Label>
                <Input value={domainsConfigForm.cloudflareOauthScope || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, cloudflareOauthScope: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>OAuth Post-Connect Redirect</Label>
                <Input value={domainsConfigForm.cloudflareOauthPostConnectRedirect || ""} onChange={(e) => setDomainsConfigForm((p) => ({ ...p, cloudflareOauthPostConnectRedirect: e.target.value }))} />
              </div>

              {/* Save + actions */}
              <div className="md:col-span-2 flex flex-wrap gap-2 pt-2 border-t">
                <Button onClick={saveDomainsConfig} disabled={domainsSaving}>
                  {domainsSaving ? "Saving…" : "Save Domain Config"}
                </Button>
                <Button variant="outline" onClick={startCloudflareOAuth}>Connect Cloudflare (OAuth)</Button>
                <Button variant="outline" onClick={testCloudflare} disabled={cfTesting}>
                  {cfTesting ? "Testing…" : "Test Cloudflare + Load Zones"}
                </Button>
                <Button variant="outline" onClick={testSslProvider} disabled={sslTesting}>
                  {sslTesting ? "Checking…" : "Test SSL Provider"}
                </Button>
                <Button variant="outline" onClick={refreshOriginTlsStatus}>Refresh Origin TLS Status</Button>
                <Button variant="outline" onClick={issueOriginTls} disabled={originTlsIssuing}>
                  {originTlsIssuing ? "Issuing…" : "Issue / Renew Origin TLS"}
                </Button>
              </div>

              {/* Inline test results */}
              {cloudflareTestResult && (
                <p className={`md:col-span-2 text-xs px-3 py-2 rounded border ${cloudflareTestResult.ok ? "text-green-700 bg-green-50 border-green-200" : "text-red-700 bg-red-50 border-red-200"}`}>
                  {cloudflareTestResult.ok ? "✅" : "❌"} {cloudflareTestResult.message}
                </p>
              )}
              {sslTestResult && (
                <p className={`md:col-span-2 text-xs px-3 py-2 rounded border ${sslTestResult.ok ? "text-green-700 bg-green-50 border-green-200" : "text-red-700 bg-red-50 border-red-200"}`}>
                  {sslTestResult.ok ? "✅" : "❌"} {sslTestResult.message}
                </p>
              )}
              {originTlsResult && (
                <p className={`md:col-span-2 text-xs px-3 py-2 rounded border ${originTlsResult.ok ? "text-green-700 bg-green-50 border-green-200" : "text-red-700 bg-red-50 border-red-200"}`}>
                  {originTlsResult.ok ? "✅" : "❌"} {originTlsResult.message}
                </p>
              )}
              {originTlsStatus && (
                <div className="md:col-span-2 text-xs bg-slate-50 border rounded px-3 py-2 space-y-1">
                  <p className="font-medium">Origin TLS Status</p>
                  <p>Configured: {String(originTlsStatus.configured)} · Cert exists: {String(originTlsStatus.certFileExists)} · Key exists: {String(originTlsStatus.keyFileExists)}</p>
                  <p>Days remaining: {originTlsStatus.daysRemaining ?? "—"} · Expires: {originTlsStatus.expiresAt ? new Date(originTlsStatus.expiresAt).toLocaleDateString() : "—"}</p>
                  <p className="text-slate-500">{originTlsStatus.message}</p>
                </div>
              )}

              {/* Zone picker */}
              {zones.length > 0 && (
                <div className="md:col-span-2 border rounded p-3">
                  <p className="text-sm font-semibold mb-2">Available Cloudflare Zones — click to set Zone ID</p>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {zones.map((zone) => (
                      <button
                        key={zone.id}
                        type="button"
                        className={`w-full text-left text-xs border rounded px-2 py-1.5 hover:bg-blue-50 transition-colors ${domainsConfigForm.cloudflareZoneId === zone.id ? "bg-blue-50 border-blue-300 font-medium" : ""}`}
                        onClick={() => setDomainsConfigForm((p) => ({ ...p, cloudflareZoneId: zone.id }))}
                      >
                        {zone.name} <span className="text-slate-400">({zone.id})</span>
                        {domainsConfigForm.cloudflareZoneId === zone.id && <span className="ml-2 text-blue-600">✓ selected</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tenant subdomains */}
          <Card>
            <CardHeader><CardTitle>Tenant Subdomains</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.subdomains || []).map((row) => (
                <div key={row.id} className="text-sm border rounded p-2">
                  <p className="font-medium">{row.subdomain || "—"} · {row.name}</p>
                  <p className="text-slate-500">{row.merchantName}</p>
                </div>
              ))}
              {!loading && (data?.subdomains || []).length === 0 && <p className="text-sm text-slate-500">No subdomains found.</p>}
            </CardContent>
          </Card>

          {/* Custom domains */}
          <Card>
            <CardHeader><CardTitle>Custom Domains</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.customDomains || []).map((row) => (
                <div key={row.id} className="text-sm border rounded p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-medium">{row.hostname}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${row.isVerified ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {row.isVerified ? "verified" : "unverified"}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${row.sslStatus === "active" ? "bg-green-100 text-green-700" : row.sslStatus === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                        ssl: {row.sslStatus}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">{row.merchantName} · {row.storeName} · dns: {row.dnsStatus}</p>
                  {row.lastError && <p className="text-red-600 text-xs mt-1">{row.lastError}</p>}
                </div>
              ))}
              {!loading && (data?.customDomains || []).length === 0 && <p className="text-sm text-slate-500">No custom domains found.</p>}
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* ── reports ──────────────────────────────────────────────────────────── */}
      {moduleKey === "reports" ? (
        <>
          <Card>
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
        </>
      ) : null}
    </div>
  );
}
