import React, { useEffect, useState } from "react";
import { BellRing, MapPin, RefreshCw, ShieldAlert, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function AlertSubscribers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const result = await api.alertSubscriptions.list(100);
      setSubscriptions(result.subscriptions || []);
    } catch (error) {
      toast({ title: "Could not load farmer alert registrations", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { if (user?.role === "admin") load(); }, [user?.role]);

  if (user?.role !== "admin") {
    return <div className="rounded-2xl border border-rose-200 bg-white p-6"><ShieldAlert className="mb-2 h-6 w-6 text-rose-600" /><h2 className="font-semibold text-slate-900">Administrator access required</h2><p className="mt-1 text-sm text-slate-600">Farmer contact details and exact farm coordinates are restricted.</p></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Farmer Alert Registrations" description="Review farmer-submitted farm locations, channel-specific consent and contact-verification status. No alerts are sent from this page." icon={BellRing}
        actions={<button type="button" onClick={() => load(true)} disabled={refreshing} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><Users className="h-4 w-4 text-slate-500" /><p className="mt-2 text-2xl font-bold text-slate-900">{subscriptions.length}</p><p className="text-xs text-slate-500">Registrations loaded</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><BellRing className="h-4 w-4 text-amber-600" /><p className="mt-2 text-2xl font-bold text-slate-900">{subscriptions.filter((item) => item.status === "pending_verification").length}</p><p className="text-xs text-slate-500">Pending contact verification</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><MapPin className="h-4 w-4 text-emerald-700" /><p className="mt-2 text-2xl font-bold text-slate-900">{subscriptions.filter((item) => item.farm_latitude != null && item.farm_longitude != null).length}</p><p className="text-xs text-slate-500">Farm points recorded</p></div>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">All new registrations remain <strong>pending verification</strong>. Do not contact farmers or enable automated alerts until channel consent, contact verification, provider readiness and operational safety checks are complete. Exact farm coordinates are sensitive and visible here only to administrators.</div>
      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading registrations…</div> : subscriptions.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No farmer alert registrations yet.</div> : (
        <div className="space-y-3">
          {subscriptions.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><h2 className="font-semibold text-slate-900">{item.name || "Farmer (name not provided)"}</h2><p className="mt-1 text-sm text-slate-600">{[item.phone, item.email].filter(Boolean).join(" · ") || "No contact"}</p><p className="mt-1 text-xs text-slate-500">{[item.municipality, item.ward ? `Ward ${item.ward}` : "", item.district, item.province].filter(Boolean).join(", ")}</p></div>
                <span className="inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">{item.status.replaceAll("_", " ")}</span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                <p><strong className="text-slate-800">Farm point:</strong> {Number(item.farm_latitude).toFixed(6)}, {Number(item.farm_longitude).toFixed(6)} ({item.location_source}{item.location_accuracy_m == null ? "" : `, ±${Math.round(item.location_accuracy_m)} m`})</p>
                <p><strong className="text-slate-800">Language:</strong> {item.preferred_language === "ne" ? "Nepali" : "English"}</p>
                <p className="sm:col-span-2"><strong className="text-slate-800">Consented channels:</strong> {Object.entries(item.channel_consents || {}).filter(([, value]) => value?.consented).map(([key]) => key.replaceAll("_", " ")).join(", ") || "None"}</p>
                <p className="sm:col-span-2"><strong className="text-slate-800">Wildlife risks:</strong> {(item.risk_preferences || []).join(", ") || "All / not specified"}</p>
                <p className="sm:col-span-2 text-slate-400">Registered {new Date(item.created_at).toLocaleString()} · Subscription ID {item.id}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
