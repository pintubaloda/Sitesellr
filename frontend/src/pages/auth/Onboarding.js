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
    { key: "register", title: "Register", subtitle: "Create account details" },
    { key: "verify", title: "Verify OTP", subtitle: "Verify email and mobile" },
    { key: "plan", title: "Choose Plan", subtitle: "Select subscription plan" },
    { key: "payment", title: "Payment", subtitle: "Pay for paid plans only" },
    { key: "store", title: "Setup Store", subtitle: "Store name and subdomain" },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[50%_50%]">
        <aside className="hidden lg:flex flex-col justify-between bg-gradient-to-b from-blue-600 via-blue-600 to-indigo-700 px-[54px] py-[52px] text-white">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 text-[44px] font-semibold leading-none tracking-tight">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 bg-white/15 text-xl">🛍</span>
              <span className="text-[46px]">Sitesellr</span>
            </Link>
            <p className="mt-[290px] text-[64px] font-semibold leading-[1.05]">Welcome back!</p>
            <p className="mt-7 max-w-[630px] text-[43px] leading-[1.28] text-blue-100/95">
              Start your free trial in a few guided steps.
            </p>
            <div className="mt-12 rounded-3xl border border-white/20 bg-white/10 px-8 py-8">
              <div className="space-y-8">
            {stepMeta.map((s, idx) => {
              const active = step === s.key;
              const complete = stepIndex > idx + 1;
              return (
                <div key={s.key} className="relative flex items-start gap-5">
                  {idx < stepMeta.length - 1 ? <div className="absolute left-[18px] top-[40px] h-[38px] w-px bg-white/35" /> : null}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${active ? "bg-white text-blue-700" : complete ? "border border-white/70 bg-white/20 text-white" : "border border-white/45 bg-transparent text-white/90"}`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className={`text-[32px] leading-none ${active ? "font-semibold text-white" : "text-blue-100/90"}`}>{s.title}</div>
                    <div className="mt-2 text-[23px] text-blue-100/75">{s.subtitle}</div>
                  </div>
                </div>
              );
            })}
              </div>
            </div>
          </div>
          <p className="text-[28px] text-blue-100/80">© 2026 Sitesellr. All rights reserved.</p>
        </aside>

        <main className="flex min-h-screen items-center justify-center bg-white px-4 py-8 sm:px-8">
          <div className="w-full max-w-[620px]">
            <div className="mb-10 flex items-center justify-end gap-4 text-[15px] text-slate-500">
              <span>Already have an account?</span>
              <Link to="/auth/login">
                <Button variant="outline" className="h-9 rounded-full px-5 text-[15px]">Log in</Button>
              </Link>
            </div>

            <h1 className="text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-slate-900 lg:text-[50px]">Create your account</h1>
            <p className="mt-3 text-lg text-slate-500 lg:text-[33px]">Enter your details to get started</p>

            <div className="mt-12 space-y-5">
          {step === "register" && (
            <div className="space-y-5">
              <div><Label className="text-base font-medium text-slate-700 lg:text-[28px]">Name</Label><Input className="mt-2 h-12 rounded-2xl border-slate-200 px-5 text-base lg:h-16 lg:text-[26px]" value={form.name} onChange={(e) => setField("name", e.target.value)} /></div>
              <div><Label className="text-base font-medium text-slate-700 lg:text-[28px]">Email Address</Label><Input className="mt-2 h-12 rounded-2xl border-slate-200 px-5 text-base lg:h-16 lg:text-[26px]" value={form.email} onChange={(e) => setField("email", e.target.value)} /></div>
              <div><Label className="text-base font-medium text-slate-700 lg:text-[28px]">Mobile Number</Label><Input className="mt-2 h-12 rounded-2xl border-slate-200 px-5 text-base lg:h-16 lg:text-[26px]" value={form.mobile} onChange={(e) => setField("mobile", e.target.value)} /></div>
              <div><Label className="text-base font-medium text-slate-700 lg:text-[28px]">Password</Label><Input className="mt-2 h-12 rounded-2xl border-slate-200 px-5 text-base lg:h-16 lg:text-[26px]" type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} /></div>
              <label className="flex items-start gap-3 pt-1 text-sm text-slate-600 lg:text-[22px]">
                <input className="mt-1 h-5 w-5" type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                <span>I agree to the <a className="underline" href="#!" onClick={(e) => e.preventDefault()}>Terms of Service</a> and <a className="underline" href="#!" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.</span>
              </label>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700 lg:text-[20px]">
                On-screen OTP (dev): Email OTP <b>{otpHints.emailOtp}</b>, Mobile OTP <b>{otpHints.mobileOtp}</b>
              </div>
              <div><Label className="text-base font-medium text-slate-700 lg:text-[28px]">Email OTP</Label><Input className="mt-2 h-12 rounded-2xl border-slate-200 px-5 text-base lg:h-16 lg:text-[26px]" value={form.emailOtp} onChange={(e) => setField("emailOtp", e.target.value)} /></div>
              <div><Label className="text-base font-medium text-slate-700 lg:text-[28px]">Mobile OTP</Label><Input className="mt-2 h-12 rounded-2xl border-slate-200 px-5 text-base lg:h-16 lg:text-[26px]" value={form.mobileOtp} onChange={(e) => setField("mobileOtp", e.target.value)} /></div>
            </div>
          )}

          {step === "plan" && (
            <div className="space-y-5">
              <Label className="text-base font-medium text-slate-700 lg:text-[28px]">Choose Plan</Label>
              <Select value={form.planCode} onValueChange={(value) => setField("planCode", value)}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200 px-5 text-base lg:h-16 lg:text-[23px]"><SelectValue /></SelectTrigger>
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
              <p className="text-sm text-slate-600 lg:text-[22px]">
                Payment required for selected plan. Click continue to confirm payment for now.
              </p>
              {paymentRequired ? <p className="text-sm text-blue-700 lg:text-[20px]">Paid plan selected.</p> : null}
            </div>
          )}

          {step === "store" && (
            <div className="space-y-5">
              <div><Label className="text-base font-medium text-slate-700 lg:text-[28px]">Store Name</Label><Input className="mt-2 h-12 rounded-2xl border-slate-200 px-5 text-base lg:h-16 lg:text-[26px]" value={form.storeName} onChange={(e) => setField("storeName", e.target.value)} /></div>
              <div><Label className="text-base font-medium text-slate-700 lg:text-[28px]">Subdomain</Label><Input className="mt-2 h-12 rounded-2xl border-slate-200 px-5 text-base lg:h-16 lg:text-[26px]" value={form.subdomain} onChange={(e) => setField("subdomain", e.target.value.toLowerCase())} /></div>
            </div>
          )}

          {message ? <div className="text-sm text-red-600 lg:text-[20px]">{message}</div> : null}
          <Button className="mt-3 h-12 w-full rounded-2xl bg-blue-600 text-lg font-medium hover:bg-blue-700 lg:h-16 lg:text-[30px]" onClick={runStep} disabled={loading}>
            {loading ? "Please wait..." : step === "store" ? "Activate Store" : "Continue"}
          </Button>
          <div className="pt-4 text-center text-xs text-slate-500 lg:text-[20px]">
            {stepIndex}/5 • Activate store redirects to admin
          </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Onboarding;
