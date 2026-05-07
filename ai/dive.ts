/**
 * Variant AI: "dive" (round-2 redesign)
 *
 * Near-corner plane-switch dive. The original dive routed pathfinders
 * via the mid-board soap-dish (5,5) and then north-east toward the
 * web (9,9), which put the assault directly through web-watch's
 * patrol arc on the ceiling (8,9). The redesign sends pathfinders
 * along the *opposite-corner* approach: walk floor (1,1) → (9,9)
 * (the tile directly under the web), then plane-switch teleports
 * pathfinders to ceiling (9,9) which IS the web tile. Web-watch
 * never gets a chance to intercept.
 *
 * Roster behavior:
 *   pathfinders     → rush floor (web.x, web.y) → plane-switch to web
 *   vanguard-bravo  → rush spider-web (rush-tempo)
 *   vanguard-alpha  → rush spider-web (rush-tempo, floor-only path)
 *   queen-guard     → worker fires `jelly-apply` each turn at the
 *                     pathfinders (the kill party), stockpiling
 *                     attack/armor multipliers via the engine's
 *                     `jellyMultipliers` lookup.
 *
 * Why this is route-distinct from baseline / rush / turtle / flank /
 * jelly-rush:
 *   - Pathfinders enters the ceiling AT THE WEB TILE itself via
 *     plane-switch from floor (web.x, web.y). No other variant
 *     teleports onto the web — flank uses the corner ladder, dive
 *     (old) used a mid-board landing, rush walks the canonical
 *     ladder, jelly-rush rushes the web but goes through the wall.
 *   - The engine's `tryPlaneTransition` call uses plane-switch when
 *     the target plane differs from the party's plane and the party
 *     carries a mage with the ability AND no `no-fly` units. The
 *     mage-only pathfinders party (1 mage + 3 archers + 2 scouts)
 *     satisfies both gates.
 *
 * Interactions:
 *   - plane-switch ability + opposite-corner route: pathfinders use the
 *     mage's plane-switch from floor (9,9) to land directly on the web
 *     tile, fully bypassing web-watch which sits at ceiling (8,9).
 *   - magic-arrow + volley pre-battle stack: the pathfinders roster
 *     (1 mage + 3 archers) auto-fires `magic-arrow` (22 dmg) and
 *     `volley` in `applyOpeningAbilities` before round 1.
 *   - jelly-apply supply line: the queen-guard's worker stockpiles a
 *     dose on pathfinders each turn; multipliers boost attack/armor
 *     in the kill battle.
 *   - rush-tempo on the secondary axes: vanguard-alpha/bravo also rush
 *     the web so multiple ant parties pile onto it within a couple
 *     turns.
 */

import { sameCoord } from '../engine/coord.ts';
import type {
  AbilityId,
  AbilityOrder,
  GameState,
  Order,
  Party,
  TileCoord,
} from '../engine/types.ts';

import { antPlacement } from './placement-helpers.ts';
import {
  buildAntPolicy,
  closestFieldPartyId,
  moveToOrHold,
  partyAlive,
  PATHFINDERS,
  postLocation,
  SPIDER_WEB,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;

/** Pathfinders' near-corner dive route. Walks floor (web.x, web.y) —
 * the tile directly under the spider-web — then plane-switches to
 * ceiling (web.x, web.y) which IS the web tile. The mage's
 * plane-switch ability does the teleport per `tryPlaneTransition`. */
const pathfindersTarget = (party: Party, webLoc: TileCoord | undefined): TileCoord | undefined => {
  if (webLoc === undefined) return undefined;
  if (party.location.plane === 'floor') {
    const floorLanding: TileCoord = { plane: 'floor', x: webLoc.x, y: webLoc.y };
    if (!sameCoord(party.location, floorLanding)) return floorLanding;
    return webLoc;
  }
  return webLoc;
};

const queenGuardOrders = (state: GameState, queenGuard: Party): readonly Order[] => {
  // Prefer pathfinders (the kill party) when alive; fall back to closest
  // field party. Concentrating doses on pathfinders is what makes this
  // variant distinct from jelly-rush, which targets whoever is closest.
  const pathfinders = state.parties.get(PATHFINDERS);
  let target;
  if (pathfinders && !pathfinders.leaderless && partyAlive(pathfinders)) {
    target = PATHFINDERS;
  } else {
    target = closestFieldPartyId(state, queenGuard);
  }
  if (target === undefined) return [];
  const order: AbilityOrder = { kind: 'use-ability', abilityId: JELLY_APPLY, target };
  return [order];
};

/** Round-9 placement: keep pathfinders' forward push but step off the
 * deep-raider's intercept window. The round-7 (5, 5) tile sits on the
 * forward-staged deep-raider's Chebyshev-3 detection arc (the raider
 * pre-stages to floor 8,5); landing at (4, 4) preserves one tile of
 * slack so pathfinders reaches the launch tile and plane-switches
 * before the raider intercepts. Inside Chebyshev-5 of storm-drain. */
const divePlacement = (state: GameState): GameState =>
  antPlacement(state, {
    pathfinders: { plane: 'floor', x: 4, y: 4 },
  });

const diveCore = buildAntPolicy(
  'dive',
  (state: GameState) => {
    const webLoc = postLocation(state, SPIDER_WEB);
    return (party) => {
      if (party.id === PATHFINDERS) {
        const target = pathfindersTarget(party, webLoc);
        if (target === undefined) return { orders: [], posture: 'fight' };
        return { orders: moveToOrHold(party, target), posture: 'fight' };
      }
      if (webLoc === undefined) return { orders: [], posture: 'fight' };
      return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
    };
  },
  queenGuardOrders,
);

export const divePlayer: AIPolicy = { ...diveCore, placement: divePlacement };
