import React, { useEffect, useState } from "react";
import { Brain, ShieldAlert } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function AIModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.entities.AIModel.list("-created_date", 100)
      .then(setModels)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="AI Model Registry" description="Track model artifacts and evaluation metadata. Detection and deployment controls stay disabled until a model is independently evaluated." icon={Brain} />
      <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <p>No inference service or device deployment channel is configured. Registry entries are metadata only; they do not mean that a model is running or accurate.</p>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Could not load the model registry: {error}</p>}
      {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading model registry…</p> : models.length ? (
        <div className="space-y-3">
          {models.map((model) => <article key={model.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h2 className="font-semibold text-slate-800">{model.name || "Unnamed model"}</h2><p className="text-xs text-slate-500">{model.model_type || "Unspecified type"} · {model.version || "No version"}</p></div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Metadata: {model.status || "unverified"}</span>
            </div>
            <p className="mt-3 text-xs text-slate-500">This record is not loaded for inference. Review dataset provenance, model artifact checksum, class-level metrics, field testing, and rollback evidence before deployment.</p>
          </article>)}
        </div>
      ) : <div className="rounded-2xl border border-slate-200 bg-white"><EmptyState icon={Brain} title="No model artifacts registered" description="First collect and review the Pokhara 21 field dataset. Model training is a later phase." /></div>}
    </div>
  );
}
