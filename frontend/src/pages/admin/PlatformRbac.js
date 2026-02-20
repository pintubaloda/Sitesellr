import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import api from "../../lib/api";

const normalizePlatformRole = (value) => (String(value || "").toLowerCase() === "owner" ? "Owner" : "Staff");

export const PlatformRbac = () => {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [category, setCategory] = useState("platform");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [platformRole, setPlatformRole] = useState("Staff");
  const [storeRole, setStoreRole] = useState("Staff");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const run = async (fn) => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err?.response?.status === 403 ? "You are not authorized." : (err?.response?.data?.error || "Action failed."));
    } finally {
      setLoading(false);
    }
  };

  const loadLists = async (term = "") => {
    await run(async () => {
      const [usersRes, storesRes] = await Promise.all([
        api.get("/platform/rbac/users", { params: term ? { q: term } : {} }),
        api.get("/platform/rbac/stores"),
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setStores(Array.isArray(storesRes.data) ? storesRes.data : []);
    });
  };

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    setSelectedUser(null);
    setReason("");
    setMessage("");
    setError("");
  }, [category]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      const isPlatform = (u.platformRoles || []).length > 0;
      const bucket = category === "platform" ? isPlatform : !isPlatform || (u.storeMemberships || 0) > 0;
      if (!bucket) return false;
      if (!term) return true;
      return String(u.email || "").toLowerCase().includes(term);
    });
  }, [category, search, users]);

  const onSelectUser = async (user) => {
    setSelectedUser(user);
    setReason("");
    setMessage("");
    setError("");
    if (category === "platform") {
      await run(async () => {
        const res = await api.get(`/platform/rbac/users/${user.id}/platform-roles`);
        const rows = Array.isArray(res.data) ? res.data : [];
        setPlatformRole(normalizePlatformRole(rows[0]));
      });
      return;
    }
    if (selectedStoreId) {
      await run(async () => {
        try {
          const res = await api.get(`/platform/rbac/stores/${selectedStoreId}/users/${user.id}/role`);
          setStoreRole(String(res.data?.role || "Staff"));
        } catch (err) {
          if (err?.response?.status === 404) {
            setStoreRole("Staff");
            return;
          }
          throw err;
        }
      });
    } else {
      setStoreRole("Staff");
    }
  };

  const onStoreChange = async (value) => {
    setSelectedStoreId(value);
    if (!selectedUser || category !== "store" || !value) return;
    await run(async () => {
      try {
        const res = await api.get(`/platform/rbac/stores/${value}/users/${selectedUser.id}/role`);
        setStoreRole(String(res.data?.role || "Staff"));
      } catch (err) {
        if (err?.response?.status === 404) {
          setStoreRole("Staff");
          return;
        }
        throw err;
      }
    });
  };

  const savePlatformRole = async () => {
    if (!selectedUser || !reason.trim()) return;
    await run(async () => {
      await api.put(`/platform/rbac/users/${selectedUser.id}/platform-roles`, {
        roles: [platformRole === "Owner" ? 0 : 1],
        reason: reason.trim(),
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, platformRoles: [platformRole] }
            : u
        )
      );
      setMessage(`Updated ${selectedUser.email} as ${platformRole}.`);
    });
  };

  const saveStoreRole = async () => {
    if (!selectedUser || !selectedStoreId || !reason.trim()) return;
    await run(async () => {
      await api.put(`/platform/rbac/stores/${selectedStoreId}/users/${selectedUser.id}/role`, {
        role: storeRole,
        reason: reason.trim(),
      });
      setMessage(`Updated ${selectedUser.email} as ${storeRole} for selected store.`);
    });
  };

  return (
    <div className="space-y-6" data-testid="platform-rbac-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform RBAC</h1>
        <p className="text-slate-500 dark:text-slate-400">Select user type, pick user, review current role, then update.</p>
      </div>

      <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle>Users</CardTitle>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={category === "platform" ? "default" : "outline"} onClick={() => setCategory("platform")}>Platform Users</Button>
              <Button variant={category === "store" ? "default" : "outline"} onClick={() => setCategory("store")}>Store Users</Button>
            </div>
            <Input placeholder="Search by email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button variant="outline" onClick={() => loadLists(search)}>Refresh</Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-auto">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelectUser(u)}
                className={`w-full text-left p-3 rounded-xl border transition ${selectedUser?.id === u.id ? "border-blue-500 bg-blue-50/40" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <p className="text-sm font-semibold text-slate-900">{u.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary">{(u.platformRoles || []).join(", ") || "No Platform Role"}</Badge>
                  <span className="text-xs text-slate-500">stores: {u.storeMemberships || 0}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 truncate">{u.id}</p>
              </button>
            ))}
            {filteredUsers.length === 0 ? <p className="text-sm text-slate-500">No users found.</p> : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle>Selected User</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedUser ? (
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/70">
                  <p className="font-semibold">{selectedUser.email}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedUser.id}</p>
                  <div className="mt-3 flex gap-2">
                    <Badge variant="secondary">Platform: {(selectedUser.platformRoles || []).join(", ") || "none"}</Badge>
                    <Badge variant="secondary">Stores: {selectedUser.storeMemberships || 0}</Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Select a user from the left list.</p>
              )}
            </CardContent>
          </Card>

          {category === "platform" ? (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader><CardTitle>Update Platform Role</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current / New Role</Label>
                  <select className="w-full h-11 border rounded-lg px-3 bg-white dark:bg-slate-950" value={platformRole} onChange={(e) => setPlatformRole(e.target.value)}>
                    <option value="Owner">Owner</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input placeholder="Reason for role change" value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <Button disabled={loading || !selectedUser || !reason.trim()} onClick={savePlatformRole}>Save Platform Role</Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader><CardTitle>Update Store Role</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Store</Label>
                    <select className="w-full h-11 border rounded-lg px-3 bg-white dark:bg-slate-950" value={selectedStoreId} onChange={(e) => onStoreChange(e.target.value)}>
                      <option value="">Select store</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.subdomain || "no-subdomain"})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Current / New Role</Label>
                    <select className="w-full h-11 border rounded-lg px-3 bg-white dark:bg-slate-950" value={storeRole} onChange={(e) => setStoreRole(e.target.value)}>
                      <option value="Owner">Owner</option>
                      <option value="Admin">Admin</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input placeholder="Reason for role change" value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <Button disabled={loading || !selectedUser || !selectedStoreId || !reason.trim()} onClick={saveStoreRole}>Save Store Role</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </div>
  );
};

export default PlatformRbac;
