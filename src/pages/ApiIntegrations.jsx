import React, { useState } from "react";
import {
  Cable, Key, Webhook, Link2, Code2, Copy, Plus, Check,
  Shield, Activity, Globe, Zap, RefreshCw, Lock
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/ui/use-toast";

const connectedApps = [
  { name: "Farm Management App", desc: "Shares wildlife alerts and farm risk data", status: "connected", icon: "🌾", color: "bg-lime-100" },
  { name: "Wildlife Mobile App", desc: "Field officer mobile companion", status: "connected", icon: "📱", color: "bg-blue-100" },
  { name: "Government Portal", desc: "Provincial wildlife reporting", status: "available", icon: "🏛️", color: "bg-slate-100" },
  { name: "IoT Gateway", desc: "LoRa device data ingestion", status: "connected", icon: "📡", color: "bg-amber-100" },
  { name: "Research Dashboard", desc: "Academic wildlife research access", status: "available", icon: "🔬", color: "bg-purple-100" },
];

const apiKeys = [
  { name: "Farm App Production", key: "wms_prod_••••••••3a8f", created: "2026-07-15", lastUsed: "2 hours ago", scopes: ["read:alerts", "read:events"] },
  { name: "Mobile App Staging", key: "wms_stg_••••••••e2c1", created: "2026-06-01", lastUsed: "1 day ago", scopes: ["read:alerts"] },
];

const webhooks = [
  { url: "https://farm-app.example.com/api/v1/wildlife/webhook", events: ["alert.created", "event.detected"], status: "active" },
  { url: "https://gov-portal.example.com/api/wildlife-sync", events: ["alert.resolved"], status: "active" },
];

export default function ApiIntegrations() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);

  const copyKey = () => {
    navigator.clipboard?.writeText("wms_prod_a1b2c3d4e5f6g7h8");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "API key copied to clipboard" });
  };

  return (
    <div>
      <PageHeader
        title="API & Integrations"
        description="Manage API keys, webhooks, and connected applications"
        icon={Cable}
        actions={
          <button
            onClick={() => setShowNewKey(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create API Key
          </button>
        }
      />

      {/* API Info Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Code2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Wildlife Management API — v1</h3>
            <p className="text-sm text-slate-300 mt-1">Base URL for all API integrations. Use stable IDs (farm_id, device_id, wildlife_event_id, alert_id) for cross-application data sharing.</p>
            <div className="mt-3 flex items-center gap-2 bg-slate-950/50 rounded-lg px-3 py-2 font-mono text-sm">
              <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-200 truncate">https://api.wildlife-ms.np/api/v1/</span>
              <button onClick={copyKey} className="ml-auto p-1 rounded hover:bg-slate-800 transition-colors">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Key, label: "API Keys", value: apiKeys.length, color: "text-amber-600 bg-amber-50" },
          { icon: Link2, label: "Connected Apps", value: connectedApps.filter((a) => a.status === "connected").length, color: "text-emerald-600 bg-emerald-50" },
          { icon: Webhook, label: "Webhooks", value: webhooks.length, color: "text-blue-600 bg-blue-50" },
          { icon: Activity, label: "Requests (24h)", value: "12.4k", color: "text-purple-600 bg-purple-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connected Applications */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-600" /> Connected Applications
          </h3>
          <div className="space-y-3">
            {connectedApps.map((app) => (
              <div key={app.name} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div className={`w-10 h-10 rounded-lg ${app.color} flex items-center justify-center text-xl flex-shrink-0`}>
                  {app.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{app.name}</div>
                  <div className="text-xs text-slate-400 truncate">{app.desc}</div>
                </div>
                {app.status === "connected" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected
                  </span>
                ) : (
                  <button className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors">
                    Connect
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-600" /> API Keys
          </h3>
          <div className="space-y-3">
            {apiKeys.map((k) => (
              <div key={k.name} className="p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-800">{k.name}</span>
                  <span className="text-xs text-slate-400">{k.created}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs text-slate-500 bg-slate-50 rounded-lg px-2 py-1.5 mb-2">
                  <Lock className="w-3 h-3 text-slate-400" />
                  {k.key}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500">{s}</span>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">Last used {k.lastUsed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhooks */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Webhook className="w-4 h-4 text-blue-600" /> Webhooks
          </h3>
          <div className="space-y-3">
            {webhooks.map((w) => (
              <div key={w.url} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-slate-100">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-slate-600 truncate">{w.url}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {w.events.map((e) => (
                      <span key={e} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-600">{e}</span>
                    ))}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API Permissions reference */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" /> Available API Scopes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            "read:alerts", "write:alerts", "read:events", "read:devices", "write:devices",
            "read:farms", "read:team", "trigger:deterrents", "read:analytics", "read:reports",
          ].map((s) => (
            <div key={s} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-sm">
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-mono text-xs text-slate-600">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}