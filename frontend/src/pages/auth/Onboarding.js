import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  const [agreeTerms, setAgreeTerms] = useState(false);
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
        if (!agreeTerms) {
          setMessage("Please accept Terms and Privacy Policy");
          return;
        }
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
  const stepMeta = [
    { key: "register", title: "Registration", subtitle: "Create your account" },
    { key: "verify", title: "Verification", subtitle: "Verify email & mobile" },
    { key: "plan", title: "Choose Plan", subtitle: "Select a subscription" },
    { key: "payment", title: "Payment", subtitle: "Complete purchase" },
    { key: "store", title: "Organization", subtitle: "Setup your business" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-2xl font-extrabold tracking-tight text-blue-700 dark:text-blue-400">Sitesellr</Link>
          <div className="flex items-center gap-3">
            <Link to="/auth/login">
              <Button variant="outline" className="border-slate-300">Login</Button>
            </Link>
            <Link to="/onboarding">
              <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl grid-cols-1 lg:grid-cols-[340px_1fr]">
        <aside className="hidden lg:block bg-gradient-to-b from-slate-900 via-blue-950 to-cyan-900 p-8 text-white">
          <div className="text-3xl font-black tracking-tight">Sitesellr</div>
          <p className="mt-8 text-4xl font-bold leading-tight">Welcome to Sitesellr</p>
          <p className="mt-4 text-slate-300">Let's set up your account in a few simple steps</p>
          <div className="mt-8 border-t border-slate-500/50" />

          <div className="mt-8 space-y-6">
            {stepMeta.map((s, idx) => {
              const active = step === s.key;
              const complete = stepIndex > idx + 1;
              return (
                <div key={s.key} className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold ${active ? "border-cyan-300 bg-cyan-400 text-slate-900" : complete ? "border-cyan-300 bg-cyan-900 text-cyan-200" : "border-slate-500 text-slate-300"}`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className={`text-2xl leading-none ${active ? "text-white font-semibold" : "text-slate-300"}`}>{s.title}</div>
                    <div className="mt-1 text-slate-400">{s.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Create your account</h1>
            <p className="mt-2 text-lg text-slate-500">Enter your details to get started</p>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">Step {stepIndex} of 5</div>

            <div className="mt-8 space-y-5">
          {step === "register" && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input className="h-12" value={form.name} onChange={(e) => setField("name", e.target.value)} /></div>
              <div><Label>Email Address</Label><Input className="h-12" value={form.email} onChange={(e) => setField("email", e.target.value)} /></div>
              <div><Label>Mobile Number</Label><Input className="h-12" value={form.mobile} onChange={(e) => setField("mobile", e.target.value)} /></div>
              <div><Label>Password</Label><Input className="h-12" type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} /></div>
              <label className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                <input className="mt-1" type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                <span>I agree to the <a className="underline" href="#!" onClick={(e) => e.preventDefault()}>Terms of Service</a> and <a className="underline" href="#!" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.</span>
              </label>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-3">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                On-screen OTP (dev): Email OTP <b>{otpHints.emailOtp}</b>, Mobile OTP <b>{otpHints.mobileOtp}</b>
              </div>
              <div><Label>Email OTP</Label><Input className="h-12" value={form.emailOtp} onChange={(e) => setField("emailOtp", e.target.value)} /></div>
              <div><Label>Mobile OTP</Label><Input className="h-12" value={form.mobileOtp} onChange={(e) => setField("mobileOtp", e.target.value)} /></div>
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
              <div><Label>Store Name</Label><Input className="h-12" value={form.storeName} onChange={(e) => setField("storeName", e.target.value)} /></div>
              <div><Label>Subdomain</Label><Input className="h-12" value={form.subdomain} onChange={(e) => setField("subdomain", e.target.value.toLowerCase())} /></div>
            </div>
          )}

          {message ? <div className="text-sm text-red-600 dark:text-red-400">{message}</div> : null}
          <Button className="h-12 w-full bg-blue-600 text-lg hover:bg-blue-700" onClick={runStep} disabled={loading}>
            {loading ? "Please wait..." : step === "store" ? "Activate Store" : "Continue"}
          </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Onboarding;
