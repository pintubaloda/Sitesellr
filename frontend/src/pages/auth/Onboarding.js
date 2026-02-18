import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import api, { setAuthToken } from "../../lib/api";
import { setStoredStoreId, setStoredTokens } from "../../lib/session";

const STEPS = ["register", "verify", "plan", "payment", "store"];

export const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState("register");
  const [plans, setPlans] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [otpHints, setOtpHints] = useState({ emailOtp: "", mobileOtp: "" });
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    emailOtp: "",
    mobileOtp: "",
    planCode: "free",
    storeName: "",
    subdomain: "",
  });

  useEffect(() => {
    api.get("/onboarding/plans").then((res) => {
      const rows = Array.isArray(res.data) ? res.data : [];
      setPlans(rows);
      const requestedPlan = searchParams.get("plan");
      const matched = rows.find((x) => x.code === requestedPlan);
      if (matched?.code) {
        setForm((prev) => ({ ...prev, planCode: matched.code }));
      } else if (rows[0]?.code) {
        setForm((prev) => ({ ...prev, planCode: rows[0].code }));
      }
    });
  }, [searchParams]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const runStep = async () => {
    setLoading(true);
    setMessage("");
    try {
      if (step === "register") {
        const res = await api.post("/onboarding/start", {
          name: form.name,
          email: form.email,
          mobile: form.mobile,
          password: form.password,
        });
        setSessionId(res.data.sessionId);
        setOtpHints({ emailOtp: res.data.emailOtp, mobileOtp: res.data.mobileOtp });
        setStep("verify");
      } else if (step === "verify") {
        await api.post("/onboarding/verify-email", { sessionId, otp: form.emailOtp });
        await api.post("/onboarding/verify-mobile", { sessionId, otp: form.mobileOtp });
        setStep("plan");
      } else if (step === "plan") {
        const res = await api.post("/onboarding/choose-plan", { sessionId, planCode: form.planCode });
        const needPayment = !!res.data.paymentRequired;
        setPaymentRequired(needPayment);
        setStep(needPayment ? "payment" : "store");
      } else if (step === "payment") {
        await api.post("/onboarding/confirm-payment", { sessionId });
        setStep("store");
      } else if (step === "store") {
        await api.post("/onboarding/setup-store", { sessionId, storeName: form.storeName, subdomain: form.subdomain });
        const done = await api.post("/onboarding/complete", { sessionId });
        setStoredTokens({
          accessToken: done.data.access_token,
          refreshToken: done.data.refresh_token,
        });
        if (done.data.storeId) {
          setStoredStoreId(done.data.storeId);
        }
        setAuthToken(done.data.access_token);
        navigate("/admin");
      }
    } catch (err) {
      setMessage(err?.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = STEPS.indexOf(step) + 1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Start Free Trial - Step {stepIndex}/5</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === "register" && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setField("name", e.target.value)} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setField("email", e.target.value)} /></div>
              <div><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setField("mobile", e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} /></div>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-3">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                On-screen OTP (dev): Email OTP <b>{otpHints.emailOtp}</b>, Mobile OTP <b>{otpHints.mobileOtp}</b>
              </div>
              <div><Label>Email OTP</Label><Input value={form.emailOtp} onChange={(e) => setField("emailOtp", e.target.value)} /></div>
              <div><Label>Mobile OTP</Label><Input value={form.mobileOtp} onChange={(e) => setField("mobileOtp", e.target.value)} /></div>
            </div>
          )}

          {step === "plan" && (
            <div className="space-y-3">
              <Label>Choose Plan</Label>
              <Select value={form.planCode} onValueChange={(value) => setField("planCode", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.name} - {Number(p.pricePerMonth || 0) === 0 ? "Free" : `Rs ${p.pricePerMonth}/mo`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Payment step (stub): click continue to mark payment successful for now.
              </p>
            </div>
          )}

          {step === "store" && (
            <div className="space-y-3">
              <div><Label>Store Name</Label><Input value={form.storeName} onChange={(e) => setField("storeName", e.target.value)} /></div>
              <div><Label>Subdomain</Label><Input value={form.subdomain} onChange={(e) => setField("subdomain", e.target.value.toLowerCase())} /></div>
            </div>
          )}

          {message ? <div className="text-sm text-red-600 dark:text-red-400">{message}</div> : null}
          <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={runStep} disabled={loading}>
            {loading ? "Please wait..." : step === "store" ? "Activate Store" : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
