import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  getLevel, computeVotePoints, getQuorum, computeConsensus,
  AGREEMENT_THRESHOLD, getEarnedBadges,
} from "../../shared/gameProgression.ts";

// Gamified verification game backend.
// Escalated images become playable samples; team members vote on the species
// label, consensus + expert review confirm the ground truth, correct voters
// earn points and climb the leaderboard, and confirmed labels feed retraining.
//
// Actions:
//  serveNext     — next playable sample for the current player (hides hints in
//                  hint_hidden mode) + queue count + player stats.
//  submitVote    — record a vote; if quorum is reached, auto-confirm (common +
//                  high agreement) or route to expert review (rare/escalated/low).
//  getLeaderboard — top players by total points (aggregate).
//  getPlayerStats — current player's points, level, streak, badges.
//  reviewQueue   — (admin) samples awaiting expert confirmation, with votes.
//  confirmLabel  — (admin) lock the consensus label, award points, queue for training.
//  overrideLabel — (admin) lock a different label, award only matching voters.

const RARE_STATUSES = ["vulnerable", "endangered", "critically_endangered"];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // ---- SERVE NEXT PLAYABLE SAMPLE ----
    if (action === "serveNext") {
      const votedPage = await base44.entities.ClassificationVote.filter(
        { player_id: user.id },
        { fields: ["sample_id"], limit: 500 }
      );
      const votedIds = (votedPage.items || votedPage || []).map((v) => v.sample_id).filter(Boolean);
      const query = { status: "pending" } as any;
      if (votedIds.length) query.id = { $nin: votedIds };
      const samplePage = await base44.entities.VerificationSample.filter(
        query, { sort: "-created_date", limit: 1 }
      );
      const samples = samplePage.items || samplePage || [];
      const raw = samples[0] || null;
      const queueCount = await base44.entities.VerificationSample.count({ status: "pending" });
      const stats = await computePlayerStats(base44, user.id, user.full_name || user.email);

      let sample = null;
      if (raw) {
        sample = { ...raw };
        if (raw.game_mode === "hint_hidden") {
          sample.yolo_label = ""; sample.yolo_confidence = 0;
          sample.llm_label = ""; sample.llm_confidence = 0;
          sample.ai_label = "Unknown"; sample.ai_confidence = 0;
        }
      }
      return Response.json({ sample, queueCount, playerStats: stats });
    }

    // ---- SUBMIT VOTE ----
    if (action === "submitVote") {
      const { sample_id, voted_label, training_comment } = body;
      if (!sample_id || !voted_label) return Response.json({ error: "sample_id and voted_label required" }, { status: 400 });

      const dupPage = await base44.entities.ClassificationVote.filter(
        { sample_id, player_id: user.id }, { limit: 1 }
      );
      if ((dupPage.items || dupPage || []).length) {
        return Response.json({ error: "Already voted on this sample" }, { status: 409 });
      }

      const sp = await base44.entities.VerificationSample.filter({ id: sample_id }, { limit: 1 });
      const sample = (sp.items || sp || [])[0];
      if (!sample) return Response.json({ error: "Sample not found" }, { status: 404 });
      if (sample.status !== "pending") return Response.json({ error: "Sample no longer open for voting" }, { status: 409 });

      const tier = sample.difficulty_tier || "common";
      const mode = sample.game_mode || "hint_shown";
      await base44.entities.ClassificationVote.create({
        sample_id, player_id: user.id,
        player_name: user.full_name || user.email,
        player_email: user.email,
        voted_label, training_comment: training_comment || "",
        is_correct: false, points_awarded: 0,
        difficulty_tier: tier, game_mode: mode,
      });

      const votePage = await base44.entities.ClassificationVote.filter({ sample_id }, { limit: 50 });
      const votes = votePage.items || votePage || [];
      const quorum = getQuorum(tier);
      const result = { accepted: true, consensus: null, confirmed: false, pointsAwarded: 0, waitingForQuorum: votes.length < quorum };

      if (votes.length >= quorum) {
        const consensus = computeConsensus(votes);
        const needsExpert = tier === "escalated" || tier === "rare" || consensus.agreement < AGREEMENT_THRESHOLD;
        if (needsExpert) {
          await base44.entities.VerificationSample.update(sample_id, {
            consensus_label: consensus.label,
            consensus_reached: true,
            expert_confirmed: false,
            vote_count: votes.length,
          });
          result.consensus = { label: consensus.label, agreement: Math.round(consensus.agreement * 100), votes: votes.length, needsExpert: true };
        } else {
          const awarded = await confirmSample(base44, sample, consensus.label, tier, mode, null, user.id);
          result.confirmed = true;
          result.consensus = { label: consensus.label, agreement: Math.round(consensus.agreement * 100), votes: votes.length, needsExpert: false };
          result.pointsAwarded = awarded.playerPoints;
        }
      }
      return Response.json(result);
    }

    // ---- GET LEADERBOARD ----
    if (action === "getLeaderboard") {
      const agg = await base44.entities.ClassificationVote.aggregate({
        groupBy: "player_id",
        sum: "points_awarded",
        count: true,
        sort: "-sum_points_awarded",
        limit: 50,
      });
      const rows = agg.rows || [];
      const ids = rows.map((r: any) => r.player_id).filter(Boolean);
      const nameMap = {};
      if (ids.length) {
        const namePage = await base44.entities.ClassificationVote.filter(
          { player_id: { $in: ids } }, { fields: ["player_id", "player_name"], limit: 200 }
        );
        for (const v of (namePage.items || namePage || [])) {
          if (!nameMap[v.player_id] && v.player_name) nameMap[v.player_id] = v.player_name;
        }
      }
      const leaderboard = rows.map((r: any, i: number) => {
        const points = r.sum_points_awarded || 0;
        const lvl = getLevel(points);
        return {
          rank: i + 1, player_id: r.player_id,
          player_name: nameMap[r.player_id] || "Anonymous",
          points, verified_count: r.count || 0,
          level: lvl.level, title: lvl.title,
          isMe: r.player_id === user.id,
        };
      });
      return Response.json({ leaderboard });
    }

    // ---- GET PLAYER STATS ----
    if (action === "getPlayerStats") {
      const stats = await computePlayerStats(base44, user.id, user.full_name || user.email);
      return Response.json({ stats });
    }

    // ---- EXPERT REVIEW QUEUE ----
    if (action === "reviewQueue") {
      if (user.role !== "admin") return Response.json({ error: "Forbidden — experts only" }, { status: 403 });
      const page = await base44.entities.VerificationSample.filter(
        { consensus_reached: true, expert_confirmed: { $ne: true } },
        { sort: "-created_date", limit: 50 }
      );
      const samples = page.items || page || [];
      const enriched = [];
      for (const s of samples) {
        const vp = await base44.entities.ClassificationVote.filter({ sample_id: s.id }, { limit: 50 });
        enriched.push({ ...s, votes: vp.items || vp || [] });
      }
      return Response.json({ queue: enriched });
    }

    // ---- CONFIRM LABEL (expert) ----
    if (action === "confirmLabel") {
      if (user.role !== "admin") return Response.json({ error: "Forbidden — experts only" }, { status: 403 });
      const { sample_id } = body;
      const sp = await base44.entities.VerificationSample.filter({ id: sample_id }, { limit: 1 });
      const sample = (sp.items || sp || [])[0];
      if (!sample) return Response.json({ error: "Sample not found" }, { status: 404 });
      const label = sample.consensus_label || "";
      if (!label) return Response.json({ error: "No consensus label to confirm" }, { status: 400 });
      const awarded = await confirmSample(base44, sample, label, sample.difficulty_tier || "common", sample.game_mode || "hint_shown", user, null);
      return Response.json({ confirmed: true, label, awarded });
    }

    // ---- OVERRIDE LABEL (expert) ----
    if (action === "overrideLabel") {
      if (user.role !== "admin") return Response.json({ error: "Forbidden — experts only" }, { status: 403 });
      const { sample_id, label } = body;
      if (!label) return Response.json({ error: "label required" }, { status: 400 });
      const sp = await base44.entities.VerificationSample.filter({ id: sample_id }, { limit: 1 });
      const sample = (sp.items || sp || [])[0];
      if (!sample) return Response.json({ error: "Sample not found" }, { status: 404 });
      const awarded = await confirmSample(base44, sample, label, sample.difficulty_tier || "common", sample.game_mode || "hint_shown", user, null);
      return Response.json({ confirmed: true, label, overridden: true, awarded });
    }

    return Response.json({ error: "Unknown action: " + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Confirm a sample's final label: award points to matching voters, lock the
// sample, and best-effort update denormalized TeamMember stats.
// `expert` is the confirming admin user (null for auto-consensus). `currentPlayerId`
// is the player whose submitVote triggered an auto-confirm (so we can return their
// points); null for expert confirm/override.
async function confirmSample(base44, sample, finalLabel, tier, mode, expert, currentPlayerId) {
  // Determine if the final label is a rare/threatened species → upgrade tier
  let finalTier = tier;
  try {
    const sp = await base44.entities.Species.filter(
      { name: { $regex: finalLabel, $options: "i" } }, { limit: 1, fields: ["name", "conservation_status"] }
    );
    const species = (sp.items || sp || [])[0];
    if (species && RARE_STATUSES.includes(species.conservation_status)) {
      finalTier = "rare";
    }
  } catch { /* non-blocking */ }

  const vp = await base44.entities.ClassificationVote.filter({ sample_id: sample.id }, { limit: 50 });
  const votes = vp.items || vp || [];
  const trainingComments = votes
    .filter((v) => v.voted_label === finalLabel && v.training_comment)
    .map((v) => v.training_comment);

  const now = new Date().toISOString();
  const updates = [];
  let playerPoints = 0;
  for (const v of votes) {
    const isCorrect = v.voted_label === finalLabel;
    const points = isCorrect ? computeVotePoints(finalTier, mode, 0) : 0;
    if (isCorrect && v.player_id === currentPlayerId) playerPoints = points;
    updates.push({ id: v.id, is_correct: isCorrect, points_awarded: points, awarded_at: now });
  }
  if (updates.length) await base44.entities.ClassificationVote.bulkUpdate(updates);

  await base44.entities.VerificationSample.update(sample.id, {
    verified_label: finalLabel,
    status: "verified",
    verified_by: expert ? expert.id : "auto-consensus",
    verified_at: now,
    queued_for_training: true,
    expert_confirmed: !!expert,
    expert_id: expert ? expert.id : "",
    expert_name: expert ? (expert.full_name || expert.email) : "",
    difficulty_tier: finalTier,
    training_comments: trainingComments,
    vote_count: votes.length,
  });

  // Best-effort: denormalize stats onto TeamMember records for correct voters
  try {
    const correctVoters = votes.filter((v) => v.voted_label === finalLabel);
    const emails = correctVoters.map((v) => v.player_email).filter(Boolean);
    if (emails.length) {
      const tmPage = await base44.entities.TeamMember.filter({ email: { $in: emails } }, { limit: 50 });
      const tms = tmPage.items || tmPage || [];
      const pointsByEmail = {};
      for (const v of correctVoters) {
        pointsByEmail[v.player_email] = (pointsByEmail[v.player_email] || 0) + (v.points_awarded || 0);
      }
      const tmUpdates = tms.map((tm) => {
        const gained = pointsByEmail[tm.email] || 0;
        const newPoints = (tm.total_points || 0) + gained;
        const lvl = getLevel(newPoints);
        return {
          id: tm.id,
          total_points: newPoints,
          game_level: lvl.level,
          game_title: lvl.title,
          verified_count: (tm.verified_count || 0) + 1,
        };
      });
      if (tmUpdates.length) await base44.entities.TeamMember.bulkUpdate(tmUpdates);
    }
  } catch { /* non-blocking — live stats come from ClassificationVote */ }

  return { matched: updates.filter((u) => u.is_correct).length, total: updates.length, playerPoints };
}

// Compute a player's stats from their votes (one filter + one count).
async function computePlayerStats(base44, playerId, playerName) {
  const judgedPage = await base44.entities.ClassificationVote.filter(
    { player_id: playerId, awarded_at: { $exists: true } },
    { sort: "-awarded_at", limit: 200, fields: ["is_correct", "points_awarded", "difficulty_tier", "awarded_at"] }
  );
  const judged = judgedPage.items || judgedPage || [];
  const totalCount = await base44.entities.ClassificationVote.count({ player_id: playerId });

  let totalPoints = 0, correct = 0, rareCorrect = 0;
  for (const v of judged) {
    totalPoints += v.points_awarded || 0;
    if (v.is_correct) {
      correct++;
      if (v.difficulty_tier === "rare") rareCorrect++;
    }
  }

  // Current streak: consecutive correct from most recent judged vote
  let currentStreak = 0;
  for (const v of judged) {
    if (v.is_correct) currentStreak++; else break;
  }
  // Best streak: chronological scan
  let bestStreak = 0, run = 0;
  for (const v of [...judged].reverse()) {
    if (v.is_correct) { run++; if (run > bestStreak) bestStreak = run; }
    else run = 0;
  }

  const verifiedCount = judged.length;
  const accuracyPct = verifiedCount > 0 ? Math.round((correct / verifiedCount) * 100) : 0;
  const lvl = getLevel(totalPoints);
  const stats = {
    player_name: playerName,
    total_points: totalPoints,
    total_votes: totalCount,
    verified_count: verifiedCount,
    correct_votes: correct,
    rare_correct_count: rareCorrect,
    accuracy_pct: accuracyPct,
    current_streak: currentStreak,
    best_streak: bestStreak,
    level: lvl.level,
    title: lvl.title,
    progress: lvl.progress,
    next_title: lvl.nextTitle,
    points_to_next: lvl.pointsToNext,
  };
  stats.badges = getEarnedBadges(stats);
  return stats;
}