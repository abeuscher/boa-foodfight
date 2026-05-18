/**
 * Initial GameState construction from validated data files.
 *
 * Loading is deterministic given the same data files: unit ids are assigned
 * by a counter scoped to the load call so re-loading produces identical ids.
 * No randomness is used here — all RNG happens in the turn loop.
 */

import fs from 'node:fs';
import path from 'node:path';

import { buildInitialMarket } from './cards.ts';
import { INITIAL_CHARISMA, isPromotableTemplate } from './charisma.ts';
import { coordKey } from './coord.ts';
import { assignFormation } from './formation.ts';
import { spawnItems } from './items.ts';
import { generateRandomMap } from './map-gen.ts';
import { INITIAL_MP_SLOTS, isCasterTemplate } from './mp-tiers.ts';
import { spawnNeutrals } from './neutrals.ts';
import { PHASE_LENGTH } from './phase.ts';
import { createRng } from './rng.ts';
import {
  abilitiesFileSchema,
  dialogueFileSchema,
  formationsFileSchema,
  itemsFileSchema,
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
  ItemsFile,
  JellyFile,
  LeadersFile,
  MapFile,
  QueenFile,
  RosterFile,
  ShopFile,
  UnitsFile,
  VictoryConditionData,
} from './schemas/index.ts';
import { DEFAULT_VICTORY_CONDITION } from './types.ts';
import type {
  AbilityId,
  FogTile,
  GameState,
  ItemSpawn,
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
  VictoryCondition,
} from './types.ts';

export interface NeutralSpawnEvent {
  readonly partyId: PartyId;
  readonly neutralKind: NeutralKind;
  readonly location: TileCoord;
}

/**
 * Round 14 — payload for one `item-spawned` replay event. The driver
 * attaches `turn`/`tick` and emits one event per entry alongside
 * `scenario-start`.
 */
export interface ItemSpawnEvent {
  readonly itemId: ItemSpawn['itemId'];
  readonly location: TileCoord;
  readonly buried: boolean;
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
  /**
   * Round 14 — item-spawn replay payloads. Same pattern as
   * neutralSpawnEvents.
   */
  readonly itemSpawnEvents: readonly ItemSpawnEvent[];
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
  readonly items: ItemsFile;
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
  items: readJson(path.join(dataDir, 'items.json'), (v) => itemsFileSchema.parse(v)),
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
      ...(p.oneWay ? { oneWay: true } : {}),
      ...(p.concealment ? { concealment: true } : {}),
      ...(p.combatModifier !== undefined
        ? {
            combatModifier: {
              litOwner: p.combatModifier.litOwner,
              faction: p.combatModifier.faction,
              attack: p.combatModifier.attack,
            },
          }
        : {}),
      ...(p.hazardField !== undefined
        ? {
            hazardField: {
              tiles: p.hazardField.tiles.map((t) => ({ plane: t.plane, x: t.x, y: t.y })),
              damage: p.hazardField.damage,
              ...(p.hazardField.suppressedWhenOwnedBy !== undefined
                ? { suppressedWhenOwnedBy: p.hazardField.suppressedWhenOwnedBy }
                : {}),
            },
          }
        : {}),
      // Engine dependency #9 — opt-in per-POST in-sim gold income.
      // Conditional spread (same shape as the optional fields above):
      // absent in the map ⇒ the key is never written, so the loaded
      // POST is byte-identical and the end-of-turn sweep finds nothing.
      ...(p.goldPerTurn !== undefined ? { goldPerTurn: p.goldPerTurn } : {}),
      tags: p.tags,
      // Round 17 — POST hold mechanic. No capture in progress at
      // scenario start for any POST (faction-locked, neutral, or
      // mid-POST alike).
      capturingFaction: null,
      captureTurnsRemaining: null,
    });
  }
  return posts;
};

