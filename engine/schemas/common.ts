import { z } from 'zod';

export const factionSchema = z.enum(['ant', 'spider', 'neutral']);
export const planeSchema = z.enum(['floor', 'wall', 'ceiling']);
export const unitSizeSchema = z.enum(['small', 'medium', 'large', 'huge']);
export const movementModeSchema = z.enum(['ground', 'climbing', 'flying', 'restricted']);
export const terrainKindSchema = z.enum(['open', 'wet', 'path', 'obstacle', 'hazard']);
export const postureSchema = z.enum(['run', 'fight', 'defend']);

export const tileCoordSchema = z.object({
  plane: planeSchema,
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

export const statsSchema = z.object({
  hp: z.number().int().positive(),
  attack: z.number().int().nonnegative(),
  agility: z.number().int().nonnegative(),
  armor: z.number().int().nonnegative(),
  intelligence: z.number().int().nonnegative(),
  constitution: z.number().int().nonnegative(),
});

/** Identifier in kebab-case, used across data files for cross-referencing. */
export const idSchema = z
  .string()
  .min(1)
  .regex(/^[a-z][a-z0-9-]*$/, 'must be kebab-case');
