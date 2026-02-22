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


// ─── Smart Domains Setup Wizard ───────────────────────────────────────────────
// Auto-detects server details, pre-fills sensible defaults, guides through setup

const ACME_PRESETS = {
  certbot: {
    label: "Certbot (recommended)",
    command: "certbot certonly --dns-cloudflare --dns-cloudflare-credentials /etc/cloudflare/credentials.ini -d {domain} --email {email} --agree-tos --non-interactive --cert-name {domain}",
    challengeMethod: "dns-01",
    directoryUrl: "https://acme-v02.api.letsencrypt.org/directory",
  },
  "acme.sh": {
    label: "acme.sh",
    command: "acme.sh --issue --dns dns_cf -d {domain} --server {acmeDirectory}",
    challengeMethod: "dns-01",
    directoryUrl: "https://acme-v02.api.letsencrypt.org/directory",
  },
  "acme.sh-staging": {
    label: "acme.sh (staging/test)",
    command: "acme.sh --issue --dns dns_cf -d {domain} --server {acmeDirectory} --test",
    challengeMethod: "dns-01",
    directoryUrl: "https://acme-staging-v02.api.letsencrypt.org/directory",
  },
};

const ORIGIN_TLS_PRESETS = {
  cloudflare_origin_ca: {
    label: "Cloudflare Origin CA (recommended)",
    description: "Free cert from Cloudflare. Works only with Cloudflare proxying.",
    command: "",
    certPath: "/etc/ssl/cloudflare-origin.crt",
    keyPath: "/etc/ssl/cloudflare-origin.key",
  },
  letsencrypt: {
    label: "Let's Encrypt (same as merchant SSL)",
    description: "Re-uses certbot/acme.sh for origin cert too.",
    command: "certbot certonly --standalone -d {host} --email admin@{host} --agree-tos --non-interactive",
    certPath: "/etc/letsencrypt/live/{host}/fullchain.pem",
    keyPath: "/etc/letsencrypt/live/{host}/privkey.pem",
  },
  self_signed: {
    label: "Self-signed (dev/testing only)",
    description: "Generates a self-signed cert. Not for production.",
    command: "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout {keyPath} -out {certPath} -subj /CN={host}",
    certPath: "/etc/ssl/origin-selfsigned.crt",
    keyPath: "/etc/ssl/origin-selfsigned.key",
  },
};

