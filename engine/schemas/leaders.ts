import { z } from 'zod';

import { idSchema } from './common.ts';

export const leaderModifierSchema = z.object({
  /** Stat keys are kept open here; cross-validation happens in the reconciler. */
  stat: z.string(),
  delta: z.number(),
  appliesTo: z.enum(['leader', 'party', 'leader-and-party']),
});

export const leaderClassSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  modifiers: z.array(leaderModifierSchema).min(1),
  /** Optional ability granted to the party while this leader lives. */
  grantsAbility: idSchema.optional(),
});

export const leadersFileSchema = z
  .object({
    version: z.literal(1),
    classes: z.array(leaderClassSchema).min(1),
  })
  .refine((file) => new Set(file.classes.map((c) => c.id)).size === file.classes.length, {
    message: 'leader class ids must be unique',
  });

export type LeadersFile = z.infer<typeof leadersFileSchema>;
