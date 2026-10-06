import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from "base44:runtime";
import { isFlagshipSpeciesName, evaluateAndAlert } from "../../shared/flagshipAlert.ts";
import { signFileUri, autoMatchOrCreatePending } from "../../shared/individualMatch.ts";
import { classifyPhoto } from "../../shared/yoloClassify.ts";

// Field Capture processor: receives a photo (private file_uri) + GPS + metadata
// captured from a mobile device in the field, classifies the animal via LLM,
// stores a WildlifeObservation, and runs the full auto-pipeline (flagship alert +
// individual re-ID match) for flagship species. Reuses the shared alert and
// individual-matching modules — no duplicated logic.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || "processCapture";

    if (action !== "processCapture") {
      return Response.json({ error: "Unknown action: " + action }, { status: 400 });
    }

    const { photo_uri, latitude, longitude, location_name, notes, captured_at } = body;
    if (!photo_uri) return Response.json({ error: "photo_uri is required" }, { status: 400 });

    const signedUrl = await signFileUri(base44, photo_uri);
    if (!signedUrl) return Response.json({ error: "Could not load capture photo for analysis" }, { status: 400 });

    // --- Supervised classification: YOLO 11 → LLM fallback → human escalation ---
    const {
      classification, classifier_source, escalated, verification_sample,
      yolo_label, yolo_confidence, llm_label, llm_confidence,
    } = await classifyPhoto(base44, {
      signedUrl, photo_uri, source: "field_capture",
      region: "the Nepal / Himalayan foothills",
      location: location_name, latitude, longitude, user,
    });

    const speciesName = (classification.species_name || "Unknown").trim();
    const confidence = typeof classification.confidence === "number" ? classification.confidence : 0.5;

    // --- Match to a registered Species entity (for flagship checks + linking) ---
    let species = null;
    if (speciesName && speciesName !== "Unknown") {
      try {
        const sp = await base44.entities.Species.filter(
          { name: { $regex: speciesName, $options: "i" } },
          { limit: 1 }
        );
        const items = sp.items || sp || [];
        if (items.length) species = items[0];
      } catch {
        /* species match is best-effort */
      }
    }

    const observedAt = captured_at || new Date().toISOString();
    const observation = await base44.entities.WildlifeObservation.create({
      observation_id: "FC-" + Date.now().toString(36).toUpperCase(),
      species: species ? species.id : speciesName,
      species_name: speciesName,
      count: classification.count || 1,
      observation_type: "individual",
      behavior: classification.behavior || "",
      latitude: typeof latitude === "number" ? latitude : null,
      longitude: typeof longitude === "number" ? longitude : null,
      location_name: location_name || "",
      photos: [photo_uri],
      notes: notes || classification.notes || "",
      observed_by: user.id,
      observer_name: user.full_name || user.email || "Field Officer",
      verified: false,
      observed_at: observedAt,
      is_demo: false,
    });

    const result = {
      observation,
      classification: {
        species_name: speciesName,
        scientific_name: classification.scientific_name || (species && species.scientific_name) || "",
        confidence,
        count: classification.count || 1,
        behavior: classification.behavior || "",
        notes: classification.notes || "",
      },
      flagship: false,
      individual_match: null,
      classifier_source,
      escalated,
      verification_sample,
    };

    // --- Flagship alert (flagship species only, non-blocking) ---
    if (isFlagshipSpeciesName(speciesName)) {
      result.flagship = true;
      waitUntil(
        evaluateAndAlert(base44, {
          species_name: speciesName,
          location: location_name || "",
          latitude,
          longitude,
          confidence,
          image_url: photo_uri,
          source: "field_capture",
          user,
        })
      );
    }

    // --- All-species individual re-identification (any wildlife species) ---
    if (species) {
      try {
        result.individual_match = await autoMatchOrCreatePending(base44, {
          species,
          sightingSignedUrl: signedUrl,
          photoUri: photo_uri,
          locationName: location_name || "",
          observedAt,
          observationId: observation.id,
          source: "field_capture",
        });
      } catch (e) {
        result.individual_match = { error: e.message };
      }
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}