import { z } from 'zod';

import { idSchema } from './common.ts';

export const abilityCategorySchema = z.enum([
  'information',
  'movement',
  'buff',
  'debuff',
  'special-attack',
  'special-attack-combo',
  'passive',
]);

export const abilityTargetSchema = z.enum(['self', 'tile', 'party', 'post', 'area', 'global']);

/**
 * Free-form per-ability parameter values. Most abilities are flat numeric
 * (`damage: 12`, `radius: 3`); round-24 combo abilities (mechanics memo
 * §1.2) extend this with a `componentAbilities: string[]` list and a
 * `mpCostBySource: Record<string, number>` table keyed by component
 * ability id. A `z.union` here keeps the legacy numeric reads (`?? 0`)
 * working unchanged on the existing ability set.
 */
const abilityParamValueSchema = z.union([
  z.number(),
  z.array(z.string()),
  z.record(z.string(), z.number()),
]);

export const abilityDefinitionSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  category: abilityCategorySchema,
  target: abilityTargetSchema,
  /** Charges per scenario; null = at-will. */
  uses: z.number().int().positive().nullable(),
  /** Turns of cooldown between uses; 0 = none. */
  cooldown: z.number().int().nonnegative(),
  /** Free-form parameters keyed by name; the engine reads what each ability needs. */
  params: z.record(z.string(), abilityParamValueSchema).default({}),
  /** Day/night gating (rec 1.2). `'day'` means usable only by day,
   * `'night'` only by night, omitted/`null` means usable in either
   * phase. The engine emits `ability-blocked-by-phase` (no-op + drop
   * order) when a use lands in the wrong phase. */
  phaseRestriction: z.enum(['day', 'night']).nullable().optional(),
  /**
   * Round 21 — MP tier (mechanics memo §1.1). Tier 1 abilities consume
   * a tier-1 slot from the caster's MP pool (4/scenario), tier 2 a
   * tier-2 slot (2/scenario), tier 3 a tier-3 slot (1/scenario). `null`
   * means the ability is outside the MP system entirely (passive
   * abilities like `spider-corner-cross`/`web-mend`-passive, plus
   * engine-driven abilities like `queen-ultimate`). Optional for
   * back-compat: missing/`undefined` is treated as `null` (no MP gate).
   * The `uses: N` per-ability cap still applies on top of MP.
   */
  tier: z
    .union([z.literal(1), z.literal(2), z.literal(3)])
    .nullable()
    .optional(),
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
export type AbilityDefinition = z.infer<typeof abilityDefinitionSchema>;
