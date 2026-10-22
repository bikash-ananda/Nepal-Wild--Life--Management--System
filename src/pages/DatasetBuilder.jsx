import React, { useState, useEffect } from "react";
import { Database, Loader2, Search, Filter, GitBranch, CheckCircle2, XCircle, Clock, MapPin, Camera, Cloud } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusColors = {
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  verified: "bg-emerald-50 text-emerald-600 border-emerald-200",
  training: "bg-blue-50 text-blue-600 border-blue-200",
  deployed: "bg-purple-50 text-purple-600 border-purple-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

export default function DatasetBuilder() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    const r = await api.entities.DatasetRecord.list("-created_date", 200);
    setRecords(r); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = records.filter(r => {
    const matchSearch = !search || r.correct_label?.toLowerCase().includes(search.toLowerCase()) || r.ai_prediction?.toLowerCase().includes(search.toLowerCase()) || r.site_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: "Total Records", value: records.length, icon: Database, color: "text-slate-700", bg: "bg-slate-100" },
    { label: "Verified", value: records.filter(r => r.status === "verified").length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Duplicates", value: records.filter(r => r.is_duplicate).length, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Avg Quality", value: `${Math.round(records.reduce((a, r) => a + (r.quality_score || 0), 0) / (records.length || 1))}%`, icon: Filter, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  // Version history grouping
  const versions = [...new Set(records.map(r => r.dataset_version).filter(Boolean))].sort();

  return (
    <div>
      <PageHeader title="Dataset Builder" description="Labelled dataset records with version history — the foundation for AI self-learning" icon={Database} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}><Icon className={`w-4 h-4 ${s.color}`} /></div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-[10px] text-slate-400 uppercase">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Version History Bar */}
      {versions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><GitBranch className="w-4 h-4 text-purple-500" /> Dataset Version History</div>
          <div className="flex flex-wrap gap-2">
            {versions.map(v => {
              const count = records.filter(r => r.dataset_version === v).length;
              return (
                <div key={v} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 text-xs">
                  <span className="font-mono font-medium text-slate-700">{v}</span>
                  <span className="text-slate-400">{count} records</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by label, AI prediction, or site..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="training">Training</SelectItem>
            <SelectItem value="deployed">Deployed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Database} title="No dataset records" description="Verify detections in AI Verification to build your labelled dataset." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(r)}>
              <div className="relative">
                <img src={r.image_url} alt="" className="w-full h-40 object-cover" />
                <span className={`absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded border ${statusColors[r.status] || statusColors.pending}`}>{r.status}</span>
                {r.is_duplicate && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded">DUPLICATE</span>}
                {r.bounding_boxes?.length > 0 && (
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">{r.bounding_boxes.length} bbox</span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-emerald-600">{r.correct_label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{r.dataset_version || "v1.0"}</span>
                </div>
                <div className="text-[10px] text-slate-400 mb-2">AI: {r.ai_prediction} ({Math.round((r.ai_confidence || 0) * 100)}%)</div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                  <div className="flex items-center gap-1"><Camera className="w-2.5 h-2.5" /> {r.camera_name || "N/A"}</div>
                  <div className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {r.site_name || "N/A"}</div>
                  <div className="flex items-center gap-1"><Cloud className="w-2.5 h-2.5" /> {r.weather || "N/A"}</div>
                  <div className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {r.captured_at ? new Date(r.captured_at).toLocaleDateString() : "N/A"}</div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Quality: <span className="font-medium text-slate-600">{r.quality_score || 0}%</span></span>
                  <span className="text-[10px] text-slate-400">by {r.verified_by || "admin"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Dataset Record Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <img src={selected.image_url} alt="" className="w-full h-56 object-cover rounded-xl" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400 text-xs">Correct Label:</span> <span className="font-medium text-emerald-600">{selected.correct_label}</span></div>
                <div><span className="text-slate-400 text-xs">AI Prediction:</span> <span className="font-medium text-slate-700">{selected.ai_prediction} ({Math.round((selected.ai_confidence || 0) * 100)}%)</span></div>
                <div><span className="text-slate-400 text-xs">AI Model Version:</span> <span className="font-medium text-slate-700">{selected.ai_model_version || "N/A"}</span></div>
                <div><span className="text-slate-400 text-xs">Dataset Version:</span> <span className="font-medium text-slate-700">{selected.dataset_version || "v1.0"}</span></div>
                <div><span className="text-slate-400 text-xs">Camera:</span> <span className="font-medium text-slate-700">{selected.camera_name || selected.camera_id || "N/A"}</span></div>
                <div><span className="text-slate-400 text-xs">Site:</span> <span className="font-medium text-slate-700">{selected.site_name || "N/A"}</span></div>
                <div><span className="text-slate-400 text-xs">GPS:</span> <span className="font-medium text-slate-700">{selected.latitude ? `${selected.latitude.toFixed(4)}, ${selected.longitude?.toFixed(4)}` : "N/A"}</span></div>
                <div><span className="text-slate-400 text-xs">Captured:</span> <span className="font-medium text-slate-700">{selected.captured_at ? new Date(selected.captured_at).toLocaleString() : "N/A"}</span></div>
                <div><span className="text-slate-400 text-xs">Weather:</span> <span className="font-medium text-slate-700">{selected.weather || "N/A"} {selected.temperature_c ? `${selected.temperature_c}°C` : ""}</span></div>
                <div><span className="text-slate-400 text-xs">Verified By:</span> <span className="font-medium text-slate-700">{selected.verified_by || "N/A"}</span></div>
                <div><span className="text-slate-400 text-xs">Quality Score:</span> <span className="font-medium text-slate-700">{selected.quality_score || 0}%</span></div>
                <div><span className="text-slate-400 text-xs">Duplicate:</span> <span className="font-medium text-slate-700">{selected.is_duplicate ? "Yes" : "No"}</span></div>
              </div>
              {selected.bounding_boxes?.length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 uppercase font-medium mb-1">Bounding Boxes ({selected.bounding_boxes.length})</div>
                  <div className="space-y-1">
                    {selected.bounding_boxes.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 text-xs">
                        <span className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="font-medium text-slate-700">{b.label || "Unknown"}</span>
                        <span className="text-slate-400 font-mono">{Math.round(b.w)}×{Math.round(b.h)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selected.sensor_readings && Object.keys(selected.sensor_readings).length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 uppercase font-medium mb-1">Sensor Readings</div>
                  <div className="bg-slate-50 rounded-lg p-2 text-xs font-mono text-slate-600">{JSON.stringify(selected.sensor_readings, null, 2)}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}