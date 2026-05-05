import { z } from 'zod';

import { idSchema } from './common.ts';

export const abilityCategorySchema = z.enum([
  'information',
  'movement',
  'buff',
  'debuff',
  'special-attack',
]);

export const abilityTargetSchema = z.enum(['self', 'tile', 'party', 'post', 'area', 'global']);

export const abilityDefinitionSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  category: abilityCategorySchema,
  target: abilityTargetSchema,
  /** Charges per scenario; null = at-will. */
  uses: z.number().int().positive().nullable(),
  /** Turns of cooldown between uses; 0 = none. */
  cooldown: z.number().int().nonnegative(),
  /** Free-form numeric parameters keyed by name; the engine reads what each ability needs. */
  params: z.record(z.string(), z.number()).default({}),
  description: z.string().min(1),
});

export const abilitiesFileSchema = z
  .object({
    version: z.literal(1),
    abilities: z.array(abilityDefinitionSchema).min(1),
  })
  .refine((file) => new Set(file.abilities.map((a) => a.id)).size === file.abilities.length, {
    message: 'ability ids must be unique',
  });

export type AbilitiesFile = z.infer<typeof abilitiesFileSchema>;
