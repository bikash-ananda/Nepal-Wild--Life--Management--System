import React, { useState, useEffect } from "react";
import { Phone, Loader2, Volume2, Languages, PhoneCall, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const templates = {
  critical_monkey_ne: "नमस्ते। तपाईंको क्षेत्रमा बाँदर देखिएको हुन सक्ने अपुष्ट रिपोर्ट आएको छ। कृपया सुरक्षित दूरीमा रहनुहोस् र स्थानीय फिल्ड टोलीलाई जानकारी दिनुहोस्।",
  critical_monkey_en: "Hello. An unverified report of possible monkey activity has been received near your area. Please keep a safe distance and contact the local field team.",
  warning_elephant_ne: "सावधान। तपाईंको क्षेत्रमा हात्ती देखिएको हुन सक्ने अपुष्ट रिपोर्ट आएको छ। कृपया सुरक्षित स्थानमा रहनुहोस् र स्थानीय टोलीलाई जानकारी दिनुहोस्।",
  warning_elephant_en: "Attention. An unverified report of possible elephant activity has been received near your area. Stay in a safe place and contact the local field team.",
  device_offline_ne: "सूचना। तपाईंको क्यामेरा अफलाइन भएको छ। कृपया जाँच गर्नुहोस्।",
  device_offline_en: "Notice. Your camera has gone offline. Please check the device.",
};

export default function VoiceBot() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("ne");
  const [message, setMessage] = useState(templates.critical_monkey_ne);
  const [siteName, setSiteName] = useState("Kaskikot Strawberry Farm");
  const [eta, setEta] = useState("2 minutes");
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const l = await api.entities.VoiceCallLog.list("-initiated_at", 20);
    setLogs(l); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const buildMessage = () => {
    const template = language === "ne" ? templates.critical_monkey_ne : templates.critical_monkey_en;
    return template.replace("your farm", siteName).replace("तपाईंको खेतमा", `${siteName} मा`);
  };

  const testCall = async () => {
    setTesting(true);
    try {
      if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
        throw new Error("Voice preview is not supported in this browser.");
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = language === "ne" ? "ne-NP" : "en-US";
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
      toast({ title: "Playing local preview", description: "This plays on this device only; no phone call or alert was sent." });
    } catch (error) {
      toast({ title: "Voice preview unavailable", description: error.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const statusIcons = {
    answered: { icon: CheckCircle2, color: "text-emerald-500" },
    no_answer: { icon: XCircle, color: "text-slate-400" },
    failed: { icon: XCircle, color: "text-red-500" },
    busy: { icon: XCircle, color: "text-amber-500" },
    initiated: { icon: PhoneCall, color: "text-blue-500" },
  };

  return (
    <div>
      <PageHeader title="Voice Message Preview" description="Preview safety wording in Nepali or English on this device. No calls are placed." icon={Phone} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4"><Languages className="w-5 h-5 text-emerald-600" /><div className="text-sm font-semibold text-slate-700">Voice Message Builder</div></div>

          <div className="space-y-3">
            <div><Label>Language</Label>
              <Select value={language} onValueChange={v => { setLanguage(v); setMessage(v === "ne" ? templates.critical_monkey_ne : templates.critical_monkey_en); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ne">नेपाली (Nepali)</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Site Name</Label><Input value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="e.g. Kaskikot Strawberry Farm" /></div>
            <div><Label>Estimated Arrival</Label><Input value={eta} onChange={e => setEta(e.target.value)} placeholder="e.g. 2 minutes" /></div>
            <div><Label>Message Template</Label>
              <Select onValueChange={v => { setMessage(language === "ne" ? templates[`${v}_ne`] : templates[`${v}_en`]); }}>
                <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical_monkey">Critical: Monkey Detection</SelectItem>
                  <SelectItem value="warning_elephant">Warning: Elephant Detection</SelectItem>
                  <SelectItem value="device_offline">Info: Device Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Custom Message</Label><Textarea value={message} onChange={e => setMessage(e.target.value)} className="min-h-[120px]" /></div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={testCall} disabled={testing} className="bg-emerald-600 hover:bg-emerald-700 flex-1">
              {testing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Volume2 className="w-4 h-4 mr-1" />}
              {testing ? "Preparing preview…" : "Play voice preview"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Browser voice availability and Nepali pronunciation depend on the phone's installed voices. This is a local preview, not an emergency alert channel.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4"><PhoneCall className="w-5 h-5 text-blue-600" /><div className="text-sm font-semibold text-slate-700">Connected call records</div></div>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div> : logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No calls yet</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {logs.map(l => {
                const st = statusIcons[l.status] || statusIcons.initiated;
                const StIcon = st.icon;
                return (
                  <div key={l.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100">
                    <StIcon className={`w-4 h-4 mt-1 ${st.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700 truncate">{l.contact_name}</div>
                      <div className="text-xs text-slate-400">{l.trigger} · {l.language === "ne" ? "नेपाली" : "English"}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{new Date(l.initiated_at).toLocaleString()}</div>
                    </div>
                    {l.acknowledged && <span className="text-[10px] text-emerald-600">✓ Acknowledged</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 bg-blue-50 rounded-2xl p-4">
        <div className="text-sm font-semibold text-blue-700 mb-1">How it works</div>
        <div className="text-xs text-blue-600">When a critical event is detected, the AI automatically places a voice call to the site owner and relevant contacts. The message is spoken in Nepali or English, includes the site name, estimated arrival time, and deterrent status. If nobody answers, the system escalates to the next contact after the configured timeout.</div>
      </div>
    </div>
  );
}
