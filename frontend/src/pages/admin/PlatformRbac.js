import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import api from "../../lib/api";

const parseCsv = (value) =>
  value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export const PlatformRbac = () => {
  const [userId, setUserId] = useState("");
  const [platformRoles, setPlatformRoles] = useState("");
  const [storeId, setStoreId] = useState("");
  const [storeUserId, setStoreUserId] = useState("");
  const [permissions, setPermissions] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const wrap = async (fn) => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err?.response?.data?.error || "RBAC action failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="platform-rbac-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform RBAC</h1>
        <p className="text-slate-500 dark:text-slate-400">Assign platform roles and store-level permissions.</p>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Platform Roles (Owner-only API)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>User ID</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="GUID" />
          </div>
          <div className="space-y-2">
            <Label>Roles CSV (0=Owner,1=Staff)</Label>
            <Input value={platformRoles} onChange={(e) => setPlatformRoles(e.target.value)} placeholder="0,1" />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={loading || !userId.trim()}
              onClick={() =>
                wrap(async () => {
                  const res = await api.get(`/platform/rbac/users/${userId.trim()}/platform-roles`);
                  setPlatformRoles((res.data || []).join(","));
                  setMessage("Platform roles loaded.");
                })
              }
            >
              Load Roles
            </Button>
            <Button
              disabled={loading || !userId.trim()}
              onClick={() =>
                wrap(async () => {
                  await api.put(`/platform/rbac/users/${userId.trim()}/platform-roles`, {
                    roles: parseCsv(platformRoles).map((x) => Number(x)),
                  });
                  setMessage("Platform roles saved.");
                })
              }
            >
              Save Roles
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Store User Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Store ID</Label>
              <Input value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="GUID" />
            </div>
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input value={storeUserId} onChange={(e) => setStoreUserId(e.target.value)} placeholder="GUID" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Permissions CSV</Label>
            <Input
              value={permissions}
              onChange={(e) => setPermissions(e.target.value)}
              placeholder="orders.read,orders.write,products.read,products.write"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={loading || !storeId.trim() || !storeUserId.trim()}
              onClick={() =>
                wrap(async () => {
                  const res = await api.get(`/platform/rbac/stores/${storeId.trim()}/users/${storeUserId.trim()}/permissions`);
                  setPermissions((res.data || []).join(","));
                  setMessage("Store permissions loaded.");
                })
              }
            >
              Load Permissions
            </Button>
            <Button
              disabled={loading || !storeId.trim() || !storeUserId.trim()}
              onClick={() =>
                wrap(async () => {
                  await api.put(`/platform/rbac/stores/${storeId.trim()}/users/${storeUserId.trim()}/permissions`, {
                    permissions: parseCsv(permissions),
                  });
                  setMessage("Store permissions saved.");
                })
              }
            >
              Save Permissions
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </div>
  );
};

export default PlatformRbac;