/**
 * L4 (Hallway) POST-randomization (§3.3). For a `static` map,
 * re-resolve each post that declares a `jitter` band: its column
 * (`location.x`) and `plane` stay fixed; the row is chosen uniformly
 * in `[minRow, maxRow]` via a dedicated seeded RNG fork (reproducible
 * and independent of the neutral / item / card / blitz streams),
 * then clamped to the post's plane height as a safety net against a
 * mis-authored band.
 *
 * Posts without `jitter` are returned untouched, and if *no* post
 * declares jitter the input is returned by reference with no RNG
 * consumed — so the jitter-free static maps (L2 / tutorial) stay
 * byte-identical. Non-static maps never reach here (their POST layout
 * is already fully seed-randomized by map-gen), so L1 is byte-
 * identical too.
 */
export const applyPostJitter = (mapFile: MapFile, seed: number): MapFile => {
  if (!mapFile.posts.some((p) => p.jitter !== undefined)) return mapFile;
  const rng = createRng(seed).fork('post-jitter');
  const planeHeight = new Map(mapFile.planes.map((pl) => [pl.plane, pl.height]));
  const posts = mapFile.posts.map((p) => {
    if (p.jitter === undefined) return p;
    const { minRow, maxRow } = p.jitter;
    const drawn = minRow + Math.floor(rng.next() * (maxRow - minRow + 1));
    const height = planeHeight.get(p.location.plane) ?? drawn + 1;
    const y = Math.min(Math.max(drawn, 0), height - 1);
    return { ...p, location: { ...p.location, y } };
  });
  return { ...mapFile, posts };
};

