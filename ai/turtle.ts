/**
 * Variant AI: "turtle"
 *
 * Vanguards play offensively: they capture floor / wall POSTs in
 * sequence (same staging baseline does for the floor parties) so the
 * spider counter-push fires and pulls silk-line + web-watch off the
 * web. The ceiling-capable parties (pathfinders, vanguard-bravo) HOLD
 * at the storm-drain healing on the home POST until the Queen ultimate
 * is nearly charged, then plane-switch to the ceiling and assault a
 * thinned web-guard.
 *
 * Hypothesis: same end-state as baseline but the assault fires at turn
 * ~16 instead of ~8, producing a noticeably longer scenario.
 */

import type { GameState, Post, PostId } from '../engine/types.ts';

import {
  buildAntPolicy,
  CEILING_CAPABLE,
  moveToOrHold,
  postLocation,
  SOAP_DISH,
  SPIDER_WEB,
  TOWEL_RACK,
  WALL_CRACK,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

const STAGE_TARGETS: readonly PostId[] = [SOAP_DISH, TOWEL_RACK, WALL_CRACK];

/** Charge fraction at which the held parties unleash. */
const UNLEASH_FRACTION = 0.8;

const nextStageTarget = (state: GameState): Post | undefined => {
  for (const id of STAGE_TARGETS) {
    const p = state.posts.get(id);
    if (p && p.owner !== 'ant') return p;
  }
  return undefined;
};

export const turtlePlayer: AIPolicy = ((): AIPolicy => {
  // Closure over scenario isn't supported by the policy interface, so
  // fold scenario lookup into decide() via a thin wrapper.
  const base = buildAntPolicy('turtle', (state: GameState) => {
    const stageTarget = nextStageTarget(state);
    return (party) => {
      if (CEILING_CAPABLE.has(party.id)) {
        // Hold while uncharged; the unleash gate is checked in the
        // decide-wrapper below where we have ScenarioData.
        return null;
      }
      if (stageTarget === undefined) return { orders: [], posture: 'fight' };
      return { orders: moveToOrHold(party, stageTarget.location), posture: 'fight' };
    };
  });
  return {
    name: 'turtle',
    faction: 'ant',
    decide(state, scenario, rng) {
      const intermediate = base.decide(state, scenario, rng);
      const data = scenario;
      const chargeMax = data.queen.ultimate.chargeMax;
      const unleash = state.queenUltimateCharge >= UNLEASH_FRACTION * chargeMax;
      if (!unleash) return intermediate;
      const webLoc = postLocation(state, SPIDER_WEB);
      if (webLoc === undefined) return intermediate;
      const nextParties = new Map(intermediate.parties);
      for (const [id, party] of intermediate.parties) {
        if (party.faction !== 'ant') continue;
        if (!CEILING_CAPABLE.has(party.id)) continue;
        if (party.leaderless) continue;
        const orders = moveToOrHold(party, webLoc);
        if (orders === party.orders && party.posture === 'fight') continue;
        nextParties.set(id, { ...party, orders, posture: 'fight' });
      }
      return { ...intermediate, parties: nextParties };
    },
  };
})();
