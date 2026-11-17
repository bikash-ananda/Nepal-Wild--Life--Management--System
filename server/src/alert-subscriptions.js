import { addAudit } from "./db.js";

const allowedChannels = new Set(["email", "sms", "whatsapp_message", "whatsapp_call"]);
const allowedRisks = new Set(["crop", "livestock", "elephant", "rhino", "tiger", "leopard", "monkey", "other"]);

export function normalizePhone(value) {
  return String(value || "").replace(/[\s()-]/g, "").slice(0, 24);
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

export function validateCoordinates(latitudeValue, longitudeValue) {
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw Object.assign(new Error("A valid farm latitude and longitude are required for location-based alerts."), { statusCode: 400 });
  }
  return { latitude, longitude };
}

function requireAdmin(request, reply) {
  if (request.user?.role !== "admin") {
    reply.code(403).send({ error: "Administrator access is required." });
    return false;
  }
  return true;
}

export function registerAlertSubscriptionRoutes(app, pool, requireAuth, checkOrigin) {
  app.post("/api/public/alert-subscriptions", {
    config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    const body = request.body || {};
    const name = String(body.name || "").trim().slice(0, 120);
    const phone = normalizePhone(body.phone);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
    const province = String(body.province || "").trim().slice(0, 100);
    const district = String(body.district || "").trim().slice(0, 100);
    const municipality = String(body.municipality || "").trim().slice(0, 120);
    const ward = String(body.ward || "").trim().slice(0, 20);
    if (!phone && !email) return reply.code(400).send({ error: "Provide a phone number or email address." });
    if (phone && !/^\+?[0-9]{7,18}$/.test(phone)) return reply.code(400).send({ error: "Enter a valid phone number." });
    if (email && !validEmail(email)) return reply.code(400).send({ error: "Enter a valid email address." });
    const channels = [...new Set(Array.isArray(body.channels) ? body.channels.map(String) : [])];
    if (!channels.length || channels.some((channel) => !allowedChannels.has(channel))) {
      return reply.code(400).send({ error: "Select at least one supported alert channel." });
    }
    if (channels.includes("email") && !email) return reply.code(400).send({ error: "An email address is required for email alerts." });
    if (channels.some((channel) => ["sms", "whatsapp_message", "whatsapp_call"].includes(channel)) && !phone) {
      return reply.code(400).send({ error: "A phone number is required for the selected phone channels." });
    }
    if (body.location_consent !== true) return reply.code(400).send({ error: "Explicit farm-location consent is required." });
    const { latitude, longitude } = validateCoordinates(body.latitude, body.longitude);
    const accuracy = body.location_accuracy_m == null ? null : Number(body.location_accuracy_m);
    if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000)) {
      return reply.code(400).send({ error: "Location accuracy is invalid." });
    }
    const risks = [...new Set(Array.isArray(body.risks) ? body.risks.map(String) : [])];
    if (risks.some((risk) => !allowedRisks.has(risk))) return reply.code(400).send({ error: "One or more wildlife risk preferences are invalid." });
    const language = ["ne", "en"].includes(String(body.language)) ? String(body.language) : "ne";
    const consentVersion = String(body.consent_text_version || "wlms-farmer-alert-consent-v1").slice(0, 80);
    const locationSource = body.location_source === "gps" ? "gps" : "manual";
    const result = await pool.query(
      `INSERT INTO alert_subscriptions
        (name, phone, email, province, district, municipality, ward, farm_latitude, farm_longitude,
         location_accuracy_m, location_source, location_consent_at, channel_consents, risk_preferences,
         preferred_language, consent_text_version, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),$12::jsonb,$13::text[],$14,$15,'pending_verification')
       RETURNING id, status, created_at`,
      [
        name, phone || null, email || null, province, district, municipality, ward,
        latitude, longitude, accuracy, locationSource,
        JSON.stringify(Object.fromEntries(channels.map((channel) => [channel, { consented: true, consented_at: new Date().toISOString() }]))),
        risks, language, consentVersion,
      ]
    );
    await addAudit(null, "alert_subscription.created", "AlertSubscription", result.rows[0].id, {
      channels, risk_count: risks.length, location_source: locationSource,
    });
    return reply.code(201).send({
      subscription_id: result.rows[0].id,
      status: result.rows[0].status,
      message: "Your preferences have been received. Contact verification and provider setup are required before alerts can be delivered.",
    });
  });

  app.get("/api/admin/alert-subscriptions", { preHandler: requireAuth }, async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const requestedLimit = Number.parseInt(request.query?.limit || "50", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50;
    const result = await pool.query(
      `SELECT id, name, phone, email, province, district, municipality, ward,
              farm_latitude, farm_longitude, location_accuracy_m, location_source,
              channel_consents, risk_preferences, preferred_language, status,
              created_at, updated_at
       FROM alert_subscriptions ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return { subscriptions: result.rows };
  });
}
