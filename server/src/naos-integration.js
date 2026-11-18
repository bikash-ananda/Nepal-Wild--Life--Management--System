import { createHash, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import path from "node:path";
import { addAudit, mediaRoot } from "./db.js";
import { createRecord, getRecord } from "./records.js";
import { routeReportToOfficers } from "./report-routing.js";
import { savePartnerUpload } from "./media.js";

const CLIENT_ID = "naos";
const REF_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPORT_TYPES = new Set(["wildlife_sighting", "crop_damage", "livestock_attack", "human_encounter", "other"]);

function fail(reply, status, error, message) {
  return reply.code(status).send({ error, message });
}

function safeTokenMatch(token, expectedHash) {
  if (!token || !/^[a-f0-9]{64}$/i.test(expectedHash || "")) return false;
  const actual = createHash("sha256").update(token).digest();
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function requireNaosService(request, reply) {
  const expectedHash = String(process.env.NAOS_PARTNER_TOKEN_SHA256 || "").trim().toLowerCase();
  if (!expectedHash) return fail(reply, 503, "partner_not_configured", "NAOS partner access is not configured on this WLMS server.");
  const authorization = String(request.headers.authorization || "");
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!safeTokenMatch(token, expectedHash)) return fail(reply, 401, "unauthorized", "A valid NAOS service credential is required.");
  request.naosClient = CLIENT_ID;
}

function validRef(value) {
  return typeof value === "string" && REF_PATTERN.test(value);
}

function consentValid(consent) {
  const recorded = Date.parse(consent?.recorded_at || "");
  return consent?.granted === true &&
    consent?.purpose === "wildlife_incident_reporting" &&
    Number.isFinite(recorded) && recorded <= Date.now() + 5 * 60_000 &&
    typeof consent?.policy_version === "string" &&
    consent.policy_version.length > 0 && consent.policy_version.length <= 40;
}

function parseLocation(location) {
  if (!location || !["coarse", "exact"].includes(location.precision)) {
    throw Object.assign(new Error("Choose coarse or exact location precision."), { statusCode: 400 });
  }
  const allowed = new Set(["precision", "zone_ref", "latitude", "longitude", "accuracy_m"]);
  if (Object.keys(location).some((key) => !allowed.has(key))) {
    throw Object.assign(new Error("Unsupported location fields were supplied."), { statusCode: 400 });
  }
  if (location.precision === "coarse") {
    if (location.latitude !== undefined || location.longitude !== undefined) {
      throw Object.assign(new Error("Coarse location must not include exact coordinates."), { statusCode: 400 });
    }
    return { latitude: null, longitude: null, accuracy: null, zone_ref: String(location.zone_ref || "").slice(0, 128) };
  }
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const accuracy = location.accuracy_m == null ? null : Number(location.accuracy_m);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000))) {
    throw Object.assign(new Error("Exact GPS coordinates or accuracy are invalid."), { statusCode: 400 });
  }
  return { latitude, longitude, accuracy, zone_ref: String(location.zone_ref || "").slice(0, 128) };
}

function reportResponse(row, entity) {
  const data = row.data || {};
  return {
    report_id: String(row.id),
    report_type: data.naos_report_type || data.observation_type || data.type || "other",
    status: data.status || data.review_status || (data.verified ? "verified" : "submitted"),
    verification_state: data.verified === true ? "human_verified" : data.review_status === "rejected" ? "rejected" : "unverified",
    occurred_at: data.occurred_at || data.observed_at || data.reported_at || row.created_at,
    updated_at: row.updated_at,
    evidence_count: Array.isArray(data.photos) ? data.photos.length : (data.photo_uri ? 1 : 0),
  };
}

async function activeLink(pool, subjectRef, farmRef) {
  const result = await pool.query(
    "SELECT id, wlms_site_ref FROM naos_reporter_links WHERE naos_subject_ref=$1 AND naos_farm_ref=$2 AND status='active'",
    [subjectRef, farmRef]
  );
  return result.rows[0] || null;
}

function validBodyKeys(body, allowed) {
  return body && typeof body === "object" && !Array.isArray(body) &&
    Object.keys(body).every((key) => allowed.has(key));
}

