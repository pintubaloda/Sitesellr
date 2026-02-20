import { useEffect, useMemo, useState } from "react";
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
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [category, setCategory] = useState("platform");
  const [userId, setUserId] = useState("");
  const [platformRoles, setPlatformRoles] = useState("");
  const [storeId, setStoreId] = useState("");
  const [storeUserId, setStoreUserId] = useState("");
  const [permissions, setPermissions] = useState("");
  const [reason, setReason] = useState("");
  const [stepUp, setStepUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadLists = async (search = "") => {
    try {
      const [usersRes, storesRes] = await Promise.all([
        api.get("/platform/rbac/users", { params: search ? { q: search } : {} }),
        api.get("/platform/rbac/stores"),
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setStores(Array.isArray(storesRes.data) ? storesRes.data : []);
    } catch (err) {
      setError(err?.response?.status === 403 ? "You are not authorized." : "Could not load users/stores.");
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      const isPlatform = (u.platformRoles || []).length > 0;
      const bucketMatch = category === "platform" ? isPlatform : !isPlatform || (u.storeMemberships || 0) > 0;
      if (!bucketMatch) return false;
      if (!term) return true;
      return String(u.email || "").toLowerCase().includes(term);
    });
  }, [category, userSearch, users]);

  const wrap = async (fn) => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await fn();
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError("You are not authorized.");
      } else {
        setError(err?.response?.data?.error || "RBAC action failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="platform-rbac-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform RBAC</h1>
        <p className="text-slate-500 dark:text-slate-400">Assign permissions by user category: Platform or Store.</p>
      </div>

      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="space-y-3">
            <CardTitle>Users</CardTitle>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={category === "platform" ? "default" : "outline"}
                onClick={() => setCategory("platform")}
              >
                Platform Users
              </Button>
              <Button
                type="button"
                variant={category === "store" ? "default" : "outline"}
                onClick={() => setCategory("store")}
              >
                Store Users
              </Button>
            </div>
            <Input
              placeholder="Search email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={() => loadLists(userSearch)}>
              Refresh List
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-auto">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  if (category === "platform") {
                    setUserId(String(u.id));
                    setPlatformRoles((u.platformRoles || []).map((r) => (r === "Owner" ? 0 : 1)).join(","));
                  } else {
                    setStoreUserId(String(u.id));
                  }
                }}
                className="w-full text-left px-3 py-2 rounded border border-slate-200 hover:bg-slate-50"
              >
                <p className="text-sm font-medium truncate">{u.email}</p>
                <p className="text-xs text-slate-500">
                  roles: {(u.platformRoles || []).join(", ") || "none"} · stores: {u.storeMemberships || 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 truncate">{u.id}</p>
              </button>
            ))}
            {filteredUsers.length === 0 ? <p className="text-sm text-slate-500">No users found.</p> : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
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
              <div className="space-y-2">
                <Label>Reason (required for sensitive changes)</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this change is needed" />
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
                  disabled={loading || !userId.trim() || !reason.trim()}
                  onClick={() =>
                    wrap(async () => {
                      await api.put(
                        `/platform/rbac/users/${userId.trim()}/platform-roles`,
                        {
                          roles: parseCsv(platformRoles).map((x) => Number(x)),
                          reason: reason.trim(),
                        },
                        { headers: stepUp ? { "X-Step-Up-Auth": "true" } : {} }
                      );
                      setMessage("Platform roles saved.");
                      await loadLists(userSearch);
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
                  <select
                    className="w-full h-10 border rounded-md px-3 text-sm bg-white dark:bg-slate-950"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                  >
                    <option value="">Select store</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.subdomain || "no-subdomain"})
                      </option>
                    ))}
                  </select>
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
              <div className="space-y-2">
                <Label>Reason (required for sensitive changes)</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this change is needed" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <input type="checkbox" checked={stepUp} onChange={(e) => setStepUp(e.target.checked)} />
                Step-up confirmed (adds X-Step-Up-Auth header)
              </label>
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
                  disabled={loading || !storeId.trim() || !storeUserId.trim() || !reason.trim()}
                  onClick={() =>
                    wrap(async () => {
                      await api.put(
                        `/platform/rbac/stores/${storeId.trim()}/users/${storeUserId.trim()}/permissions`,
                        {
                          permissions: parseCsv(permissions),
                          reason: reason.trim(),
                        },
                        { headers: stepUp ? { "X-Step-Up-Auth": "true" } : {} }
                      );
                      setMessage("Store permissions saved.");
                    })
                  }
                >
                  Save Permissions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </div>
  );
};

export default PlatformRbac;