function StepBadge({ n, done, active }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 transition-all ${
      done ? "bg-green-500 border-green-500 text-white" :
      active ? "border-blue-500 bg-blue-50 text-blue-600" :
      "border-slate-300 text-slate-400 bg-white"
    }`}>
      {done ? "✓" : n}
    </div>
  );
}

function InlineResult({ result }) {
  if (!result) return null;
  return (
    <div className={`text-xs px-3 py-2 rounded border mt-2 ${result.ok
      ? "text-green-700 bg-green-50 border-green-200"
      : "text-red-700 bg-red-50 border-red-200"}`}>
      {result.ok ? "✅" : "❌"} {result.message}
    </div>
  );
}

function DomainsSetupWizard({
  data, domainsConfigForm, setDomainsConfigForm,
  zones, setZones,
  cloudflareTestResult, setCloudflareTestResult,
  sslTestResult, setSslTestResult,
  originTlsResult, setOriginTlsResult,
  originTlsStatus, setOriginTlsStatus,
  cfTesting, setCfTesting, sslTesting, setSslTesting,
  originTlsIssuing, setOriginTlsIssuing, domainsSaving, loading,
  saveDomainsConfig, testCloudflare, testSslProvider,
  startCloudflareOAuth, refreshOriginTlsStatus, issueOriginTls,
  cfRuntime, leRuntime,
}) {
  const [acmePreset, setAcmePreset] = useState("certbot");
  const [originPreset, setOriginPreset] = useState("cloudflare_origin_ca");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showOAuth, setShowOAuth] = useState(false);

  // Auto-detect server base from current URL on first load
  const [autoDetected] = useState(() => {
    const host = window.location.hostname;
    const isLocalhost = host === "localhost" || host === "127.0.0.1";
    return {
      host,
      isLocalhost,
      suggestedBaseDomain: isLocalhost ? "" : host.split(".").slice(-2).join("."),
      suggestedIngressHost: isLocalhost ? "" : host,
      callbackUrl: `${window.location.origin}/api/platform/owner/domains/cloudflare-oauth/callback`,
    };
  });

  // Apply ACME preset
  const applyAcmePreset = (key) => {
    const preset = ACME_PRESETS[key];
    if (!preset) return;
    setAcmePreset(key);
    setDomainsConfigForm((p) => ({
      ...p,
      acmeClient: key === "certbot" ? "certbot" : "acme.sh",
      sslIssuerCommand: preset.command,
      acmeChallengeMethod: preset.challengeMethod,
      acmeDirectoryUrl: preset.directoryUrl,
    }));
  };

  // Apply Origin TLS preset
  const applyOriginPreset = (key) => {
    const preset = ORIGIN_TLS_PRESETS[key];
    if (!preset) return;
    setOriginPreset(key);
    const host = domainsConfigForm.platformIngressHost || autoDetected.host;
    setDomainsConfigForm((p) => ({
      ...p,
      originTlsMode: key,
      originTlsIssuerCommand: preset.command.replace(/\{host\}/g, host),
      originTlsCertPath: preset.certPath.replace(/\{host\}/g, host),
      originTlsKeyPath: preset.keyPath.replace(/\{host\}/g, host),
    }));
  };

  // Auto-fill base domain + ingress host from current server if empty
  const autoFillServer = () => {
    setDomainsConfigForm((p) => ({
      ...p,
      platformBaseDomain: p.platformBaseDomain || autoDetected.suggestedBaseDomain,
      platformIngressHost: p.platformIngressHost || autoDetected.suggestedIngressHost,
      cloudflareOauthRedirectUri: p.cloudflareOauthRedirectUri || autoDetected.callbackUrl,
      cloudflareOauthPostConnectRedirect: p.cloudflareOauthPostConnectRedirect || "/admin/platform-domains",
    }));
  };

  const step1Done = cfRuntime;
  const step2Done = leRuntime;
  const step3Done = originTlsStatus?.certFileExists && originTlsStatus?.keyFileExists;

  const set = (k) => (e) => setDomainsConfigForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <Metric label="Subdomains" value={data?.summary?.totalSubdomains ?? 0} />
        <Metric label="Custom Domains" value={data?.summary?.totalCustomDomains ?? 0} />
        <Metric label="Verified" value={data?.summary?.verifiedCustomDomains ?? 0} />
        <Metric label="SSL Active" value={data?.summary?.activeSslCustomDomains ?? 0} />
        <Metric label="SSL Pending" value={data?.summary?.pendingSslCustomDomains ?? 0} />
        <Metric label="Awaiting Payment" value={data?.summary?.paymentRequiredSslCustomDomains ?? 0} />
      </div>

      {/* Overall status bar */}
      <Card className={`border-2 ${step1Done && step2Done ? "border-green-400 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
        <CardContent className="py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-4 text-sm">
            <span><StatusDot ok={step1Done} />{step1Done ? "Cloudflare ready" : "Cloudflare not set up"}</span>
            <span><StatusDot ok={step2Done} />{step2Done ? "SSL/ACME ready" : "SSL not set up"}</span>
            <span><StatusDot ok={step3Done} />{step3Done ? "Origin TLS ready" : "Origin TLS not set up"}</span>
          </div>
          <button
            onClick={autoFillServer}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            ⚡ Auto-fill server details
          </button>
        </CardContent>
      </Card>

      {/* ── STEP 1: Cloudflare ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <StepBadge n={1} done={step1Done} active={!step1Done} />
            <div>
              <CardTitle className="text-base">Cloudflare DNS</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Connect your Cloudflare account for automatic DNS record provisioning</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>API Token <span className="text-red-500">*</span></Label>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={data?.config?.cloudflareApiTokenMasked ? `Current: ${data.config.cloudflareApiTokenMasked}` : "Paste token — or use OAuth below"}
                value={domainsConfigForm.cloudflareApiToken}
                onChange={set("cloudflareApiToken")}
              />
              <p className="text-xs text-slate-400">
                <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noreferrer" className="text-blue-500 underline">
                  Create token
                </a>{" "}with Zone:Read + DNS:Edit permissions, or use OAuth Connect below.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Platform Base Domain <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. yourplatform.com"
                value={domainsConfigForm.platformBaseDomain || ""}
                onChange={set("platformBaseDomain")}
              />
              <p className="text-xs text-slate-400">Root domain of your platform. Merchant subdomains will be created under this.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Platform Ingress Host <span className="text-red-500">*</span></Label>
              <Input
                placeholder={autoDetected.suggestedIngressHost || "e.g. app.yourplatform.com"}
                value={domainsConfigForm.platformIngressHost || ""}
                onChange={set("platformIngressHost")}
              />
              <p className="text-xs text-slate-400">Your server's public hostname/IP — custom domains CNAME point here.{autoDetected.suggestedIngressHost && <span className="text-blue-500"> Detected: {autoDetected.suggestedIngressHost}</span>}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Cloudflare Zone ID</Label>
              <Input
                placeholder="Auto-filled when you test & load zones below"
                value={domainsConfigForm.cloudflareZoneId || ""}
                onChange={set("cloudflareZoneId")}
              />
            </div>
          </div>

          {/* Zone picker after test */}
          {zones.length > 0 && (
            <div className="border rounded-lg p-3 bg-slate-50">
              <p className="text-xs font-semibold mb-2 text-slate-600">Select Zone for {domainsConfigForm.platformBaseDomain || "your domain"}:</p>
              <div className="space-y-1 max-h-36 overflow-auto">
                {zones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setDomainsConfigForm((p) => ({ ...p, cloudflareZoneId: zone.id }))}
                    className={`w-full text-left text-xs border rounded px-2.5 py-2 transition-colors ${
                      domainsConfigForm.cloudflareZoneId === zone.id
                        ? "bg-blue-100 border-blue-400 font-semibold text-blue-800"
                        : "hover:bg-white bg-white"
                    }`}
                  >
                    {domainsConfigForm.cloudflareZoneId === zone.id && "✓ "}{zone.name}
                    <span className="text-slate-400 ml-1.5 font-mono">{zone.id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <InlineResult result={cloudflareTestResult} />

          {/* Actions row */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" onClick={testCloudflare} disabled={cfTesting} className="text-xs">
              {cfTesting ? "Testing…" : "🔍 Test & Load Zones"}
            </Button>
            <Button variant="outline" onClick={startCloudflareOAuth} className="text-xs">
              🔗 OAuth Connect (no token needed)
            </Button>
            <button
              onClick={() => setShowOAuth(!showOAuth)}
              className="text-xs text-slate-500 underline"
            >
              {showOAuth ? "Hide" : "Show"} OAuth config
            </button>
          </div>

          {/* OAuth config — collapsed by default */}
          {showOAuth && (
            <div className="border rounded-lg p-3 bg-slate-50 space-y-3 mt-2">
              <p className="text-xs font-semibold text-slate-600">Cloudflare OAuth App Config (optional — for "Connect Cloudflare" button)</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">OAuth Client ID</Label>
                  <Input className="text-xs h-8" value={domainsConfigForm.cloudflareOauthClientId || ""} onChange={set("cloudflareOauthClientId")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">OAuth Client Secret</Label>
                  <Input type="password" className="text-xs h-8" placeholder="Leave blank to keep existing" autoComplete="new-password" value={domainsConfigForm.cloudflareOauthClientSecret || ""} onChange={set("cloudflareOauthClientSecret")} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Redirect URI (auto-generated)</Label>
                  <Input className="text-xs h-8 bg-slate-100" value={domainsConfigForm.cloudflareOauthRedirectUri || autoDetected.callbackUrl} onChange={set("cloudflareOauthRedirectUri")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Authorize URL</Label>
                  <Input className="text-xs h-8" value={domainsConfigForm.cloudflareOauthAuthorizeUrl || ""} onChange={set("cloudflareOauthAuthorizeUrl")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Token URL</Label>
                  <Input className="text-xs h-8" value={domainsConfigForm.cloudflareOauthTokenUrl || ""} onChange={set("cloudflareOauthTokenUrl")} />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── STEP 2: SSL / ACME ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <StepBadge n={2} done={step2Done} active={step1Done && !step2Done} />
            <div>
              <CardTitle className="text-base">SSL Certificate Issuance</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Choose your ACME client — command is pre-filled automatically</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset picker */}
          <div>
            <Label className="mb-2 block">ACME Client</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ACME_PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyAcmePreset(key)}
                  className={`text-xs border rounded-lg px-3 py-2.5 text-left transition-colors ${
                    acmePreset === key
                      ? "bg-blue-50 border-blue-400 text-blue-800 font-semibold"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {acmePreset === key && "✓ "}{p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contact Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                placeholder="ssl@yourplatform.com"
                value={domainsConfigForm.sslContactEmail || ""}
                onChange={set("sslContactEmail")}
              />
              <p className="text-xs text-slate-400">Let's Encrypt sends expiry warnings to this address.</p>
            </div>

            <div className="space-y-1.5">
              <Label>SSL Price (INR)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={domainsConfigForm.sslPriceInr || "999"}
                  onChange={set("sslPriceInr")}
                  className="w-32"
                />
                <select
                  className="flex-1 border rounded px-2 py-2 text-sm"
                  value={domainsConfigForm.sslRequireMarketplacePurchase}
                  onChange={set("sslRequireMarketplacePurchase")}
                >
                  <option value="true">Paid — users must purchase</option>
                  <option value="false">Free for all users</option>
                </select>
              </div>
            </div>
          </div>

          {/* Auto-filled command — show as code, allow editing */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>SSL Issuer Command <span className="text-slate-400 font-normal text-xs">(auto-filled)</span></Label>
              <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-slate-400 underline">
                {showAdvanced ? "Hide" : "Edit"} advanced fields
              </button>
            </div>
            <textarea
              className="w-full border rounded px-3 py-2 text-xs font-mono bg-slate-50 resize-y"
              rows={3}
              value={domainsConfigForm.sslIssuerCommand || ""}
              onChange={set("sslIssuerCommand")}
            />
            <p className="text-xs text-slate-400">Placeholders: <code className="bg-slate-100 px-1 rounded">&#123;domain&#125;</code> <code className="bg-slate-100 px-1 rounded">&#123;email&#125;</code> <code className="bg-slate-100 px-1 rounded">&#123;challenge&#125;</code> <code className="bg-slate-100 px-1 rounded">&#123;acmeDirectory&#125;</code></p>
          </div>

          {showAdvanced && (
            <div className="grid md:grid-cols-2 gap-3 border rounded-lg p-3 bg-slate-50">
              <div className="space-y-1">
                <Label className="text-xs">Challenge Method</Label>
                <Input className="h-8 text-xs" value={domainsConfigForm.acmeChallengeMethod || "dns-01"} onChange={set("acmeChallengeMethod")} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ACME Directory URL</Label>
                <Input className="h-8 text-xs" value={domainsConfigForm.acmeDirectoryUrl || ""} onChange={set("acmeDirectoryUrl")} />
              </div>
            </div>
          )}

          <InlineResult result={sslTestResult} />

          <div className="flex gap-2">
            <Button variant="outline" onClick={testSslProvider} disabled={sslTesting} className="text-xs">
              {sslTesting ? "Checking…" : "🔍 Test SSL Provider"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── STEP 3: Origin TLS ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <StepBadge n={3} done={step3Done} active={step1Done && step2Done && !step3Done} />
            <div>
              <CardTitle className="text-base">Origin TLS (Cloudflare → Your Server)</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Encrypts traffic between Cloudflare edge and your origin server</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset picker */}
          <div>
            <Label className="mb-2 block">Origin Certificate Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ORIGIN_TLS_PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyOriginPreset(key)}
                  className={`text-xs border rounded-lg px-3 py-2.5 text-left transition-colors ${
                    originPreset === key
                      ? "bg-blue-50 border-blue-400 text-blue-800 font-semibold"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="font-medium">{originPreset === key && "✓ "}{p.label}</div>
                  <div className="text-slate-400 mt-0.5 font-normal">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cert Path <span className="text-slate-400 font-normal text-xs">(auto-filled)</span></Label>
              <Input className="font-mono text-xs" value={domainsConfigForm.originTlsCertPath || ""} onChange={set("originTlsCertPath")} placeholder="/etc/ssl/origin.crt" />
            </div>
            <div className="space-y-1.5">
              <Label>Key Path <span className="text-slate-400 font-normal text-xs">(auto-filled)</span></Label>
              <Input className="font-mono text-xs" value={domainsConfigForm.originTlsKeyPath || ""} onChange={set("originTlsKeyPath")} placeholder="/etc/ssl/origin.key" />
            </div>
            {originPreset !== "cloudflare_origin_ca" && (
              <div className="space-y-1.5 md:col-span-2">
                <Label>Issuer Command <span className="text-slate-400 font-normal text-xs">(auto-filled)</span></Label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-xs font-mono bg-slate-50 resize-y"
                  rows={2}
                  value={domainsConfigForm.originTlsIssuerCommand || ""}
                  onChange={set("originTlsIssuerCommand")}
                />
              </div>
            )}
          </div>

          {originTlsStatus && (
            <div className="text-xs bg-slate-50 border rounded px-3 py-2.5 space-y-1">
              <p className="font-semibold">Current Status</p>
              <div className="flex gap-4 flex-wrap">
                <span><StatusDot ok={originTlsStatus.certFileExists} />Cert {originTlsStatus.certFileExists ? "exists" : "missing"}</span>
                <span><StatusDot ok={originTlsStatus.keyFileExists} />Key {originTlsStatus.keyFileExists ? "exists" : "missing"}</span>
                {originTlsStatus.daysRemaining != null && (
                  <span><StatusDot ok={originTlsStatus.daysRemaining > 14} />{originTlsStatus.daysRemaining} days remaining</span>
                )}
                {originTlsStatus.expiresAt && (
                  <span className="text-slate-400">Expires {new Date(originTlsStatus.expiresAt).toLocaleDateString()}</span>
                )}
              </div>
              {originTlsStatus.message && <p className="text-slate-500">{originTlsStatus.message}</p>}
            </div>
          )}

          <InlineResult result={originTlsResult} />

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={refreshOriginTlsStatus} className="text-xs">
              🔄 Check Status
            </Button>
            <Button variant="outline" onClick={issueOriginTls} disabled={originTlsIssuing} className="text-xs">
              {originTlsIssuing ? "Issuing…" : "🔐 Issue / Renew Origin Cert"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Save ───────────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button onClick={saveDomainsConfig} disabled={domainsSaving} className="px-8">
          {domainsSaving ? "Saving…" : "💾 Save All Configuration"}
        </Button>
      </div>

      {/* ── Domain list ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Tenant Subdomains</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data?.subdomains || []).map((row) => (
            <div key={row.id} className="text-sm border rounded p-2 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{row.subdomain || "—"} <span className="text-slate-400">·</span> {row.name}</p>
                <p className="text-slate-500 text-xs">{row.merchantName}</p>
              </div>
            </div>
          ))}
          {!loading && (data?.subdomains || []).length === 0 && <p className="text-sm text-slate-500">No subdomains yet.</p>}
        </CardContent>
      </Card>

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
          {!loading && (data?.customDomains || []).length === 0 && <p className="text-sm text-slate-500">No custom domains yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

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
        <DomainsSetupWizard
          data={data}
          domainsConfigForm={domainsConfigForm}
          setDomainsConfigForm={setDomainsConfigForm}
          zones={zones}
          setZones={setZones}
          cloudflareTestResult={cloudflareTestResult}
          setCloudflareTestResult={setCloudflareTestResult}
          sslTestResult={sslTestResult}
          setSslTestResult={setSslTestResult}
          originTlsResult={originTlsResult}
          setOriginTlsResult={setOriginTlsResult}
          originTlsStatus={originTlsStatus}
          setOriginTlsStatus={setOriginTlsStatus}
          cfTesting={cfTesting}
          setCfTesting={setCfTesting}
          sslTesting={sslTesting}
          setSslTesting={setSslTesting}
          originTlsIssuing={originTlsIssuing}
          setOriginTlsIssuing={setOriginTlsIssuing}
          domainsSaving={domainsSaving}
          loading={loading}
          saveDomainsConfig={saveDomainsConfig}
          testCloudflare={testCloudflare}
          testSslProvider={testSslProvider}
          startCloudflareOAuth={startCloudflareOAuth}
          refreshOriginTlsStatus={refreshOriginTlsStatus}
          issueOriginTls={issueOriginTls}
          cfRuntime={cfRuntime}
          leRuntime={leRuntime}
        />
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
