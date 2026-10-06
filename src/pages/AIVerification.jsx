import React, { useState, useEffect } from "react";
import { Brain, CheckCircle2, Loader2, SkipForward, TrendingUp, Image as ImageIcon, Layers } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import VerificationCard from "@/components/ai/VerificationCard";
import ConfidenceTierBadge from "@/components/ai/ConfidenceTierBadge";

export default function AIVerification() {
  const [pending, setPending] = useState([]);
  const [verified, setVerified] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [p, v] = await Promise.all([
      base44.entities.VerificationSample.filter({ status: "pending" }, "-created_date", 50),
      base44.entities.VerificationSample.filter({ status: "verified" }, "-verified_at", 10),
    ]);
    setPending(p); setVerified(v); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleVerify = async (sample, label, boundingBoxes) => {
    setVerifying(true);
    await base44.entities.VerificationSample.update(sample.id, {
      verified_label: label, status: "verified", verified_by: "admin",
      verified_at: new Date().toISOString(), queued_for_training: true,
    });
    // Auto-create a labelled dataset record
    await base44.entities.DatasetRecord.create({
      image_url: sample.image_url,
      video_url: sample.video_url || "",
      correct_label: label,
      bounding_boxes: boundingBoxes || [],
      camera_id: sample.camera_id || "",
      camera_name: sample.camera_name || "",
      site_id: sample.site_id || "",
      site_name: sample.site_name || "",
      latitude: sample.latitude || 0,
      longitude: sample.longitude || 0,
      captured_at: sample.captured_at || new Date().toISOString(),
      weather: sample.weather || "Clear",
      temperature_c: sample.temperature_c || 25,
      sensor_readings: sample.sensor_readings || {},
      verified_by: "admin",
      ai_prediction: sample.ai_label || "",
      ai_confidence: sample.ai_confidence || 0,
      ai_model_version: sample.ai_model_version || "v2.0",
      dataset_version: "v1.0",
      quality_score: Math.round((sample.ai_confidence || 0.5) * 100),
      is_duplicate: false,
      status: "verified",
      species: label,
    });
    await base44.entities.AuditLog.create({
      action: "trigger", entity_type: "VerificationSample", entity_id: sample.id,
      entity_name: `AI: ${sample.ai_label} → ${label}`, user_name: "admin",
      details: `Verified ${label} (AI said ${sample.ai_label} at ${Math.round((sample.ai_confidence || 0) * 100)}%) — dataset record created`,
      severity: "info", timestamp: new Date().toISOString(),
    });
    toast({ title: `Verified as ${label}`, description: "Labelled dataset record created and queued for training." });
    // Auto-trigger YOLO retraining when enough verified samples accumulate (best-effort)
    try {
      await base44.functions.invoke("yoloRetrain", { action: "checkThreshold" });
    } catch { /* non-blocking */ }
    setVerifying(false);
    setCurrentIndex(i => i + 1);
    load();
  };

  const handleSkip = async (sample) => {
    await base44.entities.VerificationSample.update(sample.id, { status: "rejected" });
    setCurrentIndex(i => i + 1);
    load();
  };

  const currentSample = pending[currentIndex];
  const autoCount = pending.filter(s => (s.ai_confidence || 0) >= 0.95).length;
  const reEvalCount = pending.filter(s => (s.ai_confidence || 0) >= 0.7 && (s.ai_confidence || 0) < 0.95).length;
  const humanCount = pending.filter(s => (s.ai_confidence || 0) < 0.7).length;

  const stats = [
    { label: "Pending Review", value: pending.length, icon: ImageIcon, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Verified Today", value: verified.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Queue for Training", value: verified.filter(v => v.queued_for_training).length, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <div>
      <PageHeader title="AI Verification & Self-Learning" description="Human-in-the-loop verification for low-confidence detections — continuously improves the AI model" icon={Brain} />

      {/* Confidence Tier Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-medium">Auto-Accept (≥95%)</span>
            <ConfidenceTierBadge confidence={0.96} />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{autoCount}</div>
          <div className="text-[10px] text-slate-400">Automatically accepted & response executed</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-medium">Re-Evaluate (70-95%)</span>
            <ConfidenceTierBadge confidence={0.8} />
          </div>
          <div className="text-2xl font-bold text-amber-600">{reEvalCount}</div>
          <div className="text-[10px] text-slate-400">Combining sensors & frames, re-evaluating</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-medium">Human Verify (&lt;70%)</span>
            <ConfidenceTierBadge confidence={0.6} />
          </div>
          <div className="text-2xl font-bold text-red-600">{humanCount}</div>
          <div className="text-[10px] text-slate-400">Human verification required</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}><Icon className={`w-4 h-4 ${s.color}`} /></div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-[10px] text-slate-400 uppercase">{s.label}</div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : !currentSample ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={CheckCircle2} title="All caught up!" description="No pending detections need verification. The AI is confident about all recent detections." />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-400">Reviewing {currentIndex + 1} of {pending.length}</div>
            <Button variant="ghost" size="sm" onClick={() => handleSkip(currentSample)}><SkipForward className="w-4 h-4 mr-1" /> Skip</Button>
          </div>
          {verifying ? (
            <div className="flex flex-col items-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" /><div className="text-sm text-slate-500">Saving verification & creating dataset record...</div></div>
          ) : (
            <>
              <VerificationCard sample={currentSample} onVerify={handleVerify} index={currentIndex} />
              {(currentSample.classifier_source || currentSample.yolo_label || currentSample.llm_label) && (
                <div className="mt-3 bg-white rounded-2xl border border-slate-200 p-3 text-xs">
                  <div className="text-[10px] text-slate-400 uppercase font-medium mb-2">Classifier sources</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-[10px] text-slate-400">YOLO 11</div>
                      <div className="font-semibold text-slate-700">{currentSample.yolo_label || "—"}</div>
                      <div className="text-[10px] text-slate-400">{Math.round((currentSample.yolo_confidence || 0) * 100)}%</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-[10px] text-slate-400">LLM vision</div>
                      <div className="font-semibold text-slate-700">{currentSample.llm_label || "—"}</div>
                      <div className="text-[10px] text-slate-400">{Math.round((currentSample.llm_confidence || 0) * 100)}%</div>
                    </div>
                  </div>
                  {currentSample.classifier_source === "escalated" && (
                    <div className="mt-2 text-[10px] text-amber-600 font-medium">⚠ Both classifiers were unconfident — escalated for human review</div>
                  )}
                </div>
              )}
            </>
          )}
          <div className="mt-4 bg-blue-50 rounded-xl p-3 text-xs text-blue-600">
            <div className="font-semibold mb-1 flex items-center gap-1"><Layers className="w-3 h-3" /> How self-learning works:</div>
            <div>1. YOLO 11 classifies → 2. LLM vision fallback → 3. Unclear images escalate here → 4. You verify → 5. Auto-retrain triggers at 50 verified samples/species → 6. New model deploys automatically</div>
          </div>
        </div>
      )}

      {verified.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-semibold text-slate-700 mb-3">Recently Verified</div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {verified.map(v => (
              <div key={v.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <img src={v.image_url} alt="" className="w-full h-24 object-cover" />
                <div className="p-2">
                  <div className="text-xs font-semibold text-emerald-600">{v.verified_label}</div>
                  <div className="text-[10px] text-slate-400">AI: {v.ai_label} ({Math.round((v.ai_confidence || 0) * 100)}%)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}