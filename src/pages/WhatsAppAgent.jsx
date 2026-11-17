import React, { useEffect, useState } from "react";
import {
  Activity, AlertTriangle, Bot, CheckCircle2, Clock3, Languages,
  MessageCircle, PhoneCall, Save, ShieldCheck, ShieldOff, Smartphone,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/api/apiClient";

const initialSettings = {
  official_number: "9768004157",
  display_name: "WLMS Wildlife Alert Assistant",
  default_language: "ne",
  greeting_np: "नमस्कार, म WLMS को AI सहायक हुँ। तपाईंको क्षेत्रमा वन्यजन्तुसम्बन्धी सूचना प्राप्त भएको छ। के तपाईं अहिले सुरक्षित स्थानमा हुनुहुन्छ?",
  greeting_en: "Hello, I am the WLMS AI assistant. We have received a wildlife activity report near your area. Are you currently in a safe place?",
};

function Status({ children, tone = "neutral" }) {
  const styles = {
    neutral: "bg-slate-100 text-slate-700",
    warning: "bg-amber-100 text-amber-800",
    success: "bg-emerald-100 text-emerald-800",
    danger: "bg-rose-100 text-rose-800",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}>{children}</span>;
}

function Stat({ icon: Icon, label, value, note }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm text-slate-500"><Icon className="h-4 w-4" />{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </article>
  );
}

export default function WhatsAppAgent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState(initialSettings);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isAdmin = user?.role === "admin";

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.whatsappAgent.get();
      setSettings(result.settings);
      setActivity(result.activity || []);
    } catch (error) {
      toast({ title: "Could not load WhatsApp Agent settings", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const save = async () => {
    setSaving(true);
    try {
      const result = await api.whatsappAgent.update({
        default_language: settings.default_language,
        greeting_np: settings.greeting_np,
        greeting_en: settings.greeting_en,
      });
      setSettings((current) => ({ ...current, ...result.settings }));
      toast({ title: "Agent preferences saved", description: "No messages or calls were sent." });
      await load();
    } catch (error) {
      toast({ title: "Could not save settings", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return <div className="rounded-2xl border border-rose-200 bg-white p-6"><ShieldOff className="mb-2 h-6 w-6 text-rose-600" /><h2 className="font-semibold text-slate-900">Administrator access required</h2><p className="mt-1 text-sm text-slate-600">This module contains communication-provider settings and is restricted to administrators.</p></div>;
  }

  const connectionReady = settings.connection_status === "connected";
  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp AI Agent"
        description="Configure the WLMS wildlife-alert assistant. Live messaging and calling remain disabled until official provider onboarding and verification are complete."
        icon={Bot}
      />

      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><MessageCircle className="h-6 w-6" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Official WLMS sender</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">+{settings.official_number}</h2>
              <p className="mt-1 text-sm text-slate-600">{settings.display_name}</p>
            </div>
          </div>
          <Status tone={connectionReady ? "success" : "warning"}>{connectionReady ? "Connected" : "Not connected"}</Status>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white bg-white/80 p-3"><div className="text-xs text-slate-500">Provider credentials</div><div className="mt-1 font-semibold text-slate-800">{settings.credentials_present ? "Present — integration pending" : "Not configured"}</div></div>
          <div className="rounded-xl border border-white bg-white/80 p-3"><div className="text-xs text-slate-500">Webhook verification</div><div className="mt-1 font-semibold text-slate-800">{settings.webhook_verified ? "Verified" : "Not verified"}</div></div>
          <div className="rounded-xl border border-white bg-white/80 p-3"><div className="text-xs text-slate-500">Live delivery</div><div className="mt-1 font-semibold text-rose-700">Disabled by default</div></div>
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />The number is selected as the official WLMS sender, but it has not been registered or verified with Meta. This panel does not initiate WhatsApp calls or messages.</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Bot} label="AI agent" value="Prepared" note="Conversation runtime not connected" />
        <Stat icon={PhoneCall} label="Voice calls" value="Disabled" note="No outbound or inbound call automation" />
        <Stat icon={Smartphone} label="Farmer consent" value="Required" note="Separate opt-in before WhatsApp calling" />
        <Stat icon={ShieldCheck} label="Safety mode" value="Test only" note="Live delivery is locked off" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><h2 className="font-semibold text-slate-900">Agent language and greeting</h2><p className="mt-1 text-sm text-slate-500">These are saved preferences only; they do not activate a calling service.</p></div>
          <Languages className="h-5 w-5 text-emerald-700" />
        </div>
        {loading ? <div className="py-8 text-center text-sm text-slate-500">Loading settings…</div> : (
          <div className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Default conversation language</span><select value={settings.default_language} onChange={(event) => setSettings({ ...settings, default_language: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="ne">Nepali</option><option value="en">English</option><option value="auto">Detect from farmer</option></select></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Nepali opening message</span><textarea value={settings.greeting_np} onChange={(event) => setSettings({ ...settings, greeting_np: event.target.value })} rows={3} maxLength={1200} className="w-full rounded-xl border border-slate-300 p-3 text-sm leading-6" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">English opening message</span><textarea value={settings.greeting_en} onChange={(event) => setSettings({ ...settings, greeting_en: event.target.value })} rows={3} maxLength={1200} className="w-full rounded-xl border border-slate-300 p-3 text-sm leading-6" /></label>
            <div className="flex justify-end"><button type="button" onClick={save} disabled={saving || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save preferences"}</button></div>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-700" /><h2 className="font-semibold text-slate-900">Required onboarding</h2></div>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex gap-3"><span className="font-semibold text-emerald-700">01</span><span>Confirm control of the SIM and ability to receive Meta verification directly.</span></li>
            <li className="flex gap-3"><span className="font-semibold text-emerald-700">02</span><span>Check Meta Business App Coexistence eligibility before changing the current WhatsApp Business setup.</span></li>
            <li className="flex gap-3"><span className="font-semibold text-emerald-700">03</span><span>Create the Meta Business Portfolio, WhatsApp Business Account and developer app.</span></li>
            <li className="flex gap-3"><span className="font-semibold text-emerald-700">04</span><span>Configure server-side credentials and verify webhook signatures before enabling provider traffic.</span></li>
            <li className="flex gap-3"><span className="font-semibold text-emerald-700">05</span><span>Test consent, inbound messages/calls, delivery callbacks and opt-out with a small approved test group.</span></li>
          </ol>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2"><ShieldOff className="h-5 w-5 text-amber-800" /><h2 className="font-semibold text-amber-950">Live delivery safety lock</h2></div>
          <p className="mt-2 text-sm leading-6 text-amber-900">The agent cannot send a message or place a call from this page. Live delivery remains disabled in the backend. The lock can only be reconsidered after the provider adapter, verified webhook, recipient consent, delivery limits and emergency stop have passed review.</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-900"><Clock3 className="h-4 w-4" />No live provider actions are available yet</div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-slate-600" /><h2 className="font-semibold text-slate-900">Recent administrative activity</h2></div>
        {activity.length ? <div className="mt-4 divide-y divide-slate-100">{activity.map((entry) => <div key={entry.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-slate-800">{entry.action}</p><p className="text-xs text-slate-500">{entry.actor_name || "Administrator"}</p></div><time className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString()}</time></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No configuration activity recorded yet.</p>}
      </section>
    </div>
  );
}
