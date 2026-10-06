// Shared individual-animal re-identification logic + private-file signing.
// Used by both the `individualId` and `fieldCapture` backend functions so the
// gallery matching logic is defined exactly once.

export async function signFileUri(base44, fileUri) {
  if (!fileUri) return null;
  if (/^https?:\/\//.test(fileUri)) return fileUri;
  try {
    const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri });
    return res.signed_url || res.file_url || null;
  } catch {
    return null;
  }
}

// Compare a sighting photo against the registered gallery for a flagship species.
// `species` is the resolved Species entity. Returns { candidates, best_guess_is_new }.
export async function identifySightingCandidates(base44, { species, sightingSignedUrl }) {
  const candPage = await base44.entities.AnimalIndividual.filter(
    { species: species.id, status: "confirmed", active: true },
    { sort: "-last_seen_at", limit: 50 }
  );
  const candidates = candPage.items || candPage || [];

  if (!candidates.length) {
    return { candidates: [], best_guess_is_new: true };
  }

  const candidateData = [];
  for (const c of candidates) {
    const refSigned = await signFileUri(base44, c.reference_photos && c.reference_photos[0]);
    candidateData.push({
      individual_id: c.id,
      individual_code: c.individual_code,
      nickname: c.nickname,
      feature_signature: c.feature_signature,
      reference_photo: refSigned,
    });
  }

  const refList = candidateData
    .map(
      (c, i) =>
        `Image ${i + 2}: Individual #${i + 1} — code ${c.individual_code}, nickname "${c.nickname}". Feature signature: ${JSON.stringify(c.feature_signature)}`
    )
    .join("\n");

  const llm = await base44.integrations.Core.InvokeLLM({
    prompt:
      `You are a wildlife biologist performing individual animal re-identification for ${species.name} (${species.scientific_name || ""}).\n` +
      `IMAGE 1 is a new sighting photo.\n` +
      `The following images are reference photos of known registered individuals, provided IN ORDER:\n${refList}\n\n` +
      `Compare the sighting (Image 1) against each known individual's reference image and feature signature. ` +
      `Return a ranked shortlist of likely matches. For each, give: index (1-based position in the list above), confidence (0-1), and brief reasoning. ` +
      `Only assign high confidence when genuine identifying features (coat/stripes/horn/ear/tusk patterns, scars, notches) clearly match. ` +
      `If the sighting does not resemble any known individual, return an empty matches array and set best_guess_is_new to true.`,
    file_urls: [sightingSignedUrl, ...candidateData.map((c) => c.reference_photo).filter(Boolean)],
    response_json_schema: {
      type: "object",
      properties: {
        matches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "number", description: "1-based position of the candidate in the reference list" },
              confidence: { type: "number" },
              reasoning: { type: "string" },
            },
            required: ["index", "confidence", "reasoning"],
          },
        },
        best_guess_is_new: { type: "boolean" },
      },
      required: ["matches", "best_guess_is_new"],
    },
  });

  const matches = (llm && llm.matches) || [];
  const enriched = matches
    .map((m) => {
      const c = candidateData[m.index - 1];
      if (!c) return null;
      return {
        individual_id: c.individual_id,
        individual_code: c.individual_code,
        nickname: c.nickname,
        reference_photo: c.reference_photo,
        confidence: m.confidence,
        reasoning: m.reasoning,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  return { candidates: enriched, best_guess_is_new: llm && llm.best_guess_is_new };
}

export const AUTO_LINK_THRESHOLD = 0.7;

// Run re-identification against the species gallery, then either auto-link a
// high-confidence match to the existing individual (updating its last_seen_at /
// last_location and the source observation) or create a 'pending' individual
// for ranger review when no confident match is found. Used by the public
// submission and field-capture flows so the identity gallery grows across all
// wildlife species — the same monkey seen in region A then region B is
// recognized and its movement recorded.
export async function autoMatchOrCreatePending(base44, {
  species, sightingSignedUrl, photoUri, locationName, observedAt, observationId, source,
}) {
  const match = await identifySightingCandidates(base44, { species, sightingSignedUrl });
  const best = match.candidates && match.candidates[0];

  if (best && (best.confidence || 0) >= AUTO_LINK_THRESHOLD) {
    const ind = await base44.entities.AnimalIndividual.get(best.individual_id).catch(() => null);
    if (ind) {
      await base44.entities.AnimalIndividual.update(best.individual_id, {
        sighting_count: (ind.sighting_count || 0) + 1,
        last_seen_at: observedAt,
        last_location: locationName || ind.last_location || "",
      });
      if (observationId) {
        await base44.entities.WildlifeObservation.update(observationId, {
          individual_id: best.individual_id,
          match_confidence: best.confidence,
        });
      }
      return { auto_linked: best, candidates: match.candidates };
    }
  }

  // No confident match — create a pending individual for ranger review
  const pending = await base44.entities.AnimalIndividual.create({
    individual_code: "PENDING-" + Date.now().toString(36).toUpperCase(),
    nickname: "Unverified " + (species ? species.name : "Individual"),
    species: species ? species.id : null,
    species_name: species ? species.name : "",
    scientific_name: species ? species.scientific_name : "",
    status: "pending",
    reference_photos: photoUri ? [photoUri] : [],
    feature_signature: {
      pattern_type: "auto-captured (pending review)",
      distinguishing_marks: "",
      estimated_age_class: "unknown",
      sex: "unknown",
      summary: "Auto-created from " + (source || "sighting") + " — pending ranger review",
    },
    embedding_vector: null,
    sighting_count: 1,
    first_seen_at: observedAt,
    last_seen_at: observedAt,
    last_location: locationName || "",
    notes: "Auto-created from " + (source || "sighting"),
    sensitive_location: species ? !!species.sensitive_location : false,
    active: true,
  });
  if (observationId) {
    await base44.entities.WildlifeObservation.update(observationId, {
      individual_id: pending.id,
      match_confidence: best ? best.confidence : 0,
    });
  }
  return { pending, candidates: match.candidates };
}