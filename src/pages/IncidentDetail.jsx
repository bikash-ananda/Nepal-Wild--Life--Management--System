import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, MapPin, User, Clock, Loader2 } from "lucide-react";
import { api } from "@/api/apiClient";
import SeverityBadge from "@/components/SeverityBadge";
import StatusBadge from "@/components/StatusBadge";
import DemoBadge from "@/components/DemoBadge";
import CaseTimeline from "@/components/CaseTimeline";

export default function IncidentDetail() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.entities.Incident.get(id).then(setIncident).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  if (!incident) return <div className="text-center py-20 text-slate-500">Incident not found. <Link to="/incidents" className="text-emerald-600">Back</Link></div>;

  const updateStatus = async (status) => {
    await api.entities.Incident.update(incident.id, { status });
    setIncident({ ...incident, status });
  };

  return (
    <div>
      <Link to="/incidents" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Incidents
      </Link>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 capitalize">{incident.type?.replace(/_/g, " ")}</h1>
            <div className="text-xs text-slate-400 font-mono">{incident.incident_id}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {incident.is_demo && <DemoBadge />}
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status || "reported"} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {incident.photos?.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {incident.photos.map((url, i) => (
                <img key={i} src={url} alt="" className="rounded-lg w-full aspect-video object-cover border border-slate-200" />
              ))}
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Description</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{incident.description || "No description provided."}</p>
            {incident.investigation_notes && (
              <>
                <h4 className="font-semibold text-slate-800 mt-4 mb-2 text-sm">Investigation Notes</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{incident.investigation_notes}</p>
              </>
            )}
            {incident.resolution && (
              <>
                <h4 className="font-semibold text-slate-800 mt-4 mb-2 text-sm">Resolution</h4>
                <p className="text-sm text-slate-600">{incident.resolution}</p>
              </>
            )}
          </div>
          <CaseTimeline caseType="incident" caseId={incident.id} currentStatus={incident.status} onStatusChange={updateStatus} />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <Row icon={MapPin} label="Location" value={incident.location_name || `${incident.latitude || 0}, ${incident.longitude || 0}`} />
              <Row icon={User} label="Reporter" value={incident.reporter_name || "—"} />
              <Row icon={Clock} label="Occurred" value={new Date(incident.occurred_at || incident.created_date).toLocaleString()} />
              <Row icon={User} label="Assigned" value={incident.assigned_officer || "Unassigned"} />
              <Row icon={User} label="Response Team" value={incident.response_team || "—"} />
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