import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import api, { setAuthToken } from "../../lib/api";
import { setStoredStoreId, setStoredTokens } from "../../lib/session";

export const AcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    if (!token) {
      setError("Invalid invite token.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/team-invites/accept", { token, password });
      setStoredTokens({ accessToken: res.data.access_token, refreshToken: res.data.refresh_token });
      if (res.data.storeId) setStoredStoreId(res.data.storeId);
      setAuthToken(res.data.access_token);
      navigate("/admin");
    } catch (err) {
      setError(err?.response?.data?.error || "Could not accept invite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Accept Team Invite</h1>
        <p className="text-sm text-slate-500">Set your password to join the store team.</p>
        <div className="space-y-2">
          <Label>Password (min 8 chars)</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={accept} disabled={loading || password.length < 8}>
          {loading ? "Please wait..." : "Accept Invite"}
        </Button>
      </div>
    </div>
  );
};

export default AcceptInvite;
