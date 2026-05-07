/**
 * engine/items — round 14 item-spawn helpers.
 *
 * Items are deterministic per scenario seed. We spawn 4 items at
 * scenario init: 3 normal + 1 buried. Each picks a uniformly-random
 * template id from the 6 in `items.json` and a tile via the seeded
 * `Rng`. Plane choice is weighted (60% floor, 40% ceiling) so v1
 * stays achievable; walls are intentionally skipped — discovery
 * needs ant/spider parties to wander adjacent and walls aren't
 * trafficked enough by both factions yet.
 *
 * Pure: no I/O. All randomness flows through the injected `Rng`.
 *
 * Imports allowed: `engine/coord`, `engine/types`, `engine/schemas`
 * (data shapes only — same surface used by neutrals.ts).
 */

import { coordKey, sameCoord } from './coord.ts';
import type { ItemsFile } from './schemas/index.ts';
import type { ItemId, ItemSpawn, Plane, PostId, Post, Rng, Tile, TileCoord } from './types.ts';

/** Number of normal (non-buried) item spawns per scenario. */
export const NORMAL_ITEM_COUNT = 3;

/** Buried item spawn count. Tagged on the spawn for future expansion;
 * has no behavioral effect in v1 (discovery rolls work the same way). */
export const BURIED_ITEM_COUNT = 1;

export const TOTAL_ITEM_COUNT = NORMAL_ITEM_COUNT + BURIED_ITEM_COUNT;

/**
 * Per-plane weights for item placement. Ratio comes from the spec
 * (60% floor / 40% ceiling). Walls are excluded in v1.
 */
const PLANE_WEIGHTS: readonly { plane: Plane; weight: number }[] = [
  { plane: 'floor', weight: 60 },
  { plane: 'ceiling', weight: 40 },
];

const TOTAL_WEIGHT = PLANE_WEIGHTS.reduce((sum, e) => sum + e.weight, 0);

interface ItemSpawnContext {
  readonly tiles: ReadonlyMap<string, Tile>;
  readonly postLocations: readonly TileCoord[];
  readonly takenTiles: TileCoord[];
}

const isValidItemTile = (coord: TileCoord, ctx: ItemSpawnContext): boolean => {
  const tile = ctx.tiles.get(coordKey(coord));
  if (!tile) return false;
  if (tile.terrain.kind === 'obstacle') return false;
  for (const p of ctx.postLocations) {
    if (sameCoord(p, coord)) return false;
  }
  for (const t of ctx.takenTiles) {
    if (sameCoord(t, coord)) return false;
  }
  return true;
};

/** Weighted plane pick. Walks the cumulative weights with rng.next(). */
const pickPlaneWeighted = (rng: Rng): Plane => {
  const roll = rng.next() * TOTAL_WEIGHT;
  let acc = 0;
  for (const entry of PLANE_WEIGHTS) {
    acc += entry.weight;
    if (roll < acc) return entry.plane;
  }
  // Numerical floor: roll === TOTAL_WEIGHT is impossible since
  // rng.next() ∈ [0, 1), but bail out to the last entry just in case.
  return PLANE_WEIGHTS[PLANE_WEIGHTS.length - 1]!.plane;
};

/** Pick a tile on `plane` that satisfies the spawn constraints, or
 * null if the plane is fully occupied. Mirrors the neutrals.ts
 * pattern: enumerate every (x, y), filter, pick one. */
const pickItemTile = (plane: Plane, ctx: ItemSpawnContext, rng: Rng): TileCoord | null => {
  const candidates: TileCoord[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const c: TileCoord = { plane, x, y };
      if (isValidItemTile(c, ctx)) candidates.push(c);
    }
  }
  if (candidates.length === 0) return null;
  return candidates[rng.int(candidates.length)] ?? null;
};

export interface SpawnItemsInput {
  readonly tiles: ReadonlyMap<string, Tile>;
  readonly posts: ReadonlyMap<PostId, Post>;
  readonly itemsFile: ItemsFile;
}

/**
 * Spawn the round-14 item drops. Returns `TOTAL_ITEM_COUNT` entries:
 * the first `NORMAL_ITEM_COUNT` are unburied, the last
 * `BURIED_ITEM_COUNT` carry `buried: true`. Discovery is identical
 * either way — `buried` is metadata for future expansion.
 *
 * Determinism: the supplied `Rng` is the only source of randomness,
 * so the same scenario seed produces the same set every time.
 */
export const spawnItems = (input: SpawnItemsInput, rng: Rng): readonly ItemSpawn[] => {
  const templateIds: ItemId[] = input.itemsFile.templates.map((t) => t.id as ItemId);
  if (templateIds.length === 0) return [];

  const postLocations = [...input.posts.values()].map((p) => p.location);
  const ctx: ItemSpawnContext = {
    tiles: input.tiles,
    postLocations,
    takenTiles: [],
  };

  const out: ItemSpawn[] = [];
  for (let i = 0; i < TOTAL_ITEM_COUNT; i++) {
    const itemId = templateIds[rng.int(templateIds.length)]!;
    const plane = pickPlaneWeighted(rng);
    const tile = pickItemTile(plane, ctx, rng);
    if (!tile) continue;
    ctx.takenTiles.push(tile);
    const buried = i >= NORMAL_ITEM_COUNT;
    out.push({ itemId, location: tile, buried, discovered: false });
  }
  return out;
};

/**
 * Look up the item-template metadata for a spawned id. Returns
 * undefined if the id is unknown (which would only happen if the
 * data file was edited after a replay was generated).
 */
export const itemTemplateById = (
  itemsFile: ItemsFile,
  itemId: ItemId,
): ItemsFile['templates'][number] | undefined =>
  itemsFile.templates.find((t) => (t.id as ItemId) === itemId);
