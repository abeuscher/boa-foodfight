/**
 * engine/map-gen — seeded per-scenario map randomization.
 *
 * Takes the static `MapFile` (loaded from data/level-1/map.json) and
 * produces a new MapFile with:
 *
 *   - storm-drain at floor (0,0) and spider-web at ceiling (9,9)
 *     held fixed (the "start" and "finish" anchors).
 *   - 3-5 randomly-placed mid-POSTs distributed across the 6 planes,
 *     subject to ≤2 mid-POSTs per plane. Three POST type pools —
 *     soap-dish, towel-rack, wall-crack — get one base instance each
 *     (suffixed `-1`); 0-2 random extras suffix incrementally.
 *   - One randomly-chosen floor-plane mid-POST gets paired with one
 *     randomly-chosen wall-plane mid-POST so the engine's
 *     paired-POST plane-transition shortcut is exercised. (Important
 *     for ground-only / no-fly parties.)
 *   - 2-5 obstacle tiles per plane with a clustering bias: the first
 *     obstacle on a plane lands at a random valid tile; subsequent
 *     obstacles prefer 4-neighbors of an already-placed obstacle.
 *
 * All randomness flows through a forked Rng seeded by the scenario
 * seed, so seed N always produces the same map across all variants.
 *
 * Imports allowed: engine/types, engine/coord, engine/rng,
 * engine/schemas only (this is a pure transform of MapFile).
 */

import { coordKey, inPlaneNeighbors } from './coord.ts';
import { createRng } from './rng.ts';
import type { MapFile } from './schemas/index.ts';
import type { Plane, Rng, TileCoord } from './types.ts';

const FLOOR_PLANE: Plane = 'floor';
const CEILING_PLANE: Plane = 'ceiling';
const WALL_PLANES: readonly Plane[] = ['north-wall', 'south-wall', 'east-wall', 'west-wall'];
const ALL_PLANES: readonly Plane[] = [FLOOR_PLANE, CEILING_PLANE, ...WALL_PLANES];

const STORM_DRAIN_LOC: TileCoord = { plane: FLOOR_PLANE, x: 0, y: 0 };
const SPIDER_WEB_LOC: TileCoord = { plane: CEILING_PLANE, x: 9, y: 9 };

// Party starting tiles (from the rosters). Reserved from POST/obstacle
// placement so the random map doesn't blockade a starting party.
const PARTY_START_TILES: readonly TileCoord[] = [
  { plane: 'floor', x: 0, y: 0 },
  { plane: 'floor', x: 1, y: 0 },
  { plane: 'floor', x: 0, y: 1 },
  { plane: 'floor', x: 1, y: 1 },
  { plane: 'ceiling', x: 9, y: 9 },
  { plane: 'ceiling', x: 8, y: 9 },
  { plane: 'ceiling', x: 9, y: 8 },
  { plane: 'ceiling', x: 7, y: 8 },
];

const MID_POST_TYPES = ['soap-dish', 'towel-rack', 'wall-crack'] as const;
type MidPostType = (typeof MID_POST_TYPES)[number];

const MID_POST_NAMES: Record<MidPostType, string> = {
  'soap-dish': 'Soap Dish',
  'towel-rack': 'Towel Rack',
  'wall-crack': 'Wall Crack',
};

const MID_POST_DEFENSIVE_BONUS = 2;
const MID_POST_HEALING_RATE = 1;

const GRID = 10;
const MAX_POSTS_PER_PLANE = 2;
const MIN_OBSTACLES_PER_PLANE = 2;
const MAX_OBSTACLES_PER_PLANE = 5;

const cloneCoord = (c: TileCoord): TileCoord => ({ plane: c.plane, x: c.x, y: c.y });

interface PostDraft {
  id: string;
  name: string;
  location: TileCoord;
  type: MidPostType;
  pairedWith?: string;
}

const tileKey = (c: TileCoord): string => coordKey(c);

const inBounds = (c: TileCoord): boolean => c.x >= 0 && c.x < GRID && c.y >= 0 && c.y < GRID;

const planeMidPostCount = (drafts: readonly PostDraft[], plane: Plane): number =>
  drafts.filter((d) => d.location.plane === plane).length;

