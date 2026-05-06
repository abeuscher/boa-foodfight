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
export const SOAP_DISH: PostId = 'soap-dish' as PostId;
export const TOWEL_RACK: PostId = 'towel-rack' as PostId;
export const WALL_CRACK: PostId = 'wall-crack' as PostId;
export const STORM_DRAIN: PostId = 'storm-drain' as PostId;

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

/** The canonical floor + wall-crack capture chain in order. Variants
 * that build through it (turtle, flank, dive) share this list. */
export const FLOOR_AND_WALL_POSTS: readonly PostId[] = [SOAP_DISH, TOWEL_RACK, WALL_CRACK];

/** Returns the first POST in `FLOOR_AND_WALL_POSTS` that is not yet
 * ant-owned, or undefined if the entire chain is captured. */
export const nextStageTarget = (state: GameState): Post | undefined => {
  for (const id of FLOOR_AND_WALL_POSTS) {
    const p = state.posts.get(id);
    if (p && p.owner !== 'ant') return p;
  }
  return undefined;
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
