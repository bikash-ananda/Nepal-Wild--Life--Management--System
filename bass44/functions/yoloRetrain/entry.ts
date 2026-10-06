import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from "base44:runtime";

// YOLO 11 retraining pipeline:
//  - checkThreshold: after a ranger verifies a sample, count verified-but-untrained
//    samples per species; when a species crosses RETRAIN_THRESHOLD, call the YOLO
//    server's retrain endpoint, create a TrainingJob, and mark those samples consumed.
//  - registerModel: webhook the YOLO server calls when retraining completes; registers
//    the new model version in AIModel, swaps it in as active, and completes the TrainingJob.
//
// The YOLO server URL + API key come from the YOLO_SERVER_URL / YOLO_API_KEY secrets.
// Until those are set, checkThreshold still counts but skips the external call.

const RETRAIN_THRESHOLD = 50;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ---- CHECK + TRIGGER RETRAIN (admin only) ----
    if (action === "checkThreshold") {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
      if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

      const page = await base44.entities.VerificationSample.filter(
        { status: "verified", queued_for_training: true },
        { limit: 1000, fields: ["verified_label"] }
      );
      const items = page.items || page || [];
      const bySpecies = {};
      for (const s of items) {
        const label = s.verified_label || "Unknown";
        if (!bySpecies[label]) bySpecies[label] = [];
        bySpecies[label].push(s.id);
      }

      const serverUrl = (secrets.get("YOLO_SERVER_URL") || "").replace(/\/$/, "");
      const apiKey = secrets.get("YOLO_API_KEY");
      const triggered = [];

      for (const [species, ids] of Object.entries(bySpecies)) {
        if (ids.length < RETRAIN_THRESHOLD) continue;
        if (!serverUrl) {
          triggered.push({ species, samples: ids.length, skipped: "YOLO server not configured" });
          continue;
        }
        let externalJobId = null;
        try {
          const res = await fetch(`${serverUrl}/v1/retrain`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
            body: JSON.stringify({ species, sample_ids: ids }),
            signal: AbortSignal.timeout(15000),
          });
          const data = res.ok ? await res.json().catch(() => ({})) : {};
          externalJobId = data.job_id || data.id || null;
        } catch (e) {
          triggered.push({ species, samples: ids.length, error: e.message });
          continue;
        }

        const job = await base44.entities.TrainingJob.create({
          name: `YOLO retrain — ${species}`,
          model_version: `yolo11-${species.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
          status: "training",
          samples_collected: ids.length,
          started_at: new Date().toISOString(),
        });
        // Mark these samples as consumed so they aren't re-counted
        await base44.entities.VerificationSample.updateMany(
          { id: { $in: ids } },
          { $set: { queued_for_training: false } }
        );
        triggered.push({ species, samples: ids.length, job_id: job.id, external_job_id: externalJobId });
      }

      return Response.json({ checked: items.length, threshold: RETRAIN_THRESHOLD, triggered });
    }

    // ---- REGISTER COMPLETED MODEL (webhook from YOLO server) ----
    if (action === "registerModel") {
      const auth = req.headers.get("authorization") || "";
      const apiKey = secrets.get("YOLO_API_KEY");
      if (!apiKey || auth !== `Bearer ${apiKey}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const { job_id, model_version, accuracy, false_positive_rate, supported_classes } = body;
      if (!model_version) return Response.json({ error: "model_version required" }, { status: 400 });

      const prev = await base44.entities.AIModel.filter(
        { model_type: "detection", status: "active", active: true },
        { limit: 1 }
      );
      const prevItems = prev.items || prev || [];
      const prevModel = prevItems[0];
      if (prevModel) {
        await base44.entities.AIModel.update(prevModel.id, { status: "deprecated", active: false });
      }
      const model = await base44.entities.AIModel.create({
        name: "YOLO 11 Wildlife",
        version: model_version,
        model_type: "detection",
        status: "active",
        active: true,
        accuracy: accuracy || 0,
        false_positive_rate: false_positive_rate || 0,
        supported_classes: supported_classes || [],
        previous_version: prevModel ? prevModel.version : "",
        trained_at: new Date().toISOString(),
        deployed_at: new Date().toISOString(),
      });
      if (job_id) {
        await base44.entities.TrainingJob.update(job_id, {
          status: "completed",
          progress: 100,
          accuracy: accuracy || 0,
          false_positive_rate: false_positive_rate || 0,
          completed_at: new Date().toISOString(),
          comparison_result: prevModel ? ((accuracy || 0) >= (prevModel.accuracy || 0) ? "improved" : "degraded") : "improved",
          accuracy_delta: prevModel ? ((accuracy || 0) - (prevModel.accuracy || 0)) : 0,
          previous_model_version: prevModel ? prevModel.version : "",
        });
      }
      return Response.json({ ok: true, model_id: model.id, version: model_version });
    }

    return Response.json({ error: "Unknown action: " + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}