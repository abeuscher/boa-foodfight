/**
 * engine/neutrals — round-8 neutral party spawn + helpers.
 *
 * Three neutral parties spawn per scenario (one each of mice,
 * cockroaches, stinkbugs) on distinct planes. Mice are restricted to
 * floor or ceiling; the other two pick from the remaining planes.
 * Spawn tile within each plane is seeded-random and avoids POSTs,
 * obstacles, and the ant queen's queen-guard party tile.
 *
 * Pure: no I/O. All randomness flows through the injected `Rng`.
 *
 * Imports allowed: `engine/coord`, `engine/types`.
 */

import { coordKey, sameCoord } from './coord.ts';
import type {
  NeutralKind,
  NeutralStatus,
  Party,
  PartyId,
  Plane,
  ReplayEvent,
  Rng,
  Tile,
  TileCoord,
  Unit,
  UnitId,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';

/** Planes mice are allowed to spawn on. Cockroaches/stinkbugs use any
 * of the six planes. */
export const MICE_PLANES: readonly Plane[] = ['floor', 'ceiling'];

export const ALL_PLANES: readonly Plane[] = [
  'floor',
  'ceiling',
  'north-wall',
  'south-wall',
  'east-wall',
  'west-wall',
];

/** Per-kind (templateId, unit count) recipe for one neutral party. */
const KIND_RECIPE: Readonly<Record<NeutralKind, { templateId: string; unitCount: number }>> = {
  mice: { templateId: 'mouse', unitCount: 3 },
  cockroaches: { templateId: 'cockroach', unitCount: 8 },
  stinkbugs: { templateId: 'stinkbug', unitCount: 2 },
};

export const partyIdForKind = (kind: NeutralKind): PartyId => `neutral-${kind}` as PartyId;

interface SpawnContext {
  readonly tiles: ReadonlyMap<string, Tile>;
  readonly templates: ReadonlyMap<UnitTemplateId, UnitTemplate>;
  readonly postLocations: readonly TileCoord[];
  readonly antQueenLocation: TileCoord | null;
  readonly takenTiles: TileCoord[];
}

const isValidSpawnTile = (coord: TileCoord, ctx: SpawnContext): boolean => {
  const tile = ctx.tiles.get(coordKey(coord));
  if (!tile) return false;
  if (tile.terrain.kind === 'obstacle') return false;
  // Avoid POSTs and the ant queen's tile.
  for (const p of ctx.postLocations) {
    if (sameCoord(p, coord)) return false;
  }
  if (ctx.antQueenLocation && sameCoord(ctx.antQueenLocation, coord)) return false;
  for (const t of ctx.takenTiles) {
    if (sameCoord(t, coord)) return false;
  }
  return true;
};

const pickSpawnTile = (plane: Plane, ctx: SpawnContext, rng: Rng): TileCoord | null => {
  // Iterate every (x, y) on the plane and shuffle the order via the
  // RNG's pick. We could pull random (x, y) up to N times, but a
  // deterministic shuffle is simpler and bounded.
  const candidates: TileCoord[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const c: TileCoord = { plane, x, y };
      if (isValidSpawnTile(c, ctx)) candidates.push(c);
    }
  }
  if (candidates.length === 0) return null;
  return candidates[rng.int(candidates.length)] ?? null;
};

export interface NeutralSpawn {
  readonly party: Party;
  readonly status: NeutralStatus;
  readonly event: ReplayEvent;
}

const buildNeutralParty = (
  kind: NeutralKind,
  location: TileCoord,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
  unitCounter: { value: number },
): Party => {
  const recipe = KIND_RECIPE[kind];
  const templateId = recipe.templateId as UnitTemplateId;
  const tmpl = templates.get(templateId);
  if (!tmpl) {
    throw new Error(`neutrals: unknown templateId '${recipe.templateId}' for kind '${kind}'`);
  }
  const units: Unit[] = [];
  for (let i = 0; i < recipe.unitCount; i++) {
    unitCounter.value += 1;
    units.push({
      id: `n${String(unitCounter.value).padStart(4, '0')}-${recipe.templateId}` as UnitId,
      templateId,
      currentHp: tmpl.baseStats.hp,
      level: 1,
      xp: 0,
    });
  }
  const partyId = partyIdForKind(kind);
  const leaderId = units[0]?.id;
  if (!leaderId) throw new Error(`neutrals: kind '${kind}' has zero units`);
  return {
    id: partyId,
    faction: 'neutral',
    units,
    leaderId,
    location,
    orders: [],
    posture: 'fight',
    strategyModifiers: [],
    jellyDoses: 0,
    leaderless: false,
  };
};

