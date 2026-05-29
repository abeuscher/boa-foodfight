/**
 * spider-l1-v2 — Chunk 7a behavior extension for the spider L1 AI.
 *
 * Wraps the locked `spiderL1` policy with one heuristic: **wall-POST
 * reaction**. When an ant-owned mid-POST sits on a wall plane and a
 * live spider party is within Chebyshev 5 (cross-plane via direct
 * distance over the cube), divert the closest spider party to engage
 * via paired-POST traversal or edge crossing.
 *
 * Why this exists. The post-Chunk-6 playtest (M1.2 wall combat = 0
 * across all seeds) found the canned ant AI captures wall POSTs
 * unopposed and Chunk 2 reinforcements spawn into empty tiles. The
 * spider-l1 doctrine is "sit at the web, intercept on ceiling" — it
 * never reacts to wall captures. This extension closes the gap so a
 * wall capture is meaningfully contested.
 *
 * The wrapper only OVERRIDES move-to orders, and only when:
 *
 *   - A wall POST is currently ant-owned, AND
 *   - The candidate spider party is alive, isn't the web-guard,
 *     isn't already engaged in melee, AND
 *   - The wall POST is closer (Chebyshev distance, cross-plane
 *     normalized) than the party's current baseline destination.
 *
 * Otherwise the existing spider-l1 decision passes through.
 *
 * Deterministic: parties walked in id-sorted order; the heuristic is
 * pure state inspection with no Rng draws.
 *
 * Gate: this is REGISTERED but `spiderL1` itself is byte-identical,
 * so coevo / diversity sweeps stay locked. Opt-in via the
 * `spider-l1-v2` key on `SCENARIO_PLAYER_AIS` / playtest harness.
 */

import { distance, sameCoord } from '../engine/coord.ts';
import type { ScenarioData } from '../engine/state.ts';
import type {
  GameState,
  Order,
  Party,
  PartyId,
  Plane,
  Post,
  Rng,
  TileCoord,
} from '../engine/types.ts';

import { augmentFactionParties } from './policy-augment.ts';
import { spiderL1 } from './spider-l1.ts';
import type { AIPolicy } from './types.ts';

const WALL_PLANES: ReadonlySet<Plane> = new Set([
  'north-wall',
  'south-wall',
  'east-wall',
  'west-wall',
]);

const WEB_GUARD = 'web-guard' as PartyId;
/** Spider parties that are committed elsewhere by spider-l1 doctrine
 * and shouldn't be diverted by v2 extensions. The web guard and the
 * deep raider are explicitly authored as kill-spear pieces. */
const EXEMPT_FROM_DIVERSION: ReadonlySet<PartyId> = new Set<PartyId>([WEB_GUARD]);

const partyAlive = (p: Party): boolean => p.units.some((u) => u.currentHp > 0);

/** Cross-plane distance approximation: in-plane Chebyshev when the
 * party is on the same plane, in-plane Chebyshev to the nearest
 * shared edge + 1 cross step otherwise. Conservative — overestimates
 * cross-plane distance, which keeps the heuristic from over-firing. */
const crossPlaneDistance = (a: TileCoord, b: TileCoord): number => {
  if (a.plane === b.plane) return distance(a, b);
  // Conservative cross-plane estimate: max axis distance + 1 (the
  // edge transition step). Good enough for "is the wall POST closer
  // than my current target" comparisons.
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) + 1;
};

/** True iff this party currently has a move-to order; returns the
 * target tile if so. */
const currentMoveTarget = (party: Party): TileCoord | null => {
  for (const o of party.orders) {
    if (o.kind === 'move-to') return o.target;
  }
  return null;
};

/** Find all wall POSTs currently ant-owned. */
const antOwnedWallPosts = (state: GameState): readonly Post[] => {
  const result: Post[] = [];
  for (const post of state.posts.values()) {
    if (post.owner !== 'ant') continue;
    if (!WALL_PLANES.has(post.location.plane)) continue;
    result.push(post);
  }
  return result;
};

/** Replace the first move-to in the order list with a new target.
 * If there's no move-to, prepend one. */
const setMoveTarget = (orders: readonly Order[], to: TileCoord): readonly Order[] => {
  let replaced = false;
  const updated: Order[] = [];
  for (const o of orders) {
    if (!replaced && o.kind === 'move-to') {
      updated.push({ kind: 'move-to', target: to });
      replaced = true;
    } else {
      updated.push(o);
    }
  }
  if (!replaced) updated.unshift({ kind: 'move-to', target: to });
  return updated;
};

const augmentSpiderParty = (party: Party, state: GameState): Party => {
  if (!partyAlive(party)) return party;
  if (EXEMPT_FROM_DIVERSION.has(party.id)) return party;
  // Only intervene on parties whose baseline order is a move-to.
  // Leave hold / use-ability / flee alone.
  const baselineTarget = currentMoveTarget(party);
  if (baselineTarget === null) return party;

  const wallPosts = antOwnedWallPosts(state);
  if (wallPosts.length === 0) return party;

  // Pick the closest wall POST that's a *better* target than the
  // baseline's pick (i.e., diverting actually closes distance).
  let best: { post: Post; d: number } | null = null;
  const baselineDist = crossPlaneDistance(party.location, baselineTarget);
  for (const post of wallPosts) {
    const d = crossPlaneDistance(party.location, post.location);
    if (d >= baselineDist) continue;
    if (best === null || d < best.d) best = { post, d };
  }
  if (best === null) return party;
  if (sameCoord(baselineTarget, best.post.location)) return party;
  return { ...party, orders: setMoveTarget(party.orders, best.post.location) };
};

const decideV2 = (state: GameState, scenario: ScenarioData, rng: Rng): GameState =>
  augmentFactionParties(spiderL1.decide(state, scenario, rng), 'spider', augmentSpiderParty);

export const spiderL1V2: AIPolicy = {
  name: 'spider-l1-v2',
  faction: 'spider',
  decide: decideV2,
  ...(spiderL1.placement ? { placement: spiderL1.placement } : {}),
};
