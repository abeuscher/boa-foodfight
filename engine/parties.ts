/**
 * Party computations: slot accounting, liveness, HP totals, movement
 * allowance, queen presence.
 *
 * Read-only utilities. Per CONTRACTS.md, this module imports only from
 * `engine/types`. (No `engine/coord` needed here.)
 */

import type { MovementMode, Party, Unit, UnitTemplate, UnitTemplateId } from './types.ts';

/**
 * Per-mode tile-per-turn base allowance for Level 1. The party's effective
 * speed is the slowest member's mode value. Terrain modifiers are applied
 * by the movement module per-step, not here.
 *
 * These values match the table in `engine/movement.ts`; tests will catch
 * drift if they ever desynchronize.
 */
const MOVEMENT_BY_MODE: Readonly<Record<MovementMode, number>> = {
  ground: 3,
  climbing: 3,
  flying: 4,
  restricted: 2,
};

/**
 * Sum of `slotCost` for every unit in the party (alive or dead). Dead units
 * still occupy slots until end-of-scenario cleanup; slot capacity is a
 * roster-construction constraint, not a runtime one.
 */
export const slotsUsed = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): number => {
  let total = 0;
  for (const unit of party.units) {
    const tmpl = templates.get(unit.templateId);
    if (!tmpl) continue;
    total += tmpl.slotCost;
  }
  return total;
};

/** True iff the unit has currentHp > 0. */
export const isAlive = (unit: Unit): boolean => unit.currentHp > 0;

/** Living members of the party, in roster order. Empty if all dead. */
export const livingUnits = (party: Party): readonly Unit[] => party.units.filter(isAlive);

/** Total remaining HP across living units. Dead units contribute 0. */
export const totalHp = (party: Party): number => {
  let total = 0;
  for (const unit of party.units) {
    if (unit.currentHp > 0) total += unit.currentHp;
  }
  return total;
};

/**
 * Base movement allowance for the party this turn, in tiles. Determined by
 * the slowest *living* member's `MovementMode`. If the party has no living
 * units (or no resolvable templates), returns 0.
 *
 * Spec quote: "determined by its slowest member modified by terrain type".
 * Per-step terrain modifiers are applied by the movement module. We use
 * living units only because a wholly-dead party can't move; using all
 * units would let a destroyed-but-not-cleaned-up party return a misleading
 * non-zero allowance.
 */
export const baseMovementAllowance = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): number => {
  let slowest = Number.POSITIVE_INFINITY;
  for (const unit of party.units) {
    if (unit.currentHp <= 0) continue;
    const tmpl = templates.get(unit.templateId);
    if (!tmpl) continue;
    const speed = MOVEMENT_BY_MODE[tmpl.movement];
    if (speed < slowest) slowest = speed;
  }
  return Number.isFinite(slowest) ? slowest : 0;
};

/** True iff any unit in the party (alive or dead) is tagged 'queen'. */
export const containsQueen = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  for (const unit of party.units) {
    const tmpl = templates.get(unit.templateId);
    if (!tmpl) continue;
    if (tmpl.tags.includes('queen')) return true;
  }
  return false;
};

/**
 * Sum of living-unit currentHp divided by sum of those same units'
 * baseStats.hp. Empty / fully-dead parties return 0. Used by the
 * round-15 HP-threshold flee trigger on both factions; centralizing
 * here keeps the math identical across baseline and spider AI.
 */
export const livingHpFraction = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): number => {
  let livingHp = 0;
  let maxHp = 0;
  for (const unit of party.units) {
    if (unit.currentHp <= 0) continue;
    const tmpl = templates.get(unit.templateId);
    if (!tmpl) continue;
    livingHp += unit.currentHp;
    maxHp += tmpl.baseStats.hp;
  }
  if (maxHp <= 0) return 0;
  return livingHp / maxHp;
};

/**
 * Round 16 — approximate party combat power. Sum over living units of
 * `currentHp * baseStats.attack`. Uses unit-template stats only — armor,
 * abilities, terrain affinity, jelly buffs, and queen proximity are
 * ignored for v1 (a deliberately coarse heuristic). Higher = stronger.
 * Empty / fully-dead parties return 0. Used by the AI's pre-battle
 * threat-assessment flee trigger to compare its own power against an
 * impending enemy collision.
 */
export const estimatePartyPower = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): number => {
  let total = 0;
  for (const unit of party.units) {
    if (unit.currentHp <= 0) continue;
    const tmpl = templates.get(unit.templateId);
    if (!tmpl) continue;
    total += unit.currentHp * tmpl.baseStats.attack;
  }
  return total;
};

/**
 * Round 16 — Lanchester square-law approximation of the loss
 * probability for `myParty` vs `enemyParty`. Returns a value in
 * `[0, 1]`. The square-law form
 *   P(loss) = T^2 / (M^2 + T^2)
 * captures the "strength-squared dominance" of attrition combat where
 * both sides can engage simultaneously: doubling the enemy quadruples
 * its winning weight. Returns 0.5 when both sides have 0 power
 * (degenerate — two empty parties); the AI never actually queues flee
 * in that branch because the helper above it gates on a real enemy
 * being present.
 */
export const estimateLossProbability = (
  myParty: Party,
  enemyParty: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): number => {
  const mine = estimatePartyPower(myParty, templates);
  const theirs = estimatePartyPower(enemyParty, templates);
  if (mine + theirs === 0) return 0.5;
  return (theirs * theirs) / (mine * mine + theirs * theirs);
};
