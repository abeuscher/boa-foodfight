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

import { coordKey, distance, sameCoord } from './coord.ts';
import type { ItemsFile, JellyFile } from './schemas/index.ts';
import type {
  GameState,
  ItemId,
  ItemSpawn,
  Party,
  PartyId,
  Plane,
  Post,
  PostId,
  ReplayEvent,
  Rng,
  Tile,
  TileCoord,
  Unit,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';

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

// ---------------------------------------------------------------------------
// Discovery (end-of-turn)
// ---------------------------------------------------------------------------

/**
 * Per-roll discovery probability for an undiscovered item within
 * Chebyshev 1 (same plane) of an eligible party at end-of-turn. Spec
 * locks the adjacency rate at 25%; a party standing ON the item tile
 * (Chebyshev 0) auto-discovers (100%, see `discoverItems`). The
 * round-28 bump rewards exploration: walking over an item now finds
 * it deterministically rather than rolling at 1-in-4.
 */
export const ITEM_DISCOVERY_CHANCE = 0.25;

/**
 * Slot-priority for the simple swap heuristic. Higher numbers win.
 * Consumables aren't listed here because they don't occupy slots —
 * mead and royal-jelly-vial fire on pickup and the slot stays empty.
 */
export const ITEM_PRIORITY: Readonly<Record<string, number>> = {
  'brass-knuckles': 4,
  'leather-pad': 3,
  boots: 2,
  'scout-lens': 1,
};

const priorityFor = (itemId: ItemId): number => ITEM_PRIORITY[itemId] ?? 0;

/**
 * True iff this party is eligible for item discovery. Excludes
 * neutrals, queen-guard parties (immobile, can't pursue items), and
 * leaderless / wiped parties (no living units → nobody to carry).
 */
const isDiscoveryEligible = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  if (party.faction !== 'ant' && party.faction !== 'spider') return false;
  if (party.leaderless) return false;
  if (!party.units.some((u) => u.currentHp > 0)) return false;
  // Skip the queen-guard party (the queen is tagged 'queen' and the
  // guard is anchored to it). The party never moves, so opportunistic
  // discovery would be unfair / static.
  for (const u of party.units) {
    const tmpl = templates.get(u.templateId);
    if (tmpl?.tags.includes('queen')) return false;
  }
  return true;
};

const isAdjacent = (a: TileCoord, b: TileCoord): boolean =>
  a.plane === b.plane && distance(a, b) <= 1;

/**
 * True iff the party stands ON the spawn's tile (Chebyshev 0). Round
 * 28 — on-tile pickups bypass the discovery roll and resolve at
 * 100%; only Chebyshev 1 still rolls at `ITEM_DISCOVERY_CHANCE`.
 */
const isOnTile = (a: TileCoord, b: TileCoord): boolean =>
  a.plane === b.plane && distance(a, b) === 0;

interface ConsumableEffectInput {
  readonly party: Party;
  readonly itemId: ItemId;
  readonly itemsFile: ItemsFile;
  readonly jelly: JellyFile;
  readonly templates: ReadonlyMap<UnitTemplateId, UnitTemplate>;
}

interface ConsumableEffectResult {
  readonly party: Party;
  readonly effect: 'heal' | 'jelly' | null;
}

/** Heal every unit in `party` to its template max HP. Dead units stay
 * dead. Mirrors the end-of-turn `healParty` shape. */
const healToFull = (party: Party, templates: ReadonlyMap<UnitTemplateId, UnitTemplate>): Party => {
  const healed: Unit[] = party.units.map((u) => {
    if (u.currentHp <= 0) return u;
    const tmpl = templates.get(u.templateId);
    if (!tmpl) return u;
    if (u.currentHp >= tmpl.baseStats.hp) return u;
    return { ...u, currentHp: tmpl.baseStats.hp };
  });
  return { ...party, units: healed };
};

/** Apply a consumable item's effect to the picking-up party.
 * Returns the new party + the effect tag for the replay event. If the
 * item is not a consumable, returns the party unchanged with
 * `effect: null` (caller should treat the slot as persistent). */
const applyConsumable = (input: ConsumableEffectInput): ConsumableEffectResult => {
  const tmpl = itemTemplateById(input.itemsFile, input.itemId);
  if (tmpl?.kind !== 'consumable') {
    return { party: input.party, effect: null };
  }
  if (tmpl.effect === 'heal') {
    return { party: healToFull(input.party, input.templates), effect: 'heal' };
  }
  if (tmpl.effect === 'jelly') {
    const next = Math.min(input.jelly.capacityPerParty, input.party.jellyDoses + tmpl.magnitude);
    return { party: { ...input.party, jellyDoses: next }, effect: 'jelly' };
  }
  return { party: input.party, effect: null };
};

export interface DiscoverItemsInput {
  readonly itemsFile: ItemsFile;
  readonly jelly: JellyFile;
}

/** Build the `item-discovered` replay event for a pickup. Centralized
 * so the three branches below (consumable / empty-slot / swap) share
 * one event-shape (also keeps jscpd happy). */
const makeDiscoveredEvent = (
  partyId: PartyId,
  spawn: ItemSpawn,
  turn: number,
  tick: () => number,
): ReplayEvent => ({
  kind: 'item-discovered',
  turn,
  tick: tick(),
  partyId,
  itemId: spawn.itemId,
  location: spawn.location,
});

