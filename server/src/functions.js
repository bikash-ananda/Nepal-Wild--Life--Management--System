import { createRecord, getRecord, listRecords, updateRecord, canReadSite } from "./records.js";
import { mediaIdFromUri } from "./media.js";
import { enqueueSitePush } from "./notifications.js";

const monkeyLabels = new Set(["monkey", "macaque", "rhesus macaque", "rhesus monkey"]);

async function notifyVerifiedMonkey(pool, sample, observation, label, user) {
  if (!observation?.site_id || !monkeyLabels.has(String(label).trim().toLowerCase())) return null;
  let alert;
  try {
    alert = await createRecord(pool, "Alert", {
      verification_sample_id: sample.id,
      observation_id: observation.id,
      title: "Reviewer-confirmed monkey sighting",
      species_name: label,
      site_id: String(observation.site_id),
      site_name: String(observation.site_name || "Research site"),
      status: "verified",
      acknowledged: false,
      triggered_at: new Date().toISOString(),
      is_demo: false,
    }, user.id);
  } catch (error) {
    if (error.code !== "23505") throw error;
    const previous = await pool.query(
      "SELECT id, data FROM app_records WHERE entity = 'Alert' AND data->>'verification_sample_id' = $1 LIMIT 1",
      [sample.id]
    );
    alert = previous.rowCount ? { ...previous.rows[0].data, id: previous.rows[0].id } : null;
  }
  if (!alert) return null;
  const delivery = await enqueueSitePush(pool, observation.site_id, "verified-monkey-" + sample.id, {
    title: "Verified monkey sighting",
    body: "A reviewer confirmed monkey activity at a site you follow. Keep a safe distance and check the app for approved local guidance.",
  });
  return { alert, delivery };
}

async function createCapture(pool, body, user, isPublic = false) {
  if (user && !["admin", "researcher", "reviewer", "field_officer", "field_worker", "community_reporter"].includes(user.role)) {
    throw Object.assign(new Error("Your account cannot submit field observations."), { statusCode: 403 });
  }
  const photoUri = String(body.photo_uri || body.file_uri || "");
  const mediaId = mediaIdFromUri(photoUri);
  if (!mediaId) throw Object.assign(new Error("A valid uploaded photo is required."), { statusCode: 400 });
  const media = await pool.query("SELECT id FROM media_assets WHERE id = $1", [mediaId]);
  if (!media.rowCount) throw Object.assign(new Error("Uploaded photo was not found."), { statusCode: 404 });

  const captureId = String(body.capture_id || body.event_id || mediaId);
  if (captureId.length > 180) throw Object.assign(new Error("Capture ID is too long."), { statusCode: 400 });
  const duplicate = await pool.query(
    "SELECT id FROM app_records WHERE entity = 'WildlifeObservation' AND data->>'capture_id' = $1 LIMIT 1",
    [captureId]
  );
  if (duplicate.rowCount) return { observation: { id: duplicate.rows[0].id }, duplicate: true };

  let siteId = isPublic ? "" : String(body.site_id || "");
  if (user && !["admin", "researcher"].includes(user.role)) {
    if (siteId && !(user.site_ids || []).includes(siteId)) {
      throw Object.assign(new Error("You can only submit reports for sites assigned to your account."), { statusCode: 403 });
    }
    if (!siteId && (user.site_ids || []).length === 1) siteId = String(user.site_ids[0]);
  }
  const site = siteId ? await getRecord(pool, "Site", siteId) : null;
  if (siteId && !site) throw Object.assign(new Error("Selected research site was not found."), { statusCode: 404 });
  const visibility = siteId ? "site" : "reviewer_only";

  const observedAt = body.captured_at || new Date().toISOString();
  let observation;
  try {
    observation = await createRecord(pool, "WildlifeObservation", {
    observation_id: "FC-" + captureId.slice(-14).toUpperCase(),
    capture_id: captureId,
    source: isPublic ? "public_mobile_capture" : "field_mobile_capture",
    species: "",
    species_name: "Unverified",
    count: null,
    observation_type: "wildlife_sighting",
    behavior: "",
    latitude: typeof body.latitude === "number" ? body.latitude : null,
    longitude: typeof body.longitude === "number" ? body.longitude : null,
    location_accuracy_m: Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : null,
    location_name: String(body.location_name || ""),
    province: String(body.province || ""),
    district: String(body.district || ""),
    site_id: siteId,
    site_name: String(site?.name || ""),
    plot_id: String(body.plot_id || ""),
    photos: [photoUri],
    media_asset_id: mediaId,
    notes: String(body.notes || "").slice(0, 4000),
    observed_by: user?.id || null,
    observer_name: String(body.submitter_name || user?.full_name || user?.email || "Community Reporter"),
    verified: false,
    review_status: "pending",
    observed_at: observedAt,
    is_demo: false,
    visibility,
    }, user?.id || null);
  } catch (error) {
    if (error.code !== "23505") throw error;
    const existing = await pool.query(
      "SELECT id FROM app_records WHERE entity = 'WildlifeObservation' AND data->>'capture_id' = $1 LIMIT 1",
      [captureId]
    );
    if (!existing.rowCount) throw error;
    return { observation: { id: existing.rows[0].id }, duplicate: true };
  }

  const verification = await createRecord(pool, "VerificationSample", {
    capture_id: captureId,
    observation_id: observation.id,
    image_uri: photoUri,
    image_url: "/api/media/" + mediaId,
    species_name: "Unverified",
    status: "pending",
    source: isPublic ? "public_capture" : "field_capture",
    captured_at: observedAt,
    site_id: siteId,
    site_name: String(site?.name || ""),
    latitude: observation.latitude,
    longitude: observation.longitude,
    visibility,
  }, user?.id || null);

  return {
    observation,
    classification: { species_name: "Unverified", confidence: null, status: "pending_human_review" },
    classifier_source: "human_review_pending",
    escalated: false,
    verification_sample: verification,
    duplicate: false,
  };
}

