import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
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
      await api.post(`/merchant-ops/${merchantId}/backoffice`, {
        email: backofficeEmail,
        scope: "merchant",
        department: "support",
      });
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

  return (
    <div className="space-y-6" data-testid="merchant-ops-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Merchant Ops</h1>
        <p className="text-slate-500 dark:text-slate-400">Lifecycle, onboarding checks, franchise and back-office workflows.</p>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Select Merchant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
          >
            <option value="">Select merchant</option>
            {(merchants || []).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader><CardTitle>Lifecycle Actions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <label className="text-sm text-slate-600 flex items-center gap-2">
            <input type="checkbox" checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} />
            Require approval for sensitive actions
          </label>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => lifecycle("trial")} disabled={!merchantId}>Set Trial</Button>
            <Button variant="outline" onClick={() => lifecycle("activate")} disabled={!merchantId}>Activate</Button>
            <Button variant="outline" onClick={() => lifecycle("suspend")} disabled={!merchantId}>Suspend</Button>
            <Button variant="outline" onClick={() => lifecycle("expire")} disabled={!merchantId}>Expire</Button>
            <Button variant="outline" onClick={() => lifecycle("reactivate")} disabled={!merchantId}>Reactivate</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader><CardTitle>Onboarding Completion Pipeline</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={loadOnboarding} disabled={!merchantId}>Load Pipeline</Button>
          {onboarding ? (
            <div className="grid gap-3 md:grid-cols-2">
              {["emailVerified", "mobileVerified", "kycVerified", "opsApproved", "riskApproved"].map((k) => (
                <label key={k} className="text-sm text-slate-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!onboarding[k]}
                    onChange={(e) => setOnboarding((p) => ({ ...p, [k]: e.target.checked }))}
                  />
                  {k}
                </label>
              ))}
              <div className="space-y-2">
                <Label>Pipeline Status</Label>
                <Input value={onboarding.pipelineStatus || "pending"} onChange={(e) => setOnboarding((p) => ({ ...p, pipelineStatus: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Button onClick={saveOnboarding}>Save Pipeline</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader><CardTitle>Franchise / Back-office</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Franchise Unit Name</Label>
            <Input value={franchiseName} onChange={(e) => setFranchiseName(e.target.value)} />
            <Button onClick={addFranchise} disabled={!merchantId || !franchiseName.trim()}>Add Franchise Unit</Button>
          </div>
          <div className="space-y-2">
            <Label>Back-office User Email</Label>
            <Input value={backofficeEmail} onChange={(e) => setBackofficeEmail(e.target.value)} />
            <Button onClick={addBackoffice} disabled={!merchantId || !backofficeEmail.trim()}>Assign Back-office</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader><CardTitle>Sensitive Action Approvals</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={loadApprovals}>Load Pending Approvals</Button>
          <div className="space-y-2">
            {approvals.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{a.actionType}</p>
                  <p className="text-xs text-slate-500">{a.entityType}:{a.entityId}</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => approve(a.id)}>Approve</Button>
              </div>
            ))}
            {approvals.length === 0 ? <p className="text-sm text-slate-500">No pending approvals loaded.</p> : null}
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </div>
  );
};

export default MerchantOps;
