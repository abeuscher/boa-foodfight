/**
 * Initial GameState construction from validated data files.
 *
 * Loading is deterministic given the same data files: unit ids are assigned
 * by a counter scoped to the load call so re-loading produces identical ids.
 * No randomness is used here — all RNG happens in the turn loop.
 */

import fs from 'node:fs';
import path from 'node:path';

import { coordKey } from './coord.ts';
import { generateRandomMap } from './map-gen.ts';
import { spawnNeutrals } from './neutrals.ts';
import { PHASE_LENGTH } from './phase.ts';
import { createRng } from './rng.ts';
import {
  abilitiesFileSchema,
  dialogueFileSchema,
  formationsFileSchema,
  jellyFileSchema,
  leadersFileSchema,
  mapFileSchema,
  queenFileSchema,
  rosterFileSchema,
  shopFileSchema,
  unitsFileSchema,
} from './schemas/index.ts';
import type {
  AbilitiesFile,
  DialogueFile,
  FormationsFile,
  JellyFile,
  LeadersFile,
  MapFile,
  QueenFile,
  RosterFile,
  ShopFile,
  UnitsFile,
} from './schemas/index.ts';
import type {
  AbilityId,
  FogTile,
  GameState,
  NeutralKind,
  NeutralStatus,
  Party,
  PartyId,
  Post,
  PostId,
  Terrain,
  Tile,
  TileCoord,
  Unit,
  UnitId,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';

export interface NeutralSpawnEvent {
  readonly partyId: PartyId;
  readonly neutralKind: NeutralKind;
  readonly location: TileCoord;
}

export interface LoadedScenario {
  readonly state: GameState;
  /** Original validated data, kept for ability/balance lookups during the run. */
  readonly data: ScenarioData;
  /**
   * Neutral-spawn replay payloads (round 8). The driver attaches the
   * common `turn` / `tick` fields and emits one `neutral-spawned`
   * event per entry alongside `scenario-start`.
   */
  readonly neutralSpawnEvents: readonly NeutralSpawnEvent[];
}

export interface ScenarioData {
  readonly units: UnitsFile;
  readonly abilities: AbilitiesFile;
  readonly leaders: LeadersFile;
  readonly map: MapFile;
  readonly queen: QueenFile;
  readonly jelly: JellyFile;
  readonly formations: FormationsFile;
  readonly shop: ShopFile;
  readonly dialogue: DialogueFile;
  readonly rosters: readonly RosterFile[];
}

const readJson = <T>(file: string, parse: (raw: unknown) => T): T => {
  const raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  return parse(raw);
};

export const loadScenarioData = (dataDir: string): ScenarioData => ({
  units: readJson(path.join(dataDir, 'units.json'), (v) => unitsFileSchema.parse(v)),
  abilities: readJson(path.join(dataDir, 'abilities.json'), (v) => abilitiesFileSchema.parse(v)),
  leaders: readJson(path.join(dataDir, 'leaders.json'), (v) => leadersFileSchema.parse(v)),
  map: readJson(path.join(dataDir, 'map.json'), (v) => mapFileSchema.parse(v)),
  queen: readJson(path.join(dataDir, 'queen.json'), (v) => queenFileSchema.parse(v)),
  jelly: readJson(path.join(dataDir, 'jelly.json'), (v) => jellyFileSchema.parse(v)),
  formations: readJson(path.join(dataDir, 'formations.json'), (v) => formationsFileSchema.parse(v)),
  shop: readJson(path.join(dataDir, 'shop.json'), (v) => shopFileSchema.parse(v)),
  dialogue: readJson(path.join(dataDir, 'dialogue.json'), (v) => dialogueFileSchema.parse(v)),
  rosters: [
    readJson(path.join(dataDir, 'roster-ants.json'), (v) => rosterFileSchema.parse(v)),
    readJson(path.join(dataDir, 'roster-spiders.json'), (v) => rosterFileSchema.parse(v)),
  ],
});

const buildUnitTemplates = (units: UnitsFile): ReadonlyMap<UnitTemplateId, UnitTemplate> => {
  const map = new Map<UnitTemplateId, UnitTemplate>();
  for (const t of units.templates) {
    const id = t.id as UnitTemplateId;
    map.set(id, {
      id,
      name: t.name,
      faction: t.faction,
      size: t.size,
      slotCost: t.slotCost,
      movement: t.movement,
      baseStats: t.baseStats,
      abilities: t.abilities.map((a) => a as AbilityId),
      tags: t.tags,
      planeAffinity: t.planeAffinity,
    });
  }
  return map;
};

const buildTiles = (mapFile: MapFile): ReadonlyMap<string, Tile> => {
  const tiles = new Map<string, Tile>();
  for (const plane of mapFile.planes) {
    for (let y = 0; y < plane.height; y++) {
      const row = plane.tiles[y];
      if (!row) throw new Error(`map plane '${plane.plane}' missing row ${String(y)}`);
      for (let x = 0; x < plane.width; x++) {
        const raw = row[x];
        if (!raw)
          throw new Error(`map plane '${plane.plane}' missing tile (${String(x)},${String(y)})`);
        const terrain: Terrain = {
          kind: raw.kind,
          movementCost: raw.movementCost,
          defenseModifier: raw.defenseModifier,
          ...(raw.hazardDamage !== undefined ? { hazardDamage: raw.hazardDamage } : {}),
          ...(raw.groundPathBonus !== undefined ? { groundPathBonus: raw.groundPathBonus } : {}),
        };
        const coord = { plane: plane.plane, x, y };
        tiles.set(coordKey(coord), { coord, terrain });
      }
    }
  }
  return tiles;
};

const buildPosts = (mapFile: MapFile): ReadonlyMap<PostId, Post> => {
  const posts = new Map<PostId, Post>();
  for (const p of mapFile.posts) {
    const id = p.id as PostId;
    posts.set(id, {
      id,
      name: p.name,
      location: p.location,
      owner: p.owner,
      defensiveBonus: p.defensiveBonus,
      healingRate: p.healingRate,
      ...(p.pairedWith !== undefined ? { pairedWith: p.pairedWith as PostId } : {}),
      tags: p.tags,
    });
  }
  return posts;
};

const buildParties = (
  rosters: readonly RosterFile[],
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): ReadonlyMap<PartyId, Party> => {
  const parties = new Map<PartyId, Party>();
  let unitCounter = 0;
  for (const roster of rosters) {
    for (const partyDef of roster.parties) {
      const units: Unit[] = [];
      for (const entry of partyDef.units) {
        const tmpl = templates.get(entry.templateId as UnitTemplateId);
        if (!tmpl) {
          throw new Error(
            `party '${partyDef.id}' references unknown templateId '${entry.templateId}'`,
          );
        }
        for (let i = 0; i < entry.count; i++) {
          unitCounter += 1;
          units.push({
            id: `u${String(unitCounter).padStart(4, '0')}-${entry.templateId}` as UnitId,
            templateId: tmpl.id,
            currentHp: tmpl.baseStats.hp,
            level: 1,
            xp: 0,
          });
        }
      }
      const leaderUnit = units[partyDef.leaderIndex];
      if (!leaderUnit) {
        throw new Error(
          `party '${partyDef.id}' leaderIndex ${String(partyDef.leaderIndex)} is out of range`,
        );
      }
      const id = partyDef.id as PartyId;
      parties.set(id, {
        id,
        faction: roster.faction,
        units,
        leaderId: leaderUnit.id,
        location: partyDef.startingLocation,
        orders: [],
        posture: partyDef.posture,
        strategyModifiers: [],
        jellyDoses: 0,
        leaderless: false,
      });
    }
  }
  return parties;
};

const buildInitialFog = (tiles: ReadonlyMap<string, Tile>): ReadonlyMap<string, FogTile> => {
  const fog = new Map<string, FogTile>();
  for (const key of tiles.keys()) {
    fog.set(key, { visible: false, seen: false, pheromone: false });
  }
  return fog;
};

export interface BuildInitialStateResult {
  readonly state: GameState;
  readonly neutralSpawnEvents: readonly NeutralSpawnEvent[];
}

export const buildInitialStateWithEvents = (
  data: ScenarioData,
  seed: number,
): BuildInitialStateResult => {
  const inner = buildInitialStateInternal(data, seed);
  return inner;
};

export const buildInitialState = (data: ScenarioData, seed: number): GameState =>
  buildInitialStateInternal(data, seed).state;

const buildInitialStateInternal = (data: ScenarioData, seed: number): BuildInitialStateResult => {
  const unitTemplates = buildUnitTemplates(data.units);
  // Per-seed map randomization: each scenario gets its own POST layout
  // (3-5 mid-POSTs subject to ≤2 per plane) and obstacle clusters
  // (2-5 per plane, biased to contiguity). storm-drain (start) and
  // spider-web (finish) stay fixed.
  const randomizedMap = generateRandomMap({ seed, base: data.map });
  const tiles = buildTiles(randomizedMap);
  const posts = buildPosts(randomizedMap);
  const baseParties = buildParties(data.rosters, unitTemplates);
  const fog = buildInitialFog(tiles);

  // Round 8: spawn three neutral parties (one each mice/cockroaches/
  // stinkbugs) on distinct planes via a seeded RNG fork. Mice are
  // restricted to floor/ceiling. Spawn tiles avoid POSTs, obstacles,
  // and the ant queen's queen-guard tile.
  const neutralRng = createRng(seed).fork('neutrals-spawn');
  const postLocations = [...posts.values()].map((p) => p.location);
  const spawnResult = spawnNeutrals(
    {
      tiles,
      templates: unitTemplates,
      existingParties: baseParties,
      postLocations,
    },
    neutralRng,
  );
  const parties = new Map<PartyId, Party>(baseParties);
  const neutralStatus = new Map<PartyId, NeutralStatus>();
  for (const p of spawnResult.parties) parties.set(p.id, p);
  for (const s of spawnResult.statuses) neutralStatus.set(s.partyId, s.status);

  const state: GameState = {
    turn: 0,
    seed,
    tiles,
    posts,
    parties,
    unitTemplates,
    fog,
    queenUltimateCharge: 0,
    queenUltimatesUsed: 0,
    webbedTiles: new Map(),
    buttons: 0,
    phase: 'day',
    phaseTurnsRemaining: PHASE_LENGTH,
    pheroTrails: new Map(),
    neutralStatus,
    damageZones: [],
    winner: null,
  };
  const neutralSpawnEvents: NeutralSpawnEvent[] = spawnResult.events.map((e) => ({
    partyId: e.partyId,
    neutralKind: e.kind,
    location: e.location,
  }));
  return { state, neutralSpawnEvents };
};

export const loadScenario = (dataDir: string, seed: number): LoadedScenario => {
  const data = loadScenarioData(dataDir);
  const built = buildInitialStateWithEvents(data, seed);
  return { state: built.state, data, neutralSpawnEvents: built.neutralSpawnEvents };
};
