import { z } from 'zod';

import { idSchema } from './common.ts';

export const formationSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  /** Minimum number of qualifying units required to activate. */
  minUnits: z.number().int().positive(),
  /** Optional unit-tag requirement (e.g., 'worker'); empty = any. */
  requiresTag: z.string().optional(),
  /** Multiplicative attack bonus when active. */
  attackMultiplier: z.number().min(1),
  /** Multiplicative defense bonus when active. */
  defenseMultiplier: z.number().min(1),
  description: z.string().min(1),
});

export const formationsFileSchema = z
  .object({
    version: z.literal(1),
    formations: z.array(formationSchema).min(1),
  })
  .refine((file) => new Set(file.formations.map((f) => f.id)).size === file.formations.length, {
    message: 'formation ids must be unique',
  });

export type FormationsFile = z.infer<typeof formationsFileSchema>;
