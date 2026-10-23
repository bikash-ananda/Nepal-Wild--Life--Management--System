import { randomUUID } from "node:crypto";
import { addAudit } from "./db.js";
import { createRecord } from "./records.js";

const administrativeRoles = new Set(["admin", "researcher"]);
const geocodeCache = new Map();
let geocodeQueue = Promise.resolve();
let lastGeocodeAt = 0;
let geocodeQueueDepth = 0;

function text(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function boundedCoordinate(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw Object.assign(new Error("The GPS coordinates are invalid."), { statusCode: 400 });
  }
  return number;
}

function noticePayload(body) {
  const expiryDate = new Date(body.expiry_time || body.expires_at || "");
  const payload = {
    title_en: text(body.title_en, 180),
    title_np: text(body.title_np, 180),
    content_en: text(body.content_en, 1800),
    content_np: text(body.content_np, 1800),
    target_ward: text(body.target_ward, 40),
    target_municipality: text(body.target_municipality, 120),
    priority: Number(body.priority ?? 2),
    expires_at: Number.isNaN(expiryDate.getTime()) ? "" : expiryDate.toISOString(),
  };
  if (!payload.title_en || !payload.title_np || !payload.content_en || !payload.content_np) {
    throw Object.assign(new Error("English and Nepali titles and notice text are required."), { statusCode: 400 });
  }
  if (!Number.isInteger(payload.priority) || payload.priority < 1 || payload.priority > 4) {
    throw Object.assign(new Error("Priority must be a number from 1 to 4."), { statusCode: 400 });
  }
  const expires = Date.parse(payload.expires_at);
  if (!Number.isFinite(expires) || expires <= Date.now() || expires > Date.now() + 30 * 86400000) {
    throw Object.assign(new Error("Expiry must be in the future and within 30 days."), { statusCode: 400 });
  }
  return payload;
}

function areaLabel(ward, municipality) {
  const place = text(municipality, 120);
  const wardNumber = text(ward, 40);
  return [place, wardNumber ? `Ward ${wardNumber}` : ""].filter(Boolean).join(", ") || "the reporting area";
}

function fallbackBilingualDraft({ ward, municipality, activityCount, windowMinutes, verified }) {
  const area = areaLabel(ward, municipality);
  const activity = verified
    ? `A reviewer-confirmed wildlife sighting was recorded near ${area}.`
    : `Camera activity that may indicate wildlife was flagged near ${area}; it has not yet been confirmed by a human reviewer.`;
  const activityNp = verified
    ? `${area} नजिक वन्यजन्तुको उपस्थिति मानव समीक्षकबाट पुष्टि भएको छ।`
    : `${area} नजिक वन्यजन्तु हुन सक्ने क्यामेरा गतिविधि देखिएको छ; मानव समीक्षकबाट पुष्टि हुन बाँकी छ।`;
  return {
    title_en: verified ? "Wildlife activity reported" : "Possible wildlife activity — not yet verified",
    title_np: verified ? "वन्यजन्तु गतिविधि जानकारी" : "सम्भावित वन्यजन्तु गतिविधि — पुष्टि हुन बाँकी",
    content_en: `${activity} Please keep a safe distance, secure crops and livestock where possible, and follow guidance from local officials. Do not approach, chase, or harm wildlife. This draft summarizes ${activityCount} recent camera detection${activityCount === 1 ? "" : "s"} or field report${activityCount === 1 ? "" : "s"} in the last ${windowMinutes} minutes.`,
    content_np: `${activityNp} कृपया सुरक्षित दूरी कायम गर्नुहोस्, सम्भव भए बाली र पशुधन सुरक्षित राख्नुहोस्, र स्थानीय अधिकारीको सुझाव पालना गर्नुहोस्। वन्यजन्तु नजिक नजानुहोस्, नलखेट्नुहोस् र हानि नगर्नुहोस्। यो मस्यौदा पछिल्ला ${windowMinutes} मिनेटका ${activityCount} क्यामेरा पहिचान वा मैदानी विवरणमा आधारित छ।`,
  };
}