export interface DiscoverItemsOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

/**
 * End-of-turn item-discovery tick.
 *
 * For every eligible (ant or spider, non-queen-guard, non-leaderless)
 * party, in stable id order: scan undiscovered items within
 * Chebyshev 1 on the same plane. For each, roll 25% via the seeded
 * RNG. On a hit:
 *   - If the item is a consumable, apply the effect immediately, mark
 *     the spawn discovered, and emit `item-discovered` + `item-consumed`.
 *   - If the item is persistent and the party's slot is empty, equip
 *     it and emit `item-discovered`.
 *   - If the slot is full, compare priorities. Higher new priority
 *     swaps (drop the old at the discovery tile and emit
 *     `item-dropped` then `item-discovered`); equal/lower declines
 *     and the item stays on the map.
 */
export const discoverItems = (
  state: GameState,
  input: DiscoverItemsInput,
  rng: Rng,
  turn: number,
  tick: () => number,
): DiscoverItemsOutcome => {
  const events: ReplayEvent[] = [];
  // Working copy of spawns; we may flip `discovered` and append new
  // spawns (for swap drops).
  const spawns: ItemSpawn[] = state.itemSpawns.map((s) => ({ ...s }));
  const parties = new Map<PartyId, Party>(state.parties);

  // Stable order: alphabetical by partyId.
  const orderedIds = [...state.parties.keys()].sort();

  for (const id of orderedIds) {
    const partyIn = parties.get(id);
    if (!partyIn) continue;
    if (!isDiscoveryEligible(partyIn, state.unitTemplates)) continue;

    let workingParty = partyIn;
    // Take a stable list of discoverable spawn indices. Process them
    // in spawn order so two adjacent items resolve deterministically.
    // Snapshot the length so swap-drops appended during this party's
    // pass don't re-enter the loop (they become eligible next tick).
    const snapshotLen = spawns.length;
    for (let i = 0; i < snapshotLen; i++) {
      const spawn = spawns[i];
      if (!spawn || spawn.discovered) continue;
      if (!isAdjacent(workingParty.location, spawn.location)) continue;
      // Round 28 — on-tile (Chebyshev 0) auto-discovers (100%, no
      // RNG draw); adjacency (Chebyshev 1) still rolls 25% via the
      // seeded RNG. Skipping the RNG draw on auto-discovery is
      // intentional and preserves determinism: the on-tile branch
      // is unconditional, so the consumption is deterministic
      // either way.
      if (!isOnTile(workingParty.location, spawn.location)) {
        if (rng.next() >= ITEM_DISCOVERY_CHANCE) continue;
      }

      const tmpl = itemTemplateById(input.itemsFile, spawn.itemId);
      if (!tmpl) continue;

      if (tmpl.kind === 'consumable') {
        const consumed = applyConsumable({
          party: workingParty,
          itemId: spawn.itemId,
          itemsFile: input.itemsFile,
          jelly: input.jelly,
          templates: state.unitTemplates,
        });
        if (consumed.effect === null) continue;
        workingParty = consumed.party;
        spawns[i] = { ...spawn, discovered: true };
        events.push(makeDiscoveredEvent(workingParty.id, spawn, turn, tick));
        events.push({
          kind: 'item-consumed',
          turn,
          tick: tick(),
          partyId: workingParty.id,
          itemId: spawn.itemId,
          effect: consumed.effect,
        });
        continue;
      }

      // Persistent: slot management.
      const currentItem = workingParty.item ?? null;
      if (currentItem === null) {
        workingParty = { ...workingParty, item: spawn.itemId };
        spawns[i] = { ...spawn, discovered: true };
        events.push(makeDiscoveredEvent(workingParty.id, spawn, turn, tick));
        continue;
      }

      // Slot full — compare priorities. Equal/lower declines; higher
      // swaps (drop current at the tile, equip the new).
      if (priorityFor(spawn.itemId) <= priorityFor(currentItem)) continue;
      events.push({
        kind: 'item-dropped',
        turn,
        tick: tick(),
        partyId: workingParty.id,
        itemId: currentItem,
        location: spawn.location,
      });
      // Re-seed the dropped item as a fresh undiscovered spawn so it
      // can be re-acquired on a later tick. Loop guard `snapshotLen`
      // prevents this entry from being touched in the current pass.
      spawns.push({
        itemId: currentItem,
        location: spawn.location,
        buried: false,
        discovered: false,
      });
      workingParty = { ...workingParty, item: spawn.itemId };
      spawns[i] = { ...spawn, discovered: true };
      events.push(makeDiscoveredEvent(workingParty.id, spawn, turn, tick));
    }

    parties.set(id, workingParty);
  }

  // Prune fully-resolved spawns. Discovered consumables / equipped
  // persistents are gone from the world — the replay events carry
  // the audit trail for viewer rendering, so the state-side list
  // only needs to hold what's still discoverable. Swap-drops (still
  // marked `discovered: false`) are kept and become eligible again
  // next end-of-turn.
  const prunedSpawns: ItemSpawn[] = spawns.filter((s) => !s.discovered);

  const nextState: GameState = { ...state, parties, itemSpawns: prunedSpawns };
  return { state: nextState, events };
};
