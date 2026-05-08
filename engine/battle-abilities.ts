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

import { distance } from './coord.ts';
import { backRowIntelligenceBonus, formationOrAllFront } from './formation.ts';
import { canCastTier, spendSlot, tierForAbility } from './mp-tiers.ts';
import type { AbilitiesFile } from './schemas/index.ts';
import type {
  AbilityId,
  Party,
  PartyId,
  ReplayEvent,
  Unit,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';

const VOLLEY: AbilityId = 'volley' as AbilityId;
const MEND: AbilityId = 'mend' as AbilityId;
const MAGIC_ARROW: AbilityId = 'magic-arrow' as AbilityId;
const PHALANX_CHARGE: AbilityId = 'phalanx-charge' as AbilityId;
const VENOM_BLAST: AbilityId = 'venom-blast' as AbilityId;
const WEB_TANGLE: AbilityId = 'web-tangle' as AbilityId;
const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;
const ROYAL_ONSLAUGHT: AbilityId = 'royal-onslaught' as AbilityId;
const VENOM_STORM: AbilityId = 'venom-storm' as AbilityId;
const FOOTMAN_TEMPLATE = 'ant-footman';
const ARCHER_TEMPLATE = 'ant-archer';
const MAGE_TEMPLATE = 'ant-mage';
const WORKER_TEMPLATE = 'ant-worker';
const SPINNER_TEMPLATE = 'spider-spinner';
const SPIDER_QUEEN_TEMPLATE = 'spider-queen';

/**
 * Round 24 — combo abilities (mechanics memo §1.2). When a battle's
 * shooter party has a partner adjacent (Chebyshev 1, same plane,
 * same faction) carrying the second component ability + matching
 * MP, a combo fires pre-battle. The partner sits OUTSIDE the
 * battle's two-party scope — its MP gets decremented and combo-
 * fired bookkeeping bumps the per-party-per-scenario cap. Caller
 * passes `allParties` (the working state's parties map) so the
 * resolver can locate / mutate partner parties; result includes
 * a partnerUpdates list of (partyId, updated Party) pairs that the
 * battle module writes back into state.parties after resolution.
 */
export interface ComboContext {
  readonly allParties: ReadonlyMap<PartyId, Party>;
}

export interface ComboPartnerUpdate {
  readonly partyId: PartyId;
  readonly party: Party;
}

export interface OpeningAbilityResult {
  readonly attacker: Party;
  readonly defender: Party;
  readonly events: readonly ReplayEvent[];
  /** Round 24 — partner-party MP / combo-fired updates emitted by
   * combo abilities. Empty when no combos fired. The battle module
   * folds these into `state.parties` after the rest of opening
   * resolution. */
  readonly partnerUpdates: readonly ComboPartnerUpdate[];
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

/**
 * Round 24 — params widened (mechanics memo §1.2): combo abilities
 * carry `componentAbilities: string[]` and `mpCostBySource:
 * Record<string, number>` alongside the legacy numeric reads
 * (`damage: 12`, `radius: 3`). The narrow `numericParam` helper keeps
 * the existing `def.params.damage ?? 0` call sites in this module
 * type-clean by unwrapping only number-valued slots; non-number
 * fields fall through to the supplied default.
 */
const findAbility = (
  abilities: AbilitiesFile,
  id: AbilityId,
):
  | { params: Readonly<Record<string, number | readonly string[] | Record<string, number>>> }
  | undefined => {
  for (const a of abilities.abilities) {
    if (a.id === id) return a;
  }
  return undefined;
};

const numericParam = (
  params: Readonly<Record<string, number | readonly string[] | Record<string, number>>>,
  key: string,
  fallback: number,
): number => {
  const raw = params[key];
  return typeof raw === 'number' ? raw : fallback;
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
  const damage = numericParam(def.params, 'damage', 0);
  if (damage <= 0) return { shooter, target, events: [] };
  // Optional queen-targeting bonus, configured by the coevolution-loop
  // round-3 ant-firepower designer. When the volley lands on a unit
  // tagged `queen`, add this bonus damage on top of the base.
  const queenBonus = numericParam(def.params, 'queenBonusDamage', 0);
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
  const heal = numericParam(def.params, 'heal', 0);
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
  const damage = numericParam(def.params, 'damage', 0);
  const minMages = numericParam(def.params, 'minMages', 1);
  const minArchers = numericParam(def.params, 'minArchers', 1);
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
  const damage = numericParam(def.params, 'damage', 0);
  const minFootmen = numericParam(def.params, 'minFootmen', 3);
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

/**
 * Round 22 — Venom Blast (spider damage parity ability).
 *
 * A spider party with at least one living spider-spinner OR spider-queen
 * sprays a fan of venom across the enemy front rank, hitting every
 * living unit there for `damagePerUnit` flat damage. When the front
 * rank is empty (or no formation data lists it), it falls through to
 * the back rank; if both are empty the cast fizzles silently.
 *
 * Caster pick: spider-queen first, else first living spider-spinner.
 * The caster must have a tier-2 MP slot remaining; otherwise the cast
 * silently fails (matches the round-21 MP-tier shape). Tracked at the
 * party level via `usedAbilities` occurrences across all units —
 * `uses: 2` means two firings per party per scenario regardless of who
 * casts them. The cast marks the casting unit's `usedAbilities` so the
 * count grows on each fire.
 *
 * Forward-compat: this ability is intended as a combo ingredient when
 * mechanic #2 (combo abilities) lands in a later round; for now it
 * stands alone as a pre-battle fan attack.
 */
const fireVenomBlast = (args: OpeningArgs): OpeningResult => {
  const { shooter, target, abilities, turn, tick } = args;
  const def = findAbility(abilities, VENOM_BLAST);
  if (!def) return { shooter, target, events: [] };
  const damagePerUnit = numericParam(def.params, 'damagePerUnit', 0);
  if (damagePerUnit <= 0) return { shooter, target, events: [] };
  const usesCap = numericParam(def.params, 'uses', 0);
  // Per-scenario per-party `uses` cap. Sum venom-blast occurrences in
  // the shooter's units' `usedAbilities`; cast aborts when the count
  // already meets/exceeds the cap. The data file's `uses: 2` lives on
  // the ability definition, not in `params`, so we read it via the
  // surrounding ability record.
  const ability = abilities.abilities.find((a) => a.id === VENOM_BLAST);
  const usesAllowed = ability?.uses ?? usesCap;
  const usesSoFar = shooter.units.reduce(
    (n, u) => n + (u.usedAbilities ?? []).filter((id) => id === VENOM_BLAST).length,
    0,
  );
  if (usesAllowed !== null && usesSoFar >= usesAllowed) {
    return { shooter, target, events: [] };
  }
  // Caster pick: spider-queen (living) first; else first living spinner.
  const tier = tierForAbility(abilities, VENOM_BLAST);
  let caster: Unit | undefined;
  for (const u of shooter.units) {
    if (!isLiving(u)) continue;
    if (u.templateId !== SPIDER_QUEEN_TEMPLATE) continue;
    if (!canCastTier(u, tier)) continue;
    caster = u;
    break;
  }
  if (!caster) {
    for (const u of shooter.units) {
      if (!isLiving(u)) continue;
      if (u.templateId !== SPINNER_TEMPLATE) continue;
      if (!canCastTier(u, tier)) continue;
      caster = u;
      break;
    }
  }
  if (!caster) return { shooter, target, events: [] };
  // Pick the rank: front if it has any living unit, else back.
  // Falls back to "all units front" semantics for legacy parties
  // without `formation` (matches `formationOrAllFront`).
  const formation = formationOrAllFront(target);
  const livingIn = (rank: readonly Unit['id'][]): Unit[] =>
    target.units.filter((u) => rank.includes(u.id) && isLiving(u));
  const frontLiving = livingIn(formation.front);
  const backLiving = livingIn(formation.back);
  let chosenRank: 'front' | 'back';
  let victims: Unit[];
  if (frontLiving.length > 0) {
    chosenRank = 'front';
    victims = frontLiving;
  } else if (backLiving.length > 0) {
    chosenRank = 'back';
    victims = backLiving;
  } else {
    return { shooter, target, events: [] };
  }
  // Apply damage and build per-unit deltas.
  const damaged: { unitId: Unit['id']; hpBefore: number; hpAfter: number }[] = [];
  let totalDamage = 0;
  const deathEvents: ReplayEvent[] = [];
  const newTargetUnits = target.units.map((u) => {
    if (!victims.some((v) => v.id === u.id)) return u;
    const hpAfter = Math.max(0, u.currentHp - damagePerUnit);
    const delta = u.currentHp - hpAfter;
    if (delta <= 0) return u;
    damaged.push({ unitId: u.id, hpBefore: u.currentHp, hpAfter });
    totalDamage += delta;
    if (u.currentHp > 0 && hpAfter <= 0) {
      deathEvents.push({ kind: 'unit-died', turn, tick: tick(), unitId: u.id });
    }
    return { ...u, currentHp: hpAfter };
  });
  // Mark caster's `usedAbilities` and decrement MP. The unit's
  // usedAbilities can hold multiple `'venom-blast'` entries — one per
  // fire — so the per-party cap above stays accurate across battles.
  const used = markUsed(caster, VENOM_BLAST);
  const mpResult = consumeMpForCast(used, VENOM_BLAST, tier, shooter.id, turn, tick);
  const newShooterUnits = shooter.units.map((u) => (u.id === caster.id ? mpResult.unit : u));
  const events: ReplayEvent[] = [
    {
      kind: 'ability-used',
      turn,
      tick: tick(),
      partyId: shooter.id,
      abilityId: VENOM_BLAST,
    },
  ];
  if (mpResult.event) events.push(mpResult.event);
  events.push({
    kind: 'venom-blasted',
    turn,
    tick: tick(),
    partyId: shooter.id,
    targetPartyId: target.id,
    targetRank: chosenRank,
    damagedUnits: damaged,
    totalDamage,
  });
  events.push(...deathEvents);
  return {
    shooter: { ...shooter, units: newShooterUnits },
    target: { ...target, units: newTargetUnits },
    events,
  };
};

// ---------------------------------------------------------------------------
// Round 24 — combo abilities (mechanics memo §1.2)
// ---------------------------------------------------------------------------

/**
 * Round 24 — combo "Royal Onslaught" Component A predicate: living
 * ant-mage in `party` with a tier-3 MP slot remaining AND the per-
 * party-per-scenario combo cap not yet reached. Returns the eligible
 * mage unit or undefined.
 */
const findRoyalOnslaughtMage = (party: Party): Unit | undefined => {
  for (const u of party.units) {
    if (!isLiving(u)) continue;
    if (u.templateId !== MAGE_TEMPLATE) continue;
    if (hasUsed(u, ROYAL_ONSLAUGHT)) continue;
    if (!canCastTier(u, 3)) continue;
    return u;
  }
  return undefined;
};

/**
 * Round 24 — combo "Royal Onslaught" Component B predicate: living
 * ant-worker in `party` with `jelly-apply` on its template and a
 * tier-1 MP slot remaining (workers are non-casters today, so the
 * tier check effectively short-circuits to true; the gate is here
 * for symmetry with the spec).
 */
const findRoyalOnslaughtWorker = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): Unit | undefined => {
  for (const u of party.units) {
    if (!isLiving(u)) continue;
    if (u.templateId !== WORKER_TEMPLATE) continue;
    if (hasUsed(u, ROYAL_ONSLAUGHT)) continue;
    if (!unitHasAbility(u, JELLY_APPLY, templates)) continue;
    if (!canCastTier(u, 1)) continue;
    return u;
  }
  return undefined;
};

/**
 * Round 24 — combo "Venom Storm" Component A predicate: living
 * spider unit (spinner or queen) carrying `venom-blast` with a
 * tier-2 MP slot remaining. Spinners and queens are the only
 * templates with `venom-blast` (round 22 data).
 */
const findVenomStormVenomCaster = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): Unit | undefined => {
  for (const u of party.units) {
    if (!isLiving(u)) continue;
    if (u.templateId !== SPINNER_TEMPLATE && u.templateId !== SPIDER_QUEEN_TEMPLATE) continue;
    if (hasUsed(u, VENOM_STORM)) continue;
    if (!unitHasAbility(u, VENOM_BLAST, templates)) continue;
    if (!canCastTier(u, 2)) continue;
    return u;
  }
  return undefined;
};

/**
 * Round 24 — combo "Venom Storm" Component B predicate: living
 * spider unit carrying `web-tangle` (spinner or queen) with a
 * tier-2 MP slot remaining.
 */
const findVenomStormWebCaster = (
  party: Party,
  excludeUnitId: Unit['id'] | undefined,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): Unit | undefined => {
  for (const u of party.units) {
    if (!isLiving(u)) continue;
    if (excludeUnitId !== undefined && u.id === excludeUnitId) continue;
    if (u.templateId !== SPINNER_TEMPLATE && u.templateId !== SPIDER_QUEEN_TEMPLATE) continue;
    if (hasUsed(u, VENOM_STORM)) continue;
    if (!unitHasAbility(u, WEB_TANGLE, templates)) continue;
    if (!canCastTier(u, 2)) continue;
    return u;
  }
  return undefined;
};

/**
 * Round 24 — adjacency predicate for combos (mechanics memo §1.2).
 * Two parties combo iff same faction, same plane, Chebyshev distance
 * ≤ 1 (Chebyshev 0 — co-located parties are allowed; the spec says
 * "two adjacent same-faction parties" but doesn't forbid co-location.
 * For determinism the engine matches the user's "Chebyshev 1, same
 * plane" wording: distance ≤ 1 covers both cases).
 */
const isComboAdjacent = (a: Party, b: Party): boolean => {
  if (a.id === b.id) return false;
  if (a.faction !== b.faction) return false;
  if (a.location.plane !== b.location.plane) return false;
  return distance(a.location, b.location) <= 1;
};

/** Round 24 — apply per-unit MP spend (returns updated Party + the
 * mp-spent event when one fires). */
const spendMpOnUnit = (
  party: Party,
  unitId: Unit['id'],
  abilityId: AbilityId,
  tier: 1 | 2 | 3,
  turn: number,
  tick: () => number,
): { party: Party; event: ReplayEvent | undefined } => {
  const target = party.units.find((u) => u.id === unitId);
  if (!target) return { party, event: undefined };
  const mpResult = consumeMpForCast(
    markUsed(target, abilityId),
    abilityId,
    tier,
    party.id,
    turn,
    tick,
  );
  return {
    party: { ...party, units: party.units.map((u) => (u.id === unitId ? mpResult.unit : u)) },
    event: mpResult.event,
  };
};

interface ComboFireOutcome {
  readonly target: Party;
  readonly shooter: Party;
  readonly partner: Party;
  readonly events: readonly ReplayEvent[];
}

/**
 * Round 24 — fire "Royal Onslaught" against `target`. Caller has
 * already validated component-A (mage in `shooter`) and component-B
 * (worker in `partner`) eligibility. Damage is applied to all
 * living units in the target party. Both source units consume MP
 * and have `royal-onslaught` appended to `usedAbilities`.
 */
const fireRoyalOnslaught = (args: {
  shooter: Party;
  partner: Party;
  target: Party;
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>;
  abilities: AbilitiesFile;
  turn: number;
  tick: () => number;
}): ComboFireOutcome | undefined => {
  const { shooter, partner, target, templates, abilities, turn, tick } = args;
  const def = findAbility(abilities, ROYAL_ONSLAUGHT);
  if (!def) return undefined;
  const damage = numericParam(def.params, 'damage', 0);
  if (damage <= 0) return undefined;
  const mage = findRoyalOnslaughtMage(shooter);
  if (!mage) return undefined;
  const worker = findRoyalOnslaughtWorker(partner, templates);
  if (!worker) return undefined;
  const events: ReplayEvent[] = [];

  // Mage spends tier-3 MP and marks used.
  const mageSpend = spendMpOnUnit(shooter, mage.id, ROYAL_ONSLAUGHT, 3, turn, tick);
  const workingShooter = mageSpend.party;
  if (mageSpend.event) events.push(mageSpend.event);

  const workerSpend = spendMpOnUnit(partner, worker.id, ROYAL_ONSLAUGHT, 1, turn, tick);
  const workingPartner = workerSpend.party;
  if (workerSpend.event) events.push(workerSpend.event);

  // Apply damage to every living unit in target.
  let totalDamage = 0;
  const deathEvents: ReplayEvent[] = [];
  const newTargetUnits = target.units.map((u) => {
    if (!isLiving(u)) return u;
    const hpAfter = Math.max(0, u.currentHp - damage);
    const delta = u.currentHp - hpAfter;
    if (delta <= 0) return u;
    totalDamage += delta;
    if (u.currentHp > 0 && hpAfter <= 0) {
      deathEvents.push({ kind: 'unit-died', turn, tick: tick(), unitId: u.id });
    }
    return { ...u, currentHp: hpAfter };
  });
  const newTarget: Party = { ...target, units: newTargetUnits };

  events.push({
    kind: 'ability-used',
    turn,
    tick: tick(),
    partyId: shooter.id,
    abilityId: ROYAL_ONSLAUGHT,
  });
  events.push({
    kind: 'combo-fired',
    turn,
    tick: tick(),
    comboId: ROYAL_ONSLAUGHT,
    sourcePartyId: shooter.id,
    partnerPartyId: partner.id,
    targetPartyId: target.id,
    totalDamage,
  });
  events.push(...deathEvents);

  return { shooter: workingShooter, partner: workingPartner, target: newTarget, events };
};

/**
 * Round 24 — fire "Venom Storm" against `target`. Damage to every
 * living unit + per-unit `tangleTurnsRemaining` debuff stamp. Both
 * source units (venom-caster in shooter, web-caster in partner)
 * consume tier-2 MP.
 */
const fireVenomStorm = (args: {
  shooter: Party;
  partner: Party;
  target: Party;
  abilities: AbilitiesFile;
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>;
  turn: number;
  tick: () => number;
}): ComboFireOutcome | undefined => {
  const { shooter, partner, target, abilities, templates, turn, tick } = args;
  const def = findAbility(abilities, VENOM_STORM);
  if (!def) return undefined;
  const damage = numericParam(def.params, 'damage', 0);
  const durationTurns = numericParam(def.params, 'durationTurns', 2);
  if (damage <= 0 && durationTurns <= 0) return undefined;
  const venomCaster = findVenomStormVenomCaster(shooter, templates);
  if (!venomCaster) return undefined;
  // Partner: prefer a different unit than the shooter's caster when
  // partner === shooter (defensive — combo predicate rejects same
  // party but tests may shortcut). Allow same-id when the caster
  // role differs.
  const webCaster = findVenomStormWebCaster(partner, undefined, templates);
  if (!webCaster) return undefined;

  const events: ReplayEvent[] = [];
  const venomSpend = spendMpOnUnit(shooter, venomCaster.id, VENOM_STORM, 2, turn, tick);
  const workingShooter = venomSpend.party;
  if (venomSpend.event) events.push(venomSpend.event);
  const webSpend = spendMpOnUnit(partner, webCaster.id, VENOM_STORM, 2, turn, tick);
  const workingPartner = webSpend.party;
  if (webSpend.event) events.push(webSpend.event);

  let totalDamage = 0;
  const deathEvents: ReplayEvent[] = [];
  const newTargetUnits = target.units.map((u) => {
    if (!isLiving(u)) {
      // Dead units don't get tagged; existing fields untouched.
      return u;
    }
    const hpAfter = Math.max(0, u.currentHp - damage);
    const delta = u.currentHp - hpAfter;
    totalDamage += delta;
    if (delta > 0 && u.currentHp > 0 && hpAfter <= 0) {
      deathEvents.push({ kind: 'unit-died', turn, tick: tick(), unitId: u.id });
    }
    // Stamp the debuff on every living unit (including those killed
    // outright by the damage — they're still tagged, which is harmless
    // bookkeeping). End-of-turn decay handles cleanup.
    return { ...u, currentHp: hpAfter, tangleTurnsRemaining: durationTurns };
  });
  const newTarget: Party = { ...target, units: newTargetUnits };

  events.push({
    kind: 'ability-used',
    turn,
    tick: tick(),
    partyId: shooter.id,
    abilityId: VENOM_STORM,
  });
  events.push({
    kind: 'combo-fired',
    turn,
    tick: tick(),
    comboId: VENOM_STORM,
    sourcePartyId: shooter.id,
    partnerPartyId: partner.id,
    targetPartyId: target.id,
    totalDamage,
    debuffApplied: 'venom-storm',
  });
  events.push(...deathEvents);

  return { shooter: workingShooter, partner: workingPartner, target: newTarget, events };
};

/**
 * Round 24 — locate a same-faction adjacent partner party (Chebyshev
 * 1, same plane) that satisfies `partnerOk`. Deterministic by
 * partyId order. The shooter party itself is excluded. Used by both
 * combo resolvers.
 */
const findComboPartner = (
  shooter: Party,
  allParties: ReadonlyMap<PartyId, Party>,
  partnerOk: (candidate: Party) => boolean,
): Party | undefined => {
  const candidateIds: PartyId[] = [];
  for (const id of allParties.keys()) candidateIds.push(id);
  candidateIds.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const id of candidateIds) {
    if (id === shooter.id) continue;
    const candidate = allParties.get(id);
    if (!candidate) continue;
    if (!isComboAdjacent(shooter, candidate)) continue;
    if (!partnerOk(candidate)) continue;
    return candidate;
  }
  return undefined;
};