const pickRandomLocationOnPlane = (
  rng: Rng,
  plane: Plane,
  reserved: ReadonlySet<string>,
): TileCoord | undefined => {
  // Up to 64 attempts; the 10x10 grid with ~10 reserved tiles always
  // succeeds well within that budget.
  for (let i = 0; i < 64; i++) {
    const x = rng.int(GRID);
    const y = rng.int(GRID);
    const c = { plane, x, y };
    if (!reserved.has(tileKey(c))) return c;
  }
  return undefined;
};

const generatePosts = (rng: Rng): { posts: PostDraft[]; mainPostTiles: ReadonlySet<string> } => {
  const drafts: PostDraft[] = [];
  const reservedTiles = new Set<string>();
  for (const t of PARTY_START_TILES) reservedTiles.add(tileKey(t));
  reservedTiles.add(tileKey(STORM_DRAIN_LOC));
  reservedTiles.add(tileKey(SPIDER_WEB_LOC));

  // For each base type, place exactly one POST.
  const typeCounters: Record<MidPostType, number> = {
    'soap-dish': 0,
    'towel-rack': 0,
    'wall-crack': 0,
  };

  const placeOfType = (
    type: MidPostType,
    candidatePlanes: readonly Plane[] = ALL_PLANES,
  ): PostDraft | undefined => {
    const planesByLoad = [...candidatePlanes].sort(
      (a, b) => planeMidPostCount(drafts, a) - planeMidPostCount(drafts, b),
    );
    for (const plane of planesByLoad) {
      if (planeMidPostCount(drafts, plane) >= MAX_POSTS_PER_PLANE) continue;
      const loc = pickRandomLocationOnPlane(rng, plane, reservedTiles);
      if (!loc) continue;
      typeCounters[type] += 1;
      const id = `${type}-${String(typeCounters[type])}`;
      reservedTiles.add(tileKey(loc));
      const draft: PostDraft = { id, name: MID_POST_NAMES[type], location: loc, type };
      drafts.push(draft);
      return draft;
    }
    return undefined;
  };

  // Phase 1: one of each base type, with placement constraints chosen
  // so the locked baseline AI can navigate the canonical chain even
  // on a randomized map.
  //
  //   - soap-dish-1 always lands on the floor (start plane). Baseline
  //     can reach it without plane-switch.
  //   - towel-rack-1 lands on a wall plane (any of the 4). Baseline's
  //     mage parties can plane-switch up; vanguard-alpha can edge-walk.
  //   - wall-crack-1 lands on a wall plane too — pairing logic below
  //     gives the floor↔wall transition non-fly parties need.
  placeOfType('soap-dish', [FLOOR_PLANE]);
  placeOfType('towel-rack', WALL_PLANES);
  placeOfType('wall-crack', WALL_PLANES);

  // Phase 2: 0-2 extras, picking types weighted uniformly.
  const extras = rng.int(3); // 0 | 1 | 2
  for (let i = 0; i < extras; i++) {
    const type = MID_POST_TYPES[rng.int(MID_POST_TYPES.length)];
    if (type) placeOfType(type);
  }

  // Phase 3: pair one floor mid-POST with one wall mid-POST so
  // ground-only parties have a paired-POST plane transition.
  const floorPost = drafts.find((d) => d.location.plane === FLOOR_PLANE);
  const wallPost = drafts.find((d) => WALL_PLANES.includes(d.location.plane));
  if (floorPost && wallPost) {
    floorPost.pairedWith = wallPost.id;
    wallPost.pairedWith = floorPost.id;
  }

  return { posts: drafts, mainPostTiles: reservedTiles };
};

