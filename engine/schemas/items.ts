import { z } from 'zod';

import { idSchema } from './common.ts';

/**
 * Round 14 — items file. Six templates total. Two categories:
 *   - `persistent` items occupy a party's `Party.item` slot while
 *     equipped and apply a party-wide buff (attack / armor / movement /
 *     agility).
 *   - `consumable` items fire on pickup and the slot stays empty
 *     (mead heal, royal-jelly-vial dose injection).
 *
 * The `effect` discriminator is used by `engine/items.ts` and the
 * combat / movement integration sites to know which buff to apply.
 */
export const itemKindSchema = z.enum(['persistent', 'consumable']);

export const itemEffectSchema = z.enum(['attack', 'armor', 'movement', 'agility', 'heal', 'jelly']);

export const itemTemplateSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  kind: itemKindSchema,
  effect: itemEffectSchema,
  magnitude: z.number().int().nonnegative(),
  description: z.string().min(1),
});

export const itemsFileSchema = z.object({
  version: z.literal(1),
  templates: z.array(itemTemplateSchema).min(1),
});

export type ItemKind = z.infer<typeof itemKindSchema>;
export type ItemEffect = z.infer<typeof itemEffectSchema>;
export type ItemTemplate = z.infer<typeof itemTemplateSchema>;
export type ItemsFile = z.infer<typeof itemsFileSchema>;