/**
 * Round 24 — try the ant Royal-Onslaught combo for `shooter`.
 * Returns the post-combo (shooter, target, partner-update, events)
 * or `undefined` when the combo doesn't fire.
 */
const tryRoyalOnslaught = (args: {
  shooter: Party;
  target: Party;
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>;
  abilities: AbilitiesFile;
  turn: number;
  tick: () => number;
  combo: ComboContext;
}):
  | { shooter: Party; target: Party; partner: ComboPartnerUpdate; events: readonly ReplayEvent[] }
  | undefined => {
  const { shooter, target, templates, abilities, turn, tick, combo } = args;
  if (shooter.faction !== 'ant') return undefined;
  if (!findRoyalOnslaughtMage(shooter)) return undefined;
  const partner = findComboPartner(shooter, combo.allParties, (cand) => {
    return findRoyalOnslaughtWorker(cand, templates) !== undefined;
  });
  if (!partner) return undefined;

  const out = fireRoyalOnslaught({ shooter, partner, target, templates, abilities, turn, tick });
  if (!out) return undefined;
  return {
    shooter: out.shooter,
    target: out.target,
    partner: { partyId: partner.id, party: out.partner },
    events: out.events,
  };
};

/**
 * Round 24 — try the spider Venom-Storm combo for `shooter`.
 */
const tryVenomStorm = (args: {
  shooter: Party;
  target: Party;
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>;
  abilities: AbilitiesFile;
  turn: number;
  tick: () => number;
  combo: ComboContext;
}):
  | { shooter: Party; target: Party; partner: ComboPartnerUpdate; events: readonly ReplayEvent[] }
  | undefined => {
  const { shooter, target, templates, abilities, turn, tick, combo } = args;
  if (shooter.faction !== 'spider') return undefined;
  if (!findVenomStormVenomCaster(shooter, templates)) return undefined;
  const partner = findComboPartner(shooter, combo.allParties, (cand) => {
    return findVenomStormWebCaster(cand, undefined, templates) !== undefined;
  });
  if (!partner) return undefined;
  const out = fireVenomStorm({ shooter, partner, target, abilities, templates, turn, tick });
  if (!out) return undefined;
  return {
    shooter: out.shooter,
    target: out.target,
    partner: { partyId: partner.id, party: out.partner },
    events: out.events,
  };
};

export const applyOpeningAbilities = (
  attacker: Party,
  defender: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
  abilities: AbilitiesFile,
  turn: number,
  tick: () => number,
  combo?: ComboContext,
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

  // Round 24 — combo abilities (mechanics memo §1.2). Combos fire
  // BEFORE the single-component openers (magic-arrow, phalanx-
  // charge, venom-blast) so the spike fires off the mage / venom-
  // caster's MP slot first, instead of being silently preempted by
  // a magic-arrow / venom-blast cast that drains the same tier-3
  // (mage) or tier-2 (spinner / queen) slot. Volleys still resolve
  // first (archers are non-casters; volleys never compete with
  // combos for MP). Attacker-side combo resolves first; defender-
  // side after. A combo's partner party may be ANY adjacent ally —
  // including the other combatant when adjacent. The combo MP cost
  // and per-shooter cap-bump are applied to the partner party via
  // `partnerUpdates`, which the battle module writes back into
  // state.parties after this function returns.
  let comboAttacker = defVolley.target;
  let comboDefender = defVolley.shooter;
  const partnerUpdates: ComboPartnerUpdate[] = [];
  if (combo) {
    const tryCombo = (
      shooter: Party,
      target: Party,
    ):
      | {
          shooter: Party;
          target: Party;
          partner: ComboPartnerUpdate;
          events: readonly ReplayEvent[];
        }
      | undefined => {
      if (shooter.faction === 'ant') {
        return tryRoyalOnslaught({ shooter, target, templates, abilities, turn, tick, combo });
      }
      if (shooter.faction === 'spider') {
        return tryVenomStorm({ shooter, target, templates, abilities, turn, tick, combo });
      }
      return undefined;
    };
    const atkCombo = tryCombo(comboAttacker, comboDefender);
    if (atkCombo) {
      comboAttacker = atkCombo.shooter;
      comboDefender = atkCombo.target;
      partnerUpdates.push(atkCombo.partner);
      events.push(...atkCombo.events);
    }
    const defCombo = tryCombo(comboDefender, comboAttacker);
    if (defCombo) {
      comboDefender = defCombo.shooter;
      comboAttacker = defCombo.target;
      partnerUpdates.push(defCombo.partner);
      events.push(...defCombo.events);
    }
  }

  // Group attacks: magic-arrow (mage+archer) and phalanx-charge (3+
  // footmen) fire after volley + combos and before mend, so they
  // soften the defender further or pre-empt the kill battle. Only the
  // attacker side fires group attacks — they're spec'd as offensive
  // group moves, not defensive reactions.
  const atkArrow = fireMagicArrows({
    shooter: comboAttacker,
    target: comboDefender,
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

  // Round 22 — venom-blast (spider damage parity). Each side gets a
  // chance to fire if it has a living spinner or queen. The attacker
  // resolves first for determinism; the defender's blast (if any)
  // lands against whatever's left after the attacker's events.
  const atkVenom = fireVenomBlast({
    shooter: atkPhalanx.shooter,
    target: atkPhalanx.target,
    abilities,
    turn,
    tick,
  });
  events.push(...atkVenom.events);
  const defVenom = fireVenomBlast({
    shooter: atkVenom.target,
    target: atkVenom.shooter,
    abilities,
    turn,
    tick,
  });
  events.push(...defVenom.events);

  // `defVenom.target` is the working attacker (used as the target in
  // the defender's venom-blast pass), `defVenom.shooter` is the
  // working defender.
  const atkMend = fireMends(defVenom.target, templates, abilities, turn, tick);
  events.push(...atkMend.events);
  const defMend = fireMends(defVenom.shooter, templates, abilities, turn, tick);
  events.push(...defMend.events);

  return {
    attacker: atkMend.party,
    defender: defMend.party,
    events,
    partnerUpdates,
  };
};
