import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Swords, MapPin, User, Clock, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SeverityBadge from "@/components/SeverityBadge";
import StatusBadge from "@/components/StatusBadge";
import DemoBadge from "@/components/DemoBadge";
import CaseTimeline from "@/components/CaseTimeline";
import CaseLifecycleTracker from "@/components/CaseLifecycleTracker";

export default function HwcDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    base44.entities.HwcCase.get(id).then(setItem).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  if (!item) return <div className="text-center py-20 text-slate-500">Case not found. <Link to="/hwc" className="text-emerald-600">Back</Link></div>;

  const updateStatus = async (status) => {
    await base44.entities.HwcCase.update(item.id, { status });
    setItem({ ...item, status });
  };

  return (
    <div>
      <Link to="/hwc" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to HWC Cases
      </Link>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Swords className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 capitalize">{item.conflict_type?.replace(/_/g, " ")}</h1>
            <div className="text-xs text-slate-400 font-mono">{item.case_id}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item.is_demo && <DemoBadge />}
          <SeverityBadge severity={item.urgency} />
          <StatusBadge status={item.status || "reported"} />
        </div>
      </div>

      <div className="mb-4">
        <CaseLifecycleTracker status={item.status || "reported"} onStatusChange={updateStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {item.photos?.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {item.photos.map((url, i) => (
                <img key={i} src={url} alt="" className="rounded-lg w-full aspect-video object-cover border border-slate-200" />
              ))}
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Description</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.description || "No description provided."}</p>
            {item.resolution && (
              <>
                <h4 className="font-semibold text-slate-800 mt-4 mb-2 text-sm">Resolution</h4>
                <p className="text-sm text-slate-600">{item.resolution}</p>
              </>
            )}
          </div>
          <CaseTimeline caseType="hwc" caseId={item.id} currentStatus={item.status} onStatusChange={updateStatus} />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <Row icon={MapPin} label="Location" value={item.location_name || `${item.latitude || 0}, ${item.longitude || 0}`} />
              <Row icon={User} label="Reporter" value={item.reporter_name || "—"} />
              <Row icon={Clock} label="Occurred" value={new Date(item.occurred_at || item.created_date).toLocaleString()} />
              <Row icon={Swords} label="Species" value={item.species || "—"} />
              <Row icon={MapPin} label="Affected Crop" value={item.affected_crop || "—"} />
              <Row icon={MapPin} label="Livestock" value={item.affected_livestock ? `${item.affected_livestock} (${item.livestock_count || 0})` : "—"} />
              <Row icon={Swords} label="Est. Damage" value={item.estimated_damage ? `NPR ${item.estimated_damage}` : "—"} />
              <Row icon={User} label="Casualties" value={item.human_casualties || "None"} />
              <Row icon={User} label="Assigned" value={item.assigned_officer || "Unassigned"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-400"><Icon className="w-3.5 h-3.5" /> {label}</span>
      <span className="text-slate-700 font-medium">{value}</span>
    </div>
  );
}