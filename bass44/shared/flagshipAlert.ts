const FLAGSHIP = ["tiger", "leopard", "snow leopard", "elephant", "rhinoceros", "rhino"];

export function isFlagshipSpeciesName(name) {
  if (!name) return false;
  const n = String(name).toLowerCase();
  return FLAGSHIP.some((k) => n.includes(k));
}

export async function evaluateAndAlert(base44, ctx) {
  const speciesName = ctx.species_name || "";
  if (!isFlagshipSpeciesName(speciesName)) {
    return { alerted: false, reason: "not_flagship" };
  }
  const low = speciesName.toLowerCase();
  const severity = /tiger|leopard|rhino|rhinoceros/.test(low) ? "critical" : "high";
  const title = "Flagship species detected: " + speciesName;
  const lines = [
    "Species: " + speciesName,
    ctx.location ? "Location: " + ctx.location : null,
    (ctx.latitude && ctx.longitude) ? "Coordinates: " + ctx.latitude + ", " + ctx.longitude : null,
    (typeof ctx.confidence === "number") ? "Confidence: " + Math.round(ctx.confidence * 100) + "%" : null,
    ctx.source ? "Source: " + ctx.source : null,
    ctx.individual_id ? "Linked individual: " + ctx.individual_id : null,
    ctx.image_url ? "Photo: " + ctx.image_url : null,
  ].filter(Boolean);
  const message = lines.join("\n");

  let alert = null;
  try {
    alert = await base44.entities.Alert.create({
      title,
      alert_type: "flagship_detection",
      severity,
      site_name: ctx.location || "",
      message,
      species_name: speciesName,
      latitude: ctx.latitude || null,
      longitude: ctx.longitude || null,
      image_url: ctx.image_url || null,
      individual_id: ctx.individual_id || null,
      acknowledged: false,
      triggered_at: new Date().toISOString(),
    });
  } catch (e) {
    // Alert creation failure must not block the detection flow
  }

  let emailed = false;
  if (ctx.user && ctx.user.email) {
    try {
      await base44.integrations.Core.SendEmail({
        to: ctx.user.email,
        subject: title,
        body: message + "\n\nTrack this animal's movement in the Sighting History dashboard (Wildlife \u2192 Sighting History).",
      });
      emailed = true;
    } catch (e) {
      // Email failure must not block the detection flow
    }
  }

  return { alerted: true, alert, severity, emailed };
}