// Shared supervised-classification pipeline: YOLO 11 (external GPU server) first,
// built-in LLM vision model as fallback, human-review escalation when both are
// unconfident. Reused by the field-capture and public-capture ingest paths so the
// classification logic lives in exactly one place.
import { secrets } from "base44:runtime";

export const YOLO_CONFIDENCE_THRESHOLD = 0.6;
export const LLM_CONFIDENCE_THRESHOLD = 0.6;
export const YOLO_TIMEOUT_MS = 4000; // "a few seconds" before falling back

// Call the external YOLO 11 server. Returns a classification object or null when
// the server is unconfigured, unreachable, or times out — so the caller falls
// back to the LLM. Never throws.
export async function callYoloServer({ signedUrl }) {
  const serverUrl = (secrets.get("YOLO_SERVER_URL") || "").replace(/\/$/, "");
  const apiKey = secrets.get("YOLO_API_KEY");
  if (!serverUrl) return null; // not configured yet → skip straight to LLM
  try {
    const res = await fetch(`${serverUrl}/v1/classify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ image_url: signedUrl }),
      signal: AbortSignal.timeout(YOLO_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.species_name) return null;
    return {
      species_name: String(data.species_name),
      scientific_name: data.scientific_name || "",
      confidence: typeof data.confidence === "number" ? data.confidence : 0.5,
      count: data.count || 1,
      behavior: data.behavior || "",
      notes: data.notes || "",
    };
  } catch {
    return null; // timeout / network error → fall back
  }
}

// Built-in LLM vision model fallback classifier.
export async function callLlmClassifier(base44, { signedUrl, region }) {
  const llm = await base44.integrations.Core.InvokeLLM({
    prompt:
      `You are a wildlife biologist identifying animals from photos taken ${region || "in the field"}. ` +
      `Classify the animal in this photo. Return the most likely species (common English name), scientific name if confident, ` +
      `estimated number of animals visible, observed behavior, and your confidence (0-1). ` +
      `If you cannot identify the animal with reasonable certainty, set species_name to "Unknown" and confidence low. Be conservative.`,
    file_urls: [signedUrl],
    response_json_schema: {
      type: "object",
      properties: {
        species_name: { type: "string", description: "Common English species name, or Unknown" },
        scientific_name: { type: "string" },
        count: { type: "number" },
        behavior: { type: "string" },
        confidence: { type: "number" },
        notes: { type: "string" },
      },
      required: ["species_name", "confidence"],
    },
  });
  return llm || null;
}

// Escalate an unclassified / low-confidence image to a human review queue.
// Creates a pending VerificationSample (carrying both the YOLO and LLM guesses)
// and emails on-duty officers. Non-blocking: failures never throw.
export async function escalateToHuman(base44, {
  photoUri, signedUrl, yolo, llm, bestLabel, bestConfidence,
  location, latitude, longitude, siteId, siteName, cameraId, cameraName, source, user,
}) {
  let sample = null;
  try {
    const hasGuess =
      (yolo && yolo.species_name && yolo.species_name !== "Unknown") ||
      (llm && llm.species_name && llm.species_name !== "Unknown");
    const difficultyTier = hasGuess ? "common" : "escalated";
    const gameMode = hasGuess ? "hint_shown" : "hint_hidden";
    sample = await base44.entities.VerificationSample.create({
      image_url: photoUri || signedUrl,
      ai_label: bestLabel || "Unknown",
      ai_confidence: bestConfidence || 0,
      yolo_label: (yolo && yolo.species_name) || "",
      yolo_confidence: (yolo && yolo.confidence) || 0,
      llm_label: (llm && llm.species_name) || "",
      llm_confidence: (llm && llm.confidence) || 0,
      classifier_source: "escalated",
      site_id: siteId || "",
      site_name: siteName || "",
      camera_id: cameraId || "",
      camera_name: cameraName || "",
      latitude: latitude || null,
      longitude: longitude || null,
      status: "pending",
      queued_for_training: false,
      difficulty_tier: difficultyTier,
      game_mode: gameMode,
      notes: `Escalated from ${source || "capture"} — needs human identification`,
    });
  } catch {
    /* sample creation failure must not block the flow */
  }

  try {
    const officers = await base44.entities.TeamMember.filter(
      { status: "active", role: { $in: ["Wildlife Officer", "Field Officer"] } },
      { limit: 20 }
    );
    const items = officers.items || officers || [];
    const emails = items.map((o) => o.email).filter(Boolean);
    if (emails.length) {
      await base44.integrations.Core.SendEmail({
        to: emails.join(","),
        subject: `Wildlife ID needed: ${bestLabel || "Unknown animal"} (${Math.round((bestConfidence || 0) * 100)}%)`,
        body:
          `A photo could not be classified automatically and needs human review.\n\n` +
          `Best guess: ${bestLabel || "Unknown"} (${Math.round((bestConfidence || 0) * 100)}%)\n` +
          `YOLO 11: ${yolo ? yolo.species_name + " (" + Math.round((yolo.confidence || 0) * 100) + "%)" : "n/a"}\n` +
          `LLM vision: ${llm ? llm.species_name + " (" + Math.round((llm.confidence || 0) * 100) + "%)" : "n/a"}\n` +
          `Location: ${location || "unknown"}\n\n` +
          `Review it in the app under AI Verification.`,
      });
    }
  } catch {
    /* email failure must not block the flow */
  }

  return sample;
}

// Full pipeline: YOLO → LLM fallback → human escalation.
// Returns { classification, classifier_source, escalated, verification_sample,
//           yolo_label, yolo_confidence, llm_label, llm_confidence }.
export async function classifyPhoto(base44, {
  signedUrl, photoUri, source, region, location, latitude, longitude,
  siteId, siteName, cameraId, cameraName, user,
}) {
  // 1. YOLO 11 server
  const yolo = await callYoloServer({ signedUrl });
  if (yolo && yolo.confidence >= YOLO_CONFIDENCE_THRESHOLD && yolo.species_name !== "Unknown") {
    return {
      classification: yolo,
      classifier_source: "yolo",
      yolo_label: yolo.species_name, yolo_confidence: yolo.confidence,
      llm_label: "", llm_confidence: 0,
      escalated: false, verification_sample: null,
    };
  }

  // 2. LLM vision fallback
  let llm = null;
  try {
    llm = await callLlmClassifier(base44, { signedUrl, region });
  } catch {
    llm = null;
  }
  const llmLabel = llm ? String(llm.species_name || "Unknown") : "Unknown";
  const llmConf = llm && typeof llm.confidence === "number" ? llm.confidence : 0;

  if (llm && llmConf >= LLM_CONFIDENCE_THRESHOLD && llmLabel !== "Unknown") {
    return {
      classification: { ...llm, species_name: llmLabel, confidence: llmConf },
      classifier_source: "llm",
      yolo_label: yolo ? yolo.species_name : "", yolo_confidence: yolo ? yolo.confidence : 0,
      llm_label: llmLabel, llm_confidence: llmConf,
      escalated: false, verification_sample: null,
    };
  }

  // 3. Human escalation
  const bestLabel =
    (yolo && yolo.species_name && yolo.species_name !== "Unknown") ? yolo.species_name : llmLabel;
  const bestConfidence = (yolo && yolo.confidence) || llmConf || 0;
  const sample = await escalateToHuman(base44, {
    photoUri, signedUrl, yolo, llm, bestLabel, bestConfidence,
    location, latitude, longitude, siteId, siteName, cameraId, cameraName, source, user,
  });
  return {
    classification: {
      species_name: bestLabel || "Unknown",
      scientific_name: (llm && llm.scientific_name) || "",
      confidence: bestConfidence,
      count: (llm && llm.count) || (yolo && yolo.count) || 1,
      behavior: (llm && llm.behavior) || (yolo && yolo.behavior) || "",
      notes: "Escalated to human review",
    },
    classifier_source: "escalated",
    yolo_label: yolo ? yolo.species_name : "", yolo_confidence: yolo ? yolo.confidence : 0,
    llm_label: llmLabel, llm_confidence: llmConf,
    escalated: true, verification_sample: sample,
  };
}