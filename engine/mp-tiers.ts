/**
 * engine/mp-tiers — round-21 tiered MP pool helpers (mechanics memo §1.1,
 * FF3 magic-tier shape).
 *
 * Casters carry a per-unit `MpSlots = { tier1, tier2, tier3 }` pool
 * (see `engine/types.ts`). Each ability declares a `tier: 1 | 2 | 3 | null`
 * field in `data/level-1/abilities.json`. When fired, the caster's slot
 * for that tier decrements by one. A caster with 0 slots remaining at
 * the ability's tier silently fails the cast (no event, no effect) —
 * same back-pressure shape as the legacy `uses: N` cap. Higher tiers
 * cannot drain lower tiers (no spillover): a caster sitting on 0 tier-3
 * slots cannot fire a tier-3 ability even if tier-1 and tier-2 are
 * full.
 *
 * Caster-eligibility (who gets a pool at scenario start) is determined
 * by `isCasterTemplate(template)` — `intelligence >= 5` OR template
 * carries the `'caster'` tag. Non-casters (e.g., ant-footman) don't
 * carry the field and freely fire their tier-1 abilities like `brace`
 * without consuming a pool.
 *
 * `tier: null` abilities are outside the MP system — passives like
 * `spider-corner-cross` and engine-driven specials like `queen-ultimate`
 * don't gate on or consume MP.
 *
 * Imports allowed: `engine/types`, `engine/schemas`.
 */

import type { AbilitiesFile, AbilityDefinition } from './schemas/abilities.ts';
import type { AbilityId, MpSlots, Unit, UnitTemplate } from './types.ts';

/** Round 21 — initial MP pool for caster-eligible units at scenario start. */
export const INITIAL_MP_SLOTS: MpSlots = { tier1: 4, tier2: 2, tier3: 1 };

/**
 * Round 21 — tier lookup helper. Returns the ability's `tier` field if
 * it's 1/2/3, or `null` for passive / engine-driven abilities. Returns
 * `null` if the abilities file doesn't list the id at all (treat as
 * outside the MP system, same shape as a passive).
 */
export const tierForAbility = (
  abilities: AbilitiesFile | undefined,
  abilityId: AbilityId,
): 1 | 2 | 3 | null => {
  if (!abilities) return null;
  for (const a of abilities.abilities as readonly AbilityDefinition[]) {
    if (a.id === abilityId) return a.tier ?? null;
  }
  return null;
};

/**
 * Round 21 — caster-eligibility predicate (mechanics memo §1.1). A
 * template is caster-eligible iff its baseStats.intelligence >= 5 OR
 * its tag list contains `'caster'`. The threshold catches ant-mage
 * (int 8), spider-queen (9), spider-spinner (5), ant-queen (8); the
 * tag is a manual override for any future template a designer wants
 * to grant a pool to without bumping intelligence above 4.
 *
 * Non-casters (ant-footman, ant-archer, etc.) don't get a pool; they
 * fire whatever abilities their template lists without consuming MP.
 * Tier-2/3 abilities on non-caster templates (archer volley T2,
 * footman phalanx-charge T3) are still gated by the legacy `uses: N`
 * per-ability cap — MP is purely a caster-side budget. The
 * `abilities` argument is reserved for future tuning if a designer
 * wants to widen eligibility based on ability-tier presence; it is
 * unused today.
 */
export const isCasterTemplate = (template: UnitTemplate, abilities?: AbilitiesFile): boolean => {
  void abilities;
  if (template.baseStats.intelligence >= 5) return true;
  if (template.tags.includes('caster')) return true;
  return false;
};

/**
 * Round 21 — read the slot count for the given tier. Returns 0 when
 * the unit has no MP pool (non-caster).
 */
export const slotsForTier = (slots: MpSlots | undefined, tier: 1 | 2 | 3): number => {
  if (!slots) return 0;
  if (tier === 1) return slots.tier1;
  if (tier === 2) return slots.tier2;
  return slots.tier3;
};

/**
 * Round 21 — decrement the unit's slot for the given tier. Returns a
 * fresh MpSlots object (immutable update). Caller is responsible for
 * checking `slotsForTier(unit.mpSlots, tier) > 0` before calling.
 */
export const decrementSlot = (slots: MpSlots, tier: 1 | 2 | 3): MpSlots => {
  if (tier === 1) return { ...slots, tier1: Math.max(0, slots.tier1 - 1) };
  if (tier === 2) return { ...slots, tier2: Math.max(0, slots.tier2 - 1) };
  return { ...slots, tier3: Math.max(0, slots.tier3 - 1) };
};

/**
 * Round 21 — can `unit` cast an ability of `tier` right now? Returns
 * true for `tier === null` (no MP gate) AND for non-casters (they're
 * outside the MP system entirely; their tier-1 abilities like `brace`
 * fire freely). Returns false only when the unit IS a caster (has an
 * MpSlots field) and the corresponding tier slot is exhausted.
 */
export const canCastTier = (unit: Unit, tier: 1 | 2 | 3 | null): boolean => {
  if (tier === null) return true;
  if (!unit.mpSlots) return true;
  return slotsForTier(unit.mpSlots, tier) > 0;
};

/**
 * Round 21 — apply an MP-slot decrement to a unit and return the
 * updated unit. Returns the unit unchanged when the unit has no pool
 * or the tier is `null`. Caller should already have validated the
 * cast via `canCastTier` (this helper is a no-op on exhausted slots
 * via `Math.max(0, ...)` to be safe).
 */
export const spendSlot = (unit: Unit, tier: 1 | 2 | 3 | null): Unit => {
  if (tier === null) return unit;
  if (!unit.mpSlots) return unit;
  return { ...unit, mpSlots: decrementSlot(unit.mpSlots, tier) };
};
