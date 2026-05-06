/**
 * Shared helpers for AI policies. Variant AIs share most of the
 * boilerplate (party iteration, party-id constants, "move-to or clear"
 * logic); this module dedupes that so each variant file focuses on the
 * strategy itself.
 */

import { sameCoord } from '../engine/coord.ts';
import type {
  GameState,
  MoveOrder,
  Order,
  Party,
  PartyId,
  Posture,
  Post,
  PostId,
  TileCoord,
} from '../engine/types.ts';

import type { AIPolicy } from './types.ts';

// ---------------------------------------------------------------------------
// Spec-locked POST ids and player-side party ids.
// ---------------------------------------------------------------------------

export const SPIDER_WEB: PostId = 'spider-web' as PostId;
export const STORM_DRAIN: PostId = 'storm-drain' as PostId;

/**
 * Mid-POST type prefixes. The map generator emits POST IDs of the form
 * `<type>-<n>` (e.g., `soap-dish-1`, `soap-dish-2`) so each scenario can
 * have a variable count of each type. AI helpers below match by prefix.
 */
export const SOAP_DISH_TYPE = 'soap-dish';
export const TOWEL_RACK_TYPE = 'towel-rack';
export const WALL_CRACK_TYPE = 'wall-crack';
export const MID_POST_TYPES: readonly string[] = [SOAP_DISH_TYPE, TOWEL_RACK_TYPE, WALL_CRACK_TYPE];

/** True iff `postId` belongs to the given mid-POST type prefix. */
export const postOfType = (postId: PostId, type: string): boolean => {
  const id = String(postId);
  return id === type || id.startsWith(`${type}-`);
};

/** All POSTs of a given type in stable id order. */
export const postsOfType = (state: GameState, type: string): readonly Post[] => {
  const matches: Post[] = [];
  for (const post of state.posts.values()) {
    if (postOfType(post.id, type)) matches.push(post);
  }
  matches.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return matches;
};

export const QUEEN_PARTY: PartyId = 'queen-guard' as PartyId;
export const PATHFINDERS: PartyId = 'pathfinders' as PartyId;
export const VANGUARD_BRAVO: PartyId = 'vanguard-bravo' as PartyId;

/** Parties that contain an ant-mage and can therefore plane-switch to
 * the ceiling. Hardcoded by id for AI simplicity. */
export const CEILING_CAPABLE: ReadonlySet<PartyId> = new Set([PATHFINDERS, VANGUARD_BRAVO]);

// ---------------------------------------------------------------------------
// Movement-order helpers.
// ---------------------------------------------------------------------------

/**
 * If the party is already at `target`, returns `[]` (clear stale orders);
 * otherwise returns a single move-to order. The standard idiom for
 * variant policies that pick a stage target each turn.
 */
export const moveToOrHold = (party: Party, target: TileCoord): readonly Order[] => {
  if (sameCoord(party.location, target)) return [];
  const move: MoveOrder = { kind: 'move-to', target };
  return [move];
};

/** Look up a POST's location by id; returns undefined if the post is missing. */
export const postLocation = (state: GameState, id: PostId): TileCoord | undefined =>
  state.posts.get(id)?.location;

/**
 * Returns the next mid-POST to capture, walking the type chain
 * (soap-dish → towel-rack → wall-crack) and within each type picking
 * the lowest-id unowned instance. Skips the type entirely if all
 * instances of that type are already ant-owned. Returns undefined if
 * every mid-POST is owned (i.e., chain complete).
 */
export const nextStageTarget = (state: GameState): Post | undefined => {
  for (const type of MID_POST_TYPES) {
    for (const post of postsOfType(state, type)) {
      if (post.owner !== 'ant') return post;
    }
  }
  return undefined;
};

/** Returns the closest unowned POST of `type` to `from`, or undefined
 * if all are ant-owned. Distance is Manhattan within-plane, infinity
 * across planes. */
export const closestUnownedPostOfType = (
  state: GameState,
  type: string,
  from: TileCoord,
): Post | undefined => {
  let best: Post | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const post of postsOfType(state, type)) {
    if (post.owner === 'ant') continue;
    const d =
      post.location.plane === from.plane
        ? Math.abs(post.location.x - from.x) + Math.abs(post.location.y - from.y)
        : Number.POSITIVE_INFINITY;
    if (d < bestDist) {
      bestDist = d;
      best = post;
    }
  }
  return best;
};

// ---------------------------------------------------------------------------
// Policy-construction helper.
// ---------------------------------------------------------------------------

/**
 * Builds the standard ant-side policy decide() loop. The caller supplies
 * a per-party decision function that returns the new orders + posture
 * (or null to leave the party untouched). Skips spider parties, the
 * queen-guard, and leaderless parties using consistent rules so the
 * variant policies don't duplicate that gating logic.
 */
export type DecideForParty = (
  party: Party,
) => { orders: readonly Order[]; posture: Posture } | null;

export const buildAntPolicy = (
  name: string,
  decideForParty: (state: GameState) => DecideForParty,
): AIPolicy => ({
  name,
  faction: 'ant',
  decide(state) {
    const perParty = decideForParty(state);
    const nextParties = new Map(state.parties);
    for (const [id, party] of state.parties) {
      if (party.faction !== 'ant') continue;
      // Queen-guard: spec says the Queen is immobile, so the guard never
      // moves. Always defend.
      if (party.id === QUEEN_PARTY) {
        if (party.orders.length === 0 && party.posture === 'defend') continue;
        nextParties.set(id, { ...party, orders: [], posture: 'defend' });
        continue;
      }
      // Leaderless: auto-retreat is engine-side; the AI doesn't override.
      if (party.leaderless) continue;
      const decision = perParty(party);
      if (decision === null) continue;
      const { orders, posture } = decision;
      if (orders === party.orders && posture === party.posture) continue;
      nextParties.set(id, { ...party, orders, posture });
    }
    return { ...state, parties: nextParties };
  },
});
