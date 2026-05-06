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
 * This is the route distinct from baseline's "all parties chase the
 * current single stage target." It forces a genuine difference in
 * which spider parties intercept and from which direction the web is
 * approached.
 */

import { sameCoord } from '../engine/coord.ts';
import type { GameState, Party, PartyId, Post, PostId, TileCoord } from '../engine/types.ts';

import {
  buildAntPolicy,
  CEILING_CAPABLE,
  moveToOrHold,
  PATHFINDERS,
  postLocation,
  SOAP_DISH,
  SPIDER_WEB,
  TOWEL_RACK,
  VANGUARD_BRAVO,
  WALL_CRACK,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

const FLOOR_AND_WALL_POSTS: readonly PostId[] = [SOAP_DISH, TOWEL_RACK, WALL_CRACK];

const FLOOR_CORNER: ReadonlyMap<PartyId, TileCoord> = new Map([
  [PATHFINDERS, { plane: 'floor', x: 0, y: 9 }],
  [VANGUARD_BRAVO, { plane: 'floor', x: 9, y: 0 }],
]);

const CEILING_CORNER: ReadonlyMap<PartyId, TileCoord> = new Map([
  [PATHFINDERS, { plane: 'ceiling', x: 0, y: 9 }],
  [VANGUARD_BRAVO, { plane: 'ceiling', x: 9, y: 0 }],
]);

const nextStageTarget = (state: GameState): Post | undefined => {
  for (const id of FLOOR_AND_WALL_POSTS) {
    const p = state.posts.get(id);
    if (p && p.owner !== 'ant') return p;
  }
  return undefined;
};

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

export const flankPlayer: AIPolicy = buildAntPolicy('flank', (state: GameState) => {
  const stageTarget = nextStageTarget(state);
  const webLoc = postLocation(state, SPIDER_WEB);
  return (party) => {
    if (CEILING_CAPABLE.has(party.id) && webLoc !== undefined) {
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
