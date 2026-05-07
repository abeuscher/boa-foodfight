/**
 * engine/combat — pure battle math.
 *
 * No I/O. No `Math.random()`. All randomness flows through the injected `Rng`.
 * Given identical inputs (and identical Rng state) every export here is
 * referentially transparent. This module is consumed by `engine/battle`,
 * which composes these primitives into a full battle resolution.
 *
 * Imports allowed: `engine/types` only (see CONTRACTS.md).
 */

import type { Rng, Stats, StrategyModifier, Posture, UnitId } from './types.ts';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Multipliers applied on top of the raw attack-vs-armor calculation.
 *
 * `posture` and `strategy` are the pre-battle player choices. The remaining
 * fields are situational bonuses sourced by `engine/battle` from world state:
 * POST occupancy, active Royal Jelly buffs, and Queen-proximity. Each is a
 * neutral `1.0` when the situation does not apply (with `postDefense` being
 * additive, defaulting to `0`).
 *
 * `attackerAffinityAttack` and `defenderAffinityArmor` are flat offsets
 * sourced from per-unit `planeAffinity` keyed off the battle's plane;
 * see `engine/battle` for selection. Defaults to `0`.
 */
export interface DamageModifiers {
  readonly posture: { readonly attack: number; readonly defense: number };
  readonly strategy: { readonly attack: number; readonly defense: number };
  readonly postDefense: number;
  readonly jellyAttack: number;
  readonly jellyResilience: number;
  readonly queenProximityAttack: number;
  readonly queenProximityResilience: number;
  readonly attackerAffinityAttack: number;
  readonly defenderAffinityArmor: number;
  readonly rng: Rng;
}

export interface PostureMultipliers {
  readonly attack: number;
  readonly defense: number;
  readonly canRetreat: boolean;
}

export interface StrategyMultipliers {
  readonly attack: number;
  readonly defense: number;
}

// ---------------------------------------------------------------------------
// Damage
// ---------------------------------------------------------------------------

/**
 * Compute one attacker -> defender damage tick.
 *
 * Formula:
 *   effectiveAttack  = (attacker.attack + attackerAffinityAttack)
 *                      * posture.attack * strategy.attack
 *                      * jellyAttack * queenProximityAttack
 *   effectiveDefense = (defender.armor + defenderAffinityArmor + postDefense)
 *                      * posture.defense * strategy.defense
 *                      * jellyResilience * queenProximityResilience
 *   variance         = rng.int(3) - 1   // -1, 0, or +1
 *   damage           = max(1, round(effectiveAttack - effectiveDefense + variance))
 *
 * Plane-affinity offsets fold in additively *before* the multiplicative
 * stack so a +1/-1 affinity is comparable in magnitude to a 1-point
 * stat swing rather than being amplified by jelly/posture into 1.5-2x
 * the intended budget. Guarantees a minimum of 1 damage so battles
 * always make progress.
 */
export function computeDamage(
  attacker: Stats,
  defender: Stats,
  modifiers: DamageModifiers,
): number {
  const effectiveAttack =
    (attacker.attack + modifiers.attackerAffinityAttack) *
    modifiers.posture.attack *
    modifiers.strategy.attack *
    modifiers.jellyAttack *
    modifiers.queenProximityAttack;

  const effectiveDefense =
    (defender.armor + modifiers.defenderAffinityArmor + modifiers.postDefense) *
    modifiers.posture.defense *
    modifiers.strategy.defense *
    modifiers.jellyResilience *
    modifiers.queenProximityResilience;

  const variance = modifiers.rng.int(3) - 1;
  const raw = effectiveAttack - effectiveDefense + variance;
  return Math.max(1, Math.round(raw));
}

// ---------------------------------------------------------------------------
// Posture
// ---------------------------------------------------------------------------

/**
 * Pre-battle posture multipliers.
 *
 *   fight  — neutral. Stand and trade.
 *   defend — trade attack for defense; cannot retreat (committed to the line).
 *   run    — gives up offense and exposes flanks; allowed to retreat on loss.
 */
export function computePostureMultipliers(posture: Posture): PostureMultipliers {
  switch (posture) {
    case 'fight':
      return { attack: 1.0, defense: 1.0, canRetreat: false };
    case 'defend':
      return { attack: 0.7, defense: 1.5, canRetreat: false };
    case 'run':
      return { attack: 0.5, defense: 0.7, canRetreat: true };
  }
}

// ---------------------------------------------------------------------------
// Strategy
// ---------------------------------------------------------------------------

/**
 * Combine the active strategy modifiers into a single attack/defense pair.
 *
 *   offensive       — +30% attack, -15% defense.
 *   defensive       — -15% attack, +30% defense.
 *   protect-leader  — small party-wide defense bump (+10%); the leader-side
 *                     redistribution happens inside `engine/battle` because it
 *                     needs unit identities, not stats.
 *   target-weakest  — pure targeting hint; no stat multiplier.
 *
 * Modifiers stack multiplicatively. The order in the input array does not
 * affect the result.
 */
export function computeStrategyMultiplier(
  modifiers: readonly StrategyModifier[],
): StrategyMultipliers {
  let attack = 1.0;
  let defense = 1.0;
  for (const mod of modifiers) {
    switch (mod) {
      case 'offensive':
        attack *= 1.3;
        defense *= 0.85;
        break;
      case 'defensive':
        attack *= 0.85;
        defense *= 1.3;
        break;
      case 'protect-leader':
        defense *= 1.1;
        break;
      case 'target-weakest':
        // Targeting hint only; no stat effect.
        break;
    }
  }
  return { attack, defense };
}

// ---------------------------------------------------------------------------
// Agility / turn order
// ---------------------------------------------------------------------------

/**
 * Sort units by agility descending. Ties are broken deterministically by
 * draws from `rng.next()` — taken once per unit before sorting so the
 * comparator is stable and RNG consumption is independent of array order.
 */
export function computeAgilityOrder(
  units: readonly { readonly id: UnitId; readonly stats: Stats }[],
  rng: Rng,
): readonly UnitId[] {
  const decorated = units.map((u) => ({
    id: u.id,
    agility: u.stats.agility,
    tiebreak: rng.next(),
  }));

  decorated.sort((a, b) => {
    if (a.agility !== b.agility) return b.agility - a.agility;
    return a.tiebreak - b.tiebreak;
  });

  return decorated.map((d) => d.id);
}

// ---------------------------------------------------------------------------
// Round count
// ---------------------------------------------------------------------------

/**
 * Battles run for 3, 4, or 5 internal rounds (per spec), drawn uniformly.
 */
export function decideRoundCount(rng: Rng): number {
  return rng.int(3) + 3;
}
