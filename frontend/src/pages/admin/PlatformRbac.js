import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
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
      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? { ...u, platformRoles: [platformRole] } : u)));
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
      setMessage(`Updated ${selectedUser.email} as ${storeRole}.`);
    });
  };

  const platformUsers = useMemo(() => users.filter((u) => (u.platformRoles || []).length > 0).length, [users]);
  const storeUsers = useMemo(() => users.filter((u) => (u.storeMemberships || 0) > 0).length, [users]);
  const totalRolesAssigned = useMemo(() => users.reduce((sum, u) => sum + (u.platformRoles || []).length + (u.storeRoles || []).length, 0), [users]);

  return (
    <div className="space-y-6" data-testid="platform-rbac-page">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-semibold text-slate-800">Platform RBAC</h1>
        <div className="text-slate-500 text-lg">{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><p className="text-slate-500">Platform Users</p><p className="mt-4 text-5xl font-semibold text-slate-800">{platformUsers}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-slate-500">Store Users</p><p className="mt-4 text-5xl font-semibold text-slate-800">{storeUsers}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-slate-500">Total Roles Assigned</p><p className="mt-4 text-5xl font-semibold text-slate-800">{totalRolesAssigned}</p></CardContent></Card>
      </div>

      <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <Card>
          <CardContent className="p-0">
            <div className="p-5 space-y-3 border-b">
              <h3 className="text-3xl font-semibold text-slate-800">Users</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={category === "platform" ? "default" : "outline"} onClick={() => setCategory("platform")}>Platform</Button>
                <Button variant={category === "store" ? "default" : "outline"} onClick={() => setCategory("store")}>Store</Button>
              </div>
              <Input placeholder="Search by email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-[540px] overflow-auto">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onSelectUser(u)}
                  className={`w-full text-left p-4 border-b hover:bg-slate-50 ${selectedUser?.id === u.id ? "bg-blue-50" : "bg-white"}`}
                >
                  <p className="text-2xl font-semibold text-slate-800">{u.email}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{category === "platform" ? ((u.platformRoles || []).join(", ") || "No Platform Role") : ((u.storeRoles || []).join(", ") || "No Store Role")}</Badge>
                    <span className="text-slate-500">{u.storeMemberships || 0} stores</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardContent className="p-6">
              {!selectedUser ? (
                <p className="text-center text-slate-500 text-xl py-8">Select a user from the list to manage their roles</p>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-3xl font-semibold text-slate-800">{selectedUser.email}</h3>
                  {category === "platform" ? (
                    <>
                      <div className="space-y-2">
                        <Label>Current / New Role</Label>
                        <select className="w-full h-11 border rounded-lg px-3" value={platformRole} onChange={(e) => setPlatformRole(e.target.value)}>
                          <option value="Owner">Owner</option>
                          <option value="Staff">Staff</option>
                        </select>
                      </div>
                      <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                      <Button disabled={loading || !reason.trim()} onClick={savePlatformRole}>Save Platform Role</Button>
                    </>
                  ) : (
                    <>
                      <div className="grid md:grid-cols-2 gap-3">
                        <select className="w-full h-11 border rounded-lg px-3" value={selectedStoreId} onChange={(e) => onStoreChange(e.target.value)}>
                          <option value="">Select store</option>
                          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select className="w-full h-11 border rounded-lg px-3" value={storeRole} onChange={(e) => setStoreRole(e.target.value)}>
                          <option value="Owner">Owner</option>
                          <option value="Admin">Admin</option>
                          <option value="Staff">Staff</option>
                        </select>
                      </div>
                      <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                      <Button disabled={loading || !selectedStoreId || !reason.trim()} onClick={saveStoreRole}>Save Store Role</Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-3xl font-semibold text-slate-800">Role Permissions Reference</h3>
              <p className="text-slate-500 mb-4">Overview of what each role can access</p>
              <div className="space-y-3 text-slate-700">
                <div><span className="font-semibold">Platform Owner:</span> Manage all merchants, approvals, platform RBAC, analytics, billing</div>
                <div><span className="font-semibold">Platform Staff:</span> View merchant list, basic operations, support tickets</div>
                <div><span className="font-semibold">Store Owner:</span> Full store control, team management, reports, products/orders</div>
                <div><span className="font-semibold">Store Admin:</span> Products/orders, customer management, limited settings</div>
                <div><span className="font-semibold">Store Staff:</span> View orders and fulfillment actions</div>
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