const buildParties = (
  rosters: readonly RosterFile[],
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
  abilities: AbilitiesFile,
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
          // Round 21 — initialize MP pool (mechanics memo §1.1) for
          // caster-eligible templates: intelligence ≥ 5, the `caster`
          // tag, or any template that carries a tier-2/3 ability
          // (e.g., archer's volley, footman's phalanx-charge).
          // Non-casters get no `mpSlots` field so their tier-1
          // abilities (e.g., footman `brace`) fire freely.
          const mpSlotsField = isCasterTemplate(tmpl, abilities)
            ? { mpSlots: INITIAL_MP_SLOTS }
            : {};
          // Round 26 — charisma-gated promotion (mechanics memo §1.4).
          // Seed `charisma: 50` only on promotable templates (the 8
          // listed in `PROMOTION_TREE`). Queens, neutrals, and
          // specialty units (worker / tank / potato-bug / spiderling)
          // never carry charisma since they can't promote — the
          // missing field is read by the engine as "outside the
          // promotion track."
          const charismaField = isPromotableTemplate(tmpl.id) ? { charisma: INITIAL_CHARISMA } : {};
          units.push({
            id: `u${String(unitCounter).padStart(4, '0')}-${entry.templateId}` as UnitId,
            templateId: tmpl.id,
            currentHp: tmpl.baseStats.hp,
            level: 1,
            xp: 0,
            ...mpSlotsField,
            ...charismaField,
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
      // Round 20 — auto-assign the formation (mechanics memo §1.5)
      // from template tags + size. Front cap 3, back cap 2,
      // overflow goes to reserve. Deterministic in roster order.
      const formation = assignFormation(units, templates);
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
        formation,
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
  readonly itemSpawnEvents: readonly ItemSpawnEvent[];
}

/** Brand the validated scenario `victoryCondition` data into the
 * engine's id types. Exhaustive over the discriminated union so a new
 * kind is a compile error here until it is mapped. */
const toVictoryCondition = (vc: VictoryConditionData): VictoryCondition => {
  switch (vc.kind) {
    case 'capture-post':
      return { kind: 'capture-post', postId: vc.postId as PostId };
    case 'escort':
      return {
        kind: 'escort',
        escortUnitTemplateId: vc.escortUnitTemplateId as UnitTemplateId,
        exitPostId: vc.exitPostId as PostId,
      };
    case 'eradicate':
      return { kind: 'eradicate' };
    case 'recruit-count':
      return {
        kind: 'recruit-count',
        target: vc.target,
        unitTemplateId: vc.unitTemplateId as UnitTemplateId,
      };
  }
};

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
  //
  // L2-1 — a `static: true` map (the hand-authored L2 pipe corridor,
  // whose obstacle walls and bespoke POSTs must survive intact) skips
  // the random pass entirely and is used verbatim. L1's map.json has
  // no `static` flag so its random-map path is byte-identical.
  const randomizedMap = data.map.static
    ? applyPostJitter(data.map, seed)
    : generateRandomMap({ seed, base: data.map });
  const tiles = buildTiles(randomizedMap);
  const posts = buildPosts(randomizedMap);
  const baseParties = buildParties(data.rosters, unitTemplates, data.abilities);
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

  // Round 14: item drops. 4 spawns total via a dedicated RNG fork so
  // the item placement stream is independent of neutrals/movement
  // entropy. Persistence/discoverability is handled at end-of-turn.
  const itemRng = createRng(seed).fork('items-spawn');
  const itemSpawnList = spawnItems({ tiles, posts, itemsFile: data.items }, itemRng);

  // Round 25 — commander cards (mechanics memo §1.3). Build the
  // public market + deck split via a dedicated RNG fork so the deck
  // shuffle is independent of map / neutrals / items entropy. Both
  // factions start with empty hands.
  const cardsRng = createRng(seed).fork('cards-deck');
  const initialMarket = buildInitialMarket(cardsRng);

  // Round 29 — spider blitz mode (mechanics memo §1.7). Per-scenario
  // 5% coin flip on a dedicated fork so the dice are independent of
  // every other subsystem's entropy. When true, the spider AI
  // overrides per-party orders to march every non-queen-guard party
  // at the storm-drain for the whole scenario. Adds variance to the
  // baseline win rate without changing the dominant-strategy median.
  const blitzRng = createRng(seed).fork('spider-blitz');
  const spiderBlitzMode = blitzRng.next() < 0.05;

  // L2-1 — per-scenario win/loss objective. The map may declare it;
  // a map without it defaults to the L1 capture-spider-web objective
  // (DEFAULT_VICTORY_CONDITION), so the static L1 path is byte-
  // identical. Brand the data strings into the engine's id types.
  const vcData = randomizedMap.victoryCondition;
  const victoryCondition: VictoryCondition =
    vcData === undefined ? DEFAULT_VICTORY_CONDITION : toVictoryCondition(vcData);

  // Engine dependency #10 — opt-in: when the map declares
  // `abilityParamsAuthoritative: true`, the hypnotize/recruit handlers
  // read their tuning from the loaded `abilities.json` instead of the
  // hardcoded constants (docs §4g). Absent / false on every shipped
  // map (`data/level-1..8`), so the hardcoded path — and the gate-29
  // locked baseline — is byte-identical.
  const abilityParamsAuthoritative = randomizedMap.abilityParamsAuthoritative === true;

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
    playerGold: { ant: 0, spider: 0 },
    itemSpawns: itemSpawnList,
    cardMarket: initialMarket.cardMarket,
    cardHand: { ant: [], spider: [] },
    cardDeck: initialMarket.cardDeck,
    spiderBlitzMode,
    victoryCondition,
    abilityParamsAuthoritative,
    winner: null,
  };
  const neutralSpawnEvents: NeutralSpawnEvent[] = spawnResult.events.map((e) => ({
    partyId: e.partyId,
    neutralKind: e.kind,
    location: e.location,
  }));
  const itemSpawnEvents: ItemSpawnEvent[] = itemSpawnList.map((s) => ({
    itemId: s.itemId,
    location: s.location,
    buried: s.buried,
  }));
  return { state, neutralSpawnEvents, itemSpawnEvents };
};

export const loadScenario = (dataDir: string, seed: number): LoadedScenario => {
  const data = loadScenarioData(dataDir);
  const built = buildInitialStateWithEvents(data, seed);
  return {
    state: built.state,
    data,
    neutralSpawnEvents: built.neutralSpawnEvents,
    itemSpawnEvents: built.itemSpawnEvents,
  };
};
