import React, { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const deviceTypes = ["Gateway", "IP camera", "Environmental sensor", "GPS device", "Speaker", "Siren", "Relay controller", "Other"];

export default function DeviceFormModal({ open, onOpenChange, onSubmit, editing, sites = [] }) {
  const [form, setForm] = useState({ name: "", device_type: "Other", category: "other", manufacturer: "", model: "", serial_number: "", site_id: "", latitude: "", longitude: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const value = editing || {};
    setForm({
      name: value.name || "", device_type: deviceTypes.includes(value.device_type) ? value.device_type : "Other",
      category: value.category || "other", manufacturer: value.manufacturer || "", model: value.model || "",
      serial_number: value.serial_number || "", site_id: value.site_id ? String(value.site_id) : "",
      latitude: value.latitude ?? "", longitude: value.longitude ?? "", notes: value.notes || "",
    });
  }, [editing, open]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!form.name.trim()) return;
    const site = sites.find((item) => String(item.id) === form.site_id);
    const latitude = form.latitude === "" ? null : Number(form.latitude);
    const longitude = form.longitude === "" ? null : Number(form.longitude);
    if ((latitude !== null && !Number.isFinite(latitude)) || (longitude !== null && !Number.isFinite(longitude))) return;
    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(), device_type: form.device_type, category: form.category,
        manufacturer: form.manufacturer.trim(), model: form.model.trim(), serial_number: form.serial_number.trim(),
        site_id: form.site_id || null, site_name: site?.name || "", latitude, longitude,
        notes: form.notes.trim(), status: "inventory_only", enabled: false,
      });
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
      <DialogHeader><DialogTitle>{editing?.id ? "Edit inventory record" : "Add device inventory"}</DialogTitle></DialogHeader>
      <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"><ShieldAlert className="h-4 w-4 shrink-0" /><p>Inventory only. Do not enter passwords, IP addresses, API keys, voltage settings, or device-control commands. Hardware discovery and control are not connected.</p></div>
      <div className="space-y-3">
        <div><Label htmlFor="device-name">Device name</Label><Input id="device-name" value={form.name} onChange={(event) => set("name", event.target.value)} /></div>
        <div><Label>Type</Label><Select value={form.device_type} onValueChange={(value) => set("device_type", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{deviceTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={(event) => set("manufacturer", event.target.value)} /></div><div><Label>Model</Label><Input value={form.model} onChange={(event) => set("model", event.target.value)} /></div></div>
        <div><Label>Serial number (optional)</Label><Input value={form.serial_number} onChange={(event) => set("serial_number", event.target.value)} /></div>
        <div><Label>Research site</Label><Select value={form.site_id} onValueChange={(value) => set("site_id", value)}><SelectTrigger><SelectValue placeholder="Choose a site" /></SelectTrigger><SelectContent>{sites.map((site) => <SelectItem key={site.id} value={String(site.id)}>{site.name || site.id}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Latitude</Label><Input inputMode="decimal" value={form.latitude} onChange={(event) => set("latitude", event.target.value)} /></div><div><Label>Longitude</Label><Input inputMode="decimal" value={form.longitude} onChange={(event) => set("longitude", event.target.value)} /></div></div>
        <div><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} rows={3} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={!form.name.trim() || saving}>{saving ? "Saving…" : "Save inventory"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
