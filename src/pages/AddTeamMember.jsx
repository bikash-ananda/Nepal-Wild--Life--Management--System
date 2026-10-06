import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  UserPlus, Check, ChevronRight, ChevronLeft, Upload, User,
  Mail, Phone, Briefcase, MapPin, Shield, X
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const STEPS = [
  { label: "Personal Info", icon: User },
  { label: "Profile Image", icon: Upload },
  { label: "Contact", icon: Mail },
  { label: "Role & Dept", icon: Briefcase },
  { label: "Assignment", icon: MapPin },
  { label: "Permissions", icon: Shield },
  { label: "Review", icon: Check },
];

const ROLES = [
  "Wildlife Officer", "Field Officer", "Project Manager", "IoT Technician",
  "AI/ML Specialist", "GIS Specialist", "Researcher", "Farm Coordinator",
  "Administrator", "Field Worker", "Observer",
];

const PERMISSIONS = [
  { key: "view_dashboard", label: "View Dashboard" },
  { key: "manage_team", label: "Manage Team" },
  { key: "manage_devices", label: "Manage Devices" },
  { key: "manage_farms", label: "Manage Farms" },
  { key: "manage_alerts", label: "Manage Alerts" },
  { key: "trigger_deterrents", label: "Trigger Deterrents" },
  { key: "manage_api_keys", label: "Manage API Keys" },
  { key: "manage_integrations", label: "Manage Integrations" },
  { key: "view_analytics", label: "View Analytics" },
  { key: "view_reports", label: "View Reports" },
];

const inputClass = "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400";

export default function AddTeamMember() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    full_name: "",
    profile_image_url: "",
    phone_number: "",
    email: "",
    role: "Field Officer",
    department: "",
    assigned_location: "",
    assigned_farm_names: [],
    status: "active",
    bio: "",
    permissions: ["view_dashboard"],
  });

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const validateStep = () => {
    const errs = {};
    if (step === 0 && !form.full_name.trim()) errs.full_name = "Full name is required";
    if (step === 2) {
      if (!form.email.trim()) errs.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email format";
    }
    if (step === 3 && !form.role) errs.role = "Role is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleImageUpload = async (file) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update("profile_image_url", file_url);
      toast({ title: "Profile image uploaded" });
    } catch (e) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const togglePermission = (key) => {
    update("permissions", form.permissions.includes(key)
      ? form.permissions.filter((p) => p !== key)
      : [...form.permissions, key]);
  };

  const submit = async () => {
    if (!form.full_name.trim()) {
      toast({ title: "Full name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.TeamMember.create({
        ...form,
        assigned_farm_ids: [],
      });
      toast({ title: "Team member added successfully" });
      navigate("/team");
    } catch (e) {
      toast({ title: "Failed to add member: " + (e.message || "error"), variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div>
      <Link to="/team" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <X className="w-4 h-4" /> Cancel
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Stepper */}
        <div className="px-6 py-5 border-b border-slate-100 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      done ? "bg-emerald-500 text-white" : active ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-500" : "bg-slate-100 text-slate-400"
                    }`}>
                      {done ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${active ? "text-slate-800" : "text-slate-400"}`}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`w-6 h-0.5 mx-1 ${done ? "bg-emerald-500" : "bg-slate-200"}`} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="p-6">
          {step === 0 && (
            <div className="max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Personal Information</h2>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Full Name *</label>
                <input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className={inputClass} placeholder="e.g. Ram Bahadur Gurung" />
                {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Short Bio / Designation</label>
                <textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} rows={3} className={inputClass} placeholder="e.g. Senior wildlife field officer with 8 years of experience..." />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Profile Image</h2>
              <div className="flex flex-col items-center gap-4">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-slate-400 text-3xl border-2 border-dashed border-slate-300">
                  {form.profile_image_url ? (
                    <img src={form.profile_image_url} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    form.full_name?.charAt(0) || <Upload className="w-8 h-8" />
                  )}
                </div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors">
                  <Upload className="w-4 h-4" />
                  {form.profile_image_url ? "Change Image" : "Upload Image"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0])} />
                </label>
                <p className="text-xs text-slate-400">Optional — a default avatar will be used if no image is uploaded.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Contact Information</h2>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={`${inputClass} pl-10`} placeholder="name@example.com" />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={form.phone_number} onChange={(e) => update("phone_number", e.target.value)} className={`${inputClass} pl-10`} placeholder="+977 98XXXXXXXX" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Role & Department</h2>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Role *</label>
                <select value={form.role} onChange={(e) => update("role", e.target.value)} className={inputClass}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Department / Team</label>
                <input value={form.department} onChange={(e) => update("department", e.target.value)} className={inputClass} placeholder="e.g. Kaski Field Operations" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
                <select value={form.status} onChange={(e) => update("status", e.target.value)} className={inputClass}>
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Location & Farm Assignment</h2>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Assigned Location</label>
                <input value={form.assigned_location} onChange={(e) => update("assigned_location", e.target.value)} className={inputClass} placeholder="e.g. Kaski, Gandaki Province → Pokhara → Ward 6" />
                <p className="text-xs text-slate-400 mt-1">Follow: Province → District → Municipality → Ward</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Assigned Farm(s) — names, comma separated</label>
                <input
                  value={form.assigned_farm_names.join(", ")}
                  onChange={(e) => update("assigned_farm_names", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  className={inputClass}
                  placeholder="e.g. Kaskikot Smart Farm, Sarangkot Agro Farm"
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Permissions</h2>
              <p className="text-sm text-slate-500">Select what this team member can access.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERMISSIONS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePermission(p.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                      form.permissions.includes(p.key)
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      form.permissions.includes(p.key) ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                    }`}>
                      {form.permissions.includes(p.key) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="max-w-lg space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Review & Create</h2>
              <div className="bg-slate-50 rounded-xl p-5 space-y-3 text-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold">
                    {form.profile_image_url ? <img src={form.profile_image_url} alt="" className="w-full h-full object-cover" /> : form.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{form.full_name || "—"}</div>
                    <div className="text-slate-500">{form.role}</div>
                  </div>
                </div>
                {[
                  ["Email", form.email],
                  ["Phone", form.phone_number],
                  ["Department", form.department],
                  ["Location", form.assigned_location],
                  ["Farms", form.assigned_farm_names.join(", ") || "—"],
                  ["Status", form.status],
                  ["Permissions", `${form.permissions.length} selected`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="text-slate-400 flex-shrink-0">{k}</span>
                    <span className="text-slate-700 text-right truncate">{v || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={prev}
            disabled={step === 0}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="inline-flex items-center gap-1 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {saving ? "Creating..." : "Create Team Member"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}