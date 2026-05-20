import { z } from 'zod';

import { factionSchema, idSchema, postureSchema, tileCoordSchema } from './common.ts';

const startingUnitSchema = z.object({
  templateId: idSchema,
  /** Number of copies of this template to place in the party. */
  count: z.number().int().positive(),
});

const startingPartySchema = z.object({
  id: idSchema,
  leaderClass: idSchema,
  /** Index into `units` identifying which unit is the leader. */
  leaderIndex: z.number().int().nonnegative(),
  /** Total slot capacity. Queen's party = 12; standard-party ceiling = 9
   * (raised 8→9 per roadmap §7.5; a ceiling, not a fill mandate). */
  slotCapacity: z.number().int().min(1),
  units: z.array(startingUnitSchema).min(1),
  startingLocation: tileCoordSchema,
  posture: postureSchema,
});

/**
 * Roadmap §7.12 (Exchange #8) — reinforcement-at-POST. Capturing
 * `triggerPostId` spawns `party` at `arrivalPostId` (default: the
 * trigger POST). `faction` defaults to the roster's faction. The
 * spawned party reuses the exact starting-party shape; its
 * `startingLocation` is ignored — arrival is the resolved POST tile.
 * Sibling to `parties` (not nested in a starting party) — the more
 * sensible home for a standalone trigger, still backward-compatible,
 * still no 12th loader file.
 */
const reinforcementDefSchema = z.object({
  triggerPostId: idSchema,
  arrivalPostId: idSchema.optional(),
  faction: factionSchema.optional(),
  party: startingPartySchema,
});

export const rosterFileSchema = z
  .object({
    version: z.literal(1),
    faction: factionSchema,
    parties: z.array(startingPartySchema).min(1),
    reinforcements: z.array(reinforcementDefSchema).optional(),
  })
  .refine((file) => file.parties.every((p) => p.leaderIndex < p.units.length), {
    message: 'leaderIndex must be a valid index into units',
  })
  .refine((file) => new Set(file.parties.map((p) => p.id)).size === file.parties.length, {
    message: 'party ids must be unique',
  });

export type RosterFile = z.infer<typeof rosterFileSchema>;