export function registerNaosIntegrationRoutes(app, pool) {
  const auth = { preHandler: requireNaosService };

  app.post("/api/v1/integrations/naos/reporter-links", auth, async (request, reply) => {
    const body = request.body || {};
    const allowed = new Set(["naos_subject_ref", "naos_farm_ref", "wlms_site_ref", "consent"]);
    if (!validBodyKeys(body, allowed) || !validRef(body.naos_subject_ref) ||
        !validRef(body.naos_farm_ref) || !consentValid(body.consent) ||
        (body.wlms_site_ref != null && !validRef(body.wlms_site_ref))) {
      return fail(reply, 400, "invalid_reporter_link", "Opaque references and explicit wildlife-reporting consent are required.");
    }
    if (body.wlms_site_ref) {
      const site = await getRecord(pool, "Site", body.wlms_site_ref);
      if (!site) return fail(reply, 400, "invalid_site_ref", "The linked WLMS site does not exist.");
    }
    const result = await pool.query(
      `INSERT INTO naos_reporter_links
        (naos_subject_ref,naos_farm_ref,wlms_site_ref,consent_purpose,consent_recorded_at,consent_policy_version,status)
       VALUES ($1,$2,$3,'wildlife_incident_reporting',$4,$5,'active')
       ON CONFLICT (naos_subject_ref,naos_farm_ref) DO UPDATE SET
         wlms_site_ref=EXCLUDED.wlms_site_ref, consent_purpose=EXCLUDED.consent_purpose,
         consent_recorded_at=EXCLUDED.consent_recorded_at, consent_policy_version=EXCLUDED.consent_policy_version,
         status='active', updated_at=now()
       RETURNING id,naos_subject_ref,naos_farm_ref,status,created_at`,
      [body.naos_subject_ref, body.naos_farm_ref, body.wlms_site_ref || null,
        new Date(body.consent.recorded_at).toISOString(), body.consent.policy_version]
    );
    await addAudit(null, "naos.reporter_link.create", "NaosReporterLink", result.rows[0].id, { client_id: CLIENT_ID });
    return reply.code(201).send({
      link_id: String(result.rows[0].id),
      naos_subject_ref: result.rows[0].naos_subject_ref,
      naos_farm_ref: result.rows[0].naos_farm_ref,
      status: result.rows[0].status,
      created_at: result.rows[0].created_at,
    });
  });

  app.delete("/api/v1/integrations/naos/reporter-links", auth, async (request, reply) => {
    const subjectRef = String(request.query?.subject_ref || "");
    const farmRef = String(request.query?.farm_ref || "");
    if (!validRef(subjectRef) || !validRef(farmRef)) return fail(reply, 400, "invalid_reference", "Valid subject_ref and farm_ref are required.");
    const result = await pool.query(
      "UPDATE naos_reporter_links SET status='revoked', updated_at=now() WHERE naos_subject_ref=$1 AND naos_farm_ref=$2 AND status='active' RETURNING id",
      [subjectRef, farmRef]
    );
    await addAudit(null, "naos.reporter_link.revoke", "NaosReporterLink", result.rows[0]?.id || null, { client_id: CLIENT_ID });
    return { revoked: result.rowCount > 0 };
  });

  app.post("/api/v1/integrations/naos/media", auth, async (request, reply) => {
    const subjectRef = String(request.headers["x-naos-subject-ref"] || "");
    const farmRef = String(request.headers["x-naos-farm-ref"] || "");
    if (!validRef(subjectRef) || !validRef(farmRef)) return fail(reply, 400, "invalid_reference", "NAOS subject and farm reference headers are required.");
    if (request.headers["x-naos-evidence-consent"] !== "true") return fail(reply, 400, "evidence_consent_required", "Explicit consent is required before uploading evidence.");
    const link = await activeLink(pool, subjectRef, farmRef);
    if (!link) return fail(reply, 403, "reporter_link_required", "An active consented NAOS farmer/farm link is required.");
    const uploaded = await savePartnerUpload(request, pool);
    await pool.query(
      "INSERT INTO naos_evidence_links (media_id,naos_subject_ref,naos_farm_ref) VALUES ($1,$2,$3)",
      [uploaded.id, subjectRef, farmRef]
    );
    await addAudit(null, "naos.evidence.upload", "MediaAsset", uploaded.id, {
      client_id: CLIENT_ID, naos_farm_ref: farmRef, content_type: String(request.headers["content-type"] || "").slice(0, 80),
    });
    return reply.code(201).send({
      media_id: uploaded.id, file_uri: uploaded.file_uri, size_bytes: uploaded.size_bytes,
    });
  });

  app.post("/api/v1/integrations/naos/reports", auth, async (request, reply) => {
    const body = request.body || {};
    const allowed = new Set([
      "naos_subject_ref", "naos_farm_ref", "report_type", "species_ref", "occurred_at",
      "location", "description", "damage_summary", "crop_type", "livestock_type",
      "estimated_loss_npr", "evidence_media_ids",
    ]);
    if (!validBodyKeys(body, allowed) || !validRef(body.naos_subject_ref) ||
        !validRef(body.naos_farm_ref) || !REPORT_TYPES.has(body.report_type) ||
        typeof body.description !== "string" || body.description.trim().length < 5 ||
        body.description.length > 2000) {
      return fail(reply, 400, "invalid_report", "Report type, opaque farmer/farm references, and a 5–2000 character description are required.");
    }
    const occurredAt = new Date(body.occurred_at || "");
    if (!Number.isFinite(occurredAt.getTime()) || occurredAt.getTime() > Date.now() + 5 * 60_000) {
      return fail(reply, 400, "invalid_occurred_at", "The incident date and time are invalid.");
    }
    let location;
    try { location = parseLocation(body.location); }
    catch (error) { return fail(reply, error.statusCode || 400, "invalid_location", error.message); }
    const link = await activeLink(pool, body.naos_subject_ref, body.naos_farm_ref);
    if (!link) return fail(reply, 403, "reporter_link_required", "An active consented NAOS farmer/farm link is required.");
    const idempotencyKey = String(request.headers["idempotency-key"] || "");
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) return fail(reply, 400, "idempotency_key_required", "A valid Idempotency-Key header is required.");
    const requestHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
    const reservation = await pool.query(
      "INSERT INTO naos_partner_idempotency (client_id,idempotency_key,request_hash) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING idempotency_key",
      [CLIENT_ID, idempotencyKey, requestHash]
    );
    if (!reservation.rowCount) {
      const previous = await pool.query(
        "SELECT request_hash,response_json FROM naos_partner_idempotency WHERE client_id=$1 AND idempotency_key=$2",
        [CLIENT_ID, idempotencyKey]
      );
      if (!previous.rowCount || previous.rows[0].request_hash !== requestHash) {
        return fail(reply, 409, "idempotency_conflict", "This idempotency key was already used for a different report.");
      }
      if (!previous.rows[0].response_json) return fail(reply, 409, "submission_processing", "This report submission is already being processed; retry shortly.");
      return reply.code(200).send({ ...previous.rows[0].response_json, duplicate: true });
    }

    try {
      const mediaIds = Array.isArray(body.evidence_media_ids) ? body.evidence_media_ids : [];
      if (mediaIds.length > 5 || mediaIds.some((id) => !UUID_PATTERN.test(String(id)))) {
        throw Object.assign(new Error("Provide no more than five valid evidence media IDs."), { statusCode: 400 });
      }
      const evidence = mediaIds.length ? await pool.query(
        "SELECT media_id FROM naos_evidence_links WHERE media_id = ANY($1::uuid[]) AND naos_subject_ref=$2 AND naos_farm_ref=$3 AND report_id IS NULL",
        [mediaIds, body.naos_subject_ref, body.naos_farm_ref]
      ) : { rows: [] };
      if (evidence.rows.length !== mediaIds.length) {
        throw Object.assign(new Error("One or more evidence files are not available to this linked farm."), { statusCode: 403 });
      }
      if (link.wlms_site_ref && !await getRecord(pool, "Site", link.wlms_site_ref)) {
        throw Object.assign(new Error("The linked WLMS site is no longer available."), { statusCode: 409 });
      }

      const common = {
        naos_submission_id: idempotencyKey,
        naos_subject_ref: body.naos_subject_ref,
        naos_farm_ref: body.naos_farm_ref,
        naos_report_type: body.report_type,
        source: "naos_partner",
        description: body.description.trim(),
        occurred_at: occurredAt.toISOString(),
        latitude: location.latitude,
        longitude: location.longitude,
        location_accuracy_m: location.accuracy,
        location_precision: body.location.precision,
        location_zone_ref: location.zone_ref,
        photos: mediaIds.map((id) => "media://" + id),
        is_demo: false,
        review_status: "pending",
      };
      if (link.wlms_site_ref) common.site_id = link.wlms_site_ref;

      let entity;
      let record;
      if (body.report_type === "wildlife_sighting") {
        entity = "WildlifeObservation";
        record = await createRecord(pool, entity, {
          ...common,
          capture_id: "naos:" + idempotencyKey,
          observation_id: "NAOS-" + idempotencyKey.slice(0, 24),
          observation_type: "wildlife_sighting",
          species: body.species_ref || "",
          species_name: "Unverified",
          verified: false,
          observed_at: occurredAt.toISOString(),
          media_asset_id: mediaIds[0] || null,
          visibility: link.wlms_site_ref ? "site" : "reviewer_only",
        });
        if (mediaIds.length) {
          await createRecord(pool, "VerificationSample", {
            capture_id: "naos:" + idempotencyKey,
            observation_id: record.id,
            image_uri: "media://" + mediaIds[0],
            image_url: "/api/media/" + mediaIds[0],
            species_name: "Unverified",
            status: "pending",
            source: "naos_partner_capture",
            captured_at: occurredAt.toISOString(),
            site_id: link.wlms_site_ref || "",
            visibility: link.wlms_site_ref ? "site" : "reviewer_only",
          });
        }
      } else if (["crop_damage", "livestock_attack"].includes(body.report_type)) {
        entity = "HwcCase";
        record = await createRecord(pool, entity, {
          ...common,
          case_number: "NAOS-" + idempotencyKey.slice(0, 12).toUpperCase(),
          status: "pending_review",
          loss_type: body.report_type === "crop_damage" ? "crop" : "livestock",
          crop_type: String(body.crop_type || "").slice(0, 120),
          livestock_type: String(body.livestock_type || "").slice(0, 120),
          estimated_loss_npr: body.estimated_loss_npr == null ? null : Number(body.estimated_loss_npr),
          reporter_name: "NAOS farmer",
          visibility: "reviewer_only",
        });
      } else {
        entity = "Incident";
        record = await createRecord(pool, entity, {
          ...common,
          incident_id: "NAOS-" + idempotencyKey.slice(0, 12).toUpperCase(),
          type: body.report_type === "human_encounter" ? "wildlife_conflict" : "other",
          severity: body.report_type === "human_encounter" ? "high" : "medium",
          status: "reported",
          reporter_name: "NAOS farmer",
          visibility: link.wlms_site_ref ? "site" : "reviewer_only",
        });
      }

      if (mediaIds.length) {
        await pool.query(
          "UPDATE naos_evidence_links SET report_id=$1 WHERE media_id=ANY($2::uuid[]) AND report_id IS NULL",
          [record.id, mediaIds]
        );
      }
      let officeRouting = { routed: 0, reason: "not_applicable" };
      if (["Incident", "HwcCase"].includes(entity)) {
        try {
          officeRouting = await routeReportToOfficers(pool, entity, record, { id: null }, createRecord);
        } catch { officeRouting = { routed: 0, reason: "routing_failed" }; }
      }
      const response = {
        report_id: String(record.id), entity, status: record.status || record.review_status || "submitted",
        verification_state: "unverified", evidence_count: mediaIds.length,
        created_at: record.created_date || new Date().toISOString(), office_routing: officeRouting,
      };
      await pool.query(
        "UPDATE naos_partner_idempotency SET response_json=$3::jsonb WHERE client_id=$1 AND idempotency_key=$2",
        [CLIENT_ID, idempotencyKey, JSON.stringify(response)]
      );
      await addAudit(null, "naos.report.create", entity, record.id, {
        client_id: CLIENT_ID, naos_farm_ref: body.naos_farm_ref, report_type: body.report_type,
        evidence_count: mediaIds.length,
      });
      return reply.code(201).send(response);
    } catch (error) {
      await pool.query("DELETE FROM naos_partner_idempotency WHERE client_id=$1 AND idempotency_key=$2 AND response_json IS NULL", [CLIENT_ID, idempotencyKey]).catch(() => {});
      return fail(reply, error.statusCode || 500, "report_submission_failed",
        error.statusCode ? error.message : "WLMS could not accept the report. Please retry using the same idempotency key.");
    }
  });

  app.get("/api/v1/integrations/naos/reports", auth, async (request, reply) => {
    const subjectRef = String(request.query?.subject_ref || "");
    const farmRef = String(request.query?.farm_ref || "");
    if (!validRef(subjectRef) || !validRef(farmRef)) return fail(reply, 400, "invalid_reference", "subject_ref and farm_ref are required.");
    if (!await activeLink(pool, subjectRef, farmRef)) return fail(reply, 403, "reporter_link_required", "An active consented NAOS farmer/farm link is required.");
    const result = await pool.query(
      "SELECT id,data,created_at,updated_at FROM app_records WHERE entity = ANY($1::text[]) AND data->>'naos_subject_ref'=$2 AND data->>'naos_farm_ref'=$3 ORDER BY created_at DESC LIMIT 100",
      [["Incident", "HwcCase", "WildlifeObservation"], subjectRef, farmRef]
    );
    return { items: result.rows.map((row) => reportResponse(row)) };
  });

  app.get("/api/v1/integrations/naos/reports/:reportId", auth, async (request, reply) => {
    const subjectRef = String(request.query?.subject_ref || "");
    const farmRef = String(request.query?.farm_ref || "");
    if (!validRef(subjectRef) || !validRef(farmRef)) return fail(reply, 400, "invalid_reference", "subject_ref and farm_ref are required.");
    if (!await activeLink(pool, subjectRef, farmRef)) return fail(reply, 403, "reporter_link_required", "An active consented NAOS farmer/farm link is required.");
    const result = await pool.query(
      "SELECT id,data,created_at,updated_at FROM app_records WHERE id=$1 AND entity = ANY($2::text[]) AND data->>'naos_subject_ref'=$3 AND data->>'naos_farm_ref'=$4",
      [request.params.reportId, ["Incident", "HwcCase", "WildlifeObservation"], subjectRef, farmRef]
    );
    if (!result.rowCount) return fail(reply, 404, "not_found", "Report not found.");
    return reportResponse(result.rows[0]);
  });

  app.get("/api/v1/integrations/naos/media/:mediaId", auth, async (request, reply) => {
    const subjectRef = String(request.query?.subject_ref || "");
    const farmRef = String(request.query?.farm_ref || "");
    if (!validRef(subjectRef) || !validRef(farmRef) || !UUID_PATTERN.test(request.params.mediaId)) {
      return fail(reply, 400, "invalid_reference", "Valid media ID, subject_ref and farm_ref are required.");
    }
    if (!await activeLink(pool, subjectRef, farmRef)) return fail(reply, 403, "reporter_link_required", "An active consented NAOS farmer/farm link is required.");
    const linked = await pool.query(
      "SELECT m.storage_key,m.content_type FROM naos_evidence_links e JOIN media_assets m ON m.id=e.media_id WHERE e.media_id=$1 AND e.naos_subject_ref=$2 AND e.naos_farm_ref=$3 AND e.report_id IS NOT NULL",
      [request.params.mediaId, subjectRef, farmRef]
    );
    if (!linked.rowCount) return fail(reply, 404, "not_found", "Evidence file not found.");
    reply.header("Cache-Control", "private, no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.type(linked.rows[0].content_type);
    return reply.send(createReadStream(path.join(mediaRoot, path.basename(linked.rows[0].storage_key))));
  });
}
