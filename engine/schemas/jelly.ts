import { z } from 'zod';

export const jellyFileSchema = z.object({
  version: z.literal(1),
  /** Doses produced at home base per turn. */
  productionPerTurn: z.number().nonnegative(),
  /** Maximum doses a single party can carry. */
  capacityPerParty: z.number().int().positive(),
  /** Doses consumed per application. */
  dosesPerApplication: z.number().int().positive(),
  /** Turns the bonus persists after application. */
  durationTurns: z.number().int().positive(),
  /** Multiplicative attack bonus while active (1.25 = +25%). */
  attackMultiplier: z.number().min(1),
  /** Multiplicative resilience bonus while active. */
  resilienceMultiplier: z.number().min(1),
});

export type JellyFile = z.infer<typeof jellyFileSchema>;
