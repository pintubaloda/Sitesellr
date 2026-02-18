import { useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import useApiList from "../../hooks/useApiList";

const toCsv = (rows) => {
  const header = ["CreatedAt", "Action", "MerchantId", "StoreId", "ActorUserId", "EntityType", "EntityId", "Details"];
  const lines = rows.map((r) =>
    [r.createdAt, r.action, r.merchantId, r.storeId, r.actorUserId, r.entityType, r.entityId, r.details]
      .map((v) => `"${String(v ?? "").replaceAll("\"", "\"\"")}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
};

export const AuditLogs = () => {
  const [action, setAction] = useState("");
  const [storeId, setStoreId] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const { data, loading, error } = useApiList("/audit-logs", {
    params: {
      action: action || undefined,
      storeId: storeId || undefined,
      merchantId: merchantId || undefined,
      pageSize: 200,
    },
    enabled: true,
  });

  const rows = useMemo(() => (Array.isArray(data) ? data : data?.items || []), [data]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="audit-logs-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
        <p className="text-slate-500 dark:text-slate-400">Filter, inspect and export security-sensitive actions.</p>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <Input placeholder="merchant.status_changed" value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Store ID</Label>
            <Input placeholder="GUID" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Merchant ID</Label>
            <Input placeholder="GUID" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
          {error ? <p className="text-sm text-red-600">{error?.response?.status === 403 ? "You are not authorized." : "Could not load audit logs."}</p> : null}
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900 dark:text-white">{r.action}</p>
                  <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">store={r.storeId || "-"} merchant={r.merchantId || "-"}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{r.details || "-"}</p>
              </div>
            ))}
            {!loading && rows.length === 0 ? <p className="text-sm text-slate-500">No logs found.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
