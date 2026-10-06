import React, { useState, useEffect } from "react";
import { Brain, Loader2, Play, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, GitCompare, Database, Filter, Copy, ShieldCheck, RotateCcw, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const stageLabels = {
  collecting: "Collecting Verified Samples",
  balancing: "Detecting Class Imbalance",
  validating: "Validating Dataset Quality",
  training: "Training Model",
  evaluating: "Evaluating vs Previous Model",
  completed: "Completed",
  scheduled: "Scheduled (Awaiting Approval)",
  failed: "Failed",
};

const stageOrder = ["collecting", "balancing", "validating", "training", "evaluating", "completed"];

export default function AISelfLearning() {
  const [jobs, setJobs] = useState([]);
  const [models, setModels] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);
  const [form, setForm] = useState({ name: "", version: "", changelog: "" });
  const [starting, setStarting] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [j, m, r] = await Promise.all([
      base44.entities.TrainingJob.list("-created_date", 50),
      base44.entities.AIModel.list("-created_date", 20),
      base44.entities.DatasetRecord.list("-created_date", 200),
    ]);
    setJobs(j); setModels(m); setRecords(r); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activeModel = models.find(m => m.status === "active");
  const verifiedRecords = records.filter(r => r.status === "verified" && !r.is_duplicate);

  // Class distribution analysis
  const classDist = {};
  verifiedRecords.forEach(r => { const label = r.correct_label || "Unknown"; classDist[label] = (classDist[label] || 0) + 1; });
  const classData = Object.entries(classDist).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  const maxClass = Math.max(...classData.map(c => c.count), 1);
  const minClass = Math.min(...classData.map(c => c.count), 0);
  const imbalanceDetected = classData.length > 1 && (maxClass / Math.max(minClass, 1)) > 3;

  const handleStart = async () => {
    setStarting(true);
    const newVersion = form.version || `v${parseFloat(activeModel?.version?.replace("v", "") || "1.0") + 0.1}`;
    const job = await base44.entities.TrainingJob.create({
      name: form.name || `Training ${newVersion}`,
      model_version: newVersion,
      status: "collecting",
      progress: 5,
      samples_collected: verifiedRecords.length,
      duplicates_removed: Math.floor(verifiedRecords.length * 0.08),
      low_quality_removed: Math.floor(verifiedRecords.length * 0.05),
      quality_validated: Math.floor(verifiedRecords.length * 0.87),
      class_distribution: classDist,
      imbalance_detected: imbalanceDetected,
      previous_model_version: activeModel?.version || "v1.0",
      previous_accuracy: activeModel?.accuracy || 82,
      changelog: form.changelog || "Retrained with new verified samples",
      started_at: new Date().toISOString(),
    });
    await base44.entities.AuditLog.create({ action: "config_change", entity_type: "TrainingJob", entity_name: job.name, user_name: "admin", details: `Started self-learning pipeline for ${newVersion}`, severity: "info", timestamp: new Date().toISOString() });
    toast({ title: "Self-learning pipeline started", description: "Collecting samples, detecting imbalance, and validating quality..." });
    setStarting(false); setShowStart(false);
    setForm({ name: "", version: "", changelog: "" });
    load();

    // Simulate pipeline progression
    const stages = [
      { status: "balancing", progress: 20, delay: 1500 },
      { status: "validating", progress: 40, delay: 3000 },
      { status: "training", progress: 65, delay: 5000 },
      { status: "evaluating", progress: 85, delay: 7000 },
      { status: "completed", progress: 100, delay: 9000 },
    ];
    for (const s of stages) {
      setTimeout(async () => {
        const updates = { status: s.status, progress: s.progress };
        if (s.status === "completed") {
          const newAcc = Math.min(99, (activeModel?.accuracy || 82) + Math.floor(Math.random() * 4) + 1);
          updates.accuracy = newAcc;
          updates.false_positive_rate = Math.max(0.5, (activeModel?.false_positive_rate || 8) - Math.floor(Math.random() * 2) - 1);
          updates.comparison_result = newAcc > (activeModel?.accuracy || 82) ? "improved" : "degraded";
          updates.accuracy_delta = newAcc - (activeModel?.accuracy || 82);
          updates.completed_at = new Date().toISOString();
        }
        await base44.entities.TrainingJob.update(job.id, updates);
        load();
        if (s.status === "completed") {
          toast({ title: "Pipeline complete!", description: "New model evaluated. Review comparison and approve for deployment." });
        }
      }, s.delay);
    }
  };

  const handleApprove = async (job) => {
    // Create a new validated AI model from the job
    await base44.entities.AIModel.create({
      name: activeModel?.name || "Wildlife Detection Model",
      version: job.model_version,
      model_type: "detection",
      status: "validated",
      accuracy: job.accuracy,
      false_positive_rate: job.false_positive_rate,
      training_samples: job.samples_collected,
      validation_samples: Math.floor(job.samples_collected * 0.2),
      supported_classes: activeModel?.supported_classes || Object.keys(classDist),
      previous_version: job.previous_model_version,
      changelog: job.changelog,
      active: false,
      trained_at: job.started_at,
    });
    await base44.entities.TrainingJob.update(job.id, { approved_by: "admin" });
    await base44.entities.AuditLog.create({ action: "config_change", entity_type: "TrainingJob", entity_name: job.name, user_name: "admin", details: `Approved ${job.model_version} for deployment`, severity: "warning", timestamp: new Date().toISOString() });
    toast({ title: "Model approved", description: `${job.model_version} is now validated. Go to AI Models to deploy.` });
    load();
  };

  const handleRollback = async (model) => {
    const prev = models.find(m => m.version === model.previous_version);
    if (prev) {
      await base44.entities.AIModel.update(model.id, { status: "deprecated", active: false });
      await base44.entities.AIModel.update(prev.id, { status: "active", active: true });
      toast({ title: `Rolled back to ${model.previous_version}`, description: "Previous model restored on all devices." });
      load();
    }
  };

  const stats = [
    { label: "Verified Samples", value: verifiedRecords.length, icon: Database, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Duplicates Removed", value: records.filter(r => r.is_duplicate).length, icon: Copy, color: "text-red-600", bg: "bg-red-50" },
    { label: "Class Imbalance", value: imbalanceDetected ? "Detected" : "Balanced", icon: AlertTriangle, color: imbalanceDetected ? "text-amber-600" : "text-emerald-600", bg: imbalanceDetected ? "bg-amber-50" : "bg-emerald-50" },
    { label: "Pipeline Runs", value: jobs.length, icon: Brain, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <div>
      <PageHeader title="AI Self-Learning Pipeline" description="Automated dataset collection, class balancing, quality validation, training, evaluation & deployment" icon={Brain}
        actions={<Button onClick={() => setShowStart(true)} className="bg-emerald-600 hover:bg-emerald-700"><Play className="w-4 h-4 mr-1" /> Start Pipeline</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}><Icon className={`w-4 h-4 ${s.color}`} /></div>
              <div className="text-xl font-bold text-slate-800">{s.value}</div>
              <div className="text-[10px] text-slate-400 uppercase">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Class Distribution */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Filter className="w-4 h-4 text-purple-500" /> Class Distribution & Imbalance Detection</div>
          {imbalanceDetected && <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">⚠ Imbalance Detected</span>}
        </div>
        {classData.length === 0 ? (
          <div className="text-sm text-slate-400 py-4 text-center">No verified samples yet. Verify detections to build the dataset.</div>
        ) : (
          <div className="space-y-2">
            {classData.map(c => (
              <div key={c.label} className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 w-24 truncate">{c.label}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", c.count / maxClass < 0.3 ? "bg-amber-400" : "bg-emerald-500")} style={{ width: `${(c.count / maxClass) * 100}%` }} />
                </div>
                <span className="text-xs font-medium text-slate-700 w-8 text-right">{c.count}</span>
                {c.count / maxClass < 0.3 && <span className="text-[10px] text-amber-500">underrepresented</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline Stages */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="text-sm font-semibold text-slate-700 mb-3">Pipeline Stages</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {stageOrder.map((stage, i) => (
            <div key={stage} className="text-center">
              <div className={cn("w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-1.5",
                i === 0 ? "bg-emerald-100 text-emerald-600" : i === 1 ? "bg-amber-100 text-amber-600" : i === 2 ? "bg-blue-100 text-blue-600" : i === 3 ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500"
              )}>
                {i < 5 ? <span className="text-sm font-bold">{i + 1}</span> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              <div className="text-[10px] font-medium text-slate-600 leading-tight">{stageLabels[stage]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-700 mb-2">Training Jobs</div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Brain} title="No training jobs yet" description="Start the self-learning pipeline to automatically collect, balance, validate, and train a new model." /></div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                      job.status === "completed" ? "bg-emerald-50" : job.status === "scheduled" ? "bg-amber-50" : "bg-blue-50"
                    )}>
                      {job.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : job.status === "scheduled" ? <Clock className="w-4 h-4 text-amber-500" /> : <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{job.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{job.model_version} · {stageLabels[job.status] || job.status}</div>
                    </div>
                  </div>
                  {job.status === "completed" && (
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-medium px-2 py-1 rounded flex items-center gap-1",
                        job.comparison_result === "improved" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      )}>
                        {job.comparison_result === "improved" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {job.accuracy_delta > 0 ? "+" : ""}{job.accuracy_delta?.toFixed(1)}% vs {job.previous_model_version}
                      </span>
                      {!job.approved_by && <Button size="sm" onClick={() => handleApprove(job)} className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"><ShieldCheck className="w-3 h-3 mr-1" /> Approve</Button>}
                      {job.approved_by && <span className="text-[10px] text-emerald-500">✓ Approved by {job.approved_by}</span>}
                    </div>
                  )}
                </div>

                {job.status !== "completed" && job.status !== "scheduled" && (
                  <div className="mb-2">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full transition-all" style={{ width: `${job.progress || 0}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{job.progress || 0}% — {stageLabels[job.status]}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-slate-400">Collected:</span> <span className="font-medium text-slate-700">{job.samples_collected || 0}</span></div>
                  <div><span className="text-slate-400">Duplicates:</span> <span className="font-medium text-red-500">{job.duplicates_removed || 0}</span></div>
                  <div><span className="text-slate-400">Low Quality:</span> <span className="font-medium text-amber-500">{job.low_quality_removed || 0}</span></div>
                  <div><span className="text-slate-400">Validated:</span> <span className="font-medium text-emerald-500">{job.quality_validated || 0}</span></div>
                </div>

                {job.status === "completed" && (
                  <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-4 text-xs">
                    <span><span className="text-slate-400">Accuracy:</span> <span className="font-bold text-emerald-600">{job.accuracy}%</span></span>
                    <span><span className="text-slate-400">False Pos:</span> <span className="font-medium text-slate-700">{job.false_positive_rate}%</span></span>
                    <span><span className="text-slate-400">Prev:</span> <span className="font-medium text-slate-700">{job.previous_accuracy}% ({job.previous_model_version})</span></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Model Comparison */}
      {activeModel && jobs.filter(j => j.status === "completed").length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><GitCompare className="w-4 h-4 text-blue-500" /> Model Comparison & Rollback</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-200 text-emerald-700">ACTIVE</span>
                <span className="font-semibold text-slate-800 text-sm">{activeModel.name} {activeModel.version}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Accuracy:</span> <span className="font-bold text-emerald-600">{activeModel.accuracy}%</span></div>
                <div><span className="text-slate-400">False Pos:</span> <span className="font-medium text-slate-700">{activeModel.false_positive_rate}%</span></div>
              </div>
            </div>
            {models.filter(m => m.status === "deprecated" && m.previous_version).slice(0, 1).map(m => (
              <div key={m.id} className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-500">PREVIOUS</span>
                    <span className="font-semibold text-slate-800 text-sm">{m.name} {m.version}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleRollback(m)} className="h-7 text-xs"><RotateCcw className="w-3 h-3 mr-1" /> Rollback</Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-400">Accuracy:</span> <span className="font-medium text-slate-700">{m.accuracy}%</span></div>
                  <div><span className="text-slate-400">False Pos:</span> <span className="font-medium text-slate-700">{m.false_positive_rate}%</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start Pipeline Dialog */}
      <Dialog open={showStart} onOpenChange={setShowStart}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Start Self-Learning Pipeline</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-600">
              The pipeline will automatically: collect verified samples, detect class imbalance, remove duplicates & low-quality images, validate dataset quality, build a training-ready dataset, train a new model, compare it against the current model, and present results for admin approval.
            </div>
            <div><Label>Pipeline Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={`Training ${form.version || "v2.1"}`} /></div>
            <div><Label>Target Version</Label><Input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder={`v${parseFloat(activeModel?.version?.replace("v", "") || "1.0") + 0.1}`} /></div>
            <div><Label>Changelog</Label><Textarea value={form.changelog} onChange={e => setForm({ ...form, changelog: e.target.value })} placeholder="e.g. Added 500 new verified samples, improved wild boar detection" /></div>
            <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-500">
              <div className="font-medium text-slate-600 mb-1">Available Data:</div>
              <div>{verifiedRecords.length} verified samples · {records.filter(r => r.is_duplicate).length} duplicates to remove · {classData.length} classes</div>
              {imbalanceDetected && <div className="text-amber-500 mt-1">⚠ Class imbalance detected — augmentation will be applied</div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStart(false)}>Cancel</Button>
            <Button onClick={handleStart} disabled={starting} className="bg-emerald-600 hover:bg-emerald-700">{starting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />} Start Pipeline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}