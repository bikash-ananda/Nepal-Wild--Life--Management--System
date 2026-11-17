const SPECIES_RISK = new Map([
  ["macaque", "monkey"], ["rhesus macaque", "monkey"], ["monkey", "monkey"],
  ["elephant", "elephant"], ["rhino", "rhino"], ["rhinoceros", "rhino"],
  ["tiger", "tiger"], ["leopard", "leopard"], ["common leopard", "leopard"],
]);

export function haversineDistanceKm(aLat, aLon, bLat, bLon) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(bLat - aLat);
  const longitudeDelta = toRadians(bLon - aLon);
  const value = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) *
    Math.sin(longitudeDelta / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)));
}

function eventRiskKeys(event) {
  const species = String(event.species || "").trim().toLowerCase();
  const mappedSpecies = SPECIES_RISK.get(species) || (species ? "other" : null);
  const behavior = String(event.behavior || event.incident_type || "").toLowerCase();
  const keys = new Set();
  if (mappedSpecies) keys.add(mappedSpecies);
  if (/crop|maize|paddy|field/.test(behavior)) keys.add("crop");
  if (/livestock|cattle|goat|sheep|attack/.test(behavior)) keys.add("livestock");
  if (!keys.size) keys.add("other");
  return keys;
}

export function matchActiveAlertSubscriptions(event, subscriptions, options = {}) {
  const latitude = Number(event?.latitude);
  const longitude = Number(event?.longitude);
  const confidence = Number(event?.confidence);
  const occurredAt = Date.parse(event?.occurred_at || "");
  const now = Number(options.now ?? Date.now());
  const requestedRadius = Number(options.radius_km ?? 5);
  const requestedMaxAge = Number(options.max_age_hours ?? 6);
  const radiusKm = Number.isFinite(requestedRadius) ? Math.min(25, Math.max(0.1, requestedRadius)) : 5;
  const maxAgeHours = Number.isFinite(requestedMaxAge) ? Math.min(24, Math.max(1, requestedMaxAge)) : 6;
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const accuracy = event?.location_accuracy_m == null ? null : Number(event.location_accuracy_m);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { eligible: false, reason: "invalid_event_location", matches: [] };
  }
  if (event?.verified !== true) return { eligible: false, reason: "human_review_required", matches: [] };
  if (!Number.isFinite(confidence) || confidence < 0.75) return { eligible: false, reason: "confidence_below_threshold", matches: [] };
  if (!Number.isFinite(occurredAt) || occurredAt > now + 5 * 60 * 1000 || now - occurredAt > maxAgeMs) {
    return { eligible: false, reason: "event_stale_or_invalid_time", matches: [] };
  }
  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy > 1000)) {
    return { eligible: false, reason: "location_accuracy_insufficient", matches: [] };
  }

  const risks = eventRiskKeys(event);
  const matches = [];
  for (const subscriber of subscriptions || []) {
    if (subscriber.status !== "active") continue;
    const preferences = Array.isArray(subscriber.risk_preferences) ? subscriber.risk_preferences : [];
    if (preferences.length && !preferences.some((risk) => risks.has(risk))) continue;
    const distanceKm = haversineDistanceKm(
      latitude, longitude,
      Number(subscriber.farm_latitude), Number(subscriber.farm_longitude)
    );
    if (!Number.isFinite(distanceKm) || distanceKm > radiusKm) continue;
    matches.push({
      subscription_id: subscriber.id,
      distance_km: Math.round(distanceKm * 100) / 100,
      municipality: subscriber.municipality || "",
      ward: subscriber.ward || "",
    });
  }
  matches.sort((left, right) => left.distance_km - right.distance_km);
  return { eligible: true, reason: matches.length ? "matched" : "no_nearby_subscribers", matches };
}
