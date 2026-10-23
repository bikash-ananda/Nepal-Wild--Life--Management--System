import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Brain, CheckCircle2, ChevronRight, Clock3, ImagePlus, Loader2, ShieldAlert } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";

const stateStyles = {
  ready: "bg-emerald-50 text-emerald-800 border-emerald-200",
  engine_offline: "bg-amber-50 text-amber-900 border-amber-200",
  disabled: "bg-slate-100 text-slate-700 border-slate-200",
  unavailable: "bg-rose-50 text-rose-800 border-rose-200",
  model_missing: "bg-amber-50 text-amber-900 border-amber-200",
  configuration_error: "bg-rose-50 text-rose-800 border-rose-200",
};

export default function AIModels() {
  const [state, setState] = useState({ loading: true, status: null, models: [], sites: [], error: "" });
  const [file, setFile] = useState(null);
  const [uploadedMediaId, setUploadedMediaId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.ai.status(),
      api.entities.AIModel.list("-created_date", 100),
      api.entities.Site.list("name", 200),
    ]).then(([status, models, sites]) => setState({ loading: false, status, models, sites, error: "" }))
      .catch((requestError) => setState((current) => ({ ...current, loading: false, error: requestError.message })));
  }, []);

  const validFile = file && ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 15 * 1024 * 1024;
  const canAnalyze = state.status?.state === "ready" && state.status?.engine_ready === true && Boolean(validFile) && Boolean(siteId) && !analyzing;

  const analyzeImage = async (event) => {
    event.preventDefault();
    if (!canAnalyze) return;
    setAnalyzing(true);
    setError("");
    setResult(null);
    try {
      const uploaded = uploadedMediaId ? { id: uploadedMediaId } : await api.integrations.Core.UploadPrivateFile({ file });
      setUploadedMediaId(uploaded.id);
      const analysis = await api.ai.analyze({
        media_id: uploaded.id,
        site_id: siteId,
        captured_at: new Date().toISOString(),
      });
      setResult(analysis);
    } catch (requestError) {
      setError(requestError.message || "The image could not be analyzed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const status = state.status;
  const statusLabel = status?.state === "ready" && status.engine_ready !== true ? "engine_offline" : status?.state;

  return (
    <div>
      <PageHeader title="AI Model Registry" description="Check the private inference engine and submit a research image for animal detection." icon={Brain} />

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Activity className="h-5 w-5" /></span>
            <div>
              <h2 className="font-semibold text-slate-800">Private inference service</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">{state.loading ? "Checking server configuration…" : status?.state === "ready" && status.engine_ready !== true ? "The model is configured, but the inference worker is not healthy yet. Image analysis is unavailable until it responds." : status?.message || state.error || "Service status is unavailable."}</p>
            </div>
          </div>
          {status && <span className={`rounded-full border px-3 py-1 text-xs font-medium ${stateStyles[statusLabel] || stateStyles.disabled}`}>{statusLabel.replaceAll("_", " ")}</span>}
        </div>
        {status?.enabled && <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
          <div><span className="text-slate-500">Configured model</span><div className="font-medium text-slate-800">{status.detector_model}</div></div>
          <div><span className="text-slate-500">Engine catalog</span><div className="font-medium text-slate-800">{status.model_ids?.length || 0} model(s) visible to the service</div></div>
        </div>}
      </section>

      <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>This first pretrained model detects animals, not monkey species.</strong> Every result is an unverified suggestion for a human reviewer. It cannot send community alerts or trigger field equipment.</p>
      </div>

      {state.error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Could not load AI configuration: {state.error}</p>}

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="font-semibold text-slate-800">Analyze a research image</h2>
          <p className="mt-1 text-sm text-slate-500">The private server stores the upload, runs the configured animal detector, and places its result in Human Verification.</p>
        </div>
        <form onSubmit={analyzeImage} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Research site
            <select value={siteId} onChange={(event) => setSiteId(event.target.value)} required className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none">
              <option value="">Choose a research site</option>
              {state.sites.map((site) => <option key={site.id} value={site.id}>{site.name || site.site_name || site.id}</option>)}
            </select>
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center hover:border-emerald-400">
            <ImagePlus className="mb-2 h-6 w-6 text-emerald-700" />
            <span className="text-sm font-medium text-slate-700">{file ? file.name : "Choose a JPEG, PNG, or WebP image"}</span>
            <span className="mt-1 text-xs text-slate-500">Maximum 15 MB · image only</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { setFile(event.target.files?.[0] || null); setUploadedMediaId(""); setResult(null); }} />
          </label>
          {file && !validFile && <p role="alert" className="text-sm text-rose-700">Choose a JPEG, PNG, or WebP image smaller than 15 MB.</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!canAnalyze} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
              {analyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing image…</> : "Analyze and add to review"}
            </button>
            {status?.state === "disabled" && <span className="text-xs text-slate-500">The optional AI service is not enabled.</span>}
            {status?.state === "ready" && status.engine_ready !== true && <span className="text-xs text-amber-800">The inference worker is not ready. No upload or analysis has started.</span>}
          </div>
        </form>
        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {result && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-emerald-950">Image added to human review</h3>
              <p className="mt-1 text-sm text-emerald-900">{result.animal_candidate_count || 0} animal candidate(s) · model {result.model_id} · {result.processing_time_ms ? `${Math.round(result.processing_time_ms)} ms` : "processing time unavailable"}</p>
              <div className="mt-3 space-y-1 text-xs text-emerald-950">
                {result.detections?.length ? result.detections.map((detection, index) => <div key={`${detection.label}-${index}`} className="flex justify-between gap-3 rounded-md bg-white/70 px-2 py-1.5"><span>{detection.label}</span><span>{Math.round(detection.confidence * 100)}% model score</span></div>) : <p>No animal boxes returned. The image remains available for a reviewer to confirm a missed detection.</p>}
              </div>
              <Link to="/ai-verification" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:text-emerald-950">Open Human Verification <ChevronRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>}
      </section>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="font-semibold text-slate-800">Learning path for Pokhara 21</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <LearningStep number="1" title="Pretrained baseline" text="Use a general animal detector to locate candidates. It is a screening tool, not a monkey classifier." />
          <LearningStep number="2" title="Human-reviewed labels" text="Researchers confirm species and draw boxes. Keep false detections and empty frames as useful negative examples." />
          <LearningStep number="3" title="Local evaluation" text="Train a small detector only after splitting by camera and encounter; compare recall and false alerts per camera-hour." />
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" />Self-supervised embeddings can cluster and de-duplicate unlabeled frames so reviewers see diverse examples. Human corrections then become supervised training labels. RLHF can tune alert usefulness and operator preferences later; it should not be used as a substitute for species labels.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="font-semibold text-slate-800">Registered model metadata</h2>
        {state.loading ? <p className="py-6 text-center text-sm text-slate-500">Loading model registry…</p> : state.models.length ? (
          <div className="mt-3 space-y-3">
            {state.models.map((model) => <article key={model.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 className="font-medium text-slate-800">{model.name || "Unnamed model"}</h3><p className="text-xs text-slate-500">{model.model_type || "Unspecified type"} · {model.version || "No version"}</p></div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Metadata: {model.status || "unverified"}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">A registry entry does not mean this model is loaded or validated for Pokhara field conditions.</p>
            </article>)}
          </div>
        ) : <p className="mt-2 text-sm text-slate-500">No additional model records yet. The configured engine model is shown above.</p>}
      </section>
    </div>
  );
}

function LearningStep({ number, title, text }) {
  return <div className="rounded-xl border border-slate-200 p-3"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">{number}</span><h3 className="mt-2 text-sm font-semibold text-slate-800">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{text}</p></div>;
}
