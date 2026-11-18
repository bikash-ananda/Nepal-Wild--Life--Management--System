import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = safeReturnTo();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await api.auth.loginViaEmailPassword(email.trim(), password);
      const destination = returnTo !== "/"
        ? returnTo
        : user?.role === "farmer" ? "/my-farm" : "/ai-verification";
      window.location.assign(destination);
    } catch (err) {
      setError(err.message || "लग इन गर्न सकिएन। विवरण जाँच गर्नुहोस्।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="फार्ममा स्वागत छ"
      subtitle="आफ्नो WLMS खातामा सुरक्षित रूपमा लग इन गर्नुहोस्।"
      footer={<span>खाता छैन? आफ्नो फार्म वा परियोजनाका प्रशासकसँग सम्पर्क गरेर पहुँच माग्नुहोस्।</span>}
    >
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-semibold text-slate-700">इमेल ठेगाना <span className="font-normal text-slate-400">· Email</span></Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input id="email" type="email" autoComplete="username" autoFocus placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="h-14 rounded-xl border-slate-200 bg-slate-50 pl-12 text-base focus-visible:ring-emerald-600" required />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2"><Label htmlFor="password" className="text-sm font-semibold text-slate-700">पासवर्ड <span className="font-normal text-slate-400">· Password</span></Label><Link to="/forgot-password" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline">पासवर्ड बिर्सनुभयो?</Link></div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="आफ्नो पासवर्ड लेख्नुहोस्" value={password} onChange={(event) => setPassword(event.target.value)} className="h-14 rounded-xl border-slate-200 bg-slate-50 pl-12 pr-12 text-base focus-visible:ring-emerald-600" required />
            <button type="button" aria-label={showPassword ? "पासवर्ड लुकाउनुहोस्" : "पासवर्ड देखाउनुहोस्"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70"><span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
        </div>
        <Button type="submit" className="h-14 w-full rounded-xl bg-[#176247] text-base font-semibold text-white shadow-lg shadow-emerald-900/10 hover:bg-[#124e39]" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> लग इन हुँदैछ...</> : <>सुरक्षित रूपमा लग इन गर्नुहोस् <LogIn className="ml-2 h-5 w-5" /></>}
        </Button>
      </form>
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5"><ShieldLockIcon /><p className="text-xs leading-5 text-emerald-950/80">तपाईंलाई अनुमति दिइएको फार्म र उपकरण मात्र देखिनेछन्। आफ्नो Login विवरण अरूसँग साझा नगर्नुहोस्।</p></div>
    </AuthLayout>
  );
}

function ShieldLockIcon() { return <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />; }
