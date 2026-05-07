/**
 * Baseline player AI — the standard ant strategy.
 *
 * Strategy: "soap-dish staging with commit." A competent default that any
 * standard player would discover, not a master plan. Variants like
 * rush/turtle/flank/dive/jelly-rush remain genuine meta-strategies that
 * beat the baseline through smarter routing or timing.
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
 *      and stay committed. This is the bug the previous baseline had —
 *      once mid-POSTs were taken parties would idle and time out.
 *
 * What this AI deliberately does NOT do (kept as variant-only meta):
 *   - per-spider-party micro-tactics (e.g., "dodge web-watch through
 *     ceiling (5,5)"); see flank/dive for that.
 *   - plane-switch shortcuts that bypass the wall-crack ladder; see
 *     dive.
 *   - holding ceiling parties at home until the queen ultimate charges;
 *     see turtle.
 *   - skipping the staged captures entirely; see rush/jelly-rush.
 *   - queen-guard worker stockpiling jelly on field parties; that's the
 *     jelly-rush / dive supply-line meta.
 */

import type { AbilityId, AbilityOrder, GameState, PartyId } from '../engine/types.ts';

import {
  buildAntPolicy,
  CEILING_CAPABLE,
  moveToOrHold,
  nextStageTarget,
  postLocation,
  postsOfType,
  SPIDER_WEB,
  WALL_CRACK_TYPE,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;

/** True iff every wall-crack POST is ant-owned. After that, the canonical
 * mid-POST chain is complete and all field parties commit to the web. */
const wallCracksCaptured = (state: GameState): boolean => {
  const cracks = postsOfType(state, WALL_CRACK_TYPE);
  if (cracks.length === 0) return false;
  return cracks.every((p) => p.owner === 'ant');
};

/** Constructs a `jelly-apply` ability order. Ceiling-capable parties
 * self-buff on turn 0 with target=own party id. */
const jellyApplyOrder = (target: PartyId): AbilityOrder => ({
  kind: 'use-ability',
  abilityId: JELLY_APPLY,
  target,
});

export const baselinePlayer: AIPolicy = buildAntPolicy('baseline-staging', (state: GameState) => {
  const stageTarget = nextStageTarget(state);
  const webLoc = postLocation(state, SPIDER_WEB);
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
    // party paths to the web and stays committed. This is the fix for
    // the previous "mid-POSTs captured then wander" timeout bug.
    if (committed && webLoc !== undefined) {
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
