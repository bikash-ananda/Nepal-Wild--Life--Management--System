import React, { useState, useEffect } from "react";
import { Bell, Plus, Trash2, Users, Workflow, Phone, Mail, MessageCircle, Smartphone, Loader2 } from "lucide-react";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const roles = [
  { value: "owner", labelKey: "notifications.role.owner" }, { value: "family", labelKey: "notifications.role.family" },
  { value: "manager", labelKey: "notifications.role.manager" }, { value: "municipality", labelKey: "notifications.role.municipality" },
  { value: "forest", labelKey: "notifications.role.forest" }, { value: "emergency", labelKey: "notifications.role.emergency" },
  { value: "researcher", labelKey: "notifications.role.researcher" },
];
const channels = [
  { value: "push", labelKey: "notifications.channel.browserPush", icon: Smartphone, enabled: true }, { value: "sms", labelKey: "notifications.channel.sms", icon: MessageCircle, enabled: false },
  { value: "email", labelKey: "notifications.channel.email", icon: Mail, enabled: false }, { value: "whatsapp", labelKey: "notifications.channel.whatsapp", icon: MessageCircle, enabled: false },
  { value: "messenger", labelKey: "notifications.channel.messenger", icon: MessageCircle, enabled: false }, { value: "voice_call", labelKey: "notifications.channel.voiceCall", icon: Phone, enabled: false },
  { value: "in_app", labelKey: "notifications.channel.inApp", icon: Bell, enabled: true },
];
const triggerTypes = [
  { value: "detection", labelKey: "notifications.trigger.animalDetection" }, { value: "prediction", labelKey: "notifications.trigger.aiPrediction" },
  { value: "device_offline", labelKey: "notifications.trigger.deviceOffline" }, { value: "emergency", labelKey: "notifications.trigger.emergency" },
  { value: "low_battery", labelKey: "notifications.trigger.lowBattery" }, { value: "crop_damage", labelKey: "notifications.trigger.cropDamage" },
];

