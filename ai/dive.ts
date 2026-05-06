/**
 * Variant AI: "dive"
 *
 * Mid-board plane-switch route. Pathfinders march to the soap-dish
 * (mid-floor 5,5) and capture it on the way, then plane-switch UP to
 * ceiling (5,5) — entering the ceiling from the SW-center rather than
 * the canonical north-wall ladder OR the corner-flank route. They then
 * walk east to spider-web (9,9). Vanguard-bravo continues with the
 * baseline staging on the floor and wall, providing the towel-rack /
 * wall-crack secondary axis. Vanguard-alpha and the queen-guard match
 * baseline behavior.
 *
 * Why this is route-distinct from baseline / rush / turtle / flank:
 *   - Pathfinders enter the ceiling at a mid-board interior tile, not
 *     a corner — web-watch (ceiling 8,9) lies directly between (5,5)
 *     and the web, so the ant force punches through it from the SW
 *     instead of being intercepted from the NW or pulled to a corner.
 *   - Vanguard-bravo retains the wall-crack ladder, so the spider
 *     threat-response (decideThreat in spider-l1) still triggers on
 *     wall-crack, pulling silk-line off the web — preserving the
 *     "thin the web defenders" effect baseline relies on.
 *
 * Interactions:
 *   - plane-switch ability (interaction 1): pathfinders use the mage's
 *     plane-switch from a non-edge floor tile (5,5) — only possible
 *     because the ability teleports to the same (x,y) on the target
 *     plane. Other variants tie plane-switch to corner tiles (flank)
 *     or to the home base (rush). This exercises the ability's
 *     mid-board capability that no current variant does.
 *   - soap-dish capture + spider counter-push (interaction 2):
 *     pathfinders capture soap-dish on the way, contributing to the
 *     ant-controlled-POST count that triggers the spider counter-push
 *     in spider-l1. The counter-push pulls the largest spider party
 *     toward wall-crack, which clears the web of one defender.
 *   - towel-rack / wall-crack pair (interaction 3): vanguard-bravo
 *     stages the floor → wall transition, so the second axis of attack
 *     reaches the ceiling via the canonical paired-POST route.
 */

import type { GameState, Post, TileCoord } from '../engine/types.ts';

import {
  buildAntPolicy,
  CEILING_CAPABLE,
  moveToOrHold,
  nextStageTarget,
  PATHFINDERS,
  postLocation,
  SOAP_DISH,
  SPIDER_WEB,
  VANGUARD_BRAVO,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

/**
 * Pathfinders' route:
 *   1. If they don't yet hold soap-dish, march to soap-dish (floor 5,5).
 *   2. Once at soap-dish (and after capture resolves), plane-switch
 *      directly to ceiling (5,5) by issuing a move-to ceiling target;
 *      the engine's tryPlaneTransition uses the mage's plane-switch
 *      ability to teleport to the same (x,y) on the destination plane.
 *   3. From ceiling (5,5), march to spider-web (9,9).
 */
const pathfindersTarget = (
  soap: Post | undefined,
  webLoc: TileCoord | undefined,
): TileCoord | undefined => {
  if (webLoc === undefined) return undefined;
  if (soap === undefined) return webLoc;

  // Phase 1: if soap-dish isn't ours yet, take it. The pathfinders
  // capture it and unlock phase 2.
  if (soap.owner !== 'ant') return soap.location;

  // Phase 2/3: head for the spider-web. If still on the floor, the
  // engine's tryPlaneTransition will plane-switch us to ceiling at our
  // current (x,y) — which is the soap-dish tile (5,5). From there,
  // greedy stepping walks east-southeast toward (9,9).
  return webLoc;
};

export const divePlayer: AIPolicy = buildAntPolicy('dive', (state: GameState) => {
  const stageTarget = nextStageTarget(state);
  const soap = state.posts.get(SOAP_DISH);
  const webLoc = postLocation(state, SPIDER_WEB);
  return (party) => {
    if (party.id === PATHFINDERS) {
      const target = pathfindersTarget(soap, webLoc);
      if (target === undefined) return { orders: [], posture: 'fight' };
      return { orders: moveToOrHold(party, target), posture: 'fight' };
    }
    if (party.id === VANGUARD_BRAVO) {
      // Bravo runs the canonical floor/wall stage chain and ultimately
      // climbs the wall-crack ladder. CEILING_CAPABLE means the engine
      // will plane-switch when the chain reaches the ceiling phase.
      if (stageTarget !== undefined) {
        return { orders: moveToOrHold(party, stageTarget.location), posture: 'fight' };
      }
      if (webLoc !== undefined) {
        return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
      }
      return { orders: [], posture: 'fight' };
    }
    // Other CEILING_CAPABLE parties (none in roster, but future-proof):
    // fall back to baseline-style staging.
    if (CEILING_CAPABLE.has(party.id)) {
      if (webLoc !== undefined) {
        return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
      }
      return { orders: [], posture: 'fight' };
    }
    // Floor-only parties (vanguard-alpha): mirror baseline staging.
    if (stageTarget !== undefined) {
      return { orders: moveToOrHold(party, stageTarget.location), posture: 'fight' };
    }
    return { orders: [], posture: 'fight' };
  };
});
