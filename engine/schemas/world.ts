import { z } from 'zod';

import { idSchema } from './common.ts';

/**
 * Phase B (B1) — persisted world-state schema. Validates a serialized
 * `WorldState` JSON blob loaded from disk by the world-loop runner.
 *
 * Only the campaign-durable fields are persisted (see
 * `engine/world-state.ts` for the design decisions on what carries
 * forward and what is per-scenario / reset-on-load). The schema is the
 * trust boundary for save files: a malformed save (bad faction, missing
 * roster, negative gold) is rejected here rather than silently producing
 * a corrupt campaign.
 */

const worldUnitSchema = z.object({
  id: idSchema,
  templateId: idSchema,
  /** Carried HP. The runner always re-heals to full between scenarios
   * (units heal at the home base per the spec), so in practice this
   * equals the template max; persisted for completeness / future
   * "wounded carries" tuning. */
  currentHp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  xp: z.number().int().nonnegative(),
  /** Round-26 charisma carries forward across the campaign. */
  charisma: z.number().int().min(0).max(100),
  /** Round-26 promotion is permanent within a campaign. */
  promoted: z.boolean(),
  /** Round-14 equipped item id, or null for an empty slot. */
  item: idSchema.nullable(),
  /** Phase B (B3) — cumulative campaign level-up stat bonus. Optional
   * for forward/backward compatibility: a save written before any
   * level-up (or by an older format) omits it and is read as all-zero.
   * Must persist so campaign-long growth accumulates across save /
   * reload boundaries. */
  levelUpBonus: z
    .object({
      hp: z.number().int().nonnegative(),
      attack: z.number().int().nonnegative(),
      agility: z.number().int().nonnegative(),
      intelligence: z.number().int().nonnegative(),
    })
    .optional(),
});

const partyAssignmentSchema = z.object({
  partyId: idSchema,
  unitIds: z.array(idSchema),
  leaderId: idSchema,
  /** Roadmap §7.9 — optional sparse player formation override.
   * Omitted on pre-§7.9 saves; absence ⇒ engine auto-assigns. */
  formation: z
    .object({
      front: z.array(idSchema),
      back: z.array(idSchema),
      reserve: z.array(idSchema),
    })
    .optional(),
});

const worldRosterSchema = z.object({
  /** The player is always the ant faction across the campaign. */
  faction: z.literal('ant'),
  units: z.array(worldUnitSchema),
  partyAssignments: z.array(partyAssignmentSchema),
  /** Owned-but-unequipped persistent items (counted multiset). Optional;
   * omitted on pre-inventory saves ⇒ read as empty. */
  inventory: z.array(idSchema).optional(),
});

export const worldStateSchema = z.object({
  campaignId: z.string().min(1),
  /** 0-based scenario index. 0 = L1. */
  scenarioIndex: z.number().int().nonnegative(),
  roster: worldRosterSchema,
  /** Player gold carried forward (round-12). */
  gold: z.number().int().nonnegative(),
  /** Round-25 cards are per-scenario, NOT persisted; the field is kept
   * (always empty) so the save shape is forward-compatible if the
   * decision is ever revisited. */
  cardsOwned: z.array(idSchema),
  /** Campaign-level deterministic seed for world ops. */
  rngSeed: z.number().int(),
  /** ISO-8601 timestamp of when the save was written. */
  savedAt: z.string().min(1),
});

export type WorldStateFile = z.infer<typeof worldStateSchema>;
