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

import { antPlacement } from './placement-helpers.ts';
import { buildAntPolicy, moveToOrHold, postLocation, SPIDER_WEB } from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

/** Round-9 placement: split routes so the deep-raider's south-floor
 * intercept arc (forward-stage at floor 8,5, detect radius 3) can't
 * hit the trio simultaneously. Vanguard-alpha takes the northern
 * y=0 row at (5, 0) for the NE flank — well outside the raider's
 * arc — vanguard-bravo takes the canonical NW diagonal at (3, 3)
 * for floor staging, and pathfinders takes the southern x=0 column
 * at (0, 5) for the SW flank. Each party arrives at the web via a
 * different approach so deep-raider has at most one intercept
 * opportunity. All three within Chebyshev-5 of storm-drain (0, 0). */
const rushPlacement = (state: GameState): GameState =>
  antPlacement(state, {
    'vanguard-alpha': { plane: 'floor', x: 5, y: 0 },
    'vanguard-bravo': { plane: 'floor', x: 3, y: 3 },
    pathfinders: { plane: 'floor', x: 0, y: 5 },
  });

const rushCore = buildAntPolicy('rush', (state: GameState) => {
  const target = postLocation(state, SPIDER_WEB);
  return (party) => {
    if (target === undefined) return { orders: [], posture: 'fight' };
    return { orders: moveToOrHold(party, target), posture: 'fight' };
  };
});

export const rushPlayer: AIPolicy = { ...rushCore, placement: rushPlacement };
