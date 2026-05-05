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
  /** Total slot capacity. Queen's party = 12 in Level 1; standard parties = 8. */
  slotCapacity: z.number().int().min(1),
  units: z.array(startingUnitSchema).min(1),
  startingLocation: tileCoordSchema,
  posture: postureSchema,
});

export const rosterFileSchema = z
  .object({
    version: z.literal(1),
    faction: factionSchema,
    parties: z.array(startingPartySchema).min(1),
  })
  .refine((file) => file.parties.every((p) => p.leaderIndex < p.units.length), {
    message: 'leaderIndex must be a valid index into units',
  })
  .refine((file) => new Set(file.parties.map((p) => p.id)).size === file.parties.length, {
    message: 'party ids must be unique',
  });

export type RosterFile = z.infer<typeof rosterFileSchema>;