async function handleVerification(pool, body, user) {
  const action = String(body.action || "");
  if (action === "serveNext" || action === "reviewQueue") {
    const queue = await listRecords(pool, "VerificationSample", { status: "pending" }, {
      sort: "created_date", limit: action === "serveNext" ? 1 : 100,
    }, user);
    const votes = await listRecords(pool, "ClassificationVote", { user_id: user.id }, { limit: 1000 }, user);
    if (action === "serveNext") return { sample: queue[0] || null, queueCount: queue.length, playerStats: { votes: votes.length } };
    const queueWithVotes = await Promise.all(queue.map(async (sample) => {
      const sampleVotes = await listRecords(pool, "ClassificationVote", { sample_id: sample.id }, { limit: 500 }, user);
      const distribution = sampleVotes.reduce((counts, vote) => {
        const label = String(vote.voted_label || "");
        if (label) counts[label] = (counts[label] || 0) + 1;
        return counts;
      }, {});
      const consensus = Object.entries(distribution).sort((a, b) => b[1] - a[1])[0];
      return { ...sample, votes: sampleVotes, consensus_label: sample.consensus_label || consensus?.[0] || "" };
    }));
    return { queue: queueWithVotes };
  }
  if (action === "getPlayerStats") {
    const votes = await listRecords(pool, "ClassificationVote", { user_id: user.id }, { limit: 1000 }, user);
    return { stats: { votes: votes.length, total_points: 0, verified_count: 0, accuracy_pct: 0, current_streak: 0, best_streak: 0, progress: 0 } };
  }
  if (action === "getLeaderboard") return { leaderboard: [] };
  if (action === "submitVote" || action === "vote" || action === "castVote") {
    const sampleId = String(body.sample_id || "");
    const sample = sampleId ? await getRecord(pool, "VerificationSample", sampleId) : null;
    if (!sample) throw Object.assign(new Error("Review sample not found."), { statusCode: 404 });
    if (!canReadSite(user, sample)) throw Object.assign(new Error("Review sample not found."), { statusCode: 404 });
    const votedLabel = String(body.voted_label || body.label || "").trim().slice(0, 120);
    if (!votedLabel) throw Object.assign(new Error("Choose a label before submitting your vote."), { statusCode: 400 });
    const priorVotes = await listRecords(pool, "ClassificationVote", { sample_id: sampleId, user_id: user.id }, { limit: 10 }, user);
    const vote = priorVotes[0]
      ? await updateRecord(pool, "ClassificationVote", priorVotes[0].id, {
          voted_label: votedLabel,
          training_comment: String(body.training_comment || "").slice(0, 2000),
        }, user.id)
      : await createRecord(pool, "ClassificationVote", {
      sample_id: sampleId,
      user_id: user.id,
      voted_label: votedLabel,
      training_comment: String(body.training_comment || "").slice(0, 2000),
      created_at: new Date().toISOString(),
      }, user.id);
    const allVotes = await listRecords(pool, "ClassificationVote", { sample_id: sampleId }, { limit: 500 }, user);
    const counts = allVotes.reduce((map, entry) => {
      map[entry.voted_label] = (map[entry.voted_label] || 0) + 1;
      return map;
    }, {});
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const consensusLabel = top?.[0] || "";
    await updateRecord(pool, "VerificationSample", sampleId, {
      consensus_label: consensusLabel,
      vote_count: allVotes.length,
      consensus_count: top?.[1] || 0,
    }, user.id);
    return { success: true, confirmed: false, pointsAwarded: 0, vote, consensus: { label: consensusLabel, count: top?.[1] || 0, total: allVotes.length, needsExpert: allVotes.length > 1 } };
  }
  if (action === "confirmLabel" || action === "overrideLabel") {
    if (!["admin", "researcher", "reviewer"].includes(user.role)) {
      throw Object.assign(new Error("Reviewer access is required."), { statusCode: 403 });
    }
    const sampleId = String(body.sample_id || "");
    const sample = sampleId ? await getRecord(pool, "VerificationSample", sampleId) : null;
    if (!sample) throw Object.assign(new Error("Review sample not found."), { statusCode: 404 });
    if (!canReadSite(user, sample)) throw Object.assign(new Error("Review sample not found."), { statusCode: 404 });
    const label = String(body.label || sample.consensus_label || "").trim().slice(0, 120);
    if (!label) throw Object.assign(new Error("A review label is required. Choose a consensus label or use the override action."), { statusCode: 400 });
    const updated = await updateRecord(pool, "VerificationSample", sampleId, {
      status: "verified", verified: true, verified_by: user.id,
      verified_at: new Date().toISOString(), verified_label: label,
    }, user.id);
    await updateRecord(pool, "WildlifeObservation", String(sample.observation_id), {
      verified: true, review_status: "verified", species_name: label,
    }, user.id).catch(() => null);
    const observation = sample.observation_id
      ? await getRecord(pool, "WildlifeObservation", String(sample.observation_id))
      : null;
    const alert = await notifyVerifiedMonkey(pool, sample, observation, label, user);
    return { sample: updated, success: true, alert };
  }
  throw Object.assign(new Error("Unsupported verification action."), { statusCode: 400 });
}

