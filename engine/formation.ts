/**
 * engine/formation — per-party row layout (mechanics memo §1.5).
 *
 * Each party fights from a 5-unit slotted layout: 3 front + 2 back +
 * unbounded reserve. Front-row units act first, absorb damage first,
 * and (for melee) get full attack. Back-row casters get +1 effective
 * intelligence on ability rolls; back-row melee deal -1 attack
 * (floored at 1) because they're standing behind a screen. Reserve
 * units don't engage in battle until promoted into a front/back slot
 * by a casualty.
 *
 * This module is pure — no I/O, no `Math.random()`. The only behavior
 * here is deterministic auto-assignment by tag + size, and reserve
 * promotion. All randomness in battle resolution flows through the
 * existing battle Rng; formation is identifier bookkeeping.
 *
 * Imports allowed: `engine/types` only.
 */

import type { Formation, Party, Unit, UnitId, UnitTemplate, UnitTemplateId } from './types.ts';

const FRONT_CAP = 3;
const BACK_CAP = 2;

/**
 * Tags that pin a unit to the front row. `tank`, `heavy`, `melee`,
 * `queen-guard`, `frontline` — plus any size `large`/`huge` that
 * isn't explicitly back-row.
 */
const FRONT_TAGS: ReadonlySet<string> = new Set([
  'tank',
  'heavy',
  'melee',
  'queen-guard',
  'frontline',
]);

/**
 * Tags that pin a unit to the back row, *unless* it's also tagged
 * `melee` or `tank`. `caster`, `ranged`, `support`, `leader-eligible`.
 * (The `leader-eligible` ant-queen template is also tagged `queen` and
 * doesn't carry `melee`, so it goes back; ant-scout is tagged
 * `leader-eligible` + `scout` and goes back; ant-mage is `caster` +
 * `support`.)
 */
const BACK_TAGS: ReadonlySet<string> = new Set(['caster', 'ranged', 'support', 'leader-eligible']);

/**
 * Assign a unit to its preferred row by template tags + size. Returns
 * `'front'` or `'back'` (never `'reserve'` here — reserve overflow is
 * decided by the assigner once the per-row caps are known).
 *
 * Resolution order (ties go to the earlier branch):
 *   1. Any `FRONT_TAGS` match → front.
 *   2. Size `large` or `huge` (and not flagged back-only) → front.
 *   3. Any `BACK_TAGS` match → back.
 *   4. Size fallback: small/medium → front; otherwise back.
 *
 * The `large`/`huge` size hint takes precedence over `BACK_TAGS` so a
 * `huge` queen with `leader-eligible` (e.g., the ant-queen template)
 * lands front per the spec — front-row absorbs first and the queen
 * needs to soak the queen-guard's damage. The spider-queen has the
 * same `huge` + `leader-eligible` shape and follows the same rule.
 */
export const preferredRow = (template: UnitTemplate): 'front' | 'back' => {
  const tags = template.tags;
  for (const t of tags) {
    if (FRONT_TAGS.has(t)) return 'front';
  }
  if (template.size === 'large' || template.size === 'huge') return 'front';
  for (const t of tags) {
    if (BACK_TAGS.has(t)) return 'back';
  }
  if (template.size === 'small' || template.size === 'medium') return 'front';
  return 'back';
};

/**
 * Auto-assign a roster of units into a `Formation`. Front cap = 3,
 * back cap = 2; everything past the caps lands in `reserve`.
 *
 * Determinism contract:
 *   - Iteration is in roster order (the order units appear on
 *     `Party.units`). Two parties built from identical roster JSON
 *     produce identical formations.
 *   - Within a row, capacity overflow falls through to the next-
 *     preferred row before reserve (a back-preferring caster will
 *     try to land back, and only if both back slots are full will
 *     it consider front; if front is also full it goes to reserve).
 *   - Front-preferring overflow goes to back next (and reserve last).
 *
 * The fallthrough exists so a 6-melee party fills 3 front + 2 back +
 * 1 reserve (rather than 3 front + 0 back + 3 reserve). This matches
 * the spec example: "parties with ≥6 melee units have 3 front + 2
 * back + N reserve."
 */
