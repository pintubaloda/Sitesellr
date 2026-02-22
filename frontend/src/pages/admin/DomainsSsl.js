import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import useActiveStore from "../../hooks/useActiveStore";
import api from "../../lib/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function SslBadge({ status }) {
  const map = {
    active: "bg-green-100 text-green-700",
    issuing: "bg-blue-100 text-blue-700",
    pending: "bg-yellow-100 text-yellow-700",
    pending_verification: "bg-yellow-100 text-yellow-700",
    payment_required: "bg-orange-100 text-orange-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status ?? "unknown"}
    </span>
  );
}

function DnsBadge({ status }) {
  const map = {
    configured: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      dns: {status ?? "pending"}
    </span>
  );
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="ml-2 text-xs text-slate-400 hover:text-slate-700 underline"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function DnsRecordCard({ domain }) {
  if (!domain?.verification?.host) return null;
  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">DNS Records for {domain.hostname}</CardTitle>
        <CardDescription className="text-xs">
          {domain.dnsManagedByCloudflare
            ? "✅ Cloudflare auto-provisioned these records. Verification should be fast."
            : "Add these records manually in your DNS provider, then click 'Verify DNS'."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs font-mono">
        <div className="bg-white dark:bg-slate-900 rounded p-2 border">
          <p className="text-slate-500 font-sans font-medium mb-1">CNAME (domain mapping)</p>
          <p><span className="text-slate-400">Host:</span> {domain.mapping?.host}
            <CopyButton value={domain.mapping?.host ?? ""} />
          </p>
          <p>
            <span className="text-slate-400">Value:</span>{" "}
            {domain.mapping?.target
              ? <>{domain.mapping.target}<CopyButton value={domain.mapping.target} /></>
              : <span className="text-amber-600 font-sans">(platform ingress host not configured — set it in Platform → Domains &amp; SSL config)</span>
            }
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded p-2 border">
          <p className="text-slate-500 font-sans font-medium mb-1">TXT (domain verification)</p>
          <p><span className="text-slate-400">Host:</span> {domain.verification?.host}
            <CopyButton value={domain.verification?.host ?? ""} />
          </p>
          <p><span className="text-slate-400">Value:</span> {domain.verification?.value}
            <CopyButton value={domain.verification?.value ?? ""} />
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DomainsSsl() {
  const { storeId } = useActiveStore();

  const [hostname, setHostname] = useState("");
  const [rows, setRows] = useState([]);
  const [justAdded, setJustAdded] = useState(null); // full response from Add
  const [sslPriceInr, setSslPriceInr] = useState(999);

  const [globalMsg, setGlobalMsg] = useState({ text: "", type: "" }); // type: "" | "success" | "error"
  const [actionLoading, setActionLoading] = useState({}); // { [domainId]: true }
  const [addLoading, setAddLoading] = useState(false);

  const setMsg = (text, type = "info") => setGlobalMsg({ text, type });
  const clearMsg = () => setGlobalMsg({ text: "", type: "" });

  const load = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await api.get(`/stores/${storeId}/domains`);
      const list = Array.isArray(res.data) ? res.data : [];
      setRows(list);
      if (list.length > 0 && Number.isFinite(Number(list[0]?.sslPriceInr))) {
        setSslPriceInr(Number(list[0].sslPriceInr));
      }
    } catch (err) {
      setMsg(
        err?.response?.status === 403 ? "You are not authorized to manage domains." : "Could not load domains.",
        "error"
      );
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const withActionLoading = async (id, fn) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    clearMsg();
    try { await fn(); } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ── Add domain ──────────────────────────────────────────────────────────────
  const add = async () => {
    if (!storeId || !hostname.trim()) return;
    setAddLoading(true);
    clearMsg();
    setJustAdded(null);
    try {
      const res = await api.post(`/stores/${storeId}/domains`, {
        hostname: hostname.trim().toLowerCase(),
        sslProvider: "letsencrypt",
      });
      setHostname("");
      setJustAdded(res.data);
      if (Number.isFinite(Number(res.data?.sslPriceInr))) setSslPriceInr(Number(res.data.sslPriceInr));
      await load();

      const auto = res.data?.autoAttempt;
      if (auto?.verified && auto?.sslIssued) {
        setMsg("Domain added, verified, and SSL issued automatically! 🎉", "success");
      } else if (auto?.verified) {
        setMsg("Domain added and verified. Purchase SSL from the marketplace to issue your certificate.", "success");
      } else {
        setMsg("Domain added. Add the DNS records shown below, then click 'Verify DNS'.", "info");
      }
    } catch (err) {
      const code = err?.response?.data?.error;
      const message = err?.response?.data?.message;
      if (code === "domain_already_exists") {
        setMsg(message || "This hostname is already registered on this platform.", "error");
      } else {
        setMsg(message || err?.response?.data?.error || "Could not add domain.", "error");
      }
    } finally {
      setAddLoading(false);
    }
  };

  // ── Verify DNS ──────────────────────────────────────────────────────────────
  const verify = (id) => withActionLoading(id, async () => {
    try {
      const res = await api.post(`/stores/${storeId}/domains/${id}/verify`);
      await load();
      setMsg(res.data?.message || (res.data?.verified ? "Domain verified." : "Verification failed — DNS not yet propagated."),
        res.data?.verified ? "success" : "error");
    } catch (err) {
      setMsg(err?.response?.data?.message || err?.response?.data?.error || "Could not verify domain.", "error");
    }
  });

  // ── Purchase SSL ────────────────────────────────────────────────────────────
  const purchaseSsl = (id) => withActionLoading(id, async () => {
    try {
      const res = await api.post(`/stores/${storeId}/domains/${id}/purchase-ssl`, {
        paymentReference: `ui_${Date.now()}`,
      });
      await load();
      setMsg(res.data?.message || `SSL purchased (INR ${sslPriceInr}).`, "success");
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === "ssl_already_purchased") {
        setMsg("SSL has already been purchased for this domain.", "error");
      } else {
        setMsg(err?.response?.data?.message || err?.response?.data?.error || "Could not complete SSL purchase.", "error");
      }
    }
  });

  // ── Issue SSL ───────────────────────────────────────────────────────────────
  const issueSsl = (id) => withActionLoading(id, async () => {
    try {
      const res = await api.post(`/stores/${storeId}/domains/${id}/issue-ssl`);
      await load();
      setMsg(res.data?.message || (res.data?.success ? "SSL issued successfully." : `SSL issuance failed: ${res.data?.lastError ?? "unknown"}`),
        res.data?.success ? "success" : "error");
    } catch (err) {
      setMsg(err?.response?.data?.message || err?.response?.data?.error || "Could not issue SSL.", "error");
    }
  });

  const msgColor = globalMsg.type === "success"
    ? "text-green-700 bg-green-50 border-green-200"
    : globalMsg.type === "error"
      ? "text-red-700 bg-red-50 border-red-200"
      : "text-slate-700 bg-slate-50 border-slate-200";

  return (
    <div className="space-y-6" data-testid="domains-ssl-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Domains &amp; SSL</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Add your custom domain, point DNS, verify ownership, and issue a free Let&apos;s Encrypt SSL certificate.
        </p>
        <p className="text-xs text-slate-400 mt-1">SSL marketplace price: <strong>INR {sslPriceInr}</strong></p>
      </div>

      {/* Global message */}
      {globalMsg.text && (
        <div className={`text-sm border rounded-lg px-4 py-3 ${msgColor}`}>
          {globalMsg.text}
        </div>
      )}

      {/* DNS records hint for just-added domain */}
      {justAdded && <DnsRecordCard domain={justAdded} />}

      {/* Add domain */}
      <Card>
        <CardHeader>
          <CardTitle>Add Custom Domain</CardTitle>
          <CardDescription>
            Enter your hostname (e.g. <code>shop.yourdomain.com</code>). We&apos;ll attempt to auto-configure Cloudflare DNS records.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="hostname-input">Hostname</Label>
            <Input
              id="hostname-input"
              value={hostname}
              onChange={(e) => setHostname(e.target.value.toLowerCase())}
              placeholder="shop.yourdomain.com"
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            />
          </div>
          <Button onClick={add} disabled={addLoading || !hostname.trim()}>
            {addLoading ? "Adding…" : "Add Domain"}
          </Button>
        </CardContent>
      </Card>

      {/* Domain list */}
      <Card>
        <CardHeader>
          <CardTitle>Your Domains</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No custom domains yet. Add one above.</p>
          ) : (
            rows.map((d) => {
              const isLoading = !!actionLoading[d.id];
              const canVerify = !d.isVerified;
              const canBuySsl = !d.sslPurchased;
              const canIssueSsl = d.isVerified && d.sslPurchased && d.sslStatus !== "active" && d.sslStatus !== "issuing";
              return (
                <div key={d.id} className="p-4 border rounded-xl space-y-3">
                  {/* Row top: hostname + badges */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{d.hostname}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <DnsBadge status={d.dnsStatus} />
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.isVerified ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                          {d.isVerified ? "✓ verified" : "unverified"}
                        </span>
                        <SslBadge status={d.sslStatus} />
                        {d.sslStatus === "active" && d.sslExpiresAt && (
                          <span className="text-xs text-slate-400">
                            expires {new Date(d.sslExpiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {d.dnsManagedByCloudflare && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 whitespace-nowrap">
                        ☁ Cloudflare managed
                      </span>
                    )}
                  </div>

                  {/* DNS record hints (always visible until verified) */}
                  {!d.isVerified && d.verification?.host && (
                    <div className="text-xs font-mono bg-slate-50 dark:bg-slate-900 rounded p-2 border space-y-1">
                      <p className="font-sans text-slate-500 font-medium">Required DNS records:</p>
                      <p>
                        <span className="text-slate-400">CNAME</span> {d.mapping?.host} → {d.mapping?.target}
                        <CopyButton value={d.mapping?.target ?? ""} />
                      </p>
                      <p>
                        <span className="text-slate-400">TXT</span> {d.verification?.host} = {d.verification?.value}
                        <CopyButton value={d.verification?.value ?? ""} />
                      </p>
                    </div>
                  )}

                  {/* SSL purchase prompt */}
                  {d.isVerified && !d.sslPurchased && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      🔒 Purchase SSL (INR {d.sslPriceInr ?? sslPriceInr}) to activate HTTPS for this domain.
                    </p>
                  )}

                  {/* Error — suppress internal platform-config errors from merchant view */}
                  {d.lastError && (() => {
                    const internalError = /env var|not configured|ingress host|api token|zone.?id|platform config/i.test(d.lastError);
                    if (internalError) return (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        ⚠ DNS auto-setup is pending platform configuration. Add the DNS records manually above, then click Verify DNS.
                      </p>
                    );
                    return (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                        ⚠ {d.lastError}
                      </p>
                    );
                  })()}

                  {/* Issuing spinner */}
                  {d.sslStatus === "issuing" && (
                    <p className="text-xs text-blue-600 animate-pulse">⏳ SSL issuance in progress…</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {canVerify && (
                      <Button variant="outline" size="sm" onClick={() => verify(d.id)} disabled={isLoading}>
                        {isLoading ? "Checking…" : "Verify DNS"}
                      </Button>
                    )}
                    {canBuySsl && (
                      <Button variant="outline" size="sm" onClick={() => purchaseSsl(d.id)} disabled={isLoading}>
                        {isLoading ? "Processing…" : `Buy SSL (INR ${d.sslPriceInr ?? sslPriceInr})`}
                      </Button>
                    )}
                    {canIssueSsl && (
                      <Button size="sm" onClick={() => issueSsl(d.id)} disabled={isLoading}>
                        {isLoading ? "Issuing…" : "Issue SSL"}
                      </Button>
                    )}
                    {d.sslStatus === "active" && (
                      <span className="text-xs text-green-600 font-medium">✅ SSL Active</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
