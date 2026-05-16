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
 */
export const victoryConditionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('capture-post'), postId: idSchema }),
  z.object({
    kind: z.literal('escort'),
    escortUnitTemplateId: idSchema,
    exitPostId: idSchema,
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
  tags: z.array(z.string()).default([]),
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
      return ids.has(vc.exitPostId);
    },
    { message: 'victoryCondition must reference an existing post id' },
  );

export type MapFile = z.infer<typeof mapFileSchema>;
