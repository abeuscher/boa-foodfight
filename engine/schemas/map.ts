import { z } from 'zod';

import {
  factionSchema,
  idSchema,
  planeSchema,
  terrainKindSchema,
  tileCoordSchema,
} from './common.ts';

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
    planes: z.array(planeMapSchema).min(1),
    posts: z.array(postSchema).min(1),
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
  );

export type MapFile = z.infer<typeof mapFileSchema>;
