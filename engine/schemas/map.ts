import { z } from 'zod';

import {
  factionSchema,
  idSchema,
  planeSchema,
  terrainKindSchema,
  tileCoordSchema,
} from './common.ts';

/**
 * Per-scenario win/loss objective (L2-1). Optional in the map file:
 * a map omitting it is read by the engine as the L1 default
 * (capture spider-web), keeping the static L1 data path byte-identical.
 *
 *  - `capture-post`: ants win when `postId` is ant-owned (the L1
 *    "capture the defended POST" template).
 *  - `escort`: ants win when a living unit of `escortUnitTemplateId`
 *    reaches `exitPostId`'s tile (the L2 Pipe / Aunt Ant objective).
 *  - `eradicate`: ants win when every spider party is dead (the L6
 *    Stairs objective). Carries no payload — no POST reference.
 *  - `recruit-count`: ants win when ≥`target` ant parties each hold a
 *    living `unitTemplateId` unit (the L8 Attic cockroach race). No
 *    POST reference.
 */
export const victoryConditionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('capture-post'), postId: idSchema }),
  z.object({
    kind: z.literal('escort'),
    escortUnitTemplateId: idSchema,
    exitPostId: idSchema,
  }),
  z.object({ kind: z.literal('eradicate') }),
  z.object({
    kind: z.literal('recruit-count'),
    target: z.number().int().positive(),
    unitTemplateId: idSchema,
  }),
]);

export type VictoryConditionData = z.infer<typeof victoryConditionSchema>;

export const terrainSchema = z.object({
  kind: terrainKindSchema,
  movementCost: z.number().int().min(1),
  defenseModifier: z.number().int(),
  hazardDamage: z.number().int().nonnegative().optional(),
  groundPathBonus: z.number().int().nonnegative().optional(),
});

export const planeMapSchema = z
  .object({
    plane: planeSchema,
    width: z.number().int().min(1),
    height: z.number().int().min(1),
    /** Row-major terrain grid: tiles[y][x] */
    tiles: z.array(z.array(terrainSchema).min(1)).min(1),
  })
  .refine((p) => p.tiles.length === p.height, {
    message: 'tile grid height must equal declared height',
  })
  .refine((p) => p.tiles.every((row) => row.length === p.width), {
    message: 'each tile row length must equal declared width',
  });

export const postSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  location: tileCoordSchema,
  owner: factionSchema,
  defensiveBonus: z.number().int().nonnegative(),
  healingRate: z.number().int().nonnegative(),
  pairedWith: idSchema.optional(),
  /**
   * L8 (Attic) Skylight one-way plane transit (§3.4). When `true`,
   * paired-POST transitions may leave this POST through its pair but
   * may not be used to enter it. Absent/false on every shipped map.
   */
  oneWay: z.boolean().optional(),
  /**
   * L5 (Bedroom) Under-Bed concealment (§3.7). An ant party on a
   * `concealment` POST emits no pheromone trail and its trail is
   * cleared — invisible to spider trail-scouting. Absent on every
   * shipped map.
   */
  concealment: z.boolean().optional(),
  /**
   * L4 (Hallway) Light-Switch flip-state POST → global combat
   * modifier (§3.8 / §4a #1). While this POST is NOT owned by
   * `litOwner`, every unit of `faction` gets `+attack` effective
   * attack engine-wide. Absent on every shipped map.
   */
  combatModifier: z
    .object({
      litOwner: factionSchema,
      faction: factionSchema,
      attack: z.number().int(),
    })
    .optional(),
  /**
   * L9 (Basement) dynamic-hazard surface (§3.6 / §4a #5+#6). This
   * POST governs `tiles`: while ACTIVE (not suppressed by ownership)
   * each end-of-turn deals `damage` to units standing on them.
   * Absent on every shipped map.
   */
  hazardField: z
    .object({
      tiles: z.array(tileCoordSchema).min(1),
      damage: z.number().int().positive(),
      suppressedWhenOwnedBy: factionSchema.optional(),
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  /**
   * Engine dependency #9 — opt-in per-POST in-sim gold income
   * (roadmap §4a #3 / closes the docs §4e "shop is not in-sim"
   * economy gap). When set `> 0` and this POST is owned by a real
   * faction (`ant`/`spider`, not `neutral`), the owning faction's
   * `state.playerGold` is credited `goldPerTurn` at end-of-turn —
   * income for *controlling* the node, NOT for standing on it
   * (deliberately ownership-based to sidestep the §4e co-located
   * pause race). This is the gold source the shipped card market
   * (`engine/cards.ts` `buyCard`) was always meant to spend in-sim.
   * Optional with no emitted default: absent ⇒ behaves as 0 and is a
   * literal no-op. Absent on every shipped map (`data/level-1..7`
   * declare no `goldPerTurn`), so all shipped scenarios — and the
   * gate-29 locked baseline — are byte-identical.
   */
  goldPerTurn: z.number().int().nonnegative().optional(),
  /**
   * L4 (Hallway) POST-randomization debut (§3.3). Optional per-seed
   * row jitter: the column (`location.x`) and `plane` are fixed; the
   * row is re-chosen each seed uniformly in `[minRow, maxRow]`.
   * Resolved by the loader for `static` maps only — non-static maps
   * already get a fully seed-randomized POST layout from map-gen, so
   * `jitter` is ignored there. The authored `location.y` is the
   * no-jitter fallback. The loader clamps the resolved row to the
   * post's plane height as a safety net against a mis-authored band.
   */
  jitter: z
    .object({
      minRow: z.number().int().nonnegative(),
      maxRow: z.number().int().nonnegative(),
    })
    .refine((j) => j.minRow <= j.maxRow, {
      message: 'jitter.minRow must be ≤ jitter.maxRow',
    })
    .optional(),
});

