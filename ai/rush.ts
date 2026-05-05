/**
 * Variant AI: "rush"
 *
 * All field parties immediately target the spider-web from turn 1,
 * skipping the staged POST captures the baseline does. Pathfinders and
 * vanguard-bravo (both with plane-switch) head straight to the ceiling;
 * vanguard-alpha walks the floor and incidentally captures POSTs en
 * route but isn't trying to.
 *
 * Hypothesis: faster victories when the plane-switch parties survive,
 * but lower win rate than baseline because the spider counter-push
 * doesn't fire in time to thin the web defenders.
 *
 * Used only by the route-diversity measurement. NOT the tuning
 * reference — that is `ai/baseline.ts`.
 */

import type { GameState } from '../engine/types.ts';

import { buildAntPolicy, moveToOrHold, postLocation, SPIDER_WEB } from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

export const rushPlayer: AIPolicy = buildAntPolicy('rush', (state: GameState) => {
  const target = postLocation(state, SPIDER_WEB);
  return (party) => {
    if (target === undefined) return { orders: [], posture: 'fight' };
    return { orders: moveToOrHold(party, target), posture: 'fight' };
  };
});
