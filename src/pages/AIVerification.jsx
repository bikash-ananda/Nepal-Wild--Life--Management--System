import React, { useState, useEffect } from "react";
import { Brain, CheckCircle2, Loader2, SkipForward, Image as ImageIcon, UsersRound } from "lucide-react";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import VerificationCard from "@/components/ai/VerificationCard";
import PrivateImage from "@/components/PrivateImage";

export default function AIVerification() {
  const [pending, setPending] = useState([]);
  const [verified, setVerified] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [queue, reviewed] = await Promise.all([
        api.entities.VerificationSample.filter({ status: "pending" }, "created_date", 50),
        api.entities.VerificationSample.filter({ status: "verified" }, "-verified_at", 10),
      ]);
      setPending(queue);
      setVerified(reviewed);
    } catch (error) {
      toast({ title: "Could not load review queue", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleVerify = async (sample, label, boundingBoxes) => {
    setSaving(true);
    try {
      await api.functions.invoke("verificationGame", {
        action: "overrideLabel",
        sample_id: sample.id,
        label,
      });
      await api.entities.DatasetRecord.create({
        image_url: sample.image_url,
        video_url: sample.video_url || "",
        correct_label: label,
        species: label,
        bounding_boxes: boundingBoxes || [],
        site_id: sample.site_id || "",
        site_name: sample.site_name || "",
        latitude: sample.latitude ?? null,
        longitude: sample.longitude ?? null,
        captured_at: sample.captured_at || sample.created_date,
        verified_by: user?.id || null,
        verified_at: new Date().toISOString(),
        status: "human_reviewed",
        ai_prediction: null,
        ai_confidence: null,
        ai_model_version: null,
        queued_for_training: false,
        is_demo: false,
      });
      toast({ title: `Verified as ${label}`, description: "Human-reviewed label saved. Model training remains disabled until the dataset is approved." });
      await load();
    } catch (error) {
      toast({ title: "Verification could not be saved", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async (sample) => {
    try {
      await api.entities.VerificationSample.update(sample.id, { status: "rejected", rejected_by: user?.id || null, rejected_at: new Date().toISOString() });
      await load();
    } catch (error) {
      toast({ title: "Could not skip this sample", description: error.message, variant: "destructive" });
    }
  };

  const currentSample = pending[0];
  const stats = [
    { label: "Waiting for review", value: pending.length, icon: ImageIcon, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Recently verified", value: verified.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Labels available for curation", value: verified.length, icon: UsersRound, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <div>
      <PageHeader title="Human Verification" description="Review mobile and community submissions. Every label remains a human judgment; no monkey classifier is connected." icon={Brain} />

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        AI inference and model training are not configured. Verified samples are saved for later dataset curation, not automatically used to train or deploy a model.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}><Icon className={`w-4 h-4 ${stat.color}`} /></div>
            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-[10px] text-slate-400 uppercase">{stat.label}</div>
          </div>;
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : !currentSample ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={CheckCircle2} title="Review queue is clear" description="New mobile and public submissions will appear here as unverified evidence." />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-400">Reviewing 1 of {pending.length}</div>
            <Button variant="ghost" size="sm" onClick={() => handleSkip(currentSample)} disabled={saving}><SkipForward className="w-4 h-4 mr-1" /> Skip</Button>
          </div>
          {saving ? (
            <div className="flex flex-col items-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" /><div className="text-sm text-slate-500">Saving human review…</div></div>
          ) : <VerificationCard sample={currentSample} onVerify={handleVerify} />}
        </div>
      )}

      {verified.length > 0 && <div className="mt-6">
        <div className="text-sm font-semibold text-slate-700 mb-3">Recently verified</div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {verified.map((sample) => <div key={sample.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <PrivateImage fileUri={sample.image_uri || sample.image_url} alt="Human-reviewed wildlife sample" className="w-full h-24 object-cover" />
            <div className="p-2"><div className="text-xs font-semibold text-emerald-700">{sample.verified_label || sample.species_name}</div><div className="text-[10px] text-slate-400">{sample.verified_at ? new Date(sample.verified_at).toLocaleDateString() : "Reviewed"}</div></div>
          </div>)}
        </div>
      </div>}
    </div>
  );
}
