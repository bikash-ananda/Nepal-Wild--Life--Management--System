import React, { useState } from "react";
import { BellRing, Cable, Camera, Check, CircleHelp, Copy, Link2, ShieldCheck, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/ui/use-toast";

export default function ApiIntegrations() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const apiBaseUrl = window.location.origin + "/api/";

  const copyBaseUrl = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable in this browser.");
      await navigator.clipboard.writeText(apiBaseUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast({ title: "API base path copied" });
    } catch (error) {
      toast({ title: "Could not copy API base path", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="API & Integrations"
        description="See the application API path and the integrations available in this deployment."
        icon={Cable}
      />

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Link2 className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900">Application API base path</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">The web application sends authenticated requests to this site under <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/</code>. Access still follows the signed-in account and its permissions.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-slate-950 px-3 py-3 text-sm text-emerald-100">{apiBaseUrl}</code>
              <button type="button" onClick={copyBaseUrl} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {copied ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy base path"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-700" /><h2 className="font-semibold text-slate-900">Authenticated application data</h2></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">The dashboard uses the server API for accounts, sites, observations, reviews, and other records. This page does not issue separate API tokens or expose session credentials.</p>
          <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">Keep credentials on the server. Do not place tokens, passwords, or camera connection URLs in browser code or public links.</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2"><Camera className="h-5 w-5 text-blue-700" /><h2 className="font-semibold text-slate-900">Camera streams and controls</h2></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Camera connections are configured per camera. Stream reachability and manual controls depend on that camera's network profile, supported adapter, and server configuration.</p>
          <Link to="/cameras" className="mt-4 inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Open camera management</Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-violet-700" /><h2 className="font-semibold text-slate-900">Mobile field capture</h2></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Field capture uploads observations through the application when connectivity is available. Submitted records remain unverified until a reviewer checks them.</p>
          <Link to="/field-capture" className="mt-4 inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Open field capture</Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2"><BellRing className="h-5 w-5 text-amber-700" /><h2 className="font-semibold text-slate-900">Notifications</h2></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Browser push delivery depends on notification-provider configuration and a user's subscription. A draft or saved rule is not proof that a message was delivered.</p>
          <Link to="/notifications" className="mt-4 inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Open notifications</Link>
        </article>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
          <div>
            <h2 className="font-semibold text-amber-950">External API keys and webhooks</h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">External API-key issuance, outbound webhook registration, and request-usage reporting are not implemented in this panel. No keys, connected third-party applications, or webhook deliveries are represented as active here.</p>
            <p className="mt-2 text-xs leading-5 text-amber-900">Before connecting another organization, add server-side scoped credentials with expiry, revocation, rate limits, and audit records. Never reuse a browser login token as an integration key.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
