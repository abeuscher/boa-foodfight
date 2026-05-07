/**
 * Shared helpers for AI policies. Variant AIs share most of the
 * boilerplate (party iteration, party-id constants, "move-to or clear"
 * logic); this module dedupes that so each variant file focuses on the
 * strategy itself.
 */

import { distance, sameCoord } from '../engine/coord.ts';
import type {
  GameState,
  MoveOrder,
  Order,
  Party,
  PartyId,
  Plane,
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

/** True iff `party` has at least one living unit. */
export const partyAlive = (party: Party): boolean => party.units.some((u) => u.currentHp > 0);

// ---------------------------------------------------------------------------
// Pheromone trail (rec 1.5) — spider-only ant visibility.
// ---------------------------------------------------------------------------

/** A single trail observation from the spider's vantage. Carries the
 * source ant party id (so the AI can group entries by party) plus the
 * decayed location and age bucket. Age 0 = the ant's current tile;
 * age 3 = stale (3 turns old). */
export interface SpiderVisibleTrailEntry {
  readonly partyId: PartyId;
  readonly plane: Plane;
  readonly x: number;
  readonly y: number;
  readonly ageInTurns: number;
}

/**
 * The spider AI's *only* legitimate window into ant positions: a flat
 * array of all ant pheromone trail entries. Built from
 * `state.pheroTrails`. Per rec 1.5 the spider AI must NOT scan
 * `state.parties` for ant locations — that would defeat the point of
 * the asymmetric information layer.
 */
export const getSpiderVisibleAntTrail = (state: GameState): readonly SpiderVisibleTrailEntry[] => {
  const out: SpiderVisibleTrailEntry[] = [];
  for (const [partyId, entries] of state.pheroTrails) {
    for (const e of entries) {
      out.push({ partyId, plane: e.plane, x: e.x, y: e.y, ageInTurns: e.ageInTurns });
    }
  }
  return out;
};

/** Closest living non-self ant field party id (skips queen-guard implicitly
 * via the caller-supplied `from`, leaderless parties, and dead parties).
 * Used by jelly-supply variants to pick a target party for jelly-apply. */
export const closestFieldPartyId = (state: GameState, from: Party): PartyId | undefined => {
  let best: { id: PartyId; d: number } | undefined;
  for (const [id, party] of state.parties) {
    if (party.faction !== 'ant') continue;
    if (party.id === from.id) continue;
    if (party.leaderless) continue;
    if (!partyAlive(party)) continue;
    const d = distance(from.location, party.location);
    if (!best || d < best.d || (d === best.d && id < best.id)) {
      best = { id, d };
    }
  }
  return best?.id;
};

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

/** Optional hook to give the queen-guard ability orders (e.g.
 * `jelly-apply`). The queen still doesn't move; only the worker fires
 * the order. Posture stays `defend`. Return `[]` to keep idle. */
export type QueenGuardOrders = (state: GameState, queenGuard: Party) => readonly Order[];

const queenGuardOrdersEqual = (a: readonly Order[], b: readonly Order[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (!x || !y) return false;
    if (x.kind !== y.kind) return false;
    if (x.kind === 'use-ability' && y.kind === 'use-ability') {
      if (x.abilityId !== y.abilityId) return false;
      if (x.target !== y.target) return false;
    } else if (x.kind === 'move-to' && y.kind === 'move-to') {
      if (!sameCoord(x.target, y.target)) return false;
    }
  }
  return true;
};

export const buildAntPolicy = (
  name: string,
  decideForParty: (state: GameState) => DecideForParty,
  queenGuardOrders?: QueenGuardOrders,
): AIPolicy => ({
  name,
  faction: 'ant',
  decide(state) {
    const perParty = decideForParty(state);
    const nextParties = new Map(state.parties);
    for (const [id, party] of state.parties) {
      if (party.faction !== 'ant') continue;
      // Queen-guard: spec says the Queen is immobile, so the guard never
      // moves. Always defend. If a queenGuardOrders hook is supplied,
      // the worker can fire ability orders (target=party); otherwise
      // the guard sits idle.
      if (party.id === QUEEN_PARTY) {
        const orders = queenGuardOrders ? queenGuardOrders(state, party) : [];
        if (queenGuardOrdersEqual(orders, party.orders) && party.posture === 'defend') continue;
        nextParties.set(id, { ...party, orders, posture: 'defend' });
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