export const assignFormation = (
  units: readonly Unit[],
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): Formation => {
  const front: UnitId[] = [];
  const back: UnitId[] = [];
  const reserve: UnitId[] = [];

  for (const unit of units) {
    const tmpl = templates.get(unit.templateId);
    if (!tmpl) {
      reserve.push(unit.id);
      continue;
    }
    const pref = preferredRow(tmpl);
    if (pref === 'front') {
      if (front.length < FRONT_CAP) front.push(unit.id);
      else if (back.length < BACK_CAP) back.push(unit.id);
      else reserve.push(unit.id);
    } else {
      if (back.length < BACK_CAP) back.push(unit.id);
      else if (front.length < FRONT_CAP) front.push(unit.id);
      else reserve.push(unit.id);
    }
  }
  return { front, back, reserve };
};

/**
 * Look up a unit's current slot. Returns `'reserve'` for any unit
 * not in `front`/`back` (including the explicit reserve list and any
 * unit that somehow drifted out of all three lists).
 */
export const slotForUnit = (formation: Formation, unitId: UnitId): 'front' | 'back' | 'reserve' => {
  if (formation.front.includes(unitId)) return 'front';
  if (formation.back.includes(unitId)) return 'back';
  return 'reserve';
};

/**
 * Promote the lowest-id reserve unit into the given slot. If the
 * reserve is empty (or no reserve unit is alive on `liveByUnitId`),
 * returns the formation unchanged with `promotedId: null`.
 *
 * The caller filters reserves by liveness via `liveByUnitId`: a
 * reserve unit that the engine has already marked dead (e.g., from a
 * mass-AoE that hits all parties) shouldn't be promoted. Reserve
 * units that aren't in the map are assumed alive (default).
 */
export const promoteReserve = (
  formation: Formation,
  slot: 'front' | 'back',
  liveByUnitId: ReadonlyMap<UnitId, boolean>,
): { formation: Formation; promotedId: UnitId | null } => {
  if (formation.reserve.length === 0) return { formation, promotedId: null };
  const sorted = [...formation.reserve].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  let pick: UnitId | null = null;
  for (const id of sorted) {
    const alive = liveByUnitId.get(id);
    if (alive === false) continue;
    pick = id;
    break;
  }
  if (pick === null) return { formation, promotedId: null };
  const newReserve = formation.reserve.filter((id) => id !== pick);
  if (slot === 'front') {
    return {
      formation: { front: [...formation.front, pick], back: formation.back, reserve: newReserve },
      promotedId: pick,
    };
  }
  return {
    formation: { front: formation.front, back: [...formation.back, pick], reserve: newReserve },
    promotedId: pick,
  };
};

/**
 * Build a `Formation` for a party using the templates map. Convenience
 * wrapper around `assignFormation` that pulls units off the party and
 * skips the lookup boilerplate.
 */
export const formationForParty = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): Formation => assignFormation(party.units, templates);

/**
 * Backwards-compat shim: when a party has no formation set (legacy
 * tests, old replays), treat all of its units as front-row. This is
 * the row-blind fallback that preserves pre-§1.5 behavior — every
 * unit acts every round, every unit can be targeted, no caps.
 */
export const formationOrAllFront = (party: Party): Formation => {
  if (party.formation) return party.formation;
  return { front: party.units.map((u) => u.id), back: [], reserve: [] };
};

/**
 * Round 20 — back-row caster intelligence bump (mechanics memo §1.5).
 * A unit in the back row whose template has `tags: ['caster']` (or
 * any unit with `intelligence ≥ 5`) gets `+1 effective intelligence`
 * for ability rolls. NOT applied to baseStats — only consulted where
 * abilities consume intelligence (ability gates, ability damage
 * scaling). Returns the bonus to add (0 or +1).
 */
export const backRowIntelligenceBonus = (
  formation: Formation,
  unitId: UnitId,
  template: UnitTemplate,
): number => {
  if (slotForUnit(formation, unitId) !== 'back') return 0;
  if (template.tags.includes('caster')) return 1;
  if (template.baseStats.intelligence >= 5) return 1;
  return 0;
};

/**
 * Round 20 — back-row melee attack penalty (mechanics memo §1.5). A
 * back-row unit with `melee` tag (and not also `ranged`) takes a
 * `-1 attack` penalty (floored at 1). Returns the penalty (0 or -1).
 * The caller is responsible for the floor — `Math.max(1, atk + bonus)`.
 */
export const backRowMeleeAttackPenalty = (
  formation: Formation,
  unitId: UnitId,
  template: UnitTemplate,
): number => {
  if (slotForUnit(formation, unitId) !== 'back') return 0;
  if (!template.tags.includes('melee')) return 0;
  if (template.tags.includes('ranged')) return 0;
  return -1;
};
