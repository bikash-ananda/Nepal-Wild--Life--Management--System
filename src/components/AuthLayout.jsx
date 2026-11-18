import React from "react";
import { Leaf, ShieldCheck } from "lucide-react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f7f4] px-4 py-8 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-emerald-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-lime-200/40 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#12372c] text-emerald-200 shadow-lg shadow-emerald-950/15"><Leaf className="h-6 w-6" /></span>
          <div className="text-left"><p className="text-sm font-bold tracking-[0.16em] text-[#12372c]">WLMS</p><p className="text-[10px] font-medium uppercase tracking-[0.13em] text-slate-500">Wildlife & Farm Safety</p></div>
        </div>
        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-2xl shadow-emerald-950/10 backdrop-blur">
          <div className="bg-gradient-to-br from-[#12372c] via-[#164b3b] to-[#1d6550] px-6 py-7 text-white sm:px-8">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10"><Icon className="h-6 w-6 text-emerald-100" aria-hidden="true" /></span>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-6 text-emerald-50/75">{subtitle}</p>}
          </div>
          <div className="px-5 py-6 sm:px-8 sm:py-8">{children}</div>
        </section>
        <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-700" /> सुरक्षित पहुँच · तपाईंलाई तोकिएको फार्म मात्र</div>
        {footer && <p className="mt-4 text-center text-xs leading-5 text-slate-500">{footer}</p>}
      </div>
    </main>
  );
}
