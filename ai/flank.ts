/**
 * Variant AI: "flank"
 *
 * Genuine corner-flank routing on the 6-plane geometry. While the
 * floor vanguards stage POST captures (same as baseline), the
 * ceiling-capable parties (pathfinders, vanguard-bravo) walk to
 * OPPOSITE-CORNER floor tiles first, then plane-switch up to the
 * ceiling at those corners — entering the ceiling far from the
 * canonical north-wall ladder — then converge on the spider-web.
 *
 *   pathfinders     → SW corner (floor 0,9 → ceiling 0,9 → web 9,9)
 *   vanguard-bravo  → NE corner (floor 9,0 → ceiling 9,0 → web 9,9)
 *
 * On turn 0 — before the corner march starts — both ceiling-capable
 * parties issue a `jelly-apply` self-buff order. Pathfinders and
 * vanguard-bravo each contain an ant-mage (round-3 firepower bumped
 * the mage's atk to 5 and added jelly-apply to its kit), so the
 * order is structurally legal: target = own party id, ability =
 * jelly-apply. The +1 attack window lines up with the queen-battle
 * arrival at the spider-web on the ceiling, where the queen-proximity
 * buff already stacks.
 *
 * Interactions:
 *   - corner-flank route + plane-switch (interaction 1): the route
 *     enters the ceiling far from the canonical north-wall ladder,
 *     forcing different spider parties to intercept.
 *   - jelly-apply pre-buff + queen-proximity buff (interaction 2):
 *     the round-3 mage jelly-apply lets the assault parties stack a
 *     jelly attack multiplier alongside the existing queen-proximity
 *     attack multiplier when they engage the spider queen at the web.
 *   - volley pre-battle (interaction 3): the same parties carry
 *     archers with volley (queenBonusDamage 4 from round 3); jelly
 *     is structurally compatible with archery — they fire at the same
 *     target — so the assault opens with a jelly-buffed volley.
 */

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

const FLOOR_CORNER: ReadonlyMap<PartyId, TileCoord> = new Map([
  [PATHFINDERS, { plane: 'floor', x: 0, y: 9 }],
  [VANGUARD_BRAVO, { plane: 'floor', x: 9, y: 0 }],
]);

const CEILING_CORNER: ReadonlyMap<PartyId, TileCoord> = new Map([
  [PATHFINDERS, { plane: 'ceiling', x: 0, y: 9 }],
  [VANGUARD_BRAVO, { plane: 'ceiling', x: 9, y: 0 }],
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
 * Turn-0 self-buff order: the ceiling-capable party's mage applies
 * Royal Jelly to itself before the corner march begins. The order is
 * `use-ability` with target = own party id, matching the ability's
 * `target: "party"` shape in abilities.json.
 */
const jellyApplySelfOrder = (party: Party): AbilityOrder => ({
  kind: 'use-ability',
  abilityId: JELLY_APPLY,
  target: party.id,
});

export const flankPlayer: AIPolicy = buildAntPolicy('flank', (state: GameState) => {
  const stageTarget = nextStageTarget(state);
  const webLoc = postLocation(state, SPIDER_WEB);
  const isOpeningTurn = state.turn === 0;
  return (party) => {
    if (CEILING_CAPABLE.has(party.id) && webLoc !== undefined) {
      // Turn 0: pre-buff with jelly-apply before launching the corner
      // march. The self-targeted ability order is structurally legal
      // (mages carry jelly-apply per round 3) and stacks with the
      // queen-proximity attack buff at the spider-web kill battle.
      if (isOpeningTurn) {
        const orders: readonly Order[] = [jellyApplySelfOrder(party)];
        return { orders, posture: 'fight' };
      }
      const wp = flankWaypoint(party);
      if (wp !== undefined) {
        return { orders: moveToOrHold(party, wp), posture: 'fight' };
      }
      return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
    }
    if (stageTarget !== undefined) {
      return { orders: moveToOrHold(party, stageTarget.location), posture: 'fight' };
    }
    return { orders: [], posture: 'fight' };
  };
});
