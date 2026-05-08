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

import { backRowIntelligenceBonus, formationOrAllFront } from './formation.ts';
import type { AbilitiesFile } from './schemas/index.ts';
import type { AbilityId, Party, ReplayEvent, Unit, UnitTemplate, UnitTemplateId } from './types.ts';

const VOLLEY: AbilityId = 'volley' as AbilityId;
const MEND: AbilityId = 'mend' as AbilityId;
const MAGIC_ARROW: AbilityId = 'magic-arrow' as AbilityId;
const PHALANX_CHARGE: AbilityId = 'phalanx-charge' as AbilityId;
const FOOTMAN_TEMPLATE = 'ant-footman';
const ARCHER_TEMPLATE = 'ant-archer';
const MAGE_TEMPLATE = 'ant-mage';

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
  // Optional queen-targeting bonus, configured by the coevolution-loop
  // round-3 ant-firepower designer. When the volley lands on a unit
  // tagged `queen`, add this bonus damage on top of the base.
  const queenBonus = def.params.queenBonusDamage ?? 0;

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
    const targetTmpl = templates.get(before.templateId);
    const isQueenTarget = targetTmpl?.tags.includes('queen') ?? false;
    const totalDamage = damage + (isQueenTarget ? queenBonus : 0);
    const newHp = Math.max(0, before.currentHp - totalDamage);
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

/** True iff at least one living unit's templateId === target. */
const hasLivingTemplate = (party: Party, target: string): boolean =>
  party.units.some((u) => isLiving(u) && u.templateId === target);

const countLivingTemplate = (party: Party, target: string): number =>
  party.units.filter((u) => isLiving(u) && u.templateId === target).length;

interface OpeningArgs {
  shooter: Party;
  target: Party;
  abilities: AbilitiesFile;
  turn: number;
  tick: () => number;
}
interface OpeningResult {
  shooter: Party;
  target: Party;
  events: readonly ReplayEvent[];
}

/**
 * Magic arrow: a mage charges and an archer fires. Single ranged
 * shot at a high-HP enemy. Once per scenario per archer-and-mage
 * pair (we just consume one of each via usedAbilities). Requires
 * `minMages` mages and `minArchers` archers in the shooter party.
 *
 * Round 20 — back-row casters (mechanics memo §1.5) add +1 effective
 * intelligence to ability damage. The charging mage applies the
 * bump; if the mage chosen is back-row (or back-row-by-intelligence)
 * the arrow lands one extra damage.
 */
const fireMagicArrows = (
  args: OpeningArgs & { templates: ReadonlyMap<UnitTemplateId, UnitTemplate> },
): OpeningResult => {
  const { shooter, target, abilities, turn, tick, templates } = args;
  const def = findAbility(abilities, MAGIC_ARROW);
  if (!def) return { shooter, target, events: [] };
  const damage = def.params.damage ?? 0;
  const minMages = def.params.minMages ?? 1;
  const minArchers = def.params.minArchers ?? 1;
  if (damage <= 0) return { shooter, target, events: [] };
  if (countLivingTemplate(shooter, MAGE_TEMPLATE) < minMages)
    return { shooter, target, events: [] };
  if (countLivingTemplate(shooter, ARCHER_TEMPLATE) < minArchers)
    return { shooter, target, events: [] };
  // Pick the highest-HP living target (focus fire on a tank).
  let highest: Unit | undefined;
  for (const t of target.units) {
    if (!isLiving(t)) continue;
    if (highest === undefined || t.currentHp > highest.currentHp) highest = t;
  }
  if (!highest) return { shooter, target, events: [] };
  // Mark one mage and one archer as used. (If they re-fire later it's
  // capped by the `uses: 1` ability budget — but we don't enforce
  // per-unit uses elsewhere yet, so this is the budget.)
  let consumedMage = false;
  let consumedArcher = false;
  let mageUnitId: Unit['id'] | null = null;
  const newShooterUnits = shooter.units.map((u) => {
    if (!isLiving(u)) return u;
    if (!consumedMage && u.templateId === MAGE_TEMPLATE && !hasUsed(u, MAGIC_ARROW)) {
      consumedMage = true;
      mageUnitId = u.id;
      return markUsed(u, MAGIC_ARROW);
    }
    if (!consumedArcher && u.templateId === ARCHER_TEMPLATE && !hasUsed(u, MAGIC_ARROW)) {
      consumedArcher = true;
      return markUsed(u, MAGIC_ARROW);
    }
    return u;
  });
  if (!consumedMage || !consumedArcher) return { shooter, target, events: [] };
  // Round 20 — back-row caster bonus (+1 intelligence → +1 damage)
  // when the firing mage is in the back row.
  let intBonus = 0;
  if (mageUnitId !== null) {
    const mageTmpl = templates.get(MAGE_TEMPLATE as UnitTemplateId);
    if (mageTmpl) {
      const formation = formationOrAllFront(shooter);
      intBonus = backRowIntelligenceBonus(formation, mageUnitId, mageTmpl);
    }
  }
  const totalDamage = damage + intBonus;
  // Apply damage.
  const newTargetUnits = target.units.map((u) =>
    u.id === highest.id ? { ...u, currentHp: Math.max(0, u.currentHp - totalDamage) } : u,
  );
  const events: ReplayEvent[] = [
    {
      kind: 'ability-used',
      turn,
      tick: tick(),
      partyId: shooter.id,
      abilityId: MAGIC_ARROW,
    },
  ];
  if (highest.currentHp > 0 && highest.currentHp - totalDamage <= 0) {
    events.push({ kind: 'unit-died', turn, tick: tick(), unitId: highest.id });
  }
  return {
    shooter: { ...shooter, units: newShooterUnits },
    target: { ...target, units: newTargetUnits },
    events,
  };
};

