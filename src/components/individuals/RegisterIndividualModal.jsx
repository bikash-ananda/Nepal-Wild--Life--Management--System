import React, { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import PrivatePhotoUpload from "@/components/individuals/PrivatePhotoUpload";

export default function RegisterIndividualModal({ open, onOpenChange, onCreated, presetSpeciesId, presetPhotos }) {
  const [speciesList, setSpeciesList] = useState([]);
  const [form, setForm] = useState({ species_id: "", nickname: "", individual_code: "", notes: "" });
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Species.filter({ category: "wildlife" }, { limit: 200 })
      .then((res) => setSpeciesList(res.items || res || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setForm({ species_id: presetSpeciesId || "", nickname: "", individual_code: "", notes: "" });
      setPhotos(presetPhotos || []);
    }
  }, [open, presetSpeciesId, presetPhotos]);

  const handleSubmit = async () => {
    if (!form.species_id) {
      toast({ title: "Select a species", variant: "destructive" });
      return;
    }
    if (photos.length === 0) {
      toast({ title: "Add at least one reference photo", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke("individualId", {
        action: "registerIndividual",
        species_id: form.species_id,
        nickname: form.nickname,
        individual_code: form.individual_code,
        notes: form.notes,
        photo_uris: photos,
      });
      toast({ title: "Individual registered", description: res.data?.individual?.nickname || "Saved to gallery" });
      onCreated?.(res.data?.individual);
      onOpenChange?.(false);
    } catch (e) {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" /> Register New Individual
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Species</Label>
            <Select value={form.species_id} onValueChange={(v) => setForm({ ...form, species_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select species" /></SelectTrigger>
              <SelectContent>
                {speciesList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.nepali_name ? `· ${s.nepali_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nickname</Label>
              <Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="e.g. Bagh-01" />
            </div>
            <div className="space-y-1.5">
              <Label>Individual code</Label>
              <Input value={form.individual_code} onChange={(e) => setForm({ ...form, individual_code: e.target.value })} placeholder="Auto-generated if blank" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reference photos</Label>
            <PrivatePhotoUpload value={photos} onChange={setPhotos} max={3} label="1–3 clear photos of distinguishing features" />
          </div>
          <div className="space-y-1.5">
            <Label>Distinguishing notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Scars, ear notches, known territory, etc."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Extract features & register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}