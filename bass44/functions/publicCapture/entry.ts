import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from "base44:runtime";
import { isFlagshipSpeciesName, evaluateAndAlert } from "../../shared/flagshipAlert.ts";
import { signFileUri, autoMatchOrCreatePending } from "../../shared/individualMatch.ts";
import { classifyPhoto } from "../../shared/yoloClassify.ts";

// Public wildlife submission — NO AUTHENTICATION REQUIRED.
// Anyone in the country can capture and submit a wildlife photo from any
// location. The function classifies the species via LLM, stores a
// WildlifeObservation (source: "public"), runs all-species individual
// re-identification, and fires a flagship alert when applicable. All writes
// use the service role (no user session), matching the webhook/no-auth pattern.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const {
      photo_uri, latitude, longitude,
      location_name, province, district, ward,
      submitter_name, notes, captured_at,
    } = body;
    if (!photo_uri) return Response.json({ error: "photo_uri is required" }, { status: 400 });

    // The photo is already uploaded to private storage by the public portal;
    // sign it here so the LLM can read it.
    const signedUrl = await signFileUri(svc, photo_uri);
    if (!signedUrl) return Response.json({ error: "Could not load photo for analysis" }, { status: 400 });

    // --- Supervised classification: YOLO 11 → LLM fallback → human escalation ---
    const {
      classification, classifier_source, escalated, verification_sample,
      yolo_label, yolo_confidence, llm_label, llm_confidence,
    } = await classifyPhoto(svc, {
      signedUrl, photo_uri, source: "public_submission",
      region: "across Nepal",
      location: location_name || province || "", latitude, longitude,
    });

    const speciesName = (classification.species_name || "Unknown").trim();
    const confidence = typeof classification.confidence === "number" ? classification.confidence : 0.5;

    // --- Match to a registered Species entity (best-effort) ---
    let species = null;
    if (speciesName && speciesName !== "Unknown") {
      try {
        const sp = await svc.entities.Species.filter(
          { name: { $regex: speciesName, $options: "i" } },
          { limit: 1 }
        );
        const items = sp.items || sp || [];
        if (items.length) species = items[0];
      } catch {
        /* best-effort */
      }
    }

    const observedAt = captured_at || new Date().toISOString();
    const observation = await svc.entities.WildlifeObservation.create({
      observation_id: "PUB-" + Date.now().toString(36).toUpperCase(),
      species: species ? species.id : speciesName,
      species_name: speciesName,
      count: classification.count || 1,
      observation_type: "individual",
      behavior: classification.behavior || "",
      latitude: typeof latitude === "number" ? latitude : null,
      longitude: typeof longitude === "number" ? longitude : null,
      location_name: location_name || "",
      province: province || "",
      district: district || "",
      ward: ward || "",
      source: "public",
      photos: [photo_uri],
      notes: notes || classification.notes || "",
      observed_by: null,
      observer_name: submitter_name || "Public Submission",
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
      },
      flagship: false,
      individual_match: null,
      classifier_source,
      escalated,
      verification_sample,
    };

    // --- Flagship alert (non-blocking, flagship species only) ---
    if (isFlagshipSpeciesName(speciesName)) {
      result.flagship = true;
      waitUntil(
        evaluateAndAlert(svc, {
          species_name: speciesName,
          location: location_name || province || "",
          latitude,
          longitude,
          confidence,
          image_url: photo_uri,
          source: "public_submission",
        })
      );
    }

    // --- All-species individual re-identification ---
    if (species) {
      try {
        result.individual_match = await autoMatchOrCreatePending(svc, {
          species,
          sightingSignedUrl: signedUrl,
          photoUri: photo_uri,
          locationName: location_name || province || "",
          observedAt,
          observationId: observation.id,
          source: "public_submission",
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