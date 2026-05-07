/**
 * Baseline player AI — the standard ant strategy.
 *
 * Strategy: "soap-dish staging with commit + east-wall awareness." A
 * competent default that any standard player would discover, plus one
 * map-specific reaction to the round-3 `deep-raider` spider party that
 * sits on east-wall (5,5). Variants like rush/turtle/flank/dive/
 * jelly-rush remain genuine meta-strategies that beat the baseline
 * through smarter routing or timing.
 *
 *   1. Turn 0 freebie: ceiling-capable parties (pathfinders, vanguard-
 *      bravo — both carry an ant-mage) self-buff with `jelly-apply`. The
 *      buff costs nothing on turn 0 (parties haven't moved yet) and the
 *      attack/armor multiplier is still active when the assault hits the
 *      web a few turns later.
 *   2. Stage captures (soap-dish → towel-rack → wall-crack), with the
 *      mid-POST chain advanced by `nextStageTarget` so per-seed POST
 *      randomization is handled. Parties walk the canonical ladder
 *      through wall-crack — no plane-switch shortcuts; that's a
 *      meta-strategy reserved for `dive`.
 *   3. Commit to the kill: once the canonical chain is complete (every
 *      mid-POST is ant-owned), all field parties path to the spider-web
 *      and stay committed.
 *   4. East-wall awareness: when the `deep-raider` spider party is still
 *      alive on east-wall (5,5), the corner approach for vanguard-bravo
 *      is contested — deep-raider's 2 elites + 2 soldiers + spinner can
 *      pivot onto the ceiling and intercept a direct NE push. While
 *      deep-raider lives, vanguard-bravo trades speed for safety: it
 *      routes via a captured wall-crack POST (the canonical ladder)
 *      before pushing to the web. When deep-raider falls, vanguard-
 *      bravo commits directly. This is a real strategic trade: the
 *      detour costs ~2 turns of timeout pressure but avoids a flanking
 *      ambush that often costs the kill battle outright.
 *
 * What this AI deliberately does NOT do (kept as variant-only meta):
 *   - per-spider-party micro-tactics beyond the deep-raider reaction
 *     above (e.g., "dodge web-watch through ceiling (5,5)"); see
 *     flank/dive for that.
 *   - plane-switch shortcuts that bypass the wall-crack ladder; see
 *     dive.
 *   - holding ceiling parties at home until the queen ultimate charges;
 *     see turtle.
 *   - skipping the staged captures entirely; see rush/jelly-rush.
 *   - queen-guard worker stockpiling jelly on field parties; that's the
 *     jelly-rush / dive supply-line meta.
 */

import type {
  AbilityId,
  AbilityOrder,
  GameState,
  Party,
  PartyId,
  TileCoord,
} from '../engine/types.ts';

import {
  buildAntPolicy,
  CEILING_CAPABLE,
  moveToOrHold,
  nextStageTarget,
  partyAlive,
  postLocation,
  postsOfType,
  SPIDER_WEB,
  VANGUARD_BRAVO,
  WALL_CRACK_TYPE,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;
const DEEP_RAIDER: PartyId = 'deep-raider' as PartyId;

/** True iff every wall-crack POST is ant-owned. After that, the canonical
 * mid-POST chain is complete and all field parties commit to the web. */
const wallCracksCaptured = (state: GameState): boolean => {
  const cracks = postsOfType(state, WALL_CRACK_TYPE);
  if (cracks.length === 0) return false;
  return cracks.every((p) => p.owner === 'ant');
};

/** True iff the round-3 `deep-raider` spider party is still alive. The
 * party sits on east-wall (5,5) and is the threat that motivates the
 * vanguard-bravo detour. Returns false if the party is missing,
 * leaderless, or has no living units. */
const deepRaiderAlive = (state: GameState): boolean => {
  const dr = state.parties.get(DEEP_RAIDER);
  if (!dr) return false;
  if (dr.faction !== 'spider') return false;
  if (dr.leaderless) return false;
  return partyAlive(dr);
};

/** Pick a captured wall-crack POST's location to use as a safe transit
 * waypoint for vanguard-bravo. Prefers the lowest-id captured wall-crack
 * for stable routing across seeds. Returns undefined if no wall-crack
 * is yet ant-owned. */
const capturedWallCrackLocation = (state: GameState): TileCoord | undefined => {
  for (const post of postsOfType(state, WALL_CRACK_TYPE)) {
    if (post.owner === 'ant') return post.location;
  }
  return undefined;
};

/** Constructs a `jelly-apply` ability order. Ceiling-capable parties
 * self-buff on turn 0 with target=own party id. */
const jellyApplyOrder = (target: PartyId): AbilityOrder => ({
  kind: 'use-ability',
  abilityId: JELLY_APPLY,
  target,
});

/** True iff vanguard-bravo should detour through the wall-crack ladder
 * rather than committing direct to the web. Active only during the
 * commit phase, only when deep-raider is alive, and only if the party
 * has not yet reached the wall-crack waypoint (otherwise the detour is
 * already complete and we push to the web). */
const shouldDetourBravo = (
  state: GameState,
  party: Party,
  wallCrackLoc: TileCoord | undefined,
): boolean => {
  if (party.id !== VANGUARD_BRAVO) return false;
  if (!deepRaiderAlive(state)) return false;
  if (wallCrackLoc === undefined) return false;
  // If we're already on the ceiling at-or-past the wall-crack waypoint,
  // the detour is done — push to web.
  if (party.location.plane !== 'floor') return false;
  return true;
};

export const baselinePlayer: AIPolicy = buildAntPolicy('baseline-staging', (state: GameState) => {
  const stageTarget = nextStageTarget(state);
  const webLoc = postLocation(state, SPIDER_WEB);
  const wallCrackLoc = capturedWallCrackLocation(state);
  const isOpeningTurn = state.turn === 0;
  const committed = wallCracksCaptured(state);
  return (party) => {
    // Turn-0 freebie: ceiling-capable parties self-buff with jelly-apply.
    // Costs nothing (no movement yet) and the multiplier persists into
    // the kill battle.
    if (isOpeningTurn && CEILING_CAPABLE.has(party.id)) {
      return { orders: [jellyApplyOrder(party.id)], posture: 'fight' };
    }

    // Commit phase: once the canonical chain is complete, every field
    // party paths to the web. Vanguard-bravo's NE corner approach is
    // contested by `deep-raider` on east-wall (5,5); while that party
    // lives we detour bravo through a captured wall-crack on the
    // canonical ladder so the ambush arc never connects. Once deep-
    // raider falls, bravo commits directly with the others.
    if (committed && webLoc !== undefined) {
      if (shouldDetourBravo(state, party, wallCrackLoc) && wallCrackLoc !== undefined) {
        return { orders: moveToOrHold(party, wallCrackLoc), posture: 'fight' };
      }
      return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
    }

    // Staging phase: walk the canonical chain (soap-dish → towel-rack
    // → wall-crack) per `nextStageTarget`.
    if (stageTarget !== undefined) {
      return { orders: moveToOrHold(party, stageTarget.location), posture: 'fight' };
    }

    // Every stage POST is ours but the wall-cracks-captured branch
    // didn't fire (rare race) — fall back to the web.
    if (webLoc !== undefined) {
      return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
    }
    return { orders: [], posture: 'fight' };
  };
});
