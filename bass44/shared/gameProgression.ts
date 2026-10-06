// Shared game-progression logic for the gamified verification system.
// Points, levels, titles, badges, and consensus — reused by the verificationGame
// backend function so the rules live in exactly one place.

export const BASE_POINTS = 10;
export const STREAK_BONUS = 5;
export const MAX_STREAK_BONUS = 25;

export const RARITY_MULTIPLIER: Record<string, number> = { common: 1, rare: 2, escalated: 3 };
export const DIFFICULTY_MULTIPLIER: Record<string, number> = { hint_shown: 1, hint_hidden: 1.5 };

export const LEVELS = [
  { level: 1, title: "Rookie", minPoints: 0 },
  { level: 2, title: "Ranger", minPoints: 100 },
  { level: 3, title: "Expert", minPoints: 500 },
  { level: 4, title: "Master", minPoints: 1500 },
  { level: 5, title: "Legend", minPoints: 4000 },
];

export function getLevel(totalPoints: number) {
  const points = Math.max(0, totalPoints || 0);
  let current = LEVELS[0];
  for (const l of LEVELS) if (points >= l.minPoints) current = l;
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] || null;
  const progress = next
    ? Math.min(100, Math.round(((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100))
    : 100;
  return {
    level: current.level,
    title: current.title,
    progress,
    nextTitle: next ? next.title : null,
    pointsToNext: next ? next.minPoints - points : 0,
  };
}

// Points for a single correct vote. Streak bonus is capped.
export function computeVotePoints(tier: string, mode: string, streak = 0) {
  const rarity = RARITY_MULTIPLIER[tier] || 1;
  const difficulty = DIFFICULTY_MULTIPLIER[mode] || 1;
  const streakBonus = Math.min(MAX_STREAK_BONUS, Math.max(0, streak) * STREAK_BONUS);
  return Math.round(BASE_POINTS * rarity * difficulty + streakBonus);
}

export const BADGES = [
  { id: "first_steps", name: "First Steps", description: "Verify your first image", icon: "Footprints", check: (s: any) => s.verified_count >= 1 },
  { id: "century", name: "Century", description: "Verify 100 images", icon: "Award", check: (s: any) => s.verified_count >= 100 },
  { id: "sharp_eye", name: "Sharp Eye", description: "90%+ accuracy over 20 votes", icon: "Eye", check: (s: any) => s.verified_count >= 20 && s.accuracy_pct >= 90 },
  { id: "rare_hunter", name: "Rare Species Hunter", description: "10 rare-species correct votes", icon: "Sparkles", check: (s: any) => (s.rare_correct_count || 0) >= 10 },
  { id: "on_fire", name: "On Fire", description: "25 correct-vote streak", icon: "Flame", check: (s: any) => (s.best_streak || 0) >= 25 },
  { id: "dedicated", name: "Dedicated", description: "Cast 50 votes", icon: "Target", check: (s: any) => (s.total_votes || 0) >= 50 },
];

export function getEarnedBadges(stats: any) {
  return BADGES.filter((b) => b.check(stats));
}

// Consensus configuration
export const QUORUM_COMMON = 3;
export const QUORUM_RARE = 2;
export const AGREEMENT_THRESHOLD = 0.6;

export function getQuorum(tier: string) {
  return tier === "rare" || tier === "escalated" ? QUORUM_RARE : QUORUM_COMMON;
}

export function computeConsensus(votes: any[]) {
  if (!votes || !votes.length) return { label: null, agreement: 0, counts: {} as Record<string, number> };
  const counts: Record<string, number> = {};
  for (const v of votes) {
    const label = v.voted_label || "Unknown";
    counts[label] = (counts[label] || 0) + 1;
  }
  let bestLabel: string | null = null;
  let bestCount = 0;
  for (const [label, c] of Object.entries(counts)) {
    if (c > bestCount) { bestCount = c; bestLabel = label; }
  }
  return { label: bestLabel, agreement: bestCount / votes.length, counts };
}