import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users, UserPlus, Search, Phone, Mail, MapPin, MoreVertical,
  Eye, Pencil, Power, MessageSquare, Filter
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import DemoBadge from "@/components/DemoBadge";
import { useToast } from "@/components/ui/use-toast";

const roleColors = {
  "Wildlife Officer": "bg-emerald-100 text-emerald-700",
  "Field Officer": "bg-blue-100 text-blue-700",
  "Project Manager": "bg-purple-100 text-purple-700",
  "IoT Technician": "bg-amber-100 text-amber-700",
  "AI/ML Specialist": "bg-indigo-100 text-indigo-700",
  "GIS Specialist": "bg-teal-100 text-teal-700",
  "Researcher": "bg-rose-100 text-rose-700",
  "Farm Coordinator": "bg-lime-100 text-lime-700",
  "Administrator": "bg-slate-800 text-white",
  "Field Worker": "bg-orange-100 text-orange-700",
  "Observer": "bg-slate-100 text-slate-700",
};

const statusColors = {
  active: "bg-emerald-500",
  inactive: "bg-slate-400",
  on_leave: "bg-amber-500",
  disabled: "bg-red-500",
};

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenu, setOpenMenu] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const list = await base44.entities.TeamMember.list("-created_date", 200);
      setMembers(list);
    } catch (e) {
      // empty
    }
    setLoading(false);
  };

  const toggleStatus = async (member) => {
    const newStatus = member.status === "active" ? "disabled" : "active";
    try {
      await base44.entities.TeamMember.update(member.id, { status: newStatus });
      toast({ title: `${member.full_name} ${newStatus === "active" ? "enabled" : "disabled"}` });
      loadMembers();
    } catch (e) {
      toast({ title: "Failed to update member", variant: "destructive" });
    }
    setOpenMenu(null);
  };

  const filtered = members.filter((m) => {
    const matchSearch =
      !search ||
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.assigned_location?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || m.role === roleFilter;
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Team Management"
        description="Manage field officers, technicians, and wildlife management personnel"
        icon={Users}
        actions={
          <Link
            to="/team/add"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Team Member
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or location..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">All Roles</option>
          {Object.keys(roleColors).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={Users}
            title={search || roleFilter !== "all" || statusFilter !== "all" ? "No matching team members" : "No team members yet"}
            description={search || roleFilter !== "all" || statusFilter !== "all" ? "Try adjusting your filters." : "Add your first field officer, technician, or wildlife officer to get started."}
            action={
              !search && roleFilter === "all" && statusFilter === "all" ? (
                <Link to="/team/add" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
                  <UserPlus className="w-4 h-4" /> Add Team Member
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-emerald-200 transition-all group relative"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-lg">
                    {m.profile_image_url ? (
                      <img src={m.profile_image_url} alt={m.full_name} className="w-full h-full object-cover" />
                    ) : (
                      m.full_name?.charAt(0) || "?"
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-slate-800 truncate">{m.full_name}</h3>
                      {m.is_demo && <DemoBadge />}
                    </div>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium ${roleColors[m.role] || "bg-slate-100 text-slate-600"}`}>
                      {m.role}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                  {openMenu === m.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
                        <Link to={`/team/${m.id}`} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setOpenMenu(null)}>
                          <Eye className="w-3.5 h-3.5" /> View Profile
                        </Link>
                        <Link to={`/team/${m.id}`} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setOpenMenu(null)}>
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Link>
                        <button onClick={() => toggleStatus(m)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                          <Power className="w-3.5 h-3.5" /> {m.status === "active" ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {m.assigned_location && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{m.assigned_location}</span>
                  </div>
                )}
                {m.phone_number && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{m.phone_number}</span>
                  </div>
                )}
                {m.email && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{m.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${statusColors[m.status] || "bg-slate-400"}`} />
                  <span className="text-xs text-slate-500 capitalize">{(m.status || "active").replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{m.alerts_handled || 0} alerts</span>
                  <span>{m.incidents_handled || 0} incidents</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}