export const mapFileSchema = z
  .object({
    version: z.literal(1),
    name: z.string().min(1),
    /**
     * L2-1 — when `true`, the engine skips the per-seed
     * `generateRandomMap` pass and uses the declared planes / posts
     * verbatim. Required for hand-authored geometry (the L2 pipe
     * corridor) whose obstacle walls must not be overwritten by the
     * map-gen random clusters. Absent / false on L1 → the random map
     * path is unchanged and L1 stays byte-identical.
     */
    static: z.boolean().optional(),
    planes: z.array(planeMapSchema).min(1),
    posts: z.array(postSchema).min(1),
    /**
     * L2-1 — per-scenario win/loss objective. Optional: a map without
     * it is read by the engine as the L1 default (capture spider-web).
     */
    victoryCondition: victoryConditionSchema.optional(),
    /**
     * Engine dependency #10 — opt-in switch making `abilities.json`
     * the authoritative source for the hypnotize + recruit tuning
     * params (closes the docs §4g finding: `engine/abilities.ts`
     * resolved those two abilities from hardcoded module constants and
     * never read the loaded data, so data-driven tuning of them was
     * inert — which falsified L8 / never bound the L5 hypnotize cap).
     *
     * Absent / `false` (every shipped map `data/level-1..8` declares
     * no flag) ⇒ the engine uses the historical hardcoded constants
     * EXACTLY (`HYPNOTIZE_SUCCESS_RATE`/`MIN`/`MAX`/`REBOUND`,
     * `RECRUIT_SUCCESS_RATE`) on the identical code path, so L1–L7 and
     * the gate-29 locked baseline are byte-identical.
     *
     * `true` ⇒ ONLY `handleHypnotize` / `handleRecruit` (and the
     * single rebound-immunity application point in `end-of-turn.ts`)
     * read `successRate` / `minControlTurns` / `maxControlTurns` /
     * `reboundImmunityTurns` (hypnotize) and `successRate` (recruit)
     * from the loaded ability def's `params`, falling back to the
     * hardcoded constant per-param if the data omits one (defensive +
     * deterministic). No other ability's resolution is touched and the
     * RNG call sequence is unchanged — only the numeric inputs vary.
     * Opt-in by scenario; never set on a shipped map.
     */
    abilityParamsAuthoritative: z.boolean().optional(),
  })
  .refine((file) => new Set(file.posts.map((p) => p.id)).size === file.posts.length, {
    message: 'post ids must be unique',
  })
  .refine(
    (file) => {
      const ids = new Set(file.posts.map((p) => p.id));
      return file.posts.every((p) => p.pairedWith === undefined || ids.has(p.pairedWith));
    },
    { message: 'pairedWith must reference an existing post id' },
  )
  .refine(
    (file) => {
      const vc = file.victoryCondition;
      if (vc === undefined) return true;
      const ids = new Set(file.posts.map((p) => p.id));
      if (vc.kind === 'capture-post') return ids.has(vc.postId);
      if (vc.kind === 'escort') return ids.has(vc.exitPostId);
      return true; // eradicate carries no POST reference
    },
    { message: 'victoryCondition must reference an existing post id' },
  );

export type MapFile = z.infer<typeof mapFileSchema>;
