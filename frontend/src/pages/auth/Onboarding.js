import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Store } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import api, { setAuthToken } from "../../lib/api";
import { setStoredStoreId, setStoredTokens } from "../../lib/session";

const STEPS = ["register", "verify", "plan", "payment", "store"];

export const Onboarding = ({ showHeaderMenu = false }) => {
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
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex lg:w-1/2 relative bg-blue-600">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-400 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur">
                <Store className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold">Sitesellr</span>
            </Link>

            <div className="mt-36">
              <h1 className="text-4xl font-bold mb-3">Welcome back!</h1>
              <p className="text-xl text-blue-100 max-w-xl">Start your free trial in a few guided steps.</p>
            </div>

            <div className="mt-10 rounded-3xl border border-white/20 bg-white/10 p-7 backdrop-blur-sm">
              <div className="space-y-6">
                {stepMeta.map((s, idx) => {
                  const active = step === s.key;
                  const complete = stepIndex > idx + 1;
                  return (
                    <div key={s.key} className="relative flex items-start gap-4">
                      {idx < stepMeta.length - 1 ? <div className="absolute left-[18px] top-[36px] h-[34px] w-px bg-white/35" /> : null}
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${active ? "bg-white text-blue-700" : complete ? "border border-white/70 bg-white/20 text-white" : "border border-white/45 bg-transparent text-white/90"}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className={`text-xl leading-none ${active ? "font-semibold text-white" : "text-blue-100/90"}`}>{s.title}</div>
                        <div className="mt-1 text-base text-blue-100/75">{s.subtitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="text-sm text-blue-100/80">© 2026 Sitesellr. All rights reserved.</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Sitesellr</span>
          </Link>
          {showHeaderMenu ? (
            <nav className="hidden xl:flex items-center gap-8 text-[15px] text-slate-600">
              <Link to="/" className="hover:text-slate-900">Features</Link>
              <Link to="/" className="hover:text-slate-900">Modules</Link>
              <Link to="/" className="hover:text-slate-900">Pricing</Link>
              <Link to="/" className="hover:text-slate-900">Resources</Link>
            </nav>
          ) : null}
          <div className={`flex items-center gap-4 ${showHeaderMenu ? "ml-auto xl:ml-8" : "ml-auto"}`}>
            <span className="text-sm text-slate-500">Already have an account?</span>
            <Link to="/auth/login">
              <Button variant="outline" size="sm" className="rounded-full">Log in</Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-4">
          <div className="w-full max-w-xl">
            <div className="mb-5">
              <h2 className="text-[34px] leading-[1.2] font-semibold tracking-[-0.01em] text-slate-900">Create your account</h2>
              <p className="mt-1 text-[15px] text-slate-500">Enter your details to get started</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runStep();
              }}
              className="space-y-4"
            >
              {step === "register" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-[16px] font-semibold text-slate-700">Name</Label>
                    <Input className="mt-1 h-[48px] rounded-xl text-[15px]" value={form.name} onChange={(e) => setField("name", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[16px] font-semibold text-slate-700">Email Address</Label>
                    <Input className="mt-1 h-[48px] rounded-xl text-[15px]" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[16px] font-semibold text-slate-700">Mobile Number</Label>
                    <Input className="mt-1 h-[48px] rounded-xl text-[15px]" value={form.mobile} onChange={(e) => setField("mobile", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[16px] font-semibold text-slate-700">Password</Label>
                    <Input className="mt-1 h-[48px] rounded-xl text-[15px]" type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} />
                  </div>
                  <label className="flex items-start gap-2 text-sm text-slate-600">
                    <input className="mt-1" type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                    <span>I agree to the <a className="underline" href="#!" onClick={(e) => e.preventDefault()}>Terms of Service</a> and <a className="underline" href="#!" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.</span>
                  </label>
                </div>
              )}

              {step === "verify" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-slate-700">
                    On-screen OTP (dev): Email OTP <b>{otpHints.emailOtp}</b>, Mobile OTP <b>{otpHints.mobileOtp}</b>
                  </div>
                  <div>
                    <Label className="text-[16px] font-semibold text-slate-700">Email OTP</Label>
                    <Input className="mt-1 h-[48px] rounded-xl text-[15px]" value={form.emailOtp} onChange={(e) => setField("emailOtp", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[16px] font-semibold text-slate-700">Mobile OTP</Label>
                    <Input className="mt-1 h-[48px] rounded-xl text-[15px]" value={form.mobileOtp} onChange={(e) => setField("mobileOtp", e.target.value)} />
                  </div>
                </div>
              )}

              {step === "plan" && (
                <div className="space-y-3">
                  <Label className="text-[16px] font-semibold text-slate-700">Choose Plan</Label>
                  <Select value={form.planCode} onValueChange={(value) => setField("planCode", value)}>
                    <SelectTrigger className="h-[48px] rounded-xl text-[15px]"><SelectValue /></SelectTrigger>
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
                <div className="space-y-2 text-sm text-slate-600">
                  <p>Payment required for selected plan. Click continue to confirm payment for now.</p>
                  {paymentRequired ? <p className="text-blue-700">Paid plan selected.</p> : null}
                </div>
              )}

              {step === "store" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-[16px] font-semibold text-slate-700">Store Name</Label>
                    <Input className="mt-1 h-[48px] rounded-xl text-[15px]" value={form.storeName} onChange={(e) => setField("storeName", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[16px] font-semibold text-slate-700">Subdomain</Label>
                    <Input className="mt-1 h-[48px] rounded-xl text-[15px]" value={form.subdomain} onChange={(e) => setField("subdomain", e.target.value.toLowerCase())} />
                  </div>
                </div>
              )}

              {message ? <p className="text-sm text-red-600">{message}</p> : null}

              <Button className="w-full h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 text-[18px] font-medium" disabled={loading} type="submit">
                <span className="flex items-center gap-2">
                  {loading ? "Please wait..." : step === "store" ? "Activate Store" : "Continue"}
                  {!loading ? <ArrowRight className="w-4 h-4" /> : null}
                </span>
              </Button>

              <p className="text-xs text-slate-500 text-center">Step {stepIndex}/5 · Activate store redirects to admin</p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
