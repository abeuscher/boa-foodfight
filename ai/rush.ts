/**
 * Variant AI: "rush" (round-23 venom-blast survival rebalance)
 *
 * All field parties immediately target the spider-web from turn 1,
 * skipping the staged POST captures the baseline does. The round-22
 * venom-blast pre-battle ability (4 dmg/unit on the front rank from
 * web-guard, silk-line, deep-raider) was wiping rush parties' front
 * rows on contact with the ceiling because all three parties walked
 * tile-by-tile into web-watch's intercept arc and ate web-guard's
 * blast at the web simultaneously.
 *
 * Round-23 fix:
 *   - Ceiling-capable parties (pathfinders, vanguard-bravo) now run
 *     the launch-tile → plane-switch dive line: walk floor (web.x,
 *     web.y), then a follow-up `move-to` with target=web fires
 *     `tryPlaneTransition` → `ant-plane-switch` (uses=1) to teleport
 *     onto the web tile, fully bypassing web-watch's (8,9) patrol
 *     arc. Same mechanic baseline / dive use; the rush identity is
 *     preserved by the floor-only vanguard-alpha (skips POST staging
 *     entirely and walks straight to the web).
 *   - vanguard-alpha continues the rush-tempo floor walk straight to
 *     the web (no staging chain).
 *   - Placement returns to a tighter forward stage: pathfinders
 *     forward at (4, 4), vanguard-bravo at (3, 4), vanguard-alpha at
 *     (5, 0). The (5, 0) NE row keeps alpha out of deep-raider's
 *     forward-stage Cheb-3 arc at floor (8, 5). Pathfinders/bravo
 *     reach the launch tile within 5 turns and plane-switch.
 *
 * Why this is route-distinct from baseline / dive:
 *   - Baseline: vanguard-alpha walks the canonical staging chain
 *     (soap-dish → towel-rack → wall-crack). Dive: queen-guard's
 *     worker concentrates jelly-apply doses on pathfinders.
 *   - Rush: vanguard-alpha skips staging entirely, queen-guard sits
 *     idle (no jelly supply line). Pure tempo — three field parties
 *     all rush the web, just via different routes (floor walk for
 *     alpha, plane-switch for the two ceiling-capable parties).
 *
 * Hypothesis: faster victories when the plane-switch parties land on
 * the web (bypassing web-watch + ceiling tile-by-tile venom-blast
 * exposure). Lower kill output than baseline because no jelly stack
 * — that's what makes rush a distinct variant.
 *
 * Used only by the route-diversity measurement. NOT the tuning
 * reference — that is `ai/baseline.ts`.
 */

import type { GameState } from '../engine/types.ts';

import { launchTileDiveTarget } from './dive-line.ts';
import { tryOpportunisticRecruit } from './neutral-recruit-helper.ts';
import { antPlacement } from './placement-helpers.ts';
import {
  buildAntPolicy,
  CEILING_CAPABLE,
  moveToOrHold,
  postLocation,
  SPIDER_WEB,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

/** Round-23 placement: NE row alpha at (5, 0) keeps the rush identity
 * (skips deep-raider's south-floor arc); pathfinders forward to
 * (4, 4) with one tile of slack from the deep-raider's Cheb-3 detect
 * arc at floor (8, 5); vanguard-bravo on the NW diagonal at (2, 4) so
 * its dive-line approach to the launch tile takes a different
 * pathfinder line than pathfinders' own (4, 4). All within
 * Chebyshev-5 of storm-drain. */
const rushPlacement = (state: GameState): GameState =>
  antPlacement(state, {
    'vanguard-alpha': { plane: 'floor', x: 5, y: 0 },
    'vanguard-bravo': { plane: 'floor', x: 2, y: 4 },
    pathfinders: { plane: 'floor', x: 4, y: 4 },
  });

const rushCore = buildAntPolicy('rush', (state: GameState) => {
  const target = postLocation(state, SPIDER_WEB);
  return (party) => {
    // Round-10 opportunistic neutral recruit. Fires only when a rush
    // party happens to land on a wandering cockroach/mouse — never
    // detours from the spider-web push. Stinkbugs are filtered out
    // by the helper to avoid the damage-zone spawn on failed recruit.
    const recruit = tryOpportunisticRecruit(state, party);
    if (recruit) return recruit;
    if (target === undefined) return { orders: [], posture: 'fight' };
    // Round-23: ceiling-capable parties take the launch-tile dive
    // route so plane-switch lands them on the web tile, bypassing
    // web-watch's ceiling intercept and avoiding tile-by-tile venom-
    // blast exposure on the ceiling march. Floor-only vanguard-alpha
    // keeps the rush identity (straight floor walk, skip staging).
    if (CEILING_CAPABLE.has(party.id)) {
      const dive = launchTileDiveTarget(party, target);
      if (dive !== undefined) return { orders: moveToOrHold(party, dive), posture: 'fight' };
    }
    return { orders: moveToOrHold(party, target), posture: 'fight' };
  };
});

export const rushPlayer: AIPolicy = { ...rushCore, placement: rushPlacement };
