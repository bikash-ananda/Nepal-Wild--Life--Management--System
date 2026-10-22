import React, { useState, useEffect } from "react";
import { Loader2, ScanFace, CheckCircle2, UserPlus } from "lucide-react";
import { api } from "@/api/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import PrivateImage from "@/components/PrivateImage";
import PrivatePhotoUpload from "@/components/individuals/PrivatePhotoUpload";
import RegisterIndividualModal from "@/components/individuals/RegisterIndividualModal";

export default function IdentifyIndividualModal({ open, onOpenChange, onConfirmed, presetSpeciesId, presetPhoto }) {
  const [speciesList, setSpeciesList] = useState([]);
  const [speciesId, setSpeciesId] = useState("");
  const [photo, setPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    api.entities.Species.filter({ category: "wildlife" }, { limit: 200 })
      .then((res) => setSpeciesList(res.items || res || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setSpeciesId(presetSpeciesId || "");
      setPhoto(presetPhoto ? [presetPhoto] : null);
      setResult(null);
    }
  }, [open, presetSpeciesId, presetPhoto]);

  const runIdentify = async () => {
    if (!speciesId) {
      toast({ title: "Select a species", variant: "destructive" });
      return;
    }
    if (!photo || !photo.length) {
      toast({ title: "Add a sighting photo", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await api.functions.invoke("individualId", {
        action: "identifySighting",
        species_id: speciesId,
        sighting_photo: photo[0],
      });
      setResult(res.data || { candidates: [] });
    } catch (e) {
      toast({ title: "Identification failed", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmMatch = async (c) => {
    setConfirmingId(c.individual_id);
    try {
      await api.functions.invoke("individualId", {
        action: "confirmMatch",
        individual_id: c.individual_id,
        confidence: c.confidence,
      });
      toast({ title: "Match confirmed", description: `${c.nickname} sighting recorded` });
      onConfirmed?.(c);
      onOpenChange?.(false);
    } catch (e) {
      toast({ title: "Confirm failed", description: e.message, variant: "destructive" });
    } finally {
      setConfirmingId(null);
    }
  };

  const confidenceTone = (v) => (v >= 0.75 ? "text-emerald-600" : v >= 0.5 ? "text-amber-600" : "text-slate-500");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanFace className="w-4 h-4 text-emerald-600" /> Identify Individual Animal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Species</Label>
                <Select value={speciesId} onValueChange={setSpeciesId}>
                  <SelectTrigger><SelectValue placeholder="Select species" /></SelectTrigger>
                  <SelectContent>
                    {speciesList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sighting photo</Label>
                {photo && photo.length > 0 ? (
                  <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <PrivateImage fileUri={photo[0]} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhoto(null)}
                      className="absolute top-1 right-1 text-[11px] bg-black/60 text-white px-2 py-0.5 rounded"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <PrivatePhotoUpload value={[]} onChange={(v) => setPhoto(v)} max={1} label="Upload the sighting photo" />
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={runIdentify} disabled={analyzing} className="bg-emerald-600 hover:bg-emerald-700">
                {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanFace className="w-4 h-4 mr-2" />}
                Run identification
              </Button>
            </div>

            {result && (
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700">Candidate matches</h4>
                  {result.best_guess_is_new && (
                    <span className="text-xs text-amber-600 font-medium">Likely a new individual</span>
                  )}
                </div>
                {(!result.candidates || result.candidates.length === 0) ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-slate-500 mb-3">No matching individuals found in the gallery.</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRegisterOpen(true);
                      }}
                      className="border-emerald-300 text-emerald-700"
                    >
                      <UserPlus className="w-4 h-4 mr-2" /> Register as new individual
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {result.candidates.map((c) => (
                      <div key={c.individual_id} className="flex gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          <PrivateImage fileUri={c.reference_photo} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-slate-800 text-sm truncate">{c.nickname}</div>
                            <div className={`text-sm font-bold ${confidenceTone(c.confidence || 0)}`}>
                              {Math.round((c.confidence || 0) * 100)}%
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 mb-1">{c.individual_code}</div>
                          <Progress value={(c.confidence || 0) * 100} className="h-1.5 mb-1.5" />
                          <p className="text-xs text-slate-500 line-clamp-2">{c.reasoning}</p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => confirmMatch(c)}
                              disabled={confirmingId === c.individual_id}
                              className="h-7 bg-emerald-600 hover:bg-emerald-700 text-xs"
                            >
                              {confirmingId === c.individual_id ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                              )}
                              Confirm match
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRegisterOpen(true)}
                        className="text-emerald-700"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1" /> None of these — register as new
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RegisterIndividualModal
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        presetSpeciesId={speciesId}
        presetPhotos={photo}
        onCreated={(ind) => {
          onConfirmed?.(ind);
          onOpenChange?.(false);
          setRegisterOpen(false);
        }}
      />
    </>
  );
}