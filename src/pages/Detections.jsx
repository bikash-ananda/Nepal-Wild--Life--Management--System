import React, { useState, useEffect } from "react";
import { Target, Search, Zap, Filter, Download, Trash2, CheckCheck, CheckSquare, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const detectionTypeColors = {
  monkey: "#10b981", animal: "#3b82f6", human: "#f59e0b", vehicle: "#8b5cf6",
};

export default function Detections() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    base44.entities.DetectionEvent.list("-detected_at", 200)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(e => {
    const matchSearch = e.site_name?.toLowerCase().includes(search.toLowerCase()) || e.camera_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || e.detection_type === typeFilter;
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const allSelected = filtered.length > 0 && filtered.every(e => selectedIds.includes(e.id));

  const selectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filtered.some(e => e.id === id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...filtered.map(e => e.id)])]);
    }
  };

  const bulkVerify = async () => {
    setBulkLoading(true);
    try {
      await Promise.all(selectedIds.map(id =>
        base44.entities.DetectionEvent.update(id, { status: "confirmed" })
      ));
      setEvents(prev => prev.map(e => selectedIds.includes(e.id) ? { ...e, status: "confirmed" } : e));
      setSelectedIds([]);
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} detection event(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(selectedIds.map(id => base44.entities.DetectionEvent.delete(id)));
      setEvents(prev => prev.filter(e => !selectedIds.includes(e.id)));
      setSelectedIds([]);
    } finally {
      setBulkLoading(false);
    }
  };

  const exportSelected = () => {
    const selected = filtered.filter(e => selectedIds.includes(e.id));
    const headers = ["Event ID", "Site", "Camera", "Type", "Count", "Confidence", "Deterrent", "Status", "Detected At"];
    const rows = selected.map(e => [
      e.event_id || "", e.site_name || "", e.camera_name || "", e.detection_type || "",
      e.object_count || 1, ((e.confidence || 0) * 100).toFixed(0) + "%",
      e.deterrent_triggered ? "Yes" : "No", e.status || "",
      e.detected_at ? new Date(e.detected_at).toISOString() : ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `detections-selected-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ["Event ID", "Site", "Camera", "Type", "Count", "Confidence", "Deterrent", "Status", "Detected At"];
    const rows = filtered.map(e => [
      e.event_id || "", e.site_name || "", e.camera_name || "", e.detection_type || "",
      e.object_count || 1, ((e.confidence || 0) * 100).toFixed(0) + "%",
      e.deterrent_triggered ? "Yes" : "No", e.status || "", 
      e.detected_at ? new Date(e.detected_at).toISOString() : ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `detections-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Detection Events"
        description="AI-confirmed wildlife detection log with sensor fusion data"
        icon={Target}
        actions={
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by site or camera..." className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="monkey">Monkey</SelectItem>
            <SelectItem value="animal">Animal</SelectItem>
            <SelectItem value="human">Human</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="false_alarm">False Alarm</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-20 flex items-center gap-2 bg-slate-800 text-white rounded-2xl px-4 py-3 mb-4 shadow-lg flex-wrap">
          <span className="text-sm font-medium mr-1">{selectedIds.length} selected</span>
          <Button size="sm" variant="ghost" onClick={selectAll} className="text-white hover:bg-white/10 h-8">
            <CheckSquare className="w-4 h-4 mr-1.5" /> {allSelected ? "Deselect All" : "Select All"}
          </Button>
          <Button size="sm" variant="ghost" onClick={bulkVerify} disabled={bulkLoading} className="text-emerald-300 hover:bg-emerald-500/20 h-8">
            <CheckCheck className="w-4 h-4 mr-1.5" /> Verify
          </Button>
          <Button size="sm" variant="ghost" onClick={exportSelected} className="text-sky-300 hover:bg-sky-500/20 h-8">
            <Download className="w-4 h-4 mr-1.5" /> Export Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={bulkDelete} disabled={bulkLoading} className="text-red-300 hover:bg-red-500/20 h-8">
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
          </Button>
          <button onClick={() => setSelectedIds([])} className="ml-auto p-1.5 rounded-lg hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={Target} title="No detection events" description="Detection events from edge AI devices will appear here." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(e => {
            const isSelected = selectedIds.includes(e.id);
            return (
            <div key={e.id} className={cn("bg-white rounded-2xl border-2 overflow-hidden hover:shadow-md transition-shadow", isSelected ? "border-emerald-500" : "border-slate-200")}>
              <div className="aspect-video bg-slate-900 relative cursor-pointer" onClick={() => toggleSelect(e.id)}>
                <div className={cn("absolute top-2 left-2 z-10 w-5 h-5 rounded flex items-center justify-center border-2 transition-colors", isSelected ? "bg-emerald-500 border-emerald-500" : "bg-black/40 border-white/70 backdrop-blur")}>
                  {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                </div>
                {e.image_url ? (
                  <Image src={e.image_url} fittingType="fill" className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Target className="w-8 h-8 text-slate-600" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur px-2 py-1 rounded-md">
                  <span className="w-2 h-2 rounded-full" style={{ background: detectionTypeColors[e.detection_type] || "#94a3b8" }} />
                  <span className="text-[10px] text-white font-medium capitalize">{e.detection_type}</span>
                </div>
                {e.deterrent_triggered && (
                  <div className="absolute top-2 right-2 bg-amber-500 px-2 py-1 rounded-md flex items-center gap-1">
                    <Zap className="w-3 h-3 text-white" />
                    <span className="text-[10px] text-white font-medium">Deterrent</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-slate-800 text-sm truncate">{e.site_name || "Unknown site"}</div>
                  <StatusBadge status={e.status || "new"} />
                </div>
                <div className="text-xs text-slate-400 mb-3">{e.camera_name || "—"} · {e.detected_at ? new Date(e.detected_at).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-slate-400">Count</div>
                    <div className="font-semibold text-slate-700">{e.object_count || 1}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-slate-400">Confidence</div>
                    <div className="font-semibold text-slate-700">{((e.confidence || 0) * 100).toFixed(0)}%</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-slate-400">Model</div>
                    <div className="font-semibold text-slate-700 text-[10px] truncate">{e.ai_model_version || "—"}</div>
                  </div>
                </div>
                {e.action_taken && e.action_taken !== "none" && (
                  <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {e.action_taken}
                  </div>
                )}
              </div>
            </div>
          );})}
        </div>
      )}
    </div>
  );
}