async function generateWithConfiguredModel(context, fallback) {
  const base = String(process.env.NOTICE_LLM_URL || "").trim().replace(/\/+$/, "");
  const model = String(process.env.NOTICE_LLM_MODEL || "").trim();
  if (!base || !model) return fallback;
  let url;
  try {
    url = new URL(base.includes("/chat/completions") ? base : `${base}/v1/chat/completions`);
  } catch {
    return fallback;
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) return fallback;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(process.env.NOTICE_LLM_API_KEY ? { Authorization: `Bearer ${process.env.NOTICE_LLM_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 350,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Write short public wildlife safety notices in English and Nepali. Return only JSON with title_en,title_np,content_en,content_np. Never claim an animal is confirmed unless verified is true. Avoid exact coordinates, names, blame, panic, or instructions to harm or approach animals. Include practical, nonviolent safety advice." },
          { role: "user", content: JSON.stringify(context) },
        ],
      }),
    });
    if (!response.ok) return fallback;
    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;
    const draft = {
      title_en: text(parsed?.title_en, 180), title_np: text(parsed?.title_np, 180),
      content_en: text(parsed?.content_en, 1800), content_np: text(parsed?.content_np, 1800),
    };
    return Object.values(draft).every(Boolean) ? draft : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

function adminOnly(request, reply) {
  if (!administrativeRoles.has(request.user?.role)) {
    reply.code(403).send({ error: "Administrator or researcher access is required." });
    return false;
  }
  return true;
}

async function createManualNotice(pool, request, reply, checkOrigin) {
  if (!checkOrigin(request, reply)) return;
  if (!adminOnly(request, reply)) return;
  const payload = noticePayload(request.body || {});
  const result = await pool.query(
    `INSERT INTO public_notices
      (title_en,title_np,content_en,content_np,target_ward,target_municipality,priority,source,status,expires_at,created_by,published_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'manual','published',$8,$9,$9)
     RETURNING id,title_en,title_np,content_en,content_np,target_ward,target_municipality,priority,source,status,expires_at,created_at`,
    [payload.title_en, payload.title_np, payload.content_en, payload.content_np, payload.target_ward,
      payload.target_municipality, payload.priority, payload.expires_at, request.user.id]
  );
  await addAudit(request.user.id, "public_notice.publish_manual", "PublicNotice", result.rows[0].id, {
    priority: payload.priority, target_ward: payload.target_ward,
  });
  return reply.code(201).send(result.rows[0]);
}

export function registerPublicRoutes(app, pool, requireAuth, checkOrigin) {
  app.get("/api/v1/notices/active", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (request) => {
    const ward = text(request.query?.ward, 40);
    const municipality = text(request.query?.municipality, 120);
    const result = await pool.query(
      `SELECT id,title_en,title_np,content_en,content_np,target_ward,target_municipality,priority,expires_at,created_at
       FROM public_notices
       WHERE status='published' AND expires_at > now()
         AND (target_ward = '' OR (target_ward = $1 AND (target_municipality = '' OR lower(target_municipality) = lower($2))))
       ORDER BY priority DESC, created_at DESC LIMIT 5`, [ward, municipality]
    );
    return { notices: result.rows };
  });

  app.post("/api/public/reports", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    const body = request.body || {};
    if (body.consent !== true) return reply.code(400).send({ error: "Consent is required before sharing a report with project reviewers." });
    const lossType = text(body.loss_type, 40);
    if (!["crop", "livestock", "both", "other"].includes(lossType)) {
      return reply.code(400).send({ error: "Choose a valid type of reported loss." });
    }
    const name = text(body.reporter_name, 120);
    const details = text(body.description, 2500);
    const crop = text(body.crop_type, 120);
    const livestock = text(body.livestock_type, 120);
    const estimate = body.estimated_loss_npr === "" || body.estimated_loss_npr == null ? null : Number(body.estimated_loss_npr);
    if (!details) return reply.code(400).send({ error: "Describe the damage or loss." });
    if (estimate !== null && (!Number.isFinite(estimate) || estimate < 0 || estimate > 100000000)) {
      return reply.code(400).send({ error: "Enter a valid estimated loss in NPR." });
    }
    const latitude = boundedCoordinate(body.latitude, -90, 90);
    const longitude = boundedCoordinate(body.longitude, -180, 180);
    if ((latitude === null) !== (longitude === null)) {
      return reply.code(400).send({ error: "Send both GPS coordinates or leave both blank." });
    }
    const accuracy = body.accuracy == null ? null : Number(body.accuracy);
    if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000)) {
      return reply.code(400).send({ error: "The GPS accuracy value is invalid." });
    }
    const requestedSubmissionId = text(body.submission_id, 80);
    const submissionId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedSubmissionId)
      ? requestedSubmissionId : randomUUID();
    const prior = await pool.query(
      "SELECT id FROM app_records WHERE entity='HwcCase' AND data->>'submission_id'=$1 LIMIT 1", [submissionId]
    );
    if (prior.rowCount) return reply.code(200).send({ id: prior.rows[0].id, duplicate: true, status: "pending_review" });
    const reportedAt = body.reported_at ? new Date(body.reported_at) : new Date();
    if (Number.isNaN(reportedAt.getTime()) || reportedAt.getTime() > Date.now() + 5 * 60000) {
      return reply.code(400).send({ error: "The report time is invalid." });
    }
    let record;
    try { record = await createRecord(pool, "HwcCase", {
      submission_id: submissionId,
      case_number: "PUBLIC-" + submissionId.slice(0, 8).toUpperCase(),
      source: "public_farmer_report",
      status: "pending_review",
      review_status: "pending",
      loss_type: lossType,
      crop_type: crop,
      livestock_type: livestock,
      estimated_loss_npr: estimate,
      description: details,
      reporter_name: name,
      reporter_phone: text(body.reporter_phone, 40),
      province: text(body.province, 80),
      district: text(body.district, 100),
      municipality: text(body.municipality, 120),
      ward: text(body.ward, 40),
      location_name: text(body.location_name, 180),
      latitude, longitude, location_accuracy_m: accuracy,
      reported_at: reportedAt.toISOString(),
      is_demo: false,
      visibility: "reviewer_only",
    }); } catch (error) {
      if (error.code !== "23505") throw error;
      const duplicate = await pool.query(
        "SELECT id FROM app_records WHERE entity='HwcCase' AND data->>'submission_id'=$1 LIMIT 1", [submissionId]
      );
      if (!duplicate.rowCount) throw error;
      return reply.code(200).send({ id: duplicate.rows[0].id, duplicate: true, status: "pending_review" });
    }
    return reply.code(201).send({ id: record.id, status: "pending_review", message: "Your report was received for human review." });
  });

  app.post("/api/public/geocode/reverse", { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    const latitude = boundedCoordinate(request.body?.latitude, -90, 90);
    const longitude = boundedCoordinate(request.body?.longitude, -180, 180);
    if (latitude === null || longitude === null) return reply.code(400).send({ error: "Latitude and longitude are required." });
    const configured = String(process.env.PUBLIC_GEOCODER_URL || "").trim();
    if (!configured) return { configured: false, message: "Automatic area lookup is not configured. Please enter and verify the area details." };
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = geocodeCache.get(key);
    if (cached && cached.until > Date.now()) return { configured: true, ...cached.value, cached: true };
    if (geocodeQueueDepth >= 20) return reply.code(503).send({ error: "Area lookup is busy. Please try again shortly." });
    let target;
    try {
      target = new URL(configured);
      if (!new Set(["https:", "http:"]).has(target.protocol)) throw new Error("unsupported protocol");
    } catch {
      request.log.error("PUBLIC_GEOCODER_URL must be an HTTP(S) URL.");
      return reply.code(503).send({ error: "Area lookup is not configured correctly." });
    }
    target.pathname = target.pathname.replace(/\/$/, "") + "/reverse";
    target.searchParams.set("format", "jsonv2");
    target.searchParams.set("addressdetails", "1");
    target.searchParams.set("zoom", "18");
    target.searchParams.set("lat", String(latitude));
    target.searchParams.set("lon", String(longitude));
    geocodeQueueDepth += 1;
    const pending = geocodeQueue.then(async () => {
      const waitMs = Math.max(0, 1100 - (Date.now() - lastGeocodeAt));
      if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
      lastGeocodeAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        return await fetch(target, {
          signal: controller.signal,
          headers: { "User-Agent": process.env.GEOCODER_USER_AGENT || "NepalWildlifeConflict/1.0", Accept: "application/json" },
        });
      } finally { clearTimeout(timeout); }
    });
    geocodeQueue = pending.catch(() => {});
    try {
      const response = await pending;
      if (!response.ok) return reply.code(502).send({ error: "Area lookup provider is unavailable." });
      const data = await response.json();
      const address = data?.address || {};
      const value = {
        configured: true,
        province: text(address.state || address.province || address.region, 80),
        district: text(address.county || address.district || address.state_district, 100),
        municipality: text(address.city || address.town || address.municipality || address.village, 120),
        ward: text(address.city_district || address.suburb || address.neighbourhood || address.quarter, 40),
        display_name: text(data?.display_name, 240),
        needs_confirmation: true,
      };
      geocodeCache.set(key, { value, until: Date.now() + 3600000 });
      if (geocodeCache.size > 1000) geocodeCache.delete(geocodeCache.keys().next().value);
      return value;
    } catch {
      return reply.code(502).send({ error: "Area lookup failed. Please enter the administrative area manually." });
    } finally {
      geocodeQueueDepth = Math.max(0, geocodeQueueDepth - 1);
    }
  });

  app.get("/api/v1/notices/manage", { preHandler: requireAuth }, async (request, reply) => {
    if (!adminOnly(request, reply)) return;
    const result = await pool.query(
      `SELECT id,title_en,title_np,content_en,content_np,target_ward,target_municipality,priority,source,status,evidence_summary,expires_at,created_at
       FROM public_notices ORDER BY created_at DESC LIMIT 200`
    );
    return { notices: result.rows };
  });

  app.post("/api/v1/notices/manual", { preHandler: requireAuth }, (request, reply) => createManualNotice(pool, request, reply, checkOrigin));
  // Backward-compatible spelling used in the original implementation brief.
  app.post("/anual", { preHandler: requireAuth }, (request, reply) => createManualNotice(pool, request, reply, checkOrigin));

  app.post("/api/v1/notices/ai-generate", { preHandler: requireAuth, config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    if (!adminOnly(request, reply)) return;
    const body = request.body || {};
    const ward = text(body.target_ward, 40);
    const municipality = text(body.target_municipality, 120);
    const requestedWindow = Number(body.window_minutes || 30);
    const windowMinutes = Number.isFinite(requestedWindow) ? Math.max(1, Math.min(180, Math.floor(requestedWindow))) : 30;
    const incidentLogs = Array.isArray(body.incident_logs) ? body.incident_logs.slice(0, 200) : [];
    const rawIncidentCount = body.incident_count === undefined ? incidentLogs.length : Number(body.incident_count);
    if (!Number.isFinite(rawIncidentCount) || rawIncidentCount < 0) return reply.code(400).send({ error: "Incident count must be zero or greater." });
    const incidentCount = Math.min(10000, Math.floor(rawIncidentCount));
    let detections = Number(body.detection_count || 0);
    if (!Number.isFinite(detections) || detections < 0) return reply.code(400).send({ error: "Detection count must be zero or greater." });
    detections = Math.min(10000, Math.floor(detections));
    if (detections === 0 && body.site_id) {
      const found = await pool.query(
        `SELECT data FROM app_records WHERE entity IN ('DetectionEvent','CameraEvent')
          AND created_at >= now() - make_interval(mins => $2::int)
          AND ($1::text IS NULL OR data->>'site_id'=$1) LIMIT 500`, [String(body.site_id), windowMinutes]
      );
      detections = found.rows.filter(({ data }) => {
        const record = data || {};
        const sameSite = String(record.site_id || "") === String(body.site_id);
        const sameWard = !ward || String(record.ward || "") === ward;
        const species = String(record.species_name || record.species || record.label || record.event_code || "").toLowerCase();
        return sameSite && sameWard && /monkey|macaque/.test(species);
      }).length;
    }
    const activityCount = detections + incidentCount;
    if (activityCount < 1) return reply.code(400).send({ error: "No recent activity was provided or found for this draft. Include reviewed incident or detection counts." });
    const verified = body.human_verified === true;
    const summary = {
      detection_count: detections, incident_count: incidentCount, window_minutes: windowMinutes,
      target_ward: ward, target_municipality: municipality,
      human_verified: verified,
      note: verified ? "Reviewer-confirmed wildlife activity." : "Unverified AI/camera indicators; do not claim confirmation.",
    };
    const fallback = fallbackBilingualDraft({ ward, municipality, activityCount, windowMinutes, verified });
    const generated = await generateWithConfiguredModel(summary, fallback);
    const requestedExpiry = Number(body.expiry_minutes || 60);
    const expiryMinutes = Number.isFinite(requestedExpiry) ? Math.max(15, Math.min(1440, requestedExpiry)) : 60;
    const expiry = new Date(Date.now() + expiryMinutes * 60000);
    const result = await pool.query(
      `INSERT INTO public_notices
        (title_en,title_np,content_en,content_np,target_ward,target_municipality,priority,source,status,evidence_summary,expires_at,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ai','draft',$8::jsonb,$9,$10)
       RETURNING id,title_en,title_np,content_en,content_np,target_ward,target_municipality,priority,source,status,evidence_summary,expires_at,created_at`,
      [generated.title_en, generated.title_np, generated.content_en, generated.content_np, ward, municipality,
        Number.isInteger(Number(body.priority)) && Number(body.priority) >= 1 && Number(body.priority) <= 4 ? Number(body.priority) : 2,
        JSON.stringify(summary), expiry.toISOString(), request.user.id]
    );
    await addAudit(request.user.id, "public_notice.ai_draft", "PublicNotice", result.rows[0].id, summary);
    return reply.code(201).send({ notice: result.rows[0], requires_human_approval: true });
  });

  app.post("/api/v1/notices/:id/publish", { preHandler: requireAuth }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    if (!adminOnly(request, reply)) return;
    const result = await pool.query(
      `UPDATE public_notices SET status='published', published_by=$2, updated_at=now()
       WHERE id=$1 AND status='draft' AND expires_at > now()
       RETURNING id,title_en,title_np,content_en,content_np,target_ward,target_municipality,priority,source,status,expires_at,created_at`,
      [request.params.id, request.user.id]
    );
    if (!result.rowCount) return reply.code(404).send({ error: "An active draft notice was not found." });
    await addAudit(request.user.id, "public_notice.publish_ai_draft", "PublicNotice", request.params.id);
    return { notice: result.rows[0] };
  });
}
