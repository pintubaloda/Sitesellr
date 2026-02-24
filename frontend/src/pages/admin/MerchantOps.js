import { useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import useApiList from "../../hooks/useApiList";
import api from "../../lib/api";

export const MerchantOps = () => {
  const { data: merchants } = useApiList("/merchants", { enabled: true });
  const [merchantId, setMerchantId] = useState("");
  const [reason, setReason] = useState("");
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("lifecycle");
  const [onboarding, setOnboarding] = useState(null);
  const [franchiseName, setFranchiseName] = useState("");
  const [backofficeEmail, setBackofficeEmail] = useState("");
  const [approvals, setApprovals] = useState([]);

  const call = async (fn) => {
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (err) {
      setError(err?.response?.status === 403 ? "You are not authorized." : (err?.response?.data?.error || "Action failed."));
    }
  };

  const lifecycle = async (action) => {
    await call(async () => {
      const res = await api.post(`/merchant-ops/${merchantId}/lifecycle`, { action, reason, requireApproval: approvalRequired });
      setMessage(res.data?.queuedForApproval ? "Sent for approval." : "Lifecycle updated.");
    });
  };

  const loadOnboarding = async () => {
    await call(async () => {
      const res = await api.get(`/merchant-ops/${merchantId}/onboarding`);
      setOnboarding(res.data);
      setMessage("Onboarding profile loaded.");
    });
  };

  const saveOnboarding = async () => {
    if (!onboarding) return;
    await call(async () => {
      await api.put(`/merchant-ops/${merchantId}/onboarding`, onboarding);
      setMessage("Onboarding profile saved.");
    });
  };

  const addFranchise = async () => {
    await call(async () => {
      await api.post(`/merchant-ops/${merchantId}/franchise`, { name: franchiseName });
      setFranchiseName("");
      setMessage("Franchise unit added.");
    });
  };

  const addBackoffice = async () => {
    await call(async () => {
      await api.post(`/merchant-ops/${merchantId}/backoffice`, { email: backofficeEmail, scope: "merchant", department: "support" });
      setBackofficeEmail("");
      setMessage("Back-office assignment added.");
    });
  };

  const loadApprovals = async () => {
    await call(async () => {
      const res = await api.get("/merchant-ops/approvals", { params: { status: "pending" } });
      setApprovals(Array.isArray(res.data) ? res.data : []);
    });
  };

  const approve = async (id) => {
    await call(async () => {
      await api.post(`/merchant-ops/approvals/${id}/approve`);
      await loadApprovals();
      setMessage("Approval completed.");
    });
  };

  const selectedMerchantName = useMemo(() => {
    const m = (merchants || []).find((x) => String(x.id) === String(merchantId));
    return m?.name || "";
  }, [merchants, merchantId]);

  return (
    <div className="space-y-6" data-testid="merchant-ops-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Merchant Operations</h1>
        <div className="text-slate-500 text-sm">{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <Label className="text-sm tracking-widest uppercase text-slate-500">Select merchant to operate on</Label>
          <select
            className="w-full h-12 rounded-xl border border-slate-300 px-4 text-base"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
          >
            <option value="">— Choose a merchant —</option>
            {(merchants || []).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { key: "lifecycle", label: "Lifecycle" },
          { key: "onboarding", label: "Onboarding" },
          { key: "franchise", label: "Franchise & Backoffice" },
          { key: "approvals", label: `Approvals (${approvals.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`h-14 rounded-2xl text-lg font-medium border ${activeTab === t.key ? "bg-white border-slate-300 text-slate-800" : "bg-slate-100 border-transparent text-slate-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "lifecycle" ? (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Lifecycle Management</h2>
              <p className="text-slate-500">Control merchant account status transitions</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm tracking-widest uppercase text-slate-500">Reason for action</Label>
              <Input className="h-12" placeholder="Describe the reason for this lifecycle change..." value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <label className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <span className="text-base font-medium text-slate-700">Require approval for sensitive actions</span>
              <input type="checkbox" checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} />
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Button variant="outline" className="h-16 text-lg" disabled={!merchantId} onClick={() => lifecycle("trial")}>Set Trial</Button>
              <Button variant="outline" className="h-16 text-lg" disabled={!merchantId} onClick={() => lifecycle("activate")}>Activate</Button>
              <Button variant="outline" className="h-16 text-lg" disabled={!merchantId} onClick={() => lifecycle("suspend")}>Suspend</Button>
              <Button variant="outline" className="h-16 text-lg" disabled={!merchantId} onClick={() => lifecycle("expire")}>Expire</Button>
              <Button variant="outline" className="h-16 text-lg" disabled={!merchantId} onClick={() => lifecycle("reactivate")}>Reactivate</Button>
            </div>
            {!merchantId ? <p className="text-slate-500">Select a merchant above to enable lifecycle actions.</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "onboarding" ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Onboarding Pipeline{selectedMerchantName ? ` · ${selectedMerchantName}` : ""}</h2>
            <Button variant="outline" disabled={!merchantId} onClick={loadOnboarding}>Load Pipeline</Button>
            {onboarding ? (
              <div className="grid md:grid-cols-2 gap-3">
                {["emailVerified", "mobileVerified", "kycVerified", "opsApproved", "riskApproved"].map((k) => (
                  <label key={k} className="flex items-center gap-2 p-3 rounded-xl border">
                    <input type="checkbox" checked={!!onboarding[k]} onChange={(e) => setOnboarding((p) => ({ ...p, [k]: e.target.checked }))} />
                    <span>{k}</span>
                  </label>
                ))}
                <Input value={onboarding.pipelineStatus || "pending"} onChange={(e) => setOnboarding((p) => ({ ...p, pipelineStatus: e.target.value }))} />
                <div>
                  <Button onClick={saveOnboarding}>Save Pipeline</Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "franchise" ? (
        <Card>
          <CardContent className="p-6 grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Franchise Unit Name</Label>
              <Input value={franchiseName} onChange={(e) => setFranchiseName(e.target.value)} />
              <Button onClick={addFranchise} disabled={!merchantId || !franchiseName.trim()}>Add Franchise Unit</Button>
            </div>
            <div className="space-y-3">
              <Label>Back-office User Email</Label>
              <Input value={backofficeEmail} onChange={(e) => setBackofficeEmail(e.target.value)} />
              <Button onClick={addBackoffice} disabled={!merchantId || !backofficeEmail.trim()}>Assign Back-office</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "approvals" ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Sensitive Action Approvals</h2>
              <Button variant="outline" onClick={loadApprovals}>Load Pending</Button>
            </div>
            <div className="space-y-2">
              {approvals.map((a) => (
                <div key={a.id} className="rounded-xl border p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{a.actionType}</p>
                    <p className="text-sm text-slate-500">{a.entityType}:{a.entityId}</p>
                  </div>
                  <Button onClick={() => approve(a.id)}>Approve</Button>
                </div>
              ))}
              {approvals.length === 0 ? <p className="text-slate-500">No pending approvals loaded.</p> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </div>
  );
};

export default MerchantOps;
