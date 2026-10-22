import React, { useEffect, useState } from "react";
import { Brain, Database, ShieldCheck, Clock3 } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function AISelfLearning() {
  const [state, setState] = useState({ loading: true, records: [], jobs: [], models: [], error: "" });

  useEffect(() => {
    Promise.all([
      api.entities.DatasetRecord.list("-created_date", 500),
      api.entities.TrainingJob.list("-created_date", 100),
      api.entities.AIModel.list("-created_date", 100),
    ]).then(([records, jobs, models]) => setState({ loading: false, records, jobs, models, error: "" }))
      .catch((error) => setState((current) => ({ ...current, loading: false, error: error.message })));
  }, []);

  const verified = state.records.filter((record) => ["verified", "human_reviewed"].includes(record.status) && record.correct_label);
  const activeModels = state.models.filter((model) => model.status === "active");
  const latestJob = state.jobs[0];

  return (
    <div>
      <PageHeader title="AI Learning Readiness" description="Build a reviewed Pokhara 21 dataset before training or enabling a monkey detector." icon={Brain} />

      <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <h2 className="font-semibold">Training and automatic model updates are not connected</h2>
        <p className="mt-1">Reviewed labels are saved for curation. Model training, accuracy estimates, automatic model updates, and field equipment commands are not connected.</p>
      </section>

      {state.error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Could not load AI readiness data: {state.error}</p>}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric icon={Database} label="Human-verified samples" value={state.loading ? "…" : verified.length} />
        <Metric icon={ShieldCheck} label="Model registry entries" value={state.loading ? "…" : state.models.length} />
        <Metric icon={Clock3} label="Training jobs" value={state.loading ? "…" : state.jobs.length} />
      </div>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-800">Pokhara 21 training gate</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Collect consented field photos with site, time, and GPS accuracy.</li>
          <li>Have trained reviewers label monkey, human, livestock, other wildlife, and false detections; draw boxes around each animal.</li>
          <li>Keep all images from one encounter or camera session in the same train, validation, or test split.</li>
          <li>Measure recall, false alerts per camera-hour, and performance by lighting and weather before any pilot inference.</li>
          <li>Require researcher approval and a rollback plan before enabling a version in the field.</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-800">Current readiness</h2>
        {state.loading ? <p className="py-8 text-center text-sm text-slate-500">Loading saved records…</p> : (
          <div className="mt-3 space-y-3 text-sm">
            <ReadinessRow label="Verified labeled samples" value={verified.length ? `${verified.length} recorded` : "None recorded yet"} />
            <ReadinessRow label="Active model metadata" value={activeModels.length ? `${activeModels.length} registry item(s); inference is still disabled` : "No active model"} />
            <ReadinessRow label="Latest training job" value={latestJob ? `${latestJob.name || "Unnamed job"} · ${latestJob.status || "unknown status"}` : "No training job recorded"} />
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Recommended sequence: use self-supervised image embeddings to group duplicate frames and surface diverse review examples; train a detector on researcher-approved boxes; compare it on camera- and encounter-separated test data. Human corrections are supervised labels, not RLHF. Use preference feedback later to tune alert wording and operator workload. An SLM or RAG system can summarize verified records but must not decide whether a live animal alert is true.</p>
          </div>
        )}
      </section>

      {!state.loading && !state.records.length && <div className="mt-5 rounded-2xl border border-slate-200 bg-white"><EmptyState icon={Database} title="No reviewed training samples" description="Submit field photos and complete human review before starting model work." /></div>}
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><Icon className="mb-2 h-5 w-5 text-emerald-600" /><div className="text-2xl font-semibold text-slate-800">{value}</div><div className="text-xs text-slate-500">{label}</div></div>;
}

function ReadinessRow({ label, value }) {
  return <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-700">{value}</span></div>;
}
