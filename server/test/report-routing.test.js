import test from "node:test";
import assert from "node:assert/strict";
import { prepareOfficeAlerts, routeReportToOfficers } from "../src/report-routing.js";

const reporter = { id: "reporter-1", role: "community_reporter" };

test("office alerts only target active same-site authorized officers and omit report details", () => {
  const report = {
    id: "incident-1", site_id: "site-1", type: "wildlife_conflict", severity: "high",
    description: "Sensitive household details", latitude: 27.7, longitude: 85.3,
  };
  const alerts = prepareOfficeAlerts("Incident", report, reporter, [
    { id: "reporter-1", role: "community_reporter", site_ids: ["site-1"] },
    { id: "officer-1", role: "field_officer", site_ids: ["site-1"] },
    { id: "officer-2", role: "government_officer", site_ids: ["site-2"] },
    { id: "viewer-1", role: "reviewer", site_ids: ["site-1"] },
  ]);

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].recipient_user_id, "officer-1");
  assert.equal(alerts[0].url, "/incidents/incident-1");
  assert.equal(alerts[0].site_id, "site-1");
  assert.doesNotMatch(JSON.stringify(alerts[0]), /Sensitive household details|27\.7|85\.3/);
});

test("routing creates one in-app alert per eligible officer and does not query without a site", async () => {
  let queryCount = 0;
  const created = [];
  const pool = { async query(sql, params) {
    queryCount += 1;
    assert.match(sql, /status = 'active'/);
    assert.deepEqual(params[0], "site-1");
    return { rows: [{ id: "officer-1", role: "field_officer", site_ids: ["site-1"] }] };
  } };
  const createAlert = async (_pool, entity, data) => created.push({ entity, data });

  const skipped = await routeReportToOfficers(pool, "Incident", { id: "i-2" }, reporter, createAlert);
  assert.deepEqual(skipped, { routed: 0, reason: "site_not_selected" });
  assert.equal(queryCount, 0);

  const result = await routeReportToOfficers(pool, "Incident", { id: "i-1", site_id: "site-1", type: "poaching" }, reporter, createAlert);
  assert.deepEqual(result, { routed: 1, reason: "site_officers_notified_in_app" });
  assert.equal(queryCount, 1);
  assert.equal(created[0].entity, "Alert");
  assert.equal(created[0].data.recipient_user_id, "officer-1");
});
