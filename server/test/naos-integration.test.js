import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import Fastify from "fastify";
import test, { after, before } from "node:test";

const token = "naos-test-token-".padEnd(48, "x");
process.env.NAOS_PARTNER_TOKEN_SHA256 = createHash("sha256").update(token).digest("hex");

const { registerNaosIntegrationRoutes, parseLocation } = await import("../src/naos-integration.js");
let app;
const pool = {
  async query(sql) {
    if (sql.includes("FROM naos_reporter_links")) return { rows: [] };
    return { rows: [], rowCount: 0 };
  },
};

before(async () => {
  app = Fastify();
  registerNaosIntegrationRoutes(app, pool);
  await app.ready();
});

after(async () => { await app.close(); });

const request = (method, url, payload, headers = {}) => app.inject({
  method, url, payload, headers: { authorization: `Bearer ${token}`, ...headers },
});

test("partner routes reject missing and invalid service credentials", async () => {
  const missing = await app.inject({ method: "GET", url: "/api/v1/integrations/naos/reports?subject_ref=subject-0001&farm_ref=farm-000001" });
  assert.equal(missing.statusCode, 401);
  const invalid = await app.inject({
    method: "GET", url: "/api/v1/integrations/naos/reports?subject_ref=subject-0001&farm_ref=farm-000001",
    headers: { authorization: "Bearer incorrect-token" },
  });
  assert.equal(invalid.statusCode, 401);
});

test("reporter link requires opaque references and purpose-bound consent", async () => {
  const noConsent = await request("POST", "/api/v1/integrations/naos/reporter-links", {
    naos_subject_ref: "subject-0001", naos_farm_ref: "farm-000001",
  });
  assert.equal(noConsent.statusCode, 400);
  const pii = await request("POST", "/api/v1/integrations/naos/reporter-links", {
    naos_subject_ref: "subject-0001", naos_farm_ref: "farm-000001",
    farmer_email: "farmer@example.com",
    consent: { granted: true, purpose: "wildlife_incident_reporting", recorded_at: new Date().toISOString(), policy_version: "v1" },
  });
  assert.equal(pii.statusCode, 400);
});

test("evidence upload requires explicit evidence consent and active farm link", async () => {
  const noConsent = await request("POST", "/api/v1/integrations/naos/media", null, {
    "x-naos-subject-ref": "subject-0001", "x-naos-farm-ref": "farm-000001",
  });
  assert.equal(noConsent.statusCode, 400);
  const noLink = await request("POST", "/api/v1/integrations/naos/media", null, {
    "x-naos-subject-ref": "subject-0001", "x-naos-farm-ref": "farm-000001",
    "x-naos-evidence-consent": "true",
  });
  assert.equal(noLink.statusCode, 403);
});

test("report rejects direct personal data and unsupported fields", async () => {
  const response = await request("POST", "/api/v1/integrations/naos/reports", {
    naos_subject_ref: "subject-0001", naos_farm_ref: "farm-000001",
    report_type: "wildlife_sighting", occurred_at: new Date().toISOString(),
    location: { precision: "coarse", zone_ref: "zone-ward-1" },
    description: "Animal seen near the field.",
    reporter_phone: "9800000000",
  }, { "idempotency-key": "naos-report-0001" });
  assert.equal(response.statusCode, 400);
});

test("coarse location rejects exact coordinates", () => {
  assert.throws(() => parseLocation({ precision: "coarse", latitude: 28.2, longitude: 83.9 }), { statusCode: 400 });
});

test("exact location validates both coordinates and accuracy", () => {
  assert.deepEqual(parseLocation({ precision: "exact", latitude: 28.2, longitude: 83.9, accuracy_m: 15 }), {
    latitude: 28.2, longitude: 83.9, accuracy: 15, zone_ref: "",
  });
  assert.throws(() => parseLocation({ precision: "exact", latitude: 28.2 }), { statusCode: 400 });
});