export interface SpawnNeutralsInput {
  readonly tiles: ReadonlyMap<string, Tile>;
  readonly templates: ReadonlyMap<UnitTemplateId, UnitTemplate>;
  readonly existingParties: ReadonlyMap<PartyId, Party>;
  readonly postLocations: readonly TileCoord[];
}

export interface SpawnNeutralsOutput {
  readonly parties: readonly Party[];
  readonly statuses: readonly { partyId: PartyId; status: NeutralStatus }[];
  /**
   * Neutral-spawn events, one per kind, ready to be emitted at
   * scenario-start. The driver attaches the standard turn/tick
   * common fields.
   */
  readonly events: readonly { partyId: PartyId; kind: NeutralKind; location: TileCoord }[];
}

const findAntQueenLocation = (
  parties: ReadonlyMap<PartyId, Party>,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): TileCoord | null => {
  for (const p of parties.values()) {
    if (p.faction !== 'ant') continue;
    for (const u of p.units) {
      const tmpl = templates.get(u.templateId);
      if (tmpl?.tags.includes('queen')) return p.location;
    }
  }
  return null;
};

/**
 * Pick three distinct planes for the three neutral parties:
 *   - mice: floor or ceiling (random pick).
 *   - cockroaches: any of the remaining 5 planes.
 *   - stinkbugs: any of the remaining 4 planes.
 * Order of selection is fixed (mice → cockroaches → stinkbugs) so the
 * same seed gives the same plane assignment.
 */
const pickPlanes = (rng: Rng): Record<NeutralKind, Plane> => {
  const micePlane = MICE_PLANES[rng.int(MICE_PLANES.length)]!;
  const remainingAfterMice = ALL_PLANES.filter((p) => p !== micePlane);
  const cockroachPlane = remainingAfterMice[rng.int(remainingAfterMice.length)]!;
  const remainingAfterCockroach = remainingAfterMice.filter((p) => p !== cockroachPlane);
  const stinkbugPlane = remainingAfterCockroach[rng.int(remainingAfterCockroach.length)]!;
  return { mice: micePlane, cockroaches: cockroachPlane, stinkbugs: stinkbugPlane };
};

const KIND_ORDER: readonly NeutralKind[] = ['mice', 'cockroaches', 'stinkbugs'];

/**
 * Spawn the round-8 neutral parties. Returns the new parties + their
 * status entries + replay event payloads. Deterministic given the
 * supplied `Rng`.
 */
export const spawnNeutrals = (input: SpawnNeutralsInput, rng: Rng): SpawnNeutralsOutput => {
  const planes = pickPlanes(rng);
  const antQueenLocation = findAntQueenLocation(input.existingParties, input.templates);
  const ctx: SpawnContext = {
    tiles: input.tiles,
    templates: input.templates,
    postLocations: input.postLocations,
    antQueenLocation,
    takenTiles: [],
  };
  const parties: Party[] = [];
  const statuses: { partyId: PartyId; status: NeutralStatus }[] = [];
  const events: { partyId: PartyId; kind: NeutralKind; location: TileCoord }[] = [];
  const unitCounter = { value: 0 };
  for (const kind of KIND_ORDER) {
    const plane = planes[kind];
    const tile = pickSpawnTile(plane, ctx, rng);
    if (!tile) continue;
    ctx.takenTiles.push(tile);
    const party = buildNeutralParty(kind, tile, input.templates, unitCounter);
    parties.push(party);
    statuses.push({
      partyId: party.id,
      status: {
        hypnotizedBy: null,
        hypnoticControlRemaining: 0,
        spiderImmunityRemaining: 0,
        kind,
      },
    });
    events.push({ partyId: party.id, kind, location: tile });
  }
  return { parties, statuses, events };
};
