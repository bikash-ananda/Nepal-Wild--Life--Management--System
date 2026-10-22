import path from "node:path";
import { readFile } from "node:fs/promises";
import { addAudit, mediaRoot } from "./db.js";
import { canAccessMedia, mediaIdFromUri } from "./media.js";
import { canReadSite, createRecord, getRecord } from "./records.js";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const reviewerRoles = new Set(["admin", "researcher", "reviewer"]);
const fallbackModel = "MDV6-mit-yolov9-c";

function config() {
  const base = String(process.env.WILDLIFE_AI_URL || "http://wildlife-ai:8080").trim();
  let serviceUrl = null;
  try {
    const parsed = new URL(base);
    if (["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password) serviceUrl = parsed;
  } catch { /* Invalid operator configuration is reported as unavailable. */ }
  return {
    enabled: process.env.WILDLIFE_AI_ENABLED === "true",
    serviceUrl,
    detectorModel: String(process.env.WILDLIFE_AI_DETECTOR_MODEL || fallbackModel).trim(),
    timeoutMs: Math.min(120000, Math.max(1000, Number(process.env.WILDLIFE_AI_TIMEOUT_MS || 30000))),
    maxImageBytes: Math.min(20 * 1024 * 1024, Math.max(1024, Number(process.env.WILDLIFE_AI_MAX_IMAGE_BYTES || 15 * 1024 * 1024))),
  };
}

function safeModelId(value) {
  return /^[A-Za-z0-9._-]{1,100}$/.test(value);
}

async function serviceJson(serviceUrl, route, timeoutMs) {
  const response = await fetch(new URL(route, serviceUrl), { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Inference service returned ${response.status}.`);
  return response.json();
}

export async function getAiStatus() {
  const settings = config();
  const base = {
    enabled: settings.enabled,
    state: "disabled",
    detector_model: settings.detectorModel,
    model_available: false,
    model_ids: [],
    capability: "general_animal_detection",
    message: "AI image analysis is disabled by the server administrator.",
  };
  if (!settings.enabled) return base;
  if (!settings.serviceUrl || !safeModelId(settings.detectorModel)) {
    return { ...base, state: "configuration_error", message: "The server-side AI configuration is invalid." };
  }

  try {
    const [health, catalog] = await Promise.all([
      serviceJson(settings.serviceUrl, "/v1/health", Math.min(settings.timeoutMs, 5000)),
      serviceJson(settings.serviceUrl, "/v1/catalog", Math.min(settings.timeoutMs, 5000)),
    ]);
    const modelIds = Array.isArray(catalog)
      ? catalog.map((model) => String(model.model_id || model.id || "")).filter(Boolean).slice(0, 200)
      : [];
    const available = modelIds.includes(settings.detectorModel);
    return {
      ...base,
      state: available ? "ready" : "model_missing",
      model_available: available,
      model_ids: modelIds,
      engine_ready: health?.status === "ok" || health?.ready === true || health?.healthy === true,
      message: available
        ? "The configured animal detector is available. Its output still needs human review."
        : "The inference service is running, but the configured model is not present in its model catalog.",
    };
  } catch {
    return { ...base, state: "unavailable", message: "The private inference service could not be reached." };
  }
}

function cleanDetections(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 100).flatMap((item) => {
    const confidence = Number(item?.confidence);
    const bbox = item?.bbox || {};
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return [];
    const coordinates = [bbox.x_min, bbox.y_min, bbox.x_max, bbox.y_max].map(Number);
    if (coordinates.some((number) => !Number.isFinite(number))) return [];
    const [x1, y1, x2, y2] = coordinates.map((number) => Math.max(0, Math.min(1, number)));
    if (x2 <= x1 || y2 <= y1) return [];
    return [{
      label: String(item.label || "unknown").slice(0, 80),
      label_id: Number.isInteger(item.label_id) ? item.label_id : null,
      confidence,
      bbox: { x_min: x1, y_min: y1, x_max: x2, y_max: y2 },
    }];
  });
}

function normalizedBoxes(detections) {
  return detections
    .filter((detection) => detection.label.toLowerCase() === "animal")
    .map(({ label, confidence, bbox }) => ({
      x: bbox.x_min * 640,
      y: bbox.y_min * 360,
      w: (bbox.x_max - bbox.x_min) * 640,
      h: (bbox.y_max - bbox.y_min) * 360,
      x_norm: bbox.x_min,
      y_norm: bbox.y_min,
      width_norm: bbox.x_max - bbox.x_min,
      height_norm: bbox.y_max - bbox.y_min,
      label: `${label} (${Math.round(confidence * 100)}%)`,
    }));
}

function captureTime(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function coordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

export function registerAiRoutes(app, pool, requireAuth, checkOrigin) {
  app.get("/api/ai/status", { preHandler: requireAuth }, async () => getAiStatus());

  app.post("/api/ai/analyze", { preHandler: requireAuth }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    if (!reviewerRoles.has(request.user.role)) {
      return reply.code(403).send({ error: "Researcher or reviewer access is required for AI image analysis." });
    }

    const settings = config();
    if (!settings.enabled || !settings.serviceUrl || !safeModelId(settings.detectorModel)) {
      return reply.code(503).send({ error: "AI image analysis is not configured on this server." });
    }

    const mediaId = mediaIdFromUri(request.body?.media_id || request.body?.file_uri);
    if (!mediaId) return reply.code(400).send({ error: "A valid uploaded image is required." });

    const mediaResult = await pool.query(
      "SELECT id, storage_key, content_type, size_bytes, uploaded_by FROM media_assets WHERE id = $1",
      [mediaId]
    );
    const media = mediaResult.rows[0];
    if (!media || !(await canAccessMedia(pool, request.user, mediaId, media.uploaded_by))) {
      return reply.code(404).send({ error: "Image not found." });
    }
    if (!imageTypes.has(String(media.content_type).toLowerCase())) {
      return reply.code(415).send({ error: "AI analysis accepts JPEG, PNG, or WebP images." });
    }
    if (Number(media.size_bytes) > settings.maxImageBytes) {
      return reply.code(413).send({ error: "Image exceeds the AI analysis size limit." });
    }

    const siteId = String(request.body?.site_id || "").trim();
    const site = siteId ? await getRecord(pool, "Site", siteId) : null;
    if (siteId && (!site || !canReadSite(request.user, site))) {
      return reply.code(404).send({ error: "Research site not found." });
    }

    const existing = await pool.query(
      "SELECT id, data FROM app_records WHERE entity = 'VerificationSample' AND data->>'media_id' = $1 ORDER BY created_at DESC LIMIT 1",
      [mediaId]
    );
    if (existing.rowCount) {
      const savedSample = existing.rows[0].data;
      const savedDetections = cleanDetections(savedSample.model_detections);
      return {
        sample: { ...savedSample, id: existing.rows[0].id },
        duplicate: true,
        model_id: savedSample.ai_model_version || settings.detectorModel,
        detections: savedDetections,
        animal_candidate_count: savedDetections.filter((item) => item.label.toLowerCase() === "animal").length,
        processing_time_ms: savedSample.processing_time_ms || null,
        status: savedSample.status === "verified" ? "human_reviewed" : "pending_human_review",
        capability: "general_animal_detection",
      };
    }

    let image;
    try {
      image = await readFile(path.join(mediaRoot, path.basename(media.storage_key)));
    } catch {
      return reply.code(404).send({ error: "Uploaded image file is unavailable." });
    }

    const form = new FormData();
    form.append("image", new Blob([image], { type: media.content_type }), path.basename(media.storage_key));
    const endpoint = new URL("/v1/detect", settings.serviceUrl);
    endpoint.searchParams.set("model", settings.detectorModel);
    endpoint.searchParams.set("threshold", "0.15");
    endpoint.searchParams.set("max_detections", "100");

    let engineResult;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(settings.timeoutMs),
      });
      if (!response.ok) {
        request.log.warn({ status: response.status, model: settings.detectorModel }, "Wildlife inference request failed");
        return reply.code(503).send({ error: "The AI engine could not analyze this image. Check its model configuration." });
      }
      engineResult = await response.json();
    } catch (error) {
      request.log.warn({ err: error }, "Wildlife inference service unavailable");
      return reply.code(503).send({ error: "The private AI engine is temporarily unavailable." });
    }

    const detections = cleanDetections(engineResult.detections);
    const animalDetections = detections.filter((detection) => detection.label.toLowerCase() === "animal");
    const bestAnimal = animalDetections.sort((left, right) => right.confidence - left.confidence)[0] || null;
    const capturedAt = captureTime(request.body?.captured_at);
    const imageUri = `media://${mediaId}`;
    const latitude = coordinate(request.body?.latitude, -90, 90);
    const longitude = coordinate(request.body?.longitude, -180, 180);
    const visibility = siteId ? "site" : "reviewer_only";
    const captureId = String(request.body?.capture_id || `ai-${mediaId}`).slice(0, 180);
    const observation = await createRecord(pool, "WildlifeObservation", {
      observation_id: `AI-${mediaId.slice(-14).toUpperCase()}`,
      capture_id: captureId,
      source: "ai_assisted_image_review",
      species: "",
      species_name: "Unverified",
      count: null,
      observation_type: "wildlife_sighting",
      behavior: "",
      latitude,
      longitude,
      location_accuracy_m: coordinate(request.body?.accuracy, 0, 100000),
      location_name: String(request.body?.location_name || site?.name || "").slice(0, 240),
      site_id: siteId,
      site_name: String(site?.name || ""),
      photos: [imageUri],
      media_asset_id: mediaId,
      notes: "General animal detector output. Human verification is required.",
      observed_by: request.user.id,
      observer_name: String(request.user.full_name || request.user.email || "Researcher").slice(0, 160),
      verified: false,
      review_status: "pending",
      observed_at: capturedAt,
      visibility,
      is_demo: false,
    }, request.user.id);
    const sample = await createRecord(pool, "VerificationSample", {
      capture_id: captureId,
      observation_id: observation.id,
      media_id: mediaId,
      image_uri: imageUri,
      image_url: `/api/media/${mediaId}`,
      species_name: "Unverified",
      status: "pending",
      source: "ai_assisted_image_review",
      captured_at: capturedAt,
      site_id: siteId,
      site_name: String(site?.name || ""),
      latitude,
      longitude,
      ai_prediction: bestAnimal ? "animal" : "no animal detected",
      ai_label: bestAnimal ? "animal" : "no animal detected",
      ai_confidence: bestAnimal?.confidence ?? null,
      ai_model_version: settings.detectorModel,
      model_detections: detections,
      bounding_boxes: normalizedBoxes(animalDetections),
      processing_time_ms: Number(engineResult.processing_time_ms) || null,
      image_size: Array.isArray(engineResult.image_size) ? engineResult.image_size : null,
      visibility,
      is_demo: false,
    }, request.user.id);

    await addAudit(request.user.id, "ai.image_analyzed", "VerificationSample", sample.id, {
      model_id: settings.detectorModel,
      detections: detections.length,
      animal_candidates: animalDetections.length,
      media_id: mediaId,
    });

    return reply.code(201).send({
      sample,
      duplicate: false,
      model_id: settings.detectorModel,
      detections,
      animal_candidate_count: animalDetections.length,
      processing_time_ms: Number(engineResult.processing_time_ms) || null,
      status: "pending_human_review",
      capability: "general_animal_detection",
    });
  });
}
