import React, { useState, useEffect } from "react";
import { Globe, Trash2, Loader2, CheckCircle2, TrendingUp, MapPin, Calendar, Zap, Brain, Share2 } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const categories = [
  { value: "movement_pattern", label: "Movement Patterns", icon: MapPin, color: "text-blue-600", bg: "bg-blue-50" },
  { value: "seasonal_trend", label: "Seasonal Trends", icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
  { value: "deterrent_effectiveness", label: "Deterrent Effectiveness", icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
  { value: "crop_damage", label: "Crop Damage Data", icon: TrendingUp, color: "text-red-600", bg: "bg-red-50" },
  { value: "model_update", label: "Model Updates", icon: Brain, color: "text-purple-600", bg: "bg-purple-50" },
  { value: "regional_insight", label: "Regional Insights", icon: Globe, color: "text-teal-600", bg: "bg-teal-50" },
];

export default function KnowledgeBase() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.entities.KnowledgeBase.list("-created_at", 50);
      setEntries(result);
    } catch (requestError) {
      setError(requestError.message || "Knowledge base records could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleShare = async (entry) => {
    setPendingId(entry.id);
    try {
      await api.entities.KnowledgeBase.update(entry.id, { shared: !entry.shared });
      toast({ title: entry.shared ? "Share flag cleared" : "Share flag saved", description: "This changes a record field in this deployment only." });
      await load();
    } catch (requestError) {
      toast({ title: "Share flag could not be updated", description: requestError.message, variant: "destructive" });
    } finally {
      setPendingId("");
    }
  };

  const remove = async (entry) => {
    if (!window.confirm("Delete the knowledge record “" + (entry.title || "Untitled") + "”? This cannot be undone.")) return;
    setPendingId(entry.id);
    try {
      await api.entities.KnowledgeBase.delete(entry.id);
      toast({ title: "Knowledge record deleted" });
      await load();
    } catch (requestError) {
      toast({ title: "Record could not be deleted", description: requestError.message, variant: "destructive" });
    } finally {
      setPendingId("");
    }
  };

  const filtered = filter === "all" ? entries : entries.filter(e => e.category === filter);

  return (
    <div>
      <PageHeader title="Knowledge Base Records" description="Review operational knowledge records saved in this deployment. A share flag does not publish data or train a model." icon={Globe} />

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        <button onClick={() => setFilter("all")} className={`flex flex-col items-center p-2.5 rounded-xl border transition-colors ${filter === "all" ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          <Globe className="w-5 h-5 text-slate-600" /><span className="text-[10px] text-slate-500 mt-1">All ({entries.length})</span>
        </button>
        {categories.map(c => {
          const Icon = c.icon;
          const count = entries.filter(e => e.category === c.value).length;
          return (
            <button key={c.value} onClick={() => setFilter(c.value)} className={`flex flex-col items-center p-2.5 rounded-xl border transition-colors ${filter === c.value ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <Icon className={`w-5 h-5 ${c.color}`} /><span className="text-[10px] text-slate-500 mt-1 text-center leading-tight">{c.label} ({count})</span>
            </button>
          );
        })}
      </div>

      {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Try again</Button></div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Globe} title="No knowledge records" description="Knowledge records created for this deployment will appear here." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(e => {
            const cat = categories.find(c => c.value === e.category);
            const Icon = cat?.icon || Globe;
            return (
              <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-lg ${cat?.bg || "bg-slate-50"} flex items-center justify-center`}><Icon className={`w-4 h-4 ${cat?.color || "text-slate-500"}`} /></div>
                    <div><div className="font-semibold text-slate-800 text-sm">{e.title}</div><div className="text-[10px] text-slate-400">{e.region || "Global"} · {e.species || "All species"}</div></div>
                  </div>
                  {e.verified && <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Verified</span>}
                </div>
                {e.description && <div className="text-xs text-slate-500 mb-2">{e.description}</div>}
                {e.insights && <div className="bg-slate-50 rounded-lg p-2 mb-2"><div className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Key Insights</div><div className="text-xs text-slate-600">{e.insights}</div></div>}
                {e.recommendations && <div className="bg-blue-50 rounded-lg p-2 mb-2"><div className="text-[10px] font-semibold text-blue-400 uppercase mb-0.5">Recommendations</div><div className="text-xs text-blue-600">{e.recommendations}</div></div>}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-50">
                  <span>{e.data_points?.toLocaleString()} data points · {Math.round((e.confidence || 0) * 100)}% confidence</span>
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={pendingId === e.id} onClick={() => toggleShare(e)} aria-label={e.shared ? "Clear local share flag" : "Set local share flag"} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors disabled:opacity-50"><Share2 className="w-3 h-3" /> {e.shared ? "Flagged shared" : "Set share flag"}</button>
                    <Button variant="ghost" size="icon" disabled={pendingId === e.id} aria-label="Delete knowledge record" onClick={() => remove(e)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 bg-emerald-50 rounded-2xl p-4">
        <div className="text-sm font-semibold text-emerald-800 mb-1">What the share control means</div>
        <div className="text-xs leading-5 text-emerald-800">It saves a shared/not-shared value on this record in the current deployment. It does not anonymize or publish the record, synchronize it with another system, or update an AI model. Check permissions and remove identifying details before any separate export.</div>
      </div>
    </div>
  );
}
