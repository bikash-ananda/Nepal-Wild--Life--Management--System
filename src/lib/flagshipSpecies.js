// Flagship species eligible for individual identification in v1.
// Gating is name-based so it matches the Species records in the database
// (e.g. "Bengal Tiger", "Common Leopard", "Snow Leopard", "Asian Elephant", "Indian Rhinoceros").
const FLAGSHIP_KEYWORDS = ["tiger", "leopard", "snow leopard", "elephant", "rhinoceros", "rhino"];

export function isFlagshipSpecies(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return FLAGSHIP_KEYWORDS.some((k) => n.includes(k));
}

export const FLAGSHIP_LABEL = "Flagship species (individually identifiable)";