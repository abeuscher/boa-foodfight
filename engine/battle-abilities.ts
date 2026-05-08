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
import { canCastTier, spendSlot, tierForAbility } from './mp-tiers.ts';
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

/**
 * Round 21 — MP-tier consumption for a battle-ability cast. Returns
 * the post-cast unit (slot decremented) plus the matching `mp-spent`
 * replay event when the unit has an MP pool; returns the unit
 * unchanged + undefined event when the unit is a non-caster (no
 * pool) or the ability's tier is null. Caller should already have
 * gated on `canCastTier(unit, tier)` to prevent over-spending.
 */
const consumeMpForCast = (
  unit: Unit,
  abilityId: AbilityId,
  tier: 1 | 2 | 3 | null,
  partyId: Party['id'],
  turn: number,
  tick: () => number,
): { unit: Unit; event: ReplayEvent | undefined } => {
  if (tier === null || !unit.mpSlots) return { unit, event: undefined };
  const updated = spendSlot(unit, tier);
  if (!updated.mpSlots) return { unit: updated, event: undefined };
  return {
    unit: updated,
    event: {
      kind: 'mp-spent',
      turn,
      tick: tick(),
      partyId,
      unitId: unit.id,
      abilityId,
      tier,
      slotsRemaining: updated.mpSlots,
    },
  };
};

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
  // Round 21 — MP tier (mechanics memo §1.1). Volley is tier 2: a
  // caster firing it consumes a tier-2 slot. Archers (the typical
  // shooter) are non-casters with int=2, so they have no pool and
  // consume nothing — their only gate is `usedAbilities` (=`uses: 1`).
  const tier = tierForAbility(abilities, VOLLEY);

  const events: ReplayEvent[] = [];
  let workingShooter = shooter;
  const workingTargetUnits = [...target.units];

  for (const unit of shooter.units) {
    if (!isLiving(unit)) continue;
    if (hasUsed(unit, VOLLEY)) continue;
    if (!unitHasAbility(unit, VOLLEY, templates)) continue;
    // Round 21 — MP gate: caster-side units skip the cast when their
    // tier-2 slot is exhausted. Non-casters always pass.
    if (!canCastTier(unit, tier)) continue;

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

    const used = markUsed(unit, VOLLEY);
    const mpResult = consumeMpForCast(used, VOLLEY, tier, shooter.id, turn, tick);
    workingShooter = {
      ...workingShooter,
      units: workingShooter.units.map((u) => (u.id === unit.id ? mpResult.unit : u)),
    };

    events.push({
      kind: 'ability-used',
      turn,
      tick: tick(),
      partyId: shooter.id,
      abilityId: VOLLEY,
    });
    if (mpResult.event) events.push(mpResult.event);

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
  // Round 21 — Mend is tier 2; ant-mage is a caster (int 8) so the
  // cast drains a tier-2 slot from the firing mage's pool.
  const tier = tierForAbility(abilities, MEND);

  const events: ReplayEvent[] = [];
  let workingUnits = [...party.units];

  for (const unit of party.units) {
    if (!isLiving(unit)) continue;
    if (hasUsed(unit, MEND)) continue;
    if (!unitHasAbility(unit, MEND, templates)) continue;
    // Round 21 — MP gate: out-of-MP casters skip silently.
    if (!canCastTier(unit, tier)) continue;

    // Round 21 — apply the MP decrement to the casting unit before
    // healing so the per-unit heal pass uses the post-cast unit. The
    // mp-spent event fires alongside the ability-used event.
    const mpResult = consumeMpForCast(markUsed(unit, MEND), MEND, tier, party.id, turn, tick);

    workingUnits = workingUnits.map((u) => {
      if (u.id === unit.id) return mpResult.unit;
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
    if (mpResult.event) events.push(mpResult.event);
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
  // Round 21 — Magic Arrow is tier 3. The mage charges and pays the
  // MP cost (mage is caster-eligible by intelligence); the archer is
  // a non-caster and pays nothing. If no eligible mage has a tier-3
  // slot remaining, the cast aborts entirely (no consumption,
  // matching the silent-fail semantics of the spec).
  const tier = tierForAbility(abilities, MAGIC_ARROW);
  // Pick the highest-HP living target (focus fire on a tank).
  let highest: Unit | undefined;
  for (const t of target.units) {
    if (!isLiving(t)) continue;
    if (highest === undefined || t.currentHp > highest.currentHp) highest = t;
  }
  if (!highest) return { shooter, target, events: [] };
  // Mark one mage and one archer as used. (If they re-fire later it's
  // capped by the `uses: 1` ability budget — but we don't enforce
  // per-unit uses elsewhere yet, so this is the budget.) Round 21:
  // also gate the mage on tier-3 MP availability before charging.
  let consumedMage = false;
  let consumedArcher = false;
  let mageUnitId: Unit['id'] | null = null;
  let mpEvent: ReplayEvent | undefined;
  const newShooterUnits = shooter.units.map((u) => {
    if (!isLiving(u)) return u;
    if (
      !consumedMage &&
      u.templateId === MAGE_TEMPLATE &&
      !hasUsed(u, MAGIC_ARROW) &&
      canCastTier(u, tier)
    ) {
      consumedMage = true;
      mageUnitId = u.id;
      const used = markUsed(u, MAGIC_ARROW);
      const mpResult = consumeMpForCast(used, MAGIC_ARROW, tier, shooter.id, turn, tick);
      mpEvent = mpResult.event;
      return mpResult.unit;
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
  if (mpEvent) events.push(mpEvent);
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
  // Round 21 — Phalanx-charge is tier 3. Footmen (int 1, no caster
  // tag) are non-casters: their MP gate is a no-op (`canCastTier`
  // returns true) and they emit no `mp-spent` event. The cast is
  // still bounded by `uses: 1` and `minFootmen` requirement.
  const tier = tierForAbility(abilities, PHALANX_CHARGE);
  // Mark the first `minFootmen` unused footmen.
  let consumed = 0;
  const mpEvents: ReplayEvent[] = [];
  const newShooterUnits = shooter.units.map((u) => {
    if (consumed >= minFootmen) return u;
    if (!isLiving(u)) return u;
    if (u.templateId !== FOOTMAN_TEMPLATE) return u;
    if (hasUsed(u, PHALANX_CHARGE)) return u;
    if (!canCastTier(u, tier)) return u;
    consumed += 1;
    const used = markUsed(u, PHALANX_CHARGE);
    const mpResult = consumeMpForCast(used, PHALANX_CHARGE, tier, shooter.id, turn, tick);
    if (mpResult.event) mpEvents.push(mpResult.event);
    return mpResult.unit;
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
    ...mpEvents,
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
