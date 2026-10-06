import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { evaluateAndAlert, isFlagshipSpeciesName } from "../../shared/flagshipAlert.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // Notify on a sighting/detection (field sighting or manual confirmation)
    if (action === 'notify') {
      const result = await evaluateAndAlert(base44, {
        species_name: body.species_name,
        location: body.location,
        latitude: body.latitude,
        longitude: body.longitude,
        image_url: body.image_url,
        individual_id: body.individual_id,
        confidence: body.confidence,
        source: body.source || 'field_sighting',
        user,
      });
      return Response.json(result);
    }

    // Test the alert pipeline (sends a real email to the current user)
    if (action === 'test') {
      const result = await evaluateAndAlert(base44, {
        species_name: body.species_name || 'Bengal Tiger',
        location: body.location || 'Test location',
        source: 'test',
        user,
      });
      return Response.json(result);
    }

    // Check whether a species name is flagship (no alert sent)
    if (action === 'isFlagship') {
      return Response.json({ is_flagship: isFlagshipSpeciesName(body.species_name) });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}