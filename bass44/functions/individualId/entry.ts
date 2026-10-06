import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from "base44:runtime";
import { evaluateAndAlert } from "../../shared/flagshipAlert.ts";
import { signFileUri, identifySightingCandidates } from "../../shared/individualMatch.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ---- REGISTER A NEW INDIVIDUAL ----
    if (action === "registerIndividual") {
      const { species_id, nickname, individual_code, notes, photo_uris } = body;
      if (!species_id) return Response.json({ error: "species_id is required" }, { status: 400 });
      if (!photo_uris || !photo_uris.length)
        return Response.json({ error: "At least one reference photo is required" }, { status: 400 });

      const species = await base44.entities.Species.get(species_id).catch(() => null);
      if (!species) return Response.json({ error: "Species not found" }, { status: 404 });

      const signed = [];
      for (const uri of photo_uris.slice(0, 3)) {
        const s = await signFileUri(base44, uri);
        if (s) signed.push(s);
      }
      if (!signed.length)
        return Response.json({ error: "Could not load reference photos for analysis" }, { status: 400 });

      const llm = await base44.integrations.Core.InvokeLLM({
        prompt:
          `You are a wildlife biologist assisting with individual animal identification. ` +
          `Analyze these reference photos of a ${species.name} (${species.scientific_name || ""}). ` +
          `Extract a structured feature signature that can be used to re-identify this specific individual later. ` +
          `Focus on permanent distinguishing features: coat/stripes/horn/ear/tusk patterns, scars, notches, body marks, estimated age class, and apparent sex. Be precise and conservative.`,
        file_urls: signed,
        response_json_schema: {
          type: "object",
          properties: {
            pattern_type: { type: "string", description: "Main identification feature type (e.g. stripe pattern, coat rosettes, horn shape, ear notch, tusk shape)" },
            distinguishing_marks: { type: "string", description: "Specific permanent marks/scars/notches that distinguish this individual" },
            body_condition: { type: "string", description: "Body condition assessment" },
            estimated_age_class: { type: "string", enum: ["juvenile", "subadult", "adult", "senescent", "unknown"] },
            sex: { type: "string", enum: ["male", "female", "unknown"] },
            summary: { type: "string", description: "One-line identity summary" },
          },
          required: ["pattern_type", "distinguishing_marks", "estimated_age_class", "sex"],
        },
      });

      const featureSignature = llm || {};
      const now = new Date().toISOString();
      const individual = await base44.entities.AnimalIndividual.create({
        individual_code: individual_code || "IND-" + Date.now().toString(36).toUpperCase(),
        nickname: nickname || "Unnamed",
        species: species_id,
        species_name: species.name,
        scientific_name: species.scientific_name || "",
        status: "confirmed",
        reference_photos: photo_uris,
        feature_signature: featureSignature,
        embedding_vector: null,
        sighting_count: 0,
        first_seen_at: now,
        last_seen_at: now,
        last_location: "",
        notes: notes || "",
        sensitive_location: !!species.sensitive_location,
        active: true,
      });
      return Response.json({ individual });
    }

    // ---- IDENTIFY A SIGHTING ----
    if (action === "identifySighting") {
      const { species_id, sighting_photo } = body;
      if (!species_id) return Response.json({ error: "species_id is required" }, { status: 400 });
      if (!sighting_photo) return Response.json({ error: "sighting_photo is required" }, { status: 400 });

      const species = await base44.entities.Species.get(species_id).catch(() => null);
      if (!species) return Response.json({ error: "Species not found" }, { status: 404 });

      const sightingSigned = await signFileUri(base44, sighting_photo);
      if (!sightingSigned)
        return Response.json({ error: "Could not load sighting photo for analysis" }, { status: 400 });

      const match = await identifySightingCandidates(base44, { species, sightingSignedUrl: sightingSigned });
      if (!match.candidates.length) {
        return Response.json({
          candidates: [],
          best_guess_is_new: true,
          message: "No registered individuals for this species yet. Register this sighting as a new individual.",
        });
      }
      return Response.json({ candidates: match.candidates, best_guess_is_new: match.best_guess_is_new });
    }

    // ---- CONFIRM A MATCH (link a sighting to an individual) ----
    if (action === "confirmMatch") {
      const { individual_id, source_type, source_id, confidence, location } = body;
      if (!individual_id) return Response.json({ error: "individual_id is required" }, { status: 400 });
      const individual = await base44.entities.AnimalIndividual.get(individual_id).catch(() => null);
      if (!individual) return Response.json({ error: "Individual not found" }, { status: 404 });

      const now = new Date().toISOString();
      await base44.entities.AnimalIndividual.update(individual_id, {
        sighting_count: (individual.sighting_count || 0) + 1,
        last_seen_at: now,
        last_location: location || individual.last_location || "",
      });

      if (source_type === "detection" && source_id) {
        await base44.entities.DetectionEvent.update(source_id, { individual_id, match_confidence: confidence });
      } else if (source_type === "observation" && source_id) {
        await base44.entities.WildlifeObservation.update(source_id, { individual_id, match_confidence: confidence });
      }

      return Response.json({ ok: true, individual_id });
    }

    // ---- EXTERNAL INFERENCE SERVICE CONTRACT (stubbed in v1) ----
    if (action === "ingestInference") {
      const { species_id, embedding, cropped_image_uri, camera_id, camera_name, site_name } = body;
      if (!species_id || !cropped_image_uri)
        return Response.json({ error: "species_id and cropped_image_uri are required" }, { status: 400 });

      const species = await base44.entities.Species.get(species_id).catch(() => null);
      const now = new Date().toISOString();
      const pending = await base44.entities.AnimalIndividual.create({
        individual_code: "PENDING-" + Date.now().toString(36).toUpperCase(),
        nickname: "Unverified " + (species ? species.name : "Individual"),
        species: species_id,
        species_name: species ? species.name : "",
        scientific_name: species ? species.scientific_name : "",
        status: "pending",
        reference_photos: [cropped_image_uri],
        feature_signature: {
          pattern_type: "auto-cropped (pending review)",
          distinguishing_marks: "",
          estimated_age_class: "unknown",
          sex: "unknown",
          summary: "Submitted by external inference service",
        },
        embedding_vector: embedding || null,
        sighting_count: 1,
        first_seen_at: now,
        last_seen_at: now,
        last_location: site_name || "",
        notes: "Auto-ingested from external inference service" + (camera_name ? " via " + camera_name : ""),
        sensitive_location: species ? !!species.sensitive_location : false,
        active: true,
      });

      // Fire an immediate flagship-species alert (non-blocking)
      waitUntil(evaluateAndAlert(base44, {
        species_name: species ? species.name : "",
        location: site_name || "",
        image_url: cropped_image_uri,
        individual_id: pending.id,
        source: "camera_inference",
        user,
      }));

      return Response.json({
        matched: false,
        pending_individual_id: pending.id,
        message:
          "v1 stub: gallery embeddings not yet populated, so automatic cosine-similarity matching is unavailable. " +
          "Created a 'pending' individual for ranger review. Once the external re-ID model populates embedding_vector on gallery records, this endpoint will auto-match above threshold.",
      });
    }

    return Response.json({ error: "Unknown action: " + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}