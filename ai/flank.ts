/**
 * Variant AI: "flank" (round-23 venom-blast survival rebalance)
 *
 * Genuine corner-flank routing on the 6-plane geometry. Round-22's
 * venom-blast (4 dmg/unit on the front rank, fired pre-battle by
 * spider-queen / spider-spinner) wiped flank's ceiling-march parties
 * because corner waypoints (0,9) and (9,0) on the floor pass through
 * deep-raider's south-floor intercept arc and the corner-ceiling
 * march eats web-watch's patrol arc plus web-guard's blast at the
 * web. Round-23 splits the assault: pathfinders takes the launch-
 * tile dive (plane-switch onto the web tile, bypassing web-watch
 * entirely); vanguard-bravo keeps the NE corner (9,0) → ceiling
 * (9,0) → web approach so the variant still presents a corner flank.
 *
 * Roster behavior:
 *   pathfinders     → launch-tile dive: floor (web.x, web.y) →
 *                     plane-switch to web (9,9). Same mechanic as
 *                     baseline / dive use; this is the safe path that
 *                     keeps pathfinders alive past the venom-blast.
 *   vanguard-bravo  → NE corner: floor (9,0) → ceiling (9,0) → web
 *                     (9,9) along the x=9 column. Never crosses x=8
 *                     so web-watch at (8,9) doesn't intercept.
 *   vanguard-alpha  → mid-POST staging (canonical), preserved.
 *   queen-guard     → defends with empty orders (canonical).
 *
 * On turn 0 — before the assault starts — both ceiling-capable
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
 * Why this is route-distinct from baseline / dive:
 *   - Baseline: BOTH ceiling-capable parties run the dive line; the
 *     queen-guard's worker concentrates jelly doses on pathfinders;
 *     vanguard-alpha walks the canonical staging chain.
 *   - Dive: same as baseline plus all three field parties rush the
 *     web; queen-guard's jelly target locked on pathfinders.
 *   - Flank: vanguard-bravo takes the corner-ladder approach (NE
 *     (9,0) → ceiling (9,0) → x=9 column) — distinct from the dive
 *     line. Vanguard-alpha runs the staging chain (no rush). The
 *     turn-0 jelly self-buff (vs queen-guard supply) is also a
 *     variant marker.
 *
 * Interactions:
 *   - launch-tile dive (pathfinders) + east-edge ceiling march
 *     (vanguard-bravo): pathfinders bypasses web-watch via the
 *     plane-switch; vanguard-bravo's x=9 column never crosses (8,9).
 *   - jelly-apply pre-buff + queen-proximity buff (interaction 2):
 *     turn-0 jelly-apply gives both ceiling parties a +1 attack /
 *     +1 armor window that's still active when they engage at the
 *     web (jelly durationTurns=2).
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

import { launchTileDiveTarget } from './dive-line.ts';
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

/**
 * Vanguard-bravo's NE corner waypoints: floor (9,0) → ceiling (9,0)
 * → web (9,9) along the x=9 column. Pathfinders no longer uses these
 * — round-23 routes pathfinders through the launch-tile dive line.
 */
const BRAVO_FLOOR_CORNER: TileCoord = { plane: 'floor', x: 9, y: 0 };
const BRAVO_CEILING_CORNER: TileCoord = { plane: 'ceiling', x: 9, y: 0 };

/**
 * Mid-route waypoint on vanguard-bravo's ceiling march that biases
 * the path off (8,9) web-watch. The party stays on the x=9 column
 * via (9, 5) before turning north to the web at (9, 9).
 */
const BRAVO_CEILING_MID: TileCoord = { plane: 'ceiling', x: 9, y: 5 };

const bravoFloorOrCeilingWaypoint = (party: Party): TileCoord | undefined => {
  if (party.location.plane === 'floor') {
    if (!sameCoord(party.location, BRAVO_FLOOR_CORNER)) return BRAVO_FLOOR_CORNER;
    return BRAVO_CEILING_CORNER;
  }
  return undefined;
};

/**
 * Once vanguard-bravo is on the ceiling, return the mid-waypoint to
 * bias the approach off (8,9). Returns undefined if the party should
 * march straight to the web.
 */
const bravoCeilingMidWaypoint = (party: Party, webLoc: TileCoord): TileCoord | undefined => {
  if (party.location.plane !== 'ceiling') return undefined;
  const wp = BRAVO_CEILING_MID;
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

/** Round-23 placement: pathfinders forward to (4, 4) — same one-tile
 * back-off baseline / dive use; sits at Chebyshev 4 from the deep-
 * raider's forward-staged floor (8, 5) so the dive completes before
 * intercept. Vanguard-bravo forward to (5, 0) on the NE row, closer
 * to the (9, 0) corner waypoint. All within Chebyshev-5 of storm-
 * drain. */
const flankPlacement = (state: GameState): GameState =>
  antPlacement(state, {
    pathfinders: { plane: 'floor', x: 4, y: 4 },
    'vanguard-bravo': { plane: 'floor', x: 5, y: 0 },
  });

const flankCore = buildAntPolicy('flank', (state: GameState) => {
  const stageTarget = nextStageTarget(state);
  const webLoc = postLocation(state, SPIDER_WEB);
  const isOpeningTurn = state.turn === 0;
  return (party) => {
    // Round-10 opportunistic neutral recruit: any ant-mage-bearing
    // party co-located with a recruitable neutral (cockroach/mouse,
    // never stinkbug) fires `recruit`. Skip on turn 0 — the ceiling-
    // capable branch there fires the jelly pre-buff and we don't
    // want to short-circuit it.
    if (!isOpeningTurn) {
      const recruit = tryOpportunisticRecruit(state, party);
      if (recruit) return recruit;
    }
    if (CEILING_CAPABLE.has(party.id) && webLoc !== undefined) {
      // Turn 0: pre-buff with jelly-apply before launching the
      // assault. Preserved exactly so the existing test still passes.
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
      // Round-23 split assault.
      // Pathfinders: launch-tile dive (plane-switch onto the web).
      if (party.id === PATHFINDERS) {
        const dive = launchTileDiveTarget(party, webLoc);
        if (dive !== undefined) return { orders: moveToOrHold(party, dive), posture: 'fight' };
      }
      // Vanguard-bravo: NE corner-ladder march along x=9.
      if (party.id === VANGUARD_BRAVO) {
        const wp = bravoFloorOrCeilingWaypoint(party);
        if (wp !== undefined) {
          return { orders: moveToOrHold(party, wp), posture: 'fight' };
        }
        const mid = bravoCeilingMidWaypoint(party, webLoc);
        if (mid !== undefined) {
          return { orders: moveToOrHold(party, mid), posture: 'fight' };
        }
        return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
      }
    }
    if (stageTarget !== undefined) {
      return { orders: moveToOrHold(party, stageTarget.location), posture: 'fight' };
    }
    return { orders: [], posture: 'fight' };
  };
});

export const flankPlayer: AIPolicy = { ...flankCore, placement: flankPlacement };
