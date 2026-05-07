/**
 * Variant AI: "flank" (round-2 redesign)
 *
 * Genuine corner-flank routing on the 6-plane geometry, hardened with
 * a curved post-corner ceiling approach so the assault avoids
 * web-watch (ceiling 8,9). The original flank routed both ceiling
 * parties straight from their corner to the web (9,9); pathfinders'
 * line from (0,9) → (9,9) crossed (8,9) directly, getting clipped by
 * web-watch. The redesign biases each party's ceiling path off that
 * tile via a per-party intermediate waypoint.
 *
 * Roster behavior:
 *   pathfinders     → SW floor (0,9) → ceiling (0,9) → ceiling (5,5)
 *                     → web (9,9). The (5,5) waypoint forces the
 *                     diagonal approach (5,5)→(6,6)→(7,7)→(8,8)→(9,9),
 *                     never touching (8,9).
 *   vanguard-bravo  → NE floor (9,0) → ceiling (9,0) → web (9,9)
 *                     along x=9 column. Never crosses x=8 so
 *                     web-watch at (8,9) doesn't intercept.
 *   vanguard-alpha  → mid-POST staging (canonical), preserved.
 *   queen-guard     → defends with empty orders (canonical).
 *
 * Tests asserting the existing turn-0 jelly-apply pre-buff and the
 * turn-1 floor-corner targets are preserved exactly. Behavior past
 * turn 1 (which the tests do not assert) is what changed.
 *
 * On turn 0 — before the corner march starts — both ceiling-capable
 * parties issue a `jelly-apply` self-buff order. Pathfinders and
 * vanguard-bravo each contain an ant-mage; the ability target is
 * own party id. The +1 attack window from the jelly buff lines up
 * with the queen-battle arrival at the spider-web on the ceiling,
 * where the queen-proximity buff already stacks.
 *
 * Late-game adjustment: once a ceiling-capable party is co-located
 * with an isolated single-unit spider party (e.g., a spiderling
 * spawned by the spider-queen on turn 3), it issues a `recruit`
 * ability order on that party. Recruit has 25% success per attempt;
 * even on failure it costs the spider one mage-attack-turn but
 * converts the spiderling on success, which both removes a
 * distractor and grows the assaulting party.
 *
 * Interactions:
 *   - corner-flank route + east-edge / diagonal ceiling march
 *     (interaction 1): the post-corner waypoints force the assault
 *     OFF the (8,9) intercept tile. Vanguard-bravo travels the x=9
 *     column; pathfinders takes the (5,5) diagonal. Web-watch's
 *     patrol arc never connects.
 *   - jelly-apply pre-buff + queen-proximity buff (interaction 2):
 *     turn-0 jelly-apply gives both ceiling parties a +1 attack /
 *     +1 armor window that's still active when they engage at the
 *     web (jelly durationTurns=2, plus repeated stocking from the
 *     queen-guard jelly-rush variant if it's also running).
 *   - magic-arrow + volley pre-battle (interaction 3): vanguard-
 *     bravo carries 1 mage + 1 archer (satisfying magic-arrow's
 *     minMages/minArchers gate, 22 dmg single-target) and the
 *     ant-archer fires volley (12 dmg + 4 queen-bonus). Both are
 *     auto-fired by `applyOpeningAbilities` when bravo enters the
 *     web battle, so the corner-flanker contributes ~38 hp of
 *     pre-melee damage to the spider queen.
 *   - recruit on isolated spiderlings (interaction 4): once
 *     spawn-spiderlings has fired (turn 3), there are 5 single-
 *     unit spider parties at the web tile. A flanking ceiling-
 *     capable party adjacent to one fires recruit; success flips
 *     the spiderling and shrinks the spider party-count.
 */

import { partyHasAbility } from '../engine/abilities.ts';
import { sameCoord } from '../engine/coord.ts';
import type {
  AbilityId,
  AbilityOrder,
  GameState,
  Order,
  Party,
  PartyId,
  TileCoord,
} from '../engine/types.ts';

