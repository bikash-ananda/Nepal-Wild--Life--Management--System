import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Users, ArrowLeft, Phone, Mail, MapPin, Briefcase, Building2,
  Cpu, AlertTriangle, Target, Activity, Shield, CheckCircle2, Calendar
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import DemoBadge from "@/components/DemoBadge";
import EmptyState from "@/components/EmptyState";

export default function TeamMemberDetail() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.TeamMember.get(id).catch(() => null),
      base44.entities.DetectionEvent.list("-detected_at", 10).catch(() => []),
      base44.entities.Alert.list("-triggered_at", 10).catch(() => []),
    ]).then(([m, evs, alts]) => {
      setMember(m);
      setEvents(evs);
      setAlerts(alts);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200">
        <EmptyState icon={Users} title="Team member not found" description="This profile may have been removed." action={<Link to="/team" className="text-emerald-600 text-sm font-medium">← Back to Team</Link>} />
      </div>
    );
  }

  const permLabels = {
    view_dashboard: "View Dashboard",
    manage_team: "Manage Team",
    manage_devices: "Manage Devices",
    manage_farms: "Manage Farms",
    manage_alerts: "Manage Alerts",
    trigger_deterrents: "Trigger Deterrents",
    manage_api_keys: "Manage API Keys",
    manage_integrations: "Manage Integrations",
    view_analytics: "View Analytics",
    view_reports: "View Reports",
  };

  return (
    <div>
      <Link to="/team" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Team
      </Link>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-600" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-3xl flex-shrink-0">
              {member.profile_image_url ? (
                <img src={member.profile_image_url} alt={member.full_name} className="w-full h-full object-cover" />
              ) : (
                member.full_name?.charAt(0) || "?"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800">{member.full_name}</h1>
                {member.is_demo && <DemoBadge />}
              </div>
              <p className="text-sm text-slate-500">{member.role}{member.department ? ` · ${member.department}` : ""}</p>
            </div>
            <Link to="/team" className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Contact Information</h3>
            <div className="space-y-3 text-sm">
              {member.phone_number && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">Phone</div>
                    <div className="text-slate-700 truncate">{member.phone_number}</div>
                  </div>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">Email</div>
                    <div className="text-slate-700 truncate">{member.email}</div>
                  </div>
                </div>
              )}
              {member.assigned_location && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">Assigned Location</div>
                    <div className="text-slate-700">{member.assigned_location}</div>
                  </div>
                </div>
              )}
              {member.department && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">Department</div>
                    <div className="text-slate-700">{member.department}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {member.bio && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-2">About</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{member.bio}</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Permissions</h3>
            {(!member.permissions || member.permissions.length === 0) ? (
              <p className="text-sm text-slate-400">No special permissions assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {member.permissions.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-xs font-medium text-slate-600 border border-slate-100">
                    <Shield className="w-3 h-3 text-emerald-500" />
                    {permLabels[p] || p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: AlertTriangle, label: "Alerts Handled", value: member.alerts_handled || 0, color: "text-amber-600 bg-amber-50" },
              { icon: Target, label: "Incidents", value: member.incidents_handled || 0, color: "text-emerald-600 bg-emerald-50" },
              { icon: Briefcase, label: "Farms", value: (member.assigned_farm_ids || []).length, color: "text-blue-600 bg-blue-50" },
              { icon: Cpu, label: "Devices", value: (member.assigned_device_ids || []).length, color: "text-purple-600 bg-purple-50" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Assigned Farms */}
          {member.assigned_farm_names && member.assigned_farm_names.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Assigned Farms</h3>
              <div className="space-y-2">
                {member.assigned_farm_names.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Recent Wildlife Events</h3>
            {events.length === 0 ? (
              <p className="text-sm text-slate-400">No recent activity.</p>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Activity className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700 capitalize truncate">{e.detection_type?.replace(/_/g, " ")}</span>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {e.detected_at ? new Date(e.detected_at).toLocaleDateString("en", { month: "short", day: "numeric" }) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}