import { z } from 'zod';

import { idSchema } from './common.ts';

/**
 * L1-iteration #5 — scripted-beat surface. Authored mid-scenario events
 * keyed off a simple trigger (turn number or POST capture). Each beat
 * fires at most once per scenario. The event payload is read-only copy
 * the UI surfaces in the notification strip; no engine state changes
 * beyond the firedBeats set. Absent / empty beats file → engine path
 * is byte-identical to pre-beats scenarios (gate-29-safe).
 */

const beatTriggerSchema = z.union([
  z.object({ turn: z.number().int().nonnegative() }),
  z.object({ postCaptured: idSchema }),
]);

const beatSchema = z.object({
  id: idSchema,
  trigger: beatTriggerSchema,
  title: z.string().min(1),
  message: z.string().min(1),
});

export const beatsFileSchema = z
  .object({
    version: z.literal(1),
    beats: z.array(beatSchema),
  })
  .refine((file) => new Set(file.beats.map((b) => b.id)).size === file.beats.length, {
    message: 'beat ids must be unique',
  });

export type BeatsFile = z.infer<typeof beatsFileSchema>;
export type Beat = z.infer<typeof beatSchema>;
export type BeatTrigger = z.infer<typeof beatTriggerSchema>;
