import assert from "node:assert/strict";
import test from "node:test";
import { canChangeRecordSite, canReadRecord, listRecords, matchesValue, normalizeLocationFields, validateFilter } from "../src/records.js";

test("valid coordinates and GPS accuracy are normalized to numbers", () => {
  assert.deepEqual(normalizeLocationFields({ latitude: "28.2096", longitude: "83.9856", location_accuracy_m: 18 }), {
    latitude: 28.2096, longitude: 83.9856, location_accuracy_m: 18,
  });
});

test("manual reports may omit coordinates", () => {
  assert.deepEqual(normalizeLocationFields({ location_name: "Ward 21" }), { location_name: "Ward 21" });
});

test("partial or out-of-range coordinates are rejected", () => {
  assert.throws(() => normalizeLocationFields({ latitude: 28.2 }), { statusCode: 400 });
  assert.throws(() => normalizeLocationFields({ latitude: 91, longitude: 83.9 }), { statusCode: 400 });
  assert.throws(() => normalizeLocationFields({ latitude: 28.2, longitude: -181 }), { statusCode: 400 });
});

test("invalid GPS accuracy is rejected", () => {
  assert.throws(() => normalizeLocationFields({ latitude: 28.2, longitude: 83.9, location_accuracy_m: -1 }), { statusCode: 400 });
  assert.throws(() => normalizeLocationFields({ location_accuracy_m: 20 }), { statusCode: 400 });
});

test("site-scoped users cannot clear or move an existing site assignment", () => {
  const user = { role: "field_worker", site_ids: ["site-a"] };
  const current = { site_id: "site-a" };
  assert.equal(canChangeRecordSite(user, current, { description: "updated" }), true);
  assert.equal(canChangeRecordSite(user, current, { site_id: "site-a" }), true);
  assert.equal(canChangeRecordSite(user, current, { site_id: null }), false);
  assert.equal(canChangeRecordSite(user, current, { site_id: "site-b" }), false);
});

