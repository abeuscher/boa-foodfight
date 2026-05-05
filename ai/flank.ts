/**
 * Variant AI: "flank"
 *
 * Two-phase strategy. Phase 1: every field party converges on the next
 * floor / wall stage target — pathfinders + vanguard-bravo help the
 * vanguards capture POSTs faster. Phase 2 (triggered when all floor
 * POSTs are ant-owned): the floor vanguard holds captured POSTs while
 * pathfinders + vanguard-bravo plane-switch to the spider-web.
 *
 * The explicit two-phase structure is the route distinct from
 * baseline's "all parties chase the current single stage target."
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

const FLOOR_AND_WALL_POSTS: readonly PostId[] = [SOAP_DISH, TOWEL_RACK, WALL_CRACK];

const nextStageTarget = (state: GameState): Post | undefined => {
  for (const id of FLOOR_AND_WALL_POSTS) {
    const p = state.posts.get(id);
    if (p && p.owner !== 'ant') return p;
  }
  return undefined;
};

export const flankPlayer: AIPolicy = buildAntPolicy('flank', (state: GameState) => {
  const stageTarget = nextStageTarget(state);
  const webLoc = postLocation(state, SPIDER_WEB);
  return (party) => {
    if (stageTarget !== undefined) {
      // Phase 1: everyone helps capture the floor.
      return { orders: moveToOrHold(party, stageTarget.location), posture: 'fight' };
    }
    // Phase 2: floor secured.
    if (CEILING_CAPABLE.has(party.id) && webLoc !== undefined) {
      return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
    }
    // Floor vanguards hold their captured POST positions.
    return { orders: [], posture: 'fight' };
  };
});
