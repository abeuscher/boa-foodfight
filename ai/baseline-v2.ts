/**
 * baseline-v2 — Chunk 7a AI behavior extensions for the ant baseline.
 *
 * Wraps the locked `baselinePlayer` policy with two opportunistic
 * heuristics that exercise post-Chunk-6 engine surface:
 *
 *   1. **Item attraction.** Once per turn, if a visible item spawn
 *      is within Chebyshev 3 of an ant party AND the party isn't
 *      already running a special-purpose verb, divert the party to
 *      the item tile. Exercises Chunk 4 (item-gated terminal-class
 *      promotions) so the canned playthrough actually picks up
 *      phero-crowns and iron-fangs instead of waiting for lucky
 *      spawn alignments.
 *
 *   2. **POST opportunism.** If a neutral mid-POST is within
 *      Chebyshev 2 of an ant party AND the party isn't carrying a
 *      special verb, divert one turn to the POST tile. Each captured
 *      POST triggers a defending battle (Chunk 5b Aggression +1)
 *      which feeds Chunk 6 field-promotion. Walks the rubric metrics
 *      M2.3 (cap gap), M4.4 (utilization), and the max-Aggression
 *      cap upward.
 *
 * The wrapper preserves the locked baseline's `placement` hook and
 * its decision lattice — we only OVERRIDE the move-to target when an
 * opportunity is closer than whatever the baseline picked. Other
 * verb kinds (jelly-apply, flee, use-ability, hold) pass through
 * untouched.
 *
 * Deterministic: walks parties in id-sorted order; ties broken by
 * nearest-then-lowest-id, no Rng draws beyond what `baselinePlayer`
 * already takes.
 *
 * Gate: this policy is REGISTERED but the locked `baselinePlayer`
 * is unchanged, so the gate-29 diversity sweep and the
 * harness/coevo trace are byte-identical. Opt-in via the
 * `baseline-v2` key on `PLAYER_AIS` / `SCENARIO_PLAYER_AIS`.
 */

import { distance, sameCoord } from '../engine/coord.ts';
import type { ScenarioData } from '../engine/state.ts';
import type { GameState, Order, Party, Rng, TileCoord, UnitTemplateId } from '../engine/types.ts';

import { baselinePlayer } from './baseline.ts';
import { augmentFactionParties } from './policy-augment.ts';
import type { AIPolicy } from './types.ts';

const ITEM_ATTRACTION_RANGE = 3;
const POST_OPPORTUNITY_RANGE = 2;

/** True iff the party's queued orders contain a non-move-to verb we
 * shouldn't stomp (jelly-apply, use-ability, flee, etc.). The baseline
 * only ever emits `move-to`, `jelly-apply`, and `flee` so this is a
 * tight check. */
const hasSpecialVerb = (orders: readonly Order[]): boolean =>
  orders.some((o) => o.kind !== 'move-to');

const partyAlive = (p: Party): boolean => p.units.some((u) => u.currentHp > 0);

const isQueenGuard = (party: Party): boolean =>
  party.units.some((u) => u.templateId === ('ant-queen' as UnitTemplateId));

/** Find the closest visible item spawn within range; null if none. */
const closestItem = (party: Party, state: GameState): TileCoord | null => {
  let best: { tile: TileCoord; d: number } | null = null;
  for (const spawn of state.itemSpawns) {
    if (spawn.discovered) continue;
    if (spawn.buried) continue; // buried needs digging — out of scope here
    if (spawn.location.plane !== party.location.plane) continue;
    const d = distance(party.location, spawn.location);
    if (d > ITEM_ATTRACTION_RANGE) continue;
    if (d === 0) continue; // already there; the engine pickup handles it
    if (best === null || d < best.d) best = { tile: spawn.location, d };
  }
  return best?.tile ?? null;
};

/** Find the closest neutral mid-POST within range; null if none.
 * Skips storm-drain / spider-web (faction-locked anchors). */
const closestOpportunisticPost = (party: Party, state: GameState): TileCoord | null => {
  let best: { tile: TileCoord; d: number } | null = null;
  for (const post of state.posts.values()) {
    if (post.owner !== 'neutral') continue;
    if (post.id === 'storm-drain' || post.id === 'spider-web') continue;
    if (post.location.plane !== party.location.plane) continue;
    const d = distance(party.location, post.location);
    if (d > POST_OPPORTUNITY_RANGE) continue;
    if (d === 0) continue;
    if (best === null || d < best.d) best = { tile: post.location, d };
  }
  return best?.tile ?? null;
};

/** Replace the party's first move-to with a fresh one targeting `to`.
 * Preserves any non-move-to orders in their original positions. */
const replaceMoveTarget = (orders: readonly Order[], to: TileCoord): readonly Order[] => {
  let replaced = false;
  return orders.map((o) => {
    if (replaced) return o;
    if (o.kind !== 'move-to') return o;
    replaced = true;
    return { kind: 'move-to', target: to };
  });
};

/** Insert a fresh move-to as the first order. Used when the baseline
 * didn't queue any move (party is "hold" or idle). */
const insertMoveTarget = (orders: readonly Order[], to: TileCoord): readonly Order[] => [
  { kind: 'move-to', target: to },
  ...orders,
];

/** Apply v2 extensions to a single party. Returns a (possibly
 * modified) Party object. */
const augmentParty = (party: Party, state: GameState): Party => {
  if (!partyAlive(party)) return party;
  if (isQueenGuard(party)) return party;
  if (hasSpecialVerb(party.orders)) return party;

  // Heuristic 1: item attraction wins over POST opportunism — items
  // are scarcer + tied to L1-iteration #7 / #9 progression hooks.
  const itemTile = closestItem(party, state);
  if (itemTile !== null) {
    // If the party's baseline destination already matches the item
    // tile, leave it alone (baseline got there first by accident).
    const existing = party.orders.find((o) => o.kind === 'move-to');
    if (existing?.kind === 'move-to' && sameCoord(existing.target, itemTile)) {
      return party;
    }
    const newOrders =
      existing !== undefined
        ? replaceMoveTarget(party.orders, itemTile)
        : insertMoveTarget(party.orders, itemTile);
    return { ...party, orders: newOrders };
  }

  // Heuristic 2: POST opportunism. Only kicks in if no item nearby.
  const postTile = closestOpportunisticPost(party, state);
  if (postTile !== null) {
    const existing = party.orders.find((o) => o.kind === 'move-to');
    if (existing?.kind === 'move-to' && sameCoord(existing.target, postTile)) {
      return party;
    }
    // Compare distance: only divert if the POST is closer than the
    // baseline's current destination. Prevents "infinite detour" loops
    // where every turn we pick a different nearby POST.
    if (existing?.kind === 'move-to') {
      const baselineDist = distance(party.location, existing.target);
      const postDist = distance(party.location, postTile);
      if (baselineDist <= postDist) return party;
    }
    const newOrders =
      existing !== undefined
        ? replaceMoveTarget(party.orders, postTile)
        : insertMoveTarget(party.orders, postTile);
    return { ...party, orders: newOrders };
  }

  return party;
};

const decideV2 = (state: GameState, scenario: ScenarioData, rng: Rng): GameState =>
  augmentFactionParties(baselinePlayer.decide(state, scenario, rng), 'ant', augmentParty);

export const baselineV2: AIPolicy = {
  name: 'baseline-v2',
  faction: 'ant',
  decide: decideV2,
  ...(baselinePlayer.placement ? { placement: baselinePlayer.placement } : {}),
};