test("administrators and researchers may reassign records between sites", () => {
  for (const role of ["admin", "researcher"]) {
    assert.equal(canChangeRecordSite({ role, site_ids: [] }, { site_id: "site-a" }, { site_id: "site-b" }), true);
  }
});
test("site-scoped users can only list or open their assigned site records", () => {
  const siteA = { id: "site-a", name: "Assigned site" };
  const siteB = { id: "site-b", name: "Other site" };
  const user = { id: "field-user", role: "field_worker", site_ids: ["site-a"] };
  assert.equal(canReadRecord(user, "Site", siteA), true);
  assert.equal(canReadRecord(user, "Site", siteB), false);
  assert.equal(canReadRecord({ ...user, role: "admin" }, "Site", siteB), true);
  assert.equal(canReadRecord(user, "Incident", { id: "incident", site_id: "site-a" }), true);
});
test("unscoped privileged records are limited to their authorized roles", () => {
  const fieldUser = { id: "field-user", role: "field_worker", site_ids: ["site-a"] };
  assert.equal(canReadRecord(fieldUser, "NotificationContact", { id: "contact-1" }), false);
  assert.equal(canReadRecord(fieldUser, "NotificationContact", { id: "contact-2", site_id: "site-a" }), true);
  assert.equal(canReadRecord({ ...fieldUser, role: "technician" }, "AIModel", { id: "model-1" }), true);
  assert.equal(canReadRecord({ ...fieldUser, role: "technician" }, "TrainingJob", { id: "job-1" }), false);
  assert.equal(canReadRecord({ ...fieldUser, role: "reviewer" }, "VerificationSample", { id: "sample-1" }), true);
});
test("unscoped privileged rows are excluded in SQL before pagination", async () => {
  let queryText;
  const pool = { async query(sql) { queryText = sql; return { rows: [] }; } };
  await listRecords(pool, "NotificationContact", {}, { limit: 3 }, { id: "field-user", role: "field_worker", site_ids: ["site-a"] });
  assert.match(queryText, /NULLIF\(data->>'site_id', ''\) IS NOT NULL/);
});
test("unassigned reports and exact-location records are visible only to their owner or review roles", () => {
  const fieldUser = { id: "field-user", role: "field_worker", site_ids: ["site-a"] };
  const report = { id: "incident-1", reported_by: "field-user" };
  assert.equal(canReadRecord(fieldUser, "Incident", report), true);
  assert.equal(canReadRecord({ ...fieldUser, id: "other-user" }, "Incident", report), false);
  assert.equal(canReadRecord({ ...fieldUser, role: "reviewer" }, "Incident", report), true);
  assert.equal(canReadRecord(fieldUser, "WildlifeObservation", { id: "sighting-1", latitude: 27.7, longitude: 85.3, __created_by: "field-user" }), true);
  assert.equal(canReadRecord(fieldUser, "WildlifeObservation", { id: "sighting-2", latitude: 27.7, longitude: 85.3, __created_by: "other-user" }), false);
  assert.equal(canReadRecord(fieldUser, "Incident", { id: "incident-2", site_id: "site-b", reported_by: "field-user" }), false);
});
test("unfiltered common lists paginate and sort in PostgreSQL", async () => {
  let queryText;
  let queryParams;
  const pool = { async query(sql, params) {
    queryText = sql;
    queryParams = params;
    return { rows: [
      { id: "incident-3", data: { type: "poaching", created_date: "2026-02-03T00:00:00.000Z" }, created_at: "2026-02-03T00:00:00.000Z", updated_at: "2026-02-03T00:00:00.000Z" },
      { id: "incident-2", data: { type: "injured_wildlife", created_date: "2026-02-02T00:00:00.000Z" }, created_at: "2026-02-02T00:00:00.000Z", updated_at: "2026-02-02T00:00:00.000Z" },
    ] };
  } };

  const rows = await listRecords(pool, "Incident", {}, { sort: "-created_date", limit: 2, offset: 4 }, { role: "admin", id: "admin-1", site_ids: [] });
  assert.match(queryText, /ORDER BY COALESCE\(data->>'created_date'/);
  assert.match(queryText, /LIMIT \$2 OFFSET \$3$/);
  assert.deepEqual(queryParams, ["Incident", 2, 4]);
  assert.deepEqual(rows.map((record) => record.id), ["incident-3", "incident-2"]);
});
test("database pagination applies site and recipient restrictions before limiting", async () => {
  let queryText;
  let queryParams;
  const pool = { async query(sql, params) {
    queryText = sql;
    queryParams = params;
    return { rows: [
      { id: "alert-a", data: { site_id: "site-a", recipient_user_id: "officer-a" }, created_at: "2026-02-03T00:00:00.000Z", updated_at: "2026-02-03T00:00:00.000Z" },
      { id: "alert-b", data: { site_id: "site-b", recipient_user_id: "officer-a" }, created_at: "2026-02-02T00:00:00.000Z", updated_at: "2026-02-02T00:00:00.000Z" },
    ] };
  } };
  const rows = await listRecords(pool, "Alert", {}, { sort: "-created_date", limit: 1 }, { id: "officer-a", role: "field_officer", site_ids: ["site-a"] });
  assert.match(queryText, /recipient_user_id/);
  assert.match(queryText, /site_id/);
  assert.deepEqual(queryParams, ["Alert", "officer-a", false, ["site-a"], 1, 0]);
  assert.deepEqual(rows.map((record) => record.id), ["alert-a"]);
});
test("record filters reject excessive complexity and unsupported operators", () => {
  assert.throws(() => validateFilter({ name: { $unknown: "x" } }), { statusCode: 400 });
  assert.throws(() => validateFilter({ name: { $regex: "x".repeat(129) } }), { statusCode: 400 });
  assert.throws(() => validateFilter({ name: { $in: Array(51).fill("x") } }), { statusCode: 400 });
});

test("record filters accept bounded literal search", () => {
  assert.deepEqual(validateFilter({ species: { $regex: "macaque", $options: "i" } }), { species: { $regex: "macaque", $options: "i" } });
});
test("literal search is case-insensitive and does not execute regular expressions", () => {
  assert.equal(matchesValue("Rhesus macaque near field", { $regex: "MACAQUE", $options: "i" }), true);
  assert.equal(matchesValue("aaaaaa!", { $regex: "(a+)+$" }), false);
});
