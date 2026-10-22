import React, { useState } from "react";
import { Camera } from "lucide-react";
import { api } from "@/api/apiClient";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

const emptyForm = {
  name: "",
  camera_id: "",
  brand: "Dahua",
  model: "P3I-PV / DH-P31-PV (verify camera label)",
  serial_number: "",
  site_id: "",
  installation_description: "",
};

export default function AddCameraDialog({ open, onOpenChange, sites = [], onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleCreate = async () => {
    const site = sites.find((item) => item.id === form.site_id);
    if (!form.name.trim() || !site) {
      toast({ title: "Camera name and installation site are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api.entities.Camera.create({
        name: form.name.trim(),
        camera_id: form.camera_id.trim() || `CAM-${Date.now().toString(36).toUpperCase()}`,
        brand: form.brand.trim(),
        model: form.model.trim(),
        serial_number: form.serial_number.trim(),
        site_id: site.id,
        site_name: site.name || "",
        installation_description: form.installation_description.trim(),
        inventory_status: "inventory_only",
      });
      toast({ title: "Camera inventory record saved" });
      setForm(emptyForm);
      onOpenChange(false);
      onCreated?.();
    } catch {
      toast({ title: "Failed to save camera inventory", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> Add camera inventory</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            This records the camera for planning. It does not connect to the device. Do not enter an IP address, stream URL, username, or password here.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="camera-name">Camera name *</Label>
              <Input id="camera-name" value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Ward 21 field camera 01" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="camera-id">Camera ID</Label>
              <Input id="camera-id" value={form.camera_id} onChange={(event) => set("camera_id", event.target.value)} placeholder="Generated if blank" />
            </div>
            <div className="space-y-1.5">
              <Label>Installation site *</Label>
              <Select value={form.site_id} onValueChange={(value) => set("site_id", value)}>
                <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                <SelectContent>{sites.map((site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="camera-brand">Brand</Label>
              <Input id="camera-brand" value={form.brand} onChange={(event) => set("brand", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="camera-model">Model (verify on label)</Label>
              <Input id="camera-model" value={form.model} onChange={(event) => set("model", event.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="camera-serial">Serial number (optional)</Label>
              <Input id="camera-serial" value={form.serial_number} onChange={(event) => set("serial_number", event.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="camera-placement">Placement and view notes</Label>
              <Textarea id="camera-placement" value={form.installation_description} onChange={(event) => set("installation_description", event.target.value)} placeholder="Mounting location, direction, privacy mask, and covered plot" rows={3} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !sites.length} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Saving…" : "Save inventory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
