import { z } from 'zod';

export const queenFileSchema = z.object({
  version: z.literal(1),
  proximity: z.object({
    /** Tile radius within which ants gain Queen-proximity bonuses. */
    radius: z.number().int().positive(),
    attackMultiplier: z.number().min(1),
    resilienceMultiplier: z.number().min(1),
  }),
  ultimate: z.object({
    /** Charge points required to fire. */
    chargeMax: z.number().int().positive(),
    /** Charge accrual per turn (constant). */
    chargePerTurn: z.number().positive(),
    /** Bonus charge per battle the Queen's home is attacked. */
    chargeOnHomeAttack: z.number().nonnegative(),
    /** Tile radius of the ultimate's effect, centered on the Queen. */
    radius: z.number().int().positive(),
    /** Damage dealt to enemy units in radius (flat). */
    damage: z.number().int().positive(),
    /** Number of times the ultimate may be fired per scenario. */
    usesPerScenario: z.number().int().positive(),
  }),
  production: z.object({
    /** Ant unit produced per N turns at home base. */
    turnsPerUnit: z.number().int().positive(),
    /** Template ID of the unit produced. Validated by reconciler. */
    producedTemplateId: z.string().min(1),
  }),
});

export type QueenFile = z.infer<typeof queenFileSchema>;