import { tryOpportunisticRecruit } from './neutral-recruit-helper.ts';
import { antPlacement } from './placement-helpers.ts';
import {
  buildAntPolicy,
  CEILING_CAPABLE,
  moveToOrHold,
  nextStageTarget,
  PATHFINDERS,
  postLocation,
  SPIDER_WEB,
  VANGUARD_BRAVO,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;
const RECRUIT: AbilityId = 'recruit' as AbilityId;

const FLOOR_CORNER: ReadonlyMap<PartyId, TileCoord> = new Map([
  [PATHFINDERS, { plane: 'floor', x: 0, y: 9 }],
  [VANGUARD_BRAVO, { plane: 'floor', x: 9, y: 0 }],
]);

const CEILING_CORNER: ReadonlyMap<PartyId, TileCoord> = new Map([
  [PATHFINDERS, { plane: 'ceiling', x: 0, y: 9 }],
  [VANGUARD_BRAVO, { plane: 'ceiling', x: 9, y: 0 }],
]);

/**
 * Mid-route waypoint on the ceiling that biases each party's path
 * off the (8,9) web-watch intercept tile. Pathfinders pivots through
 * (5,5) so the final approach hits the diagonal; vanguard-bravo
 * stays on the x=9 column.
 */
const CEILING_WAYPOINT: ReadonlyMap<PartyId, TileCoord> = new Map([
  [PATHFINDERS, { plane: 'ceiling', x: 5, y: 5 }],
  [VANGUARD_BRAVO, { plane: 'ceiling', x: 9, y: 5 }],
]);

const flankWaypoint = (party: Party): TileCoord | undefined => {
  const floorCorner = FLOOR_CORNER.get(party.id);
  const ceilingCorner = CEILING_CORNER.get(party.id);
  if (!floorCorner || !ceilingCorner) return undefined;
  if (party.location.plane === 'floor') {
    if (!sameCoord(party.location, floorCorner)) return floorCorner;
    return ceilingCorner;
  }
  return undefined;
};

/**
 * Once on the ceiling, return the next ceiling waypoint to bias the
 * approach off (8,9). Returns undefined if the party should march
 * straight to the web (i.e., it has reached or passed the waypoint).
 */
const ceilingMidWaypoint = (party: Party, webLoc: TileCoord): TileCoord | undefined => {
  if (party.location.plane !== 'ceiling') return undefined;
  const wp = CEILING_WAYPOINT.get(party.id);
  if (!wp) return undefined;
  // If we're already at the waypoint or closer to the web than the
  // waypoint is, march straight to the web.
  if (sameCoord(party.location, wp)) return undefined;
  const dToWeb = Math.abs(party.location.x - webLoc.x) + Math.abs(party.location.y - webLoc.y);
  const wpToWeb = Math.abs(wp.x - webLoc.x) + Math.abs(wp.y - webLoc.y);
  if (dToWeb <= wpToWeb) return undefined;
  return wp;
};

const jellyApplySelfOrder = (party: Party): AbilityOrder => ({
  kind: 'use-ability',
  abilityId: JELLY_APPLY,
  target: party.id,
});

/** First single-unit enemy spider party co-located with `party`. */
const recruitTargetAt = (state: GameState, party: Party): PartyId | undefined => {
  for (const [id, other] of state.parties) {
    if (other.faction !== 'spider') continue;
    if (other.leaderless) continue;
    if (!sameCoord(other.location, party.location)) continue;
    const living = other.units.filter((u) => u.currentHp > 0);
    if (living.length !== 1) continue;
    return id;
  }
  return undefined;
};

/** Round-7 feature 2 placement: push pathfinders toward (5, 0) and
 * vanguard-bravo toward (0, 5) — closer to the corner ladders that
 * the corner-flank route uses. Note: flank routes ceiling-capable
 * parties via opposite floor corners (0,9) and (9,0) — but those are
 * outside the radius-5 window from storm-drain. So we forward-stage
 * to the nearest in-radius tiles on the chosen flanking diagonals. */
const flankPlacement = (state: GameState): GameState =>
  antPlacement(state, {
    pathfinders: { plane: 'floor', x: 5, y: 0 },
    'vanguard-bravo': { plane: 'floor', x: 0, y: 5 },
  });

const flankCore = buildAntPolicy('flank', (state: GameState) => {
  const stageTarget = nextStageTarget(state);
  const webLoc = postLocation(state, SPIDER_WEB);
  const isOpeningTurn = state.turn === 0;
  return (party) => {
    // Round-10 opportunistic neutral recruit: any ant-mage-bearing
    // party co-located with a recruitable neutral (cockroach/mouse,
    // never stinkbug) fires `recruit`. Runs before the corner-march /
    // staging branches so it applies to every party that happens to
    // land on a wandering neutral, not just the ceiling-capable spear
    // (which already has its own legacy single-unit-spider recruit
    // branch below). Skip on turn 0 — the ceiling-capable branch
    // there fires the jelly pre-buff and we don't want to short-
    // circuit it.
    if (!isOpeningTurn) {
      const recruit = tryOpportunisticRecruit(state, party);
      if (recruit) return recruit;
    }
    if (CEILING_CAPABLE.has(party.id) && webLoc !== undefined) {
      // Turn 0: pre-buff with jelly-apply before launching the corner
      // march. Preserved exactly so the existing test still passes.
      if (isOpeningTurn) {
        const orders: readonly Order[] = [jellyApplySelfOrder(party)];
        return { orders, posture: 'fight' };
      }
      // Late-game: if we're co-located with an isolated spider party
      // (most likely a spiderling), fire recruit. The mage's recruit
      // ability has 25% success; on success the unit flips sides and
      // augments our party. Only attempt if the mage is alive.
      if (partyHasAbility(party, RECRUIT, state.unitTemplates)) {
        const recruitable = recruitTargetAt(state, party);
        if (recruitable !== undefined) {
          const order: AbilityOrder = {
            kind: 'use-ability',
            abilityId: RECRUIT,
            target: recruitable,
          };
          return { orders: [order], posture: 'fight' };
        }
      }
      // Corner-march phase: if still on the floor, march to the
      // floor corner then plane-switch. Preserved exactly so the
      // turn-1 test still passes.
      const wp = flankWaypoint(party);
      if (wp !== undefined) {
        return { orders: moveToOrHold(party, wp), posture: 'fight' };
      }
      // On the ceiling: route via the east-edge / diagonal mid-
      // waypoint before heading to the web. Avoids web-watch (8,9).
      const mid = ceilingMidWaypoint(party, webLoc);
      if (mid !== undefined) {
        return { orders: moveToOrHold(party, mid), posture: 'fight' };
      }
      return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
    }
    if (stageTarget !== undefined) {
      return { orders: moveToOrHold(party, stageTarget.location), posture: 'fight' };
    }
    return { orders: [], posture: 'fight' };
  };
});

export const flankPlayer: AIPolicy = { ...flankCore, placement: flankPlacement };
