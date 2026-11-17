import React, { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Edit3, Plus, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const blank = {
  title_np: "", title_en: "", year: String(new Date().getFullYear()),
  category: "national", source_type: "peer-reviewed", citation: "",
  summary_np: "", summary_en: "", limitations_np: "", limitations_en: "",
  url: "", region: "", species: "", status: "draft",
};
const categories = ["national", "mitigation", "human-safety", "species-conflict"];
const states = ["draft", "review", "published"];

function toRecord(form) {
  const year = Number(form.year);
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) throw new Error("Publication year is invalid.");
  const url = new URL(form.url);
  if (url.protocol !== "https:") throw new Error("Only HTTPS source links are accepted.");
  const title = { np: form.title_np.trim(), en: form.title_en.trim() };
  const summary = { np: form.summary_np.trim(), en: form.summary_en.trim() };
  const limitations = { np: form.limitations_np.trim(), en: form.limitations_en.trim() };
  if (Object.values(title).some((v) => !v) || Object.values(summary).some((v) => !v) || Object.values(limitations).some((v) => !v) || !form.citation.trim()) throw new Error("Both languages, citation and limitations are required.");
  return {
    year, category: form.category, sourceType: form.source_type, title,
    citation: form.citation.trim(), summary, limitations, url: url.href,
    region: form.region.split(",").map((v) => v.trim()).filter(Boolean),
    species: form.species.split(",").map((v) => v.trim()).filter(Boolean),
    status: form.status,
  };
}

function fromRecord(item) {
  return {
    ...blank,
    title_np: item.title?.np || "", title_en: item.title?.en || "",
    year: String(item.year || ""), category: item.category || "national",
    source_type: item.sourceType || "peer-reviewed", citation: item.citation || "",
    summary_np: item.summary?.np || "", summary_en: item.summary?.en || "",
    limitations_np: item.limitations?.np || "", limitations_en: item.limitations?.en || "",
    url: item.url || "", region: (item.region || []).join(", "), species: (item.species || []).join(", "),
    status: item.status || "draft",
  };
}

export default function ResearchManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const allowed = ["admin", "researcher"].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try { setRecords(await api.entities.ResearchStudy.list({ sort: "-updated_at", limit: 200 })); }
    catch (error) { toast({ title: "Could not load research records", description: error.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (allowed) load(); }, [allowed]);

  const reset = () => { setEditing(null); setForm(blank); };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = toRecord(form);
      if (editing) await api.entities.ResearchStudy.update(editing, payload);
      else await api.entities.ResearchStudy.create(payload);
      toast({ title: form.status === "published" ? "Research published" : "Research saved", description: "Public readers can see this record only after it is marked published." });
      reset(); await load();
    } catch (error) { toast({ title: "Could not save research", description: error.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };
  const edit = (item) => { setEditing(item.id); setForm(fromRecord(item)); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const remove = async (item) => {
    if (item.status === "published") { toast({ title: "Unpublish before deleting", description: "Change the record to draft first so the public page no longer displays it.", variant: "destructive" }); return; }
    if (!window.confirm("Delete this draft research record?")) return;
    try { await api.entities.ResearchStudy.delete(item.id); await load(); toast({ title: "Draft deleted" }); }
    catch (error) { toast({ title: "Could not delete draft", description: error.message, variant: "destructive" }); }
  };

  if (!allowed) return <div className="rounded-2xl border border-rose-200 bg-white p-6"><ShieldAlert className="mb-2 h-6 w-6 text-rose-600"/><h2 className="font-semibold">Administrator or researcher access required</h2><p className="mt-1 text-sm text-slate-600">Research publication is restricted to approved editorial roles.</p></div>;

  const field = (key, label, multiline = false, required = true) => <label className="block text-sm font-medium text-slate-700">{label}{multiline ? <textarea required={required} rows={3} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"/> : <input required={required} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"/>}</label>;

  return <div className="space-y-5">
    <PageHeader title="Research & Knowledge Manager" description="Create, review, publish and maintain source-linked Nepal wildlife research. Only published records appear in the public research feed." icon={BookOpen} actions={<button onClick={load} className="inline-flex min-h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm"><RefreshCw className="h-4 w-4"/>Refresh</button>}/>
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">{editing ? "Edit research record" : "Add research record"}</h2>{editing && <button type="button" onClick={reset} className="text-sm text-slate-600">Cancel edit</button>}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("title_np", "शीर्षक (नेपाली)")}{field("title_en", "Title (English)")}
        {field("year", "Publication year")}
        <label className="text-sm font-medium text-slate-700">Topic<select value={form.category} onChange={(e) => setForm({...form,category:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3">{categories.map(x=><option key={x}>{x}</option>)}</select></label>
        {field("citation", "Full citation", true)}
        {field("url", "Original source HTTPS URL")}
        {field("summary_np", "सारांश (नेपाली)", true)}{field("summary_en", "Summary (English)", true)}
        {field("limitations_np", "अध्ययनको सीमा (नेपाली)", true)}{field("limitations_en", "Study limitations (English)", true)}
        {field("region", "Study regions (comma-separated)", false, false)}{field("species", "Species keys (comma-separated)", false, false)}
        <label className="text-sm font-medium text-slate-700">Publication status<select value={form.status} onChange={(e) => setForm({...form,status:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3">{states.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Source type<input value={form.source_type} onChange={(e)=>setForm({...form,source_type:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3"/></label>
      </div>
      <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Publish only after checking the original source, publication year, sample and geographic scope. A summary must not imply that a local study represents all of Nepal.</p>
      <div className="flex flex-wrap gap-2"><button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-white disabled:opacity-60"><CheckCircle2 className="h-4 w-4"/>{saving ? "Saving…" : form.status === "published" ? "Save and publish" : "Save research"}</button><button type="button" onClick={reset} className="min-h-11 rounded-xl border px-4 text-sm">Clear form</button></div>
    </form>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><h2 className="font-semibold">Research records ({records.length})</h2>{loading ? <p className="py-8 text-sm text-slate-500">Loading…</p> : <div className="mt-4 divide-y">{records.map(item=><article key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{item.status || "draft"}</span><span className="text-xs text-slate-500">{item.year} · {item.category}</span></div><h3 className="mt-1 font-medium">{item.title?.np || item.title?.en || item.id}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.citation}</p></div><div className="flex shrink-0 gap-2"><button onClick={()=>edit(item)} className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 text-sm"><Edit3 className="h-4 w-4"/>Edit</button>{item.status !== "published" && <button onClick={()=>remove(item)} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-rose-200 px-3 text-sm text-rose-700"><Trash2 className="h-4 w-4"/>Delete</button>}</div></article>)}</div>}</section>
  </div>;
}
