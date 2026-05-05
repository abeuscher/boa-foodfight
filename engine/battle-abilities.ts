/**
 * Pre-battle ability resolver. Runs at the start of every battle, before
 * any combat rounds. Currently handles two abilities:
 *
 * - `volley` — special-attack target=party. Each archer (or any unit
 *   carrying volley) with charges remaining picks the lowest-HP living
 *   enemy unit and deals `params.damage` flat damage. Focused-fire
 *   interpretation of "Pre-battle softening." Uses are one-shot per
 *   scenario (the schema says uses=2 but charge tracking is binary for
 *   now; expand when other abilities need finer granularity).
 *
 * - `mend` — buff target=party. Each medic-bearing unit with charges
 *   remaining heals every living unit in its own party for `params.heal`,
 *   capped at the unit template's baseStats.hp.
 *
 * Both abilities are read off the per-unit `usedAbilities` list and add
 * to it on use. The battle module calls this once per battle and uses
 * the returned (attacker, defender) for the ensuing rounds.
 *
 * Imports allowed: `engine/types`, `engine/schemas` (for the AbilitiesFile
 * type the turn driver passes through).
 */

import type { AbilitiesFile } from './schemas/index.ts';
import type { AbilityId, Party, ReplayEvent, Unit, UnitTemplate, UnitTemplateId } from './types.ts';

const VOLLEY: AbilityId = 'volley' as AbilityId;
const MEND: AbilityId = 'mend' as AbilityId;

export interface OpeningAbilityResult {
  readonly attacker: Party;
  readonly defender: Party;
  readonly events: readonly ReplayEvent[];
}

const hasUsed = (unit: Unit, abilityId: AbilityId): boolean =>
  (unit.usedAbilities ?? []).includes(abilityId);

const markUsed = (unit: Unit, abilityId: AbilityId): Unit => ({
  ...unit,
  usedAbilities: [...(unit.usedAbilities ?? []), abilityId],
});

const isLiving = (u: Unit): boolean => u.currentHp > 0;

const findAbility = (
  abilities: AbilitiesFile,
  id: AbilityId,
): { params: Readonly<Record<string, number>> } | undefined => {
  for (const a of abilities.abilities) {
    if (a.id === id) return a;
  }
  return undefined;
};

const unitHasAbility = (
  unit: Unit,
  abilityId: AbilityId,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  const tmpl = templates.get(unit.templateId);
  return tmpl?.abilities.includes(abilityId) ?? false;
};

const fireVolleys = (
  shooter: Party,
  target: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
  abilities: AbilitiesFile,
  turn: number,
  tick: () => number,
): { shooter: Party; target: Party; events: readonly ReplayEvent[] } => {
  const def = findAbility(abilities, VOLLEY);
  if (!def) return { shooter, target, events: [] };
  const damage = def.params.damage ?? 0;
  if (damage <= 0) return { shooter, target, events: [] };

  const events: ReplayEvent[] = [];
  let workingShooter = shooter;
  const workingTargetUnits = [...target.units];

  for (const unit of shooter.units) {
    if (!isLiving(unit)) continue;
    if (hasUsed(unit, VOLLEY)) continue;
    if (!unitHasAbility(unit, VOLLEY, templates)) continue;

    // Pick the lowest-HP living enemy unit. Tiebreak by id for determinism.
    let lowest: Unit | undefined;
    for (const t of workingTargetUnits) {
      if (!isLiving(t)) continue;
      if (lowest === undefined || t.currentHp < lowest.currentHp) lowest = t;
      else if (t.currentHp === lowest.currentHp && t.id < lowest.id) lowest = t;
    }
    if (!lowest) break;

    const targetIdx = workingTargetUnits.findIndex((u) => u.id === lowest.id);
    if (targetIdx < 0) break;
    const before = workingTargetUnits[targetIdx];
    if (!before) break;
    const newHp = Math.max(0, before.currentHp - damage);
    workingTargetUnits[targetIdx] = { ...before, currentHp: newHp };

    workingShooter = {
      ...workingShooter,
      units: workingShooter.units.map((u) => (u.id === unit.id ? markUsed(u, VOLLEY) : u)),
    };

    events.push({
      kind: 'ability-used',
      turn,
      tick: tick(),
      partyId: shooter.id,
      abilityId: VOLLEY,
    });

    if (before.currentHp > 0 && newHp <= 0) {
      events.push({ kind: 'unit-died', turn, tick: tick(), unitId: before.id });
    }
  }

  return {
    shooter: workingShooter,
    target: { ...target, units: workingTargetUnits },
    events,
  };
};

const fireMends = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
  abilities: AbilitiesFile,
  turn: number,
  tick: () => number,
): { party: Party; events: readonly ReplayEvent[] } => {
  const def = findAbility(abilities, MEND);
  if (!def) return { party, events: [] };
  const heal = def.params.heal ?? 0;
  if (heal <= 0) return { party, events: [] };

  const events: ReplayEvent[] = [];
  let workingUnits = [...party.units];

  for (const unit of party.units) {
    if (!isLiving(unit)) continue;
    if (hasUsed(unit, MEND)) continue;
    if (!unitHasAbility(unit, MEND, templates)) continue;

    workingUnits = workingUnits.map((u) => {
      if (u.id === unit.id) return markUsed(u, MEND);
      if (!isLiving(u)) return u;
      const tmpl = templates.get(u.templateId);
      if (!tmpl) return u;
      const cap = tmpl.baseStats.hp;
      if (u.currentHp >= cap) return u;
      return { ...u, currentHp: Math.min(cap, u.currentHp + heal) };
    });

    events.push({
      kind: 'ability-used',
      turn,
      tick: tick(),
      partyId: party.id,
      abilityId: MEND,
    });
  }

  return { party: { ...party, units: workingUnits }, events };
};

export const applyOpeningAbilities = (
  attacker: Party,
  defender: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
  abilities: AbilitiesFile,
  turn: number,
  tick: () => number,
): OpeningAbilityResult => {
  const events: ReplayEvent[] = [];

  const atkVolley = fireVolleys(attacker, defender, templates, abilities, turn, tick);
  events.push(...atkVolley.events);
  const defVolley = fireVolleys(
    atkVolley.target,
    atkVolley.shooter,
    templates,
    abilities,
    turn,
    tick,
  );
  events.push(...defVolley.events);

  const atkMend = fireMends(defVolley.target, templates, abilities, turn, tick);
  events.push(...atkMend.events);
  const defMend = fireMends(defVolley.shooter, templates, abilities, turn, tick);
  events.push(...defMend.events);

  return { attacker: atkMend.party, defender: defMend.party, events };
};