function base64UrlToBytes(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export default function Notifications() {
  const [tab, setTab] = useState("contacts");
  const [contacts, setContacts] = useState([]);
  const [rules, setRules] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", site_id: "", role: "owner", phone: "", email: "", whatsapp: "", preferred_channel: "push", priority: 1, active: true });
  const [ruleForm, setRuleForm] = useState({ name: "", site_id: "", trigger_type: "detection", species: "", min_confidence: 0.5, min_risk_level: "medium", channels: ["push"], contact_roles: ["owner"], escalation_minutes: 5, ai_optimized: false, active: true });
  const [pushStatus, setPushStatus] = useState("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const { user } = useAuth();
  const { t: translateText } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const checkPush = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (!cancelled) setPushStatus("unsupported");
        return;
      }
      try {
        const [config, status] = await Promise.all([api.notifications.pushConfig(), api.notifications.pushStatus()]);
        if (!cancelled) setPushStatus(!config.configured ? "unconfigured" : status.enabled ? "enabled" : "disabled");
      } catch {
        if (!cancelled) setPushStatus("error");
      }
    };
    checkPush();
    return () => { cancelled = true; };
  }, []);

  const enablePush = async () => {
    setPushBusy(true);
    let errorKey = "notifications.pushEnableFailedDescription";
    try {
      if (!("Notification" in window)) {
        errorKey = "notifications.pushBrowserUnsupported";
        throw new Error("unsupported");
      }
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        errorKey = "notifications.pushPermissionDenied";
        throw new Error("permission_denied");
      }
      const config = await api.notifications.pushConfig();
      if (!config.configured || !config.public_key) {
        errorKey = "notifications.pushServerUnconfigured";
        throw new Error("push_unconfigured");
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(config.public_key),
      });
      await api.notifications.subscribe(subscription.toJSON());
      setPushStatus("enabled");
      toast({ title: translateText("notifications.pushEnabled"), description: translateText("notifications.pushEnabledDescription") });
    } catch {
      toast({ title: translateText("notifications.pushEnableFailed"), description: translateText(errorKey), variant: "destructive" });
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    setPushBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.notifications.unsubscribe(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setPushStatus("disabled");
      toast({ title: translateText("notifications.pushDisabled") });
    } catch {
      toast({ title: translateText("notifications.pushDisableFailed"), variant: "destructive" });
    } finally {
      setPushBusy(false);
    }
  };

  const load = async () => {
    try {
      const [c, r, s] = await Promise.all([
        api.entities.NotificationContact.list(),
        api.entities.NotificationRule.list(),
        api.entities.Site.list(),
      ]);
      setContacts(c); setRules(r); setSites(s);
    } catch {
      toast({ title: translateText("notifications.loadFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createContact = async () => {
    if (!contactForm.name.trim() || !contactForm.site_id) {
      toast({ title: translateText("notifications.requiredFields"), variant: "destructive" });
      return;
    }
    const site = sites.find(s => s.id === contactForm.site_id);
    try {
      await api.entities.NotificationContact.create({ ...contactForm, name: contactForm.name.trim(), site_name: site?.name });
      toast({ title: translateText("notifications.contactAdded") });
      setShowContact(false);
      setContactForm({ name: "", site_id: "", role: "owner", phone: "", email: "", whatsapp: "", preferred_channel: "push", priority: 1, active: true });
      await load();
    } catch {
      toast({ title: translateText("notifications.contactAddFailed"), variant: "destructive" });
    }
  };

  const createRule = async () => {
    if (!ruleForm.name.trim() || !ruleForm.site_id) {
      toast({ title: translateText("notifications.requiredFields"), variant: "destructive" });
      return;
    }
    const site = sites.find(s => s.id === ruleForm.site_id);
    try {
      await api.entities.NotificationRule.create({ ...ruleForm, name: ruleForm.name.trim(), site_name: site?.name });
      toast({ title: translateText("notifications.ruleCreated") });
      setShowRule(false);
      setRuleForm({ name: "", site_id: "", trigger_type: "detection", species: "", min_confidence: 0.5, min_risk_level: "medium", channels: ["push"], contact_roles: ["owner"], escalation_minutes: 5, ai_optimized: false, active: true });
      await load();
    } catch {
      toast({ title: translateText("notifications.ruleAddFailed"), variant: "destructive" });
    }
  };

  const toggleChannel = (ch) => {
    if (!channels.find((channel) => channel.value === ch)?.enabled) return;
    setRuleForm((form) => ({ ...form, channels: form.channels.includes(ch) ? form.channels.filter((item) => item !== ch) : [...form.channels, ch] }));
  };
  const toggleRole = (r) => setRuleForm(f => ({ ...f, contact_roles: f.contact_roles.includes(r) ? f.contact_roles.filter(x => x !== r) : [...f.contact_roles, r] }));

  const removeContact = async (c) => {
    try { await api.entities.NotificationContact.delete(c.id); await load(); }
    catch { toast({ title: translateText("notifications.contactDeleteFailed"), variant: "destructive" }); }
  };
  const removeRule = async (r) => {
    try { await api.entities.NotificationRule.delete(r.id); await load(); }
    catch { toast({ title: translateText("notifications.ruleDeleteFailed"), variant: "destructive" }); }
  };
  const toggleContact = async (c) => {
    try { await api.entities.NotificationContact.update(c.id, { active: !c.active }); await load(); }
    catch { toast({ title: translateText("notifications.contactUpdateFailed"), variant: "destructive" }); }
  };
  const toggleRule = async (r) => {
    try { await api.entities.NotificationRule.update(r.id, { active: !r.active }); await load(); }
    catch { toast({ title: translateText("notifications.ruleUpdateFailed"), variant: "destructive" }); }
  };

  return (
    <div>
      <PageHeader title={translateText("notifications.pageTitle")} description={translateText("notifications.pageDescription")} icon={Bell}
        actions={tab === "contacts" ? <Button onClick={() => setShowContact(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> {translateText("notifications.addContact")}</Button>
          : <Button onClick={() => setShowRule(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> {translateText("notifications.addRule")}</Button>} />

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-800">{translateText("notifications.browserAlertsHeading")}</h2>
            <p className="mt-1 text-sm text-slate-500">{translateText("notifications.browserAlertsDescription")}</p>
            <p className="mt-2 max-w-2xl text-xs text-slate-500">{translateText("notifications.costDisclosure")}</p>
            <p className="mt-1 text-xs text-slate-400">{translateText("notifications.assignedSites", { count: user?.site_ids?.length || 0 })}</p>
          </div>
          {pushStatus === "enabled" ? (
            <Button variant="outline" onClick={disablePush} disabled={pushBusy}>{pushBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}{translateText("notifications.disableAlerts")}</Button>
          ) : (
            <Button onClick={enablePush} disabled={pushBusy || !user?.site_ids?.length || ["checking", "unconfigured", "unsupported", "error"].includes(pushStatus)} className="bg-emerald-600 hover:bg-emerald-700">
              {pushBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
              {translateText("notifications.enableAlerts")}
            </Button>
          )}
        </div>
        {pushStatus === "unconfigured" && <p className="mt-3 text-xs text-amber-800">{translateText("notifications.pushUnconfigured")}</p>}
        {pushStatus === "unsupported" && <p className="mt-3 text-xs text-amber-800">{translateText("notifications.pushUnsupported")}</p>}
        {pushStatus === "error" && <p className="mt-3 text-xs text-rose-700">{translateText("notifications.pushStatusFailed")}</p>}
      </section>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {translateText("notifications.rulesStoredOnly")}
      </div>

      <div className="flex gap-1 border-b border-slate-100 mb-4">
        {[{ id: "contacts", labelKey: "notifications.contactsTab", icon: Users }, { id: "rules", labelKey: "notifications.rulesTab", icon: Workflow }].map(t => {
          const Icon = t.icon;
          return <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}><Icon className="w-4 h-4" /> {translateText(t.labelKey)}</button>;
        })}
      </div>

      {loading ? <div role="status" aria-label={translateText("common.loading")} className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /><span className="sr-only">{translateText("common.loading")}</span></div> : tab === "contacts" ? (
        contacts.length === 0 ? <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Users} title={translateText("notifications.noContacts")} description={translateText("notifications.noContactsDescription")} action={<Button onClick={() => setShowContact(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> {translateText("notifications.addContact")}</Button>} /></div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {contacts.map(c => {
              const role = roles.find(r => r.value === c.role);
              const channel = channels.find(ch => ch.value === c.preferred_channel);
              const ChIcon = channel?.icon || Bell;
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div><div className="font-semibold text-slate-800 text-sm">{c.name}</div><div className="text-xs text-slate-400">{role ? translateText(role.labelKey) : c.role} · {c.site_name}</div></div>
                    <Switch checked={c.active} onCheckedChange={() => toggleContact(c)} aria-label={translateText(c.active ? "notifications.deactivateContact" : "notifications.activateContact", { name: c.name })} />
                  </div>
                  <div className="space-y-1 text-xs text-slate-500 mb-3">
                    {c.phone && <div>📞 {c.phone}</div>}
                    {c.email && <div>✉️ {c.email}</div>}
                    {c.whatsapp && <div>💬 {c.whatsapp}</div>}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded"><ChIcon className="w-3 h-3" /> {channel ? translateText(channel.labelKey) : c.preferred_channel}</span>
                    <Button variant="ghost" size="icon" aria-label={translateText("notifications.deleteContact", { name: c.name })} onClick={() => removeContact(c)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        rules.length === 0 ? <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Workflow} title={translateText("notifications.noRules")} description={translateText("notifications.noRulesDescription")} action={<Button onClick={() => setShowRule(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> {translateText("notifications.addRule")}</Button>} /></div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rules.map(r => {
              const trigger = triggerTypes.find(t => t.value === r.trigger_type);
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div><div className="font-semibold text-slate-800 text-sm">{r.name}</div><div className="text-xs text-slate-400">{r.site_name} · {trigger ? translateText(trigger.labelKey) : r.trigger_type}</div></div>
                    <Switch checked={r.active} onCheckedChange={() => toggleRule(r)} aria-label={translateText(r.active ? "notifications.deactivateRule" : "notifications.activateRule", { name: r.name })} />
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(r.channels || []).map(ch => { const Ch = channels.find(c => c.value === ch); return <span key={ch} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{Ch ? translateText(Ch.labelKey) : ch}</span>; })}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(r.contact_roles || []).map(rl => { const role = roles.find(ro => ro.value === rl); return <span key={rl} className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">{role ? translateText(role.labelKey) : rl}</span>; })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-50">
                    <span>{translateText("notifications.escalateAfter", { minutes: r.escalation_minutes })}</span>
                    {r.ai_optimized && <span className="inline-flex items-center gap-1 text-purple-500"><Sparkles className="w-3 h-3" /> {translateText("notifications.aiOptimized")}</span>}
                    <Button variant="ghost" size="icon" aria-label={translateText("notifications.deleteRule", { name: r.name })} onClick={() => removeRule(r)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{translateText("notifications.addContactDialog")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{translateText("notifications.contactName")}</Label><Input value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} placeholder={translateText("notifications.contactNamePlaceholder")} /></div>
            <div><Label>{translateText("notifications.siteRequired")}</Label><Select value={contactForm.site_id} onValueChange={v => setContactForm({ ...contactForm, site_id: v })}><SelectTrigger><SelectValue placeholder={translateText("notifications.selectSite")} /></SelectTrigger><SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{translateText("notifications.roleLabel")}</Label><Select value={contactForm.role} onValueChange={v => setContactForm({ ...contactForm, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.map(r => <SelectItem key={r.value} value={r.value}>{translateText(r.labelKey)}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{translateText("notifications.phone")}</Label><Input value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} placeholder="+977..." /></div>
              <div><Label>{translateText("notifications.email")}</Label><Input value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} /></div>
            </div>
            <div><Label>{translateText("notifications.whatsappLabel")}</Label><Input value={contactForm.whatsapp} onChange={e => setContactForm({ ...contactForm, whatsapp: e.target.value })} placeholder="+977..." /></div>
            <div><Label>{translateText("notifications.preferredChannel")}</Label><Select value={contactForm.preferred_channel} onValueChange={v => setContactForm({ ...contactForm, preferred_channel: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{channels.map(c => <SelectItem key={c.value} value={c.value} disabled={!c.enabled}>{translateText(c.labelKey)}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowContact(false)}>{translateText("notifications.cancel")}</Button><Button onClick={createContact} className="bg-emerald-600 hover:bg-emerald-700">{translateText("notifications.addContact")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRule} onOpenChange={setShowRule}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{translateText("notifications.addRuleDialog")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{translateText("notifications.ruleName")}</Label><Input value={ruleForm.name} onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder={translateText("notifications.ruleNamePlaceholder")} /></div>
            <div><Label>{translateText("notifications.siteRequired")}</Label><Select value={ruleForm.site_id} onValueChange={v => setRuleForm({ ...ruleForm, site_id: v })}><SelectTrigger><SelectValue placeholder={translateText("notifications.selectSite")} /></SelectTrigger><SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{translateText("notifications.triggerType")}</Label><Select value={ruleForm.trigger_type} onValueChange={v => setRuleForm({ ...ruleForm, trigger_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{triggerTypes.map(t => <SelectItem key={t.value} value={t.value}>{translateText(t.labelKey)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{translateText("notifications.channels")}</Label><div className="flex flex-wrap gap-1.5 mt-1">{channels.map(c => { const Icon = c.icon; return <button key={c.value} type="button" disabled={!c.enabled} onClick={() => toggleChannel(c.value)} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${ruleForm.channels.includes(c.value) ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}><Icon className="w-3 h-3" /> {translateText(c.labelKey)}</button>; })}</div></div>
            <div><Label>{translateText("notifications.notifyRoles")}</Label><div className="flex flex-wrap gap-1.5 mt-1">{roles.map(r => <button key={r.value} type="button" onClick={() => toggleRole(r.value)} className={`text-xs px-2 py-1 rounded-lg border transition-colors ${ruleForm.contact_roles.includes(r.value) ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{translateText(r.labelKey)}</button>)}</div></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{translateText("notifications.minConfidence")}</Label><Input type="number" step="0.1" value={ruleForm.min_confidence} onChange={e => setRuleForm({ ...ruleForm, min_confidence: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>{translateText("notifications.escalationMinutes")}</Label><Input type="number" value={ruleForm.escalation_minutes} onChange={e => setRuleForm({ ...ruleForm, escalation_minutes: parseInt(e.target.value) || 5 })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowRule(false)}>{translateText("notifications.cancel")}</Button><Button onClick={createRule} className="bg-emerald-600 hover:bg-emerald-700">{translateText("notifications.addRule")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
