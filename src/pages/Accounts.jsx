import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { UserCog, Plus, Search, ShieldCheck, Loader2, Pencil, UserX, Mail } from "lucide-react";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const roles = [
  { value: "admin", label: "Administrator" },
  { value: "researcher", label: "Researcher" },
  { value: "reviewer", label: "Reviewer" },
  { value: "field_officer", label: "Field officer" },
  { value: "field_worker", label: "Field worker" },
  { value: "community_reporter", label: "Community reporter" },
  { value: "technician", label: "Technician" },
];

const emptyAccount = { full_name: "", email: "", password: "", role: "field_worker", site_ids: [] };

export default function Accounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyAccount);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userRows, siteRows] = await Promise.all([api.entities.User.list(), api.entities.Site.list()]);
      setAccounts(userRows);
      setSites(siteRows);
    } catch (error) {
      toast({ title: "Could not load accounts", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (user?.role === "admin") load(); }, [load, user?.role]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter((account) => `${account.full_name} ${account.email}`.toLowerCase().includes(query));
  }, [accounts, search]);

  if (user && user.role !== "admin") return <Navigate to="/" replace />;

  const createAccount = async () => {
    if (!form.full_name.trim() || !form.email.trim() || form.password.length < 12) {
      toast({ title: "Check the account details", description: "Name, valid email, and a password with at least 12 characters are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api.entities.User.create({ ...form, full_name: form.full_name.trim(), email: form.email.trim().toLowerCase() });
      toast({ title: "Account created", description: "Share the initial password securely and ask the user to change it after signing in." });
      setCreating(false);
      setForm(emptyAccount);
      await load();
    } catch (error) {
      toast({ title: "Account was not created", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (account) => {
    setEditing(account);
    setForm({ full_name: account.full_name || "", email: account.email || "", password: "", role: account.role, status: account.status, site_ids: (account.site_ids || []).map(String) });
  };

  const saveAccess = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.entities.User.update(editing.id, { role: form.role, status: form.status, site_ids: form.site_ids });
      toast({ title: "Account access updated" });
      setEditing(null);
      await load();
    } catch (error) {
      toast({ title: "Access update failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const disableAccount = async (account) => {
    if (account.id === user?.id) {
      toast({ title: "You cannot disable your own account", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Disable sign-in for ${account.full_name || account.email}?`)) return;
    try {
      await api.entities.User.delete(account.id);
      toast({ title: "Account disabled" });
      await load();
    } catch (error) {
      toast({ title: "Could not disable account", description: error.message, variant: "destructive" });
    }
  };

  const siteNames = (siteIds) => (siteIds || []).map((id) => sites.find((site) => String(site.id) === String(id))?.name || id);

  return (
    <div>
      <PageHeader title="Accounts & Site Access" description="Create named accounts, assign least-privilege roles, and scope each user's field data and browser alerts to specific sites." icon={UserCog}
        actions={<Button onClick={() => { setForm(emptyAccount); setCreating(true); }} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> New account</Button>} />

      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Site assignment controls which site records and confirmed-monkey push alerts a user can access. Give each person only the sites they need. Disable accounts when access should end.
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="pl-9" />
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div> : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white"><EmptyState icon={UsersRoundIcon} title="No accounts found" description="Create the first field or research account." /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((account) => (
            <article key={account.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 truncate">{account.full_name || "Unnamed user"}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Mail className="h-3.5 w-3.5" />{account.email}</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${account.status === "active" ? "bg-emerald-50 text-emerald-700" : account.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{account.status}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-600"><ShieldCheck className="h-3.5 w-3.5 text-slate-400" />{roles.find((role) => role.value === account.role)?.label || account.role}</div>
              <div className="mt-2 text-xs text-slate-500">Sites: {siteNames(account.site_ids).join(", ") || "None assigned"}</div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-400">Last sign-in: {account.last_login_at ? new Date(account.last_login_at).toLocaleString() : "Never"}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(account)}><Pencil className="h-3.5 w-3.5 mr-1" /> Access</Button>
                  {account.status !== "disabled" && account.id !== user?.id && <Button variant="ghost" size="sm" onClick={() => disableAccount(account)} aria-label={`Disable ${account.email}`}><UserX className="h-4 w-4 text-rose-500" /></Button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Create field account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label htmlFor="account-name">Full name</Label><Input id="account-name" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></div>
            <div><Label htmlFor="account-email">Email</Label><Input id="account-email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            <div><Label htmlFor="account-password">Initial password (12+ characters)</Label><Input id="account-password" type="password" autoComplete="new-password" minLength={12} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></div>
            <div><Label>Role</Label><Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select></div>
            <SiteSelector sites={sites} selected={form.site_ids} onChange={(site_ids) => setForm({ ...form, site_ids })} />
            <p className="text-xs text-slate-500">For password reset by email, configure SMTP on the VPS. Keep the initial password out of chat and email.</p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button><Button onClick={createAccount} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Update account access</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm"><div className="font-medium text-slate-800">{editing?.full_name}</div><div className="text-slate-500">{editing?.email}</div></div>
            <div><Label>Role</Label><Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Account status</Label><Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="pending">Pending approval</SelectItem><SelectItem value="disabled">Disabled</SelectItem></SelectContent></Select></div>
            <SiteSelector sites={sites} selected={form.site_ids} onChange={(site_ids) => setForm({ ...form, site_ids })} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveAccess} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save access"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SiteSelector({ sites, selected, onChange }) {
  return <fieldset className="space-y-2">
    <legend className="text-sm font-medium text-slate-700">Assigned sites</legend>
    {sites.length ? <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
      {sites.map((site) => {
        const checked = selected.includes(String(site.id));
        return <label key={site.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={checked} onChange={() => onChange(checked ? selected.filter((id) => id !== String(site.id)) : [...selected, String(site.id)])} />
          {site.name || site.id}
        </label>;
      })}
    </div> : <p className="text-xs text-slate-500">Create a site before assigning access.</p>}
  </fieldset>;
}

function UsersRoundIcon(props) {
  return <UserCog {...props} />;
}