export async function handleFunction(pool, name, body, user) {
  if (name === "publicCapture") return createCapture(pool, body, null, true);
  if (!user) throw Object.assign(new Error("Authentication required"), { statusCode: 401 });

  if (name === "fieldCapture") {
    if ((body.action || "processCapture") !== "processCapture") {
      throw Object.assign(new Error("Unsupported field-capture action."), { statusCode: 400 });
    }
    return createCapture(pool, body, user, false);
  }
  if (name === "individualId") {
    return { status: "pending_human_review", matches: [], message: "Automatic individual matching is not configured. Reviewers must compare images manually." };
  }
  if (name === "yoloRetrain") {
    return { status: "not_configured", message: "Model training is not configured. Human-reviewed labels are retained for a later local model." };
  }
  if (name === "flagshipAlert") {
    const alert = await createRecord(pool, "Alert", {
      title: "Wildlife observation requires review",
      species_name: String(body.species_name || "Unknown"),
      location_name: String(body.location || ""),
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      image_url: String(body.image_url || ""),
      status: "pending_review",
      triggered_at: new Date().toISOString(),
      is_demo: false,
    }, user.id);
    return { alert, status: "created" };
  }
  if (name === "verificationGame") return handleVerification(pool, body, user);
  throw Object.assign(new Error("Unknown server function: " + name), { statusCode: 404 });
}

export function registerFunctionRoutes(app, pool, requireAuth, checkOrigin) {
  app.post("/api/functions/:name", async (request, reply) => {
    const name = String(request.params.name);
    if (name !== "publicCapture") {
      await requireAuth(request, reply);
      if (reply.sent) return;
    }
    if (!checkOrigin(request, reply)) return;
    const result = await handleFunction(pool, name, request.body || {}, request.user || null);
    return { data: result, ...result };
  });
}
