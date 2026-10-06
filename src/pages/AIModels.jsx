import React, { useState, useEffect } from "react";
import { Brain, Plus, Trash2, Upload, RotateCcw, Loader2, CheckCircle2, TrendingUp, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ModelVersionCard from "@/components/ai/ModelVersionCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function AIModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRetrain, setShowRetrain] = useState(false);
  const [retrainForm, setRetrainForm] = useState({ name: "", version: "", changelog: "" });
  const [retraining, setRetraining] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const m = await base44.entities.AIModel.list("-created_date", 50);
    setModels(m); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activeModel = models.find(m => m.status === "active" && m.model_type === "detection");
  const trainingModels = models.filter(m => m.status === "training");
  const validatedModels = models.filter(m => m.status === "validated");
  const deprecatedModels = models.filter(m => m.status === "deprecated");

  const handleDeploy = async (model) => {
    if (activeModel) {
      await base44.entities.AIModel.update(activeModel.id, { status: "deprecated", active: false });
    }
    await base44.entities.AIModel.update(model.id, { status: "active", active: true, deployed_at: new Date().toISOString(), deployed_devices: 12 });
    await base44.entities.AuditLog.create({ action: "config_change", entity_type: "AIModel", entity_name: model.name, user_name: "admin", details: `Deployed v${model.version} to all devices`, severity: "warning", timestamp: new Date().toISOString() });
    toast({ title: `Model v${model.version} deployed`, description: "Update pushed to all connected devices." });
    load();
  };

  const handleRollback = async (model) => {
    await base44.entities.AIModel.update(model.id, { status: "active", active: true });
    toast({ title: `Rolled back to v${model.previous_version}`, description: "Previous model restored on all devices." });
    load();
  };

  const startRetrain = async () => {
    setRetraining(true);
    const newVersion = `v${parseFloat(activeModel?.version?.replace("v", "") || "1.0") + 0.1}`;
    const newModel = await base44.entities.AIModel.create({
      name: activeModel?.name || "Wildlife Detection Model",
      version: retrainForm.version || newVersion,
      model_type: "detection",
      status: "training",
      accuracy: 0, false_positive_rate: 0,
      training_samples: 15420, validation_samples: 3200,
      supported_classes: activeModel?.supported_classes || ["monkey", "langur", "human", "dog", "cow", "goat", "bird", "vehicle"],
      previous_version: activeModel?.version || "v1.0",
      changelog: retrainForm.changelog || "Retrained with new verified samples",
      active: false,
      trained_at: new Date().toISOString(),
    });
    await base44.entities.AuditLog.create({ action: "config_change", entity_type: "AIModel", entity_name: newModel.name, user_name: "admin", details: `Started training v${newModel.version}`, severity: "info", timestamp: new Date().toISOString() });
    toast({ title: "Training started", description: "Model is training with 15,420 verified samples." });
    setRetraining(false); setShowRetrain(false);
    setRetrainForm({ name: "", version: "", changelog: "" });
    // Simulate training completion
    setTimeout(async () => {
      await base44.entities.AIModel.update(newModel.id, { status: "validated", accuracy: 96.2, false_positive_rate: 2.1 });
      toast({ title: "Training complete!", description: "New model validated and ready for deployment." });
      load();
    }, 5000);
    load();
  };

  return (
    <div>
      <PageHeader title="AI Model Management" description="Version control, training, and deployment of AI detection models with rollback capability" icon={Brain}
        actions={<Button onClick={() => setShowRetrain(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Retrain Model</Button>} />

      {activeModel && (
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl border border-emerald-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center"><Brain className="w-6 h-6 text-emerald-600" /></div>
              <div>
                <div className="text-sm font-bold text-slate-800">Active Model: {activeModel.name} v{activeModel.version}</div>
                <div className="text-xs text-slate-500">Accuracy: {activeModel.accuracy}% · False Positive: {activeModel.false_positive_rate}% · {activeModel.deployed_devices} devices</div>
              </div>
            </div>
            <div className="flex gap-4 text-center">
              <div><div className="text-2xl font-bold text-emerald-600">{activeModel.accuracy}%</div><div className="text-[10px] text-slate-400">Accuracy</div></div>
              <div><div className="text-2xl font-bold text-blue-600">{activeModel.training_samples?.toLocaleString()}</div><div className="text-[10px] text-slate-400">Samples</div></div>
            </div>
          </div>
        </div>
      )}

      {trainingModels.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> Training in Progress</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trainingModels.map(m => (
              <div key={m.id} className="bg-blue-50 rounded-2xl border border-blue-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-slate-800 text-sm">{m.name} v{m.version}</div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-600">TRAINING</span>
                </div>
                <div className="text-xs text-slate-500 mb-2">{m.training_samples?.toLocaleString()} samples · {m.changelog}</div>
                <div className="h-2 bg-blue-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: "65%" }} /></div>
                <div className="text-[10px] text-blue-500 mt-1">Training... 65%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {validatedModels.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Validated — Ready to Deploy</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {validatedModels.map(m => <ModelVersionCard key={m.id} model={m} onDeploy={handleDeploy} isActive={false} />)}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="text-sm font-semibold text-slate-700 mb-2">All Versions</div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
        ) : models.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Brain} title="No AI models yet" description="Retrain your first model to get started." /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {models.map(m => <ModelVersionCard key={m.id} model={m} onDeploy={handleDeploy} onRollback={handleRollback} isActive={m.status === "active"} />)}
          </div>
        )}
      </div>

      <Dialog open={showRetrain} onOpenChange={setShowRetrain}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Retrain AI Model</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>Retraining will use all verified samples from the dataset. The new model will need admin approval before deployment to field devices.</div>
            </div>
            <div><Label>Model Name</Label><Input value={retrainForm.name} onChange={e => setRetrainForm({ ...retrainForm, name: e.target.value })} placeholder={activeModel?.name || "Wildlife Detection Model"} /></div>
            <div><Label>New Version</Label><Input value={retrainForm.version} onChange={e => setRetrainForm({ ...retrainForm, version: e.target.value })} placeholder={`v${parseFloat(activeModel?.version?.replace("v", "") || "1.0") + 0.1}`} /></div>
            <div><Label>Changelog</Label><Textarea value={retrainForm.changelog} onChange={e => setRetrainForm({ ...retrainForm, changelog: e.target.value })} placeholder="e.g. Added 500 new verified monkey samples, improved langur detection" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowRetrain(false)}>Cancel</Button><Button onClick={startRetrain} disabled={retraining} className="bg-emerald-600 hover:bg-emerald-700">{retraining ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Start Training</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}