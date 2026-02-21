import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import useActiveStore from "../../hooks/useActiveStore";
import api from "../../lib/api";

export default function DomainsSsl() {
  const { storeId } = useActiveStore();
  const [hostname, setHostname] = useState("");
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [dnsHint, setDnsHint] = useState(null);
  const [sslPriceInr, setSslPriceInr] = useState(999);

  const load = async () => {
    if (!storeId) return;
    try {
      const res = await api.get(`/stores/${storeId}/domains`);
      const list = Array.isArray(res.data) ? res.data : [];
      setRows(list);
      if (list.length > 0 && Number.isFinite(Number(list[0]?.sslPriceInr))) {
        setSslPriceInr(Number(list[0]?.sslPriceInr));
      }
    } catch (err) {
      setMessage(err?.response?.status === 403 ? "You are not authorized." : "Could not load domains.");
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const add = async () => {
    if (!storeId || !hostname.trim()) return;
    setMessage("");
    setDnsHint(null);
    try {
      const res = await api.post(`/stores/${storeId}/domains`, { hostname: hostname.trim(), sslProvider: "letsencrypt" });
      setHostname("");
      await load();
      setDnsHint({
        verificationHost: res.data?.verification?.host,
        verificationValue: res.data?.verification?.value,
        mappingHost: res.data?.mapping?.host,
        mappingTarget: res.data?.mapping?.target,
      });
      if (Number.isFinite(Number(res.data?.sslPriceInr))) {
        setSslPriceInr(Number(res.data?.sslPriceInr));
      }
      setMessage("Domain added. DNS mapping + TXT verification attempted automatically via Cloudflare.");
    } catch (err) {
      setMessage(err?.response?.data?.error || "Could not add domain.");
    }
  };

  const verify = async (id) => {
    if (!storeId) return;
    setMessage("");
    try {
      await api.post(`/stores/${storeId}/domains/${id}/verify`);
      await load();
      setMessage("Domain verified.");
    } catch (err) {
      setMessage(err?.response?.data?.error || "Could not verify domain.");
    }
  };

  const issueSsl = async (id) => {
    if (!storeId) return;
    setMessage("");
    try {
      await api.post(`/stores/${storeId}/domains/${id}/issue-ssl`);
      await load();
      setMessage("SSL issuance triggered.");
    } catch (err) {
      setMessage(err?.response?.data?.error || "Could not issue SSL.");
    }
  };

  const purchaseSsl = async (id) => {
    if (!storeId) return;
    setMessage("");
    try {
      await api.post(`/stores/${storeId}/domains/${id}/purchase-ssl`, { paymentReference: `ui_${Date.now()}` });
      await load();
      setMessage(`SSL purchase recorded (INR ${sslPriceInr}). If DNS is verified, issuance starts automatically.`);
    } catch (err) {
      setMessage(err?.response?.data?.error || "Could not complete SSL purchase.");
    }
  };

  return (
    <div className="space-y-6" data-testid="domains-ssl-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Domains & Free SSL</h1>
        <p className="text-slate-500 dark:text-slate-400">Add custom domain, verify DNS, then purchase and issue Let's Encrypt SSL from marketplace flow.</p>
        <p className="text-xs text-slate-500 mt-1">Current SSL marketplace price: INR {sslPriceInr}</p>
      </div>

      {message ? <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p> : null}
      {dnsHint ? (
        <Card>
          <CardHeader>
            <CardTitle>DNS Records</CardTitle>
            <CardDescription>If auto-provision did not complete, add these manually in Cloudflare and click Verify Now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">CNAME:</span> {dnsHint.mappingHost} -> {dnsHint.mappingTarget}</p>
            <p><span className="font-medium">TXT:</span> {dnsHint.verificationHost} = {dnsHint.verificationValue}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add Custom Domain</CardTitle>
          <CardDescription>Use Cloudflare DNS, then verify and issue SSL from this panel</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label>Hostname</Label>
            <Input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="shop.yourdomain.com" />
          </div>
          <Button onClick={add}>Add Domain</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domain SSL Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((d) => (
            <div key={d.id} className="p-3 border rounded-lg flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{d.hostname}</p>
                <p className="text-xs text-slate-500">
                  dns: {d.dnsStatus || "-"} · verified: {String(d.isVerified)} · ssl-purchased: {String(d.sslPurchased)} · ssl: {d.sslStatus} · expires: {d.sslExpiresAt || "-"}
                </p>
                {!d.sslPurchased ? <p className="text-xs text-amber-600 mt-1">SSL purchase required: INR {d.sslPriceInr ?? sslPriceInr}</p> : null}
                {d.lastError ? <p className="text-xs text-red-600">{d.lastError}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                {!d.sslPurchased ? <Button variant="outline" onClick={() => purchaseSsl(d.id)}>Buy SSL (INR {d.sslPriceInr ?? sslPriceInr})</Button> : null}
                <Button variant="outline" onClick={() => verify(d.id)}>Verify Now</Button>
                <Button onClick={() => issueSsl(d.id)} disabled={!d.sslPurchased || !d.isVerified}>Issue SSL</Button>
              </div>
            </div>
          ))}
          {rows.length === 0 ? <p className="text-sm text-slate-500">No domains yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