/**
 * Phalanx Charge: 3+ footmen lock shields and barrel forward. AoE
 * damage on every living enemy. Once per scenario per footman.
 */
const firePhalanxCharge = (args: OpeningArgs): OpeningResult => {
  const { shooter, target, abilities, turn, tick } = args;
  const def = findAbility(abilities, PHALANX_CHARGE);
  if (!def) return { shooter, target, events: [] };
  const damage = def.params.damage ?? 0;
  const minFootmen = def.params.minFootmen ?? 3;
  if (damage <= 0) return { shooter, target, events: [] };
  if (countLivingTemplate(shooter, FOOTMAN_TEMPLATE) < minFootmen)
    return { shooter, target, events: [] };
  // Mark the first `minFootmen` unused footmen.
  let consumed = 0;
  const newShooterUnits = shooter.units.map((u) => {
    if (consumed >= minFootmen) return u;
    if (!isLiving(u)) return u;
    if (u.templateId !== FOOTMAN_TEMPLATE) return u;
    if (hasUsed(u, PHALANX_CHARGE)) return u;
    consumed += 1;
    return markUsed(u, PHALANX_CHARGE);
  });
  if (consumed < minFootmen) return { shooter, target, events: [] };
  // AoE: every living target unit takes `damage`.
  const events: ReplayEvent[] = [
    {
      kind: 'ability-used',
      turn,
      tick: tick(),
      partyId: shooter.id,
      abilityId: PHALANX_CHARGE,
    },
  ];
  const newTargetUnits = target.units.map((u) => {
    if (!isLiving(u)) return u;
    const newHp = Math.max(0, u.currentHp - damage);
    if (newHp <= 0 && u.currentHp > 0) {
      events.push({ kind: 'unit-died', turn, tick: tick(), unitId: u.id });
    }
    return { ...u, currentHp: newHp };
  });
  void hasLivingTemplate; // keep helper exported-by-side-effect for symmetry
  return {
    shooter: { ...shooter, units: newShooterUnits },
    target: { ...target, units: newTargetUnits },
    events,
  };
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

  // Group attacks: magic-arrow (mage+archer) and phalanx-charge (3+
  // footmen) fire after volley and before mend, so they soften the
  // defender further or pre-empt the kill battle. Only the attacker
  // side fires group attacks — they're spec'd as offensive group
  // moves, not defensive reactions.
  const atkArrow = fireMagicArrows({
    shooter: defVolley.target,
    target: defVolley.shooter,
    abilities,
    turn,
    tick,
    templates,
  });
  events.push(...atkArrow.events);
  const atkPhalanx = firePhalanxCharge({
    shooter: atkArrow.shooter,
    target: atkArrow.target,
    abilities,
    turn,
    tick,
  });
  events.push(...atkPhalanx.events);

  const atkMend = fireMends(atkPhalanx.shooter, templates, abilities, turn, tick);
  events.push(...atkMend.events);
  const defMend = fireMends(atkPhalanx.target, templates, abilities, turn, tick);
  events.push(...defMend.events);

  // The attacker is whichever party's units we threaded through the
  // mage/archer/phalanx pipeline; defender is the other.
  return { attacker: atkMend.party, defender: defMend.party, events };
};
