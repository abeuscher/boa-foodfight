import { z } from 'zod';

import { idSchema } from './common.ts';

export const dialogueTriggerSchema = z.enum([
  'scenario-start',
  'scenario-end-victory',
  'scenario-end-defeat',
  'first-battle',
  'first-post-captured',
  'queen-ultimate-ready',
  'queen-ultimate-fired',
  'leader-died',
  'low-jelly',
  'idle',
]);

export const dialogueLineSchema = z.object({
  id: idSchema,
  speaker: z.string().min(1),
  trigger: dialogueTriggerSchema,
  text: z.string().min(1),
  /** Optional weight for random selection among multiple lines on the same trigger. */
  weight: z.number().int().positive().default(1),
});

export const dialogueFileSchema = z
  .object({
    version: z.literal(1),
    lines: z.array(dialogueLineSchema).min(1),
  })
  .refine((file) => new Set(file.lines.map((l) => l.id)).size === file.lines.length, {
    message: 'dialogue line ids must be unique',
  });

export type DialogueFile = z.infer<typeof dialogueFileSchema>;