const generateObstaclesForPlane = (
  rng: Rng,
  plane: Plane,
  reservedTiles: ReadonlySet<string>,
): TileCoord[] => {
  const count =
    MIN_OBSTACLES_PER_PLANE + rng.int(MAX_OBSTACLES_PER_PLANE - MIN_OBSTACLES_PER_PLANE + 1);
  const placed: TileCoord[] = [];
  const placedKeys = new Set<string>();
  let lastSeed: TileCoord | undefined;

  const isFree = (c: TileCoord): boolean =>
    inBounds(c) && !reservedTiles.has(tileKey(c)) && !placedKeys.has(tileKey(c));

  for (let i = 0; i < count; i++) {
    let pick: TileCoord | undefined;
    // 80% chance to attach to the most-recently-placed obstacle for
    // contiguity; 20% (or all of the time, when there's no anchor)
    // to seed a fresh random tile.
    if (lastSeed && rng.next() < 0.8) {
      const candidates = inPlaneNeighbors(lastSeed).filter((c) => isFree(c));
      if (candidates.length > 0) {
        pick = candidates[rng.int(candidates.length)];
      }
    }
    if (!pick) {
      for (let attempt = 0; attempt < 64; attempt++) {
        const x = rng.int(GRID);
        const y = rng.int(GRID);
        const c = { plane, x, y };
        if (isFree(c)) {
          pick = c;
          break;
        }
      }
    }
    if (!pick) break;
    placed.push(pick);
    placedKeys.add(tileKey(pick));
    lastSeed = pick;
  }

  return placed;
};

interface GenerateOptions {
  readonly seed: number;
  readonly base: MapFile;
}

export const generateRandomMap = (opts: GenerateOptions): MapFile => {
  const rng = createRng(opts.seed).fork('map-gen');
  const postRng = rng.fork('posts');
  const obstacleRng = rng.fork('obstacles');

  // ---- POSTs: storm-drain + spider-web fixed; 3-5 mid-POSTs random.
  const { posts: midDrafts, mainPostTiles } = generatePosts(postRng);

  const fixedPosts: MapFile['posts'] = [
    {
      id: 'storm-drain',
      name: 'The Storm Drain',
      location: cloneCoord(STORM_DRAIN_LOC),
      owner: 'ant',
      defensiveBonus: 4,
      healingRate: 3,
      tags: ['home-base'],
    },
    {
      id: 'spider-web',
      name: 'The Spider Web',
      location: cloneCoord(SPIDER_WEB_LOC),
      owner: 'spider',
      defensiveBonus: 2,
      healingRate: 3,
      tags: ['web'],
    },
  ];

  const newPosts: MapFile['posts'] = [
    ...fixedPosts,
    ...midDrafts.map((d) => ({
      id: d.id,
      name: d.name,
      location: cloneCoord(d.location),
      owner: 'neutral' as const,
      defensiveBonus: MID_POST_DEFENSIVE_BONUS,
      healingRate: MID_POST_HEALING_RATE,
      ...(d.pairedWith !== undefined ? { pairedWith: d.pairedWith } : {}),
      tags: d.pairedWith !== undefined ? ['plane-transition'] : [],
    })),
  ];

  // ---- Obstacles: 2-5 per plane, clustered.
  // Reserve all POST tiles + party start tiles.
  const obstacleReserved = new Set<string>(mainPostTiles);
  // The base map may have hardcoded obstacle tiles from earlier
  // phases; strip them first so the seed-generated layout is the
  // authoritative obstacle set. Hazards (other non-open terrain) are
  // preserved.
  const OPEN_TILE = { kind: 'open' as const, movementCost: 1, defenseModifier: 0 };
  const newPlanes: MapFile['planes'] = opts.base.planes.map((basePlane) => {
    const obstacles = generateObstaclesForPlane(obstacleRng, basePlane.plane, obstacleReserved);
    const obstacleSet = new Set(obstacles.map(tileKey));
    const tiles = basePlane.tiles.map((row, y) =>
      row.map((cell, x) => {
        const key = tileKey({ plane: basePlane.plane, x, y });
        if (obstacleSet.has(key)) {
          return { kind: 'obstacle' as const, movementCost: 999, defenseModifier: 0 };
        }
        // Wipe any base-map obstacles; preserve other non-open terrain.
        if (cell.kind === 'obstacle') return { ...OPEN_TILE };
        return cell;
      }),
    );
    return { plane: basePlane.plane, width: basePlane.width, height: basePlane.height, tiles };
  });

  return {
    version: opts.base.version,
    name: opts.base.name,
    planes: newPlanes,
    posts: newPosts,
  };
};
