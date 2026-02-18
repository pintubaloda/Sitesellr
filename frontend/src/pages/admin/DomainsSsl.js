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

  const load = async () => {
    if (!storeId) return;
    try {
      const res = await api.get(`/stores/${storeId}/domains`);
      setRows(Array.isArray(res.data) ? res.data : []);
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
    try {
      const res = await api.post(`/stores/${storeId}/domains`, { hostname: hostname.trim(), sslProvider: "letsencrypt" });
      setHostname("");
      await load();
      setMessage(`Domain added. Auto verify/SSL attempted. TXT fallback: ${res.data?.verification?.host} = ${res.data?.verification?.value}`);
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

  return (
    <div className="space-y-6" data-testid="domains-ssl-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Domains & Free SSL</h1>
        <p className="text-slate-500 dark:text-slate-400">Add custom domain, verify DNS, issue free Let's Encrypt SSL from system</p>
      </div>

      {message ? <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p> : null}

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
                <p className="text-xs text-slate-500">verified: {String(d.isVerified)} · ssl: {d.sslStatus} · expires: {d.sslExpiresAt || "-"}</p>
                {d.lastError ? <p className="text-xs text-red-600">{d.lastError}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => verify(d.id)}>Verify Now</Button>
                <Button onClick={() => issueSsl(d.id)}>Issue SSL</Button>
              </div>
            </div>
          ))}
          {rows.length === 0 ? <p className="text-sm text-slate-500">No domains yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
