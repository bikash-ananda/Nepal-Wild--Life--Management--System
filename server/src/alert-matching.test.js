import test from "node:test";
import assert from "node:assert/strict";
import { haversineDistanceKm, matchActiveAlertSubscriptions } from "./alert-matching.js";

const now = Date.parse("2026-11-17T08:00:00.000Z");
const event = {
  latitude: 28.21,
  longitude: 83.99,
  species: "monkey",
  confidence: 0.91,
  verified: true,
  occurred_at: new Date(now - 10 * 60 * 1000).toISOString(),
  location_accuracy_m: 25,
};

test("haversine distance is zero for the same point and plausible for nearby points", () => {
  assert.equal(haversineDistanceKm(28.21, 83.99, 28.21, 83.99), 0);
  assert.ok(haversineDistanceKm(28.21, 83.99, 28.22, 83.99) > 1);
});

test("only active nearby subscribers with matching risk preferences are returned", () => {
  const result = matchActiveAlertSubscriptions(event, [
    { id: "near", status: "active", farm_latitude: 28.211, farm_longitude: 83.99, risk_preferences: ["monkey"] },
    { id: "wrong-risk", status: "active", farm_latitude: 28.211, farm_longitude: 83.99, risk_preferences: ["elephant"] },
    { id: "pending", status: "pending_verification", farm_latitude: 28.211, farm_longitude: 83.99, risk_preferences: ["monkey"] },
    { id: "far", status: "active", farm_latitude: 29.5, farm_longitude: 84.5, risk_preferences: ["monkey"] },
  ], { now, radius_km: 5 });
  assert.equal(result.eligible, true);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].subscription_id, "near");
});

test("unverified, low-confidence, stale and inaccurate events are never matched", () => {
  const subscribers = [{ id: "near", status: "active", farm_latitude: 28.211, farm_longitude: 83.99, risk_preferences: ["monkey"] }];
  assert.equal(matchActiveAlertSubscriptions({ ...event, verified: false }, subscribers, { now }).reason, "human_review_required");
  assert.equal(matchActiveAlertSubscriptions({ ...event, confidence: 0.5 }, subscribers, { now }).reason, "confidence_below_threshold");
  assert.equal(matchActiveAlertSubscriptions({ ...event, occurred_at: new Date(now - 10 * 60 * 60 * 1000).toISOString() }, subscribers, { now }).reason, "event_stale_or_invalid_time");
  assert.equal(matchActiveAlertSubscriptions({ ...event, location_accuracy_m: 2500 }, subscribers, { now }).reason, "location_accuracy_insufficient");
});
