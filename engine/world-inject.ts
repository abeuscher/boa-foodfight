/**
 * Phase B (B4) — world → scenario injection.
 *
 * Produces a scenario's initial ant parties from a carried `WorldState`
 * roster instead of the static `roster-ants.json`. This is an
 * ALTERNATIVE entry point: `loadScenario` is left untouched for the
 * existing batch / diversity / coevo paths. The world loop calls
 * `loadScenario` to build the map / POSTs / neutrals / items / cards
 * (all per-scenario, freshly seeded), then this module REPLACES the ant
 * parties with ones rebuilt from the campaign roster. The spider side
 * is scenario-defined (enemy roster is not campaign-carried), so its
 * parties from `loadScenario` are kept verbatim.
 *
 * ## How parties are rebuilt
 *
 * The static `roster-ants.json` parties act as a *scaffold*: each
 * provides a party id, starting location, posture, and leader class.
 * For every scaffold party we look up the matching `WorldState`
 * partyAssignment (by party id) and rebuild the party from the carried
 * world units in that assignment, preserving the scaffold's location /
 * posture. If a carried party shrank (units died last scenario) the
 * party is rebuilt smaller. If a scaffold party has no surviving
 * carried units it is dropped entirely (so a wiped vanguard doesn't
 * respawn for free). The 9-slot cap (12 for the queen guard) is
 * enforced — overflow carried units are trimmed deterministically
 * (roster order) and reported.
 *
 * Each rebuilt unit keeps its carried `level`, `xp`, `charisma`,
 * `promoted` flag (and thus its promoted `templateId`). MP slots are
 * re-seeded fresh per-scenario (decision (b): MP is per-scenario).
 *
 * ## Level-up stat folding — Phase-B follow-up (now wired through)
 *
 * The B3 `levelUpBonus` is persisted + computed. Rather than forking
 * the shared, immutable `UnitTemplate` map, the bonus rides on each
 * rebuilt scenario `Unit` as the optional `levelBonus` field
 * (`engine/types`): the cumulative combat delta for the unit's carried
 * `level`, derived from `engine/world-levelup`'s `cumulativeLevelBonus`
 * (single curve owner — no duplication). `engine/combat` folds the
 * attack / armor / agility / intelligence lanes additively into the
 * established item / phase / plane-affinity / POST / card offset lane;
 * the hp lane is realized HERE as a larger spawn HP pool (the unit
 * spawns the scenario healed to its leveled max — Phase-B decision
 * (a), units rest at the home base between scenarios). `promoted`
 * units additionally get their evolved-template stats as before.
 *
 * The static `loadScenario` path (batch / diversity / coevo) never
 * sets `levelBonus`, so combat treats it as all-zero — a strict no-op
 * preserving byte-identical non-campaign replays.
 *
 * Determinism: pure transformation, no RNG, no I/O.
 *
 * Imports allowed: `engine/types`, `engine/world-state`, `engine/mp-tiers`,
 * `engine/charisma`, `engine/formation`, `engine/world-levelup`.
 */

import { isPromotableTemplate } from './charisma.ts';
import { assignFormation } from './formation.ts';
import { INITIAL_MP_SLOTS, isCasterTemplate } from './mp-tiers.ts';
import type { GameState, Party, PartyId, Unit, UnitId, UnitTemplate } from './types.ts';
import { cumulativeLevelBonus } from './world-levelup.ts';
import type { WorldRoster } from './world-state.ts';

/** Default party slot cap in Tier 1. Raised 8→9 per the UX↔Gameplay
 * change request (roadmap §7.5): a ceiling for legible 3×3 rendering,
 * not a mandate to fill — authored rosters keep their compositions. */
export const PARTY_SLOT_CAP = 9;
/** The queen-guard's exceptional 12-slot capacity (game-outline). */
export const QUEEN_GUARD_SLOT_CAP = 12;
export const QUEEN_GUARD_PARTY_ID = 'queen-guard' as PartyId;

/**
 * Phase-B follow-up — a leveled unit's combat-relevant level facts,
 * surfaced on the inject report so the world loop can emit the
 * `roster-levels-summary` replay event without re-deriving the curve.
 * Only units with `level >= 2` appear here; an all-empty list means no
 * unit is leveled and the event is skipped (keeps non-campaign replays
 * clean).
 */
export interface LeveledUnitSummary {
  readonly unitId: UnitId;
  readonly level: number;
  readonly levelBonus: {
    readonly attack: number;
    readonly armor: number;
    readonly hp: number;
    readonly agility: number;
    readonly intelligence: number;
  };
}

export interface InjectReport {
  /** Party ids that were rebuilt from the carried roster. */
  readonly rebuiltParties: readonly PartyId[];
  /** Scaffold party ids dropped because no carried units survived. */
  readonly droppedParties: readonly PartyId[];
  /** Carried unit ids trimmed because their party exceeded the slot cap. */
  readonly trimmedUnitIds: readonly UnitId[];
  /** Total ant units placed into the scenario. */
  readonly antUnitsPlaced: number;
  /**
   * Phase-B follow-up — every placed ant unit with `level >= 2`, with
   * its level and folded `levelBonus`. Empty when nothing is leveled.
   * In placement (scaffold) order then party-unit order for determinism.
   */
  readonly leveledUnits: readonly LeveledUnitSummary[];
}

export interface InjectResult {
  readonly state: GameState;
  readonly report: InjectReport;
}

export const slotCapForParty = (partyId: PartyId): number =>
  partyId === QUEEN_GUARD_PARTY_ID ? QUEEN_GUARD_SLOT_CAP : PARTY_SLOT_CAP;

/**
 * Rebuild a single `Unit` from a carried world unit. Re-seeds the
 * per-scenario MP pool (caster-eligible units only) and charisma
 * (promotable templates only); carries level / xp / promoted / the
 * carried charisma value forward.
 *
 * Phase-B follow-up: the unit's cumulative campaign `levelBonus` is
 * derived from its carried `level` (single curve owner in
 * `engine/world-levelup`) and attached when non-trivial (level >= 2).
 * The hp lane raises the spawn HP pool: the unit enters the scenario
 * healed to `template hp + bonus.hp` (Phase-B decision (a) — units
 * rest at the home base between scenarios). A level-1 unit gets no
 * `levelBonus` field (all-zero curve) so combat is a strict no-op.
 */
const rebuildUnit = (worldUnit: WorldRoster['units'][number], tmpl: UnitTemplate): Unit => {
  const mpField = isCasterTemplate(tmpl) ? { mpSlots: INITIAL_MP_SLOTS } : {};
  // Carried charisma wins; but only promotable templates carry the
  // field at all (mirrors loadScenario's seeding rule).
  const charismaField = isPromotableTemplate(tmpl.id) ? { charisma: worldUnit.charisma } : {};
  const promotedField = worldUnit.promoted ? { promoted: true } : {};
  const bonus = cumulativeLevelBonus(worldUnit.level, tmpl);
  const isLeveled = worldUnit.level >= 2;
  // Spawn healed to the (possibly larger) leveled max HP pool. Derive
  // from the template base + hp bonus rather than the carried
  // currentHp so the pool is correct independent of the carried value.
  const currentHp = tmpl.baseStats.hp + bonus.hp;
  const levelBonusField = isLeveled ? { levelBonus: bonus } : {};
  return {
    id: worldUnit.id,
    templateId: tmpl.id,
    currentHp,
    level: worldUnit.level,
    xp: worldUnit.xp,
    ...mpField,
    ...charismaField,
    ...promotedField,
    ...levelBonusField,
  };
};

/**
 * Options for `injectWorldRoster`. All optional and backward-
 * compatible: omitting them reproduces the original behavior exactly
 * (so the L1 path and the world-loop stub-S1 stay byte-identical).
 */
export interface InjectOptions {
  /**
   * L2-4 — scenario-provided ant party ids to keep VERBATIM from the
   * freshly-loaded scenario (not scaffold-rebuilt from the carried
   * roster). This is how an L2-scenario-provided unit that the carried
   * L1 roster does not contain — Aunt Ant, placed by
   * `data/level-2/roster-ants.json` in `escort-column` — survives the
   * inject. The carried roster still fills every OTHER scaffold party
   * (queen-guard, the combat escorts), so the campaign roster and the
   * L2 escortee compose: carried veterans guard a fresh Aunt Ant.
   */
  readonly preserveScenarioPartyIds?: ReadonlySet<PartyId>;
}

/**
 * Inject a carried `WorldState` roster into a freshly-loaded scenario
 * `GameState`. `scaffold` is the static ant `roster-ants.json` party
 * metadata (id → location / posture). Spider / neutral parties in
 * `base` are untouched. Returns the new state plus a report for the
 * world-loop summary.
 */
export const injectWorldRoster = (
  base: GameState,
  roster: WorldRoster,
  scaffold: ReadonlyMap<PartyId, { location: Party['location']; posture: Party['posture'] }>,
  options?: InjectOptions,
): InjectResult => {
  const preserve = options?.preserveScenarioPartyIds ?? new Set<PartyId>();
  const rebuiltParties: PartyId[] = [];
  const droppedParties: PartyId[] = [];
  const trimmedUnitIds: UnitId[] = [];
  const leveledUnits: LeveledUnitSummary[] = [];
  let antUnitsPlaced = 0;

  const worldUnitById = new Map(roster.units.map((u) => [u.id, u] as const));
  const newParties = new Map<PartyId, Party>();

  // Keep every non-ant (spider / neutral) party verbatim, plus any
  // ant party explicitly preserved (L2-4: the scenario-provided
  // escort party carrying Aunt Ant — not in the carried roster).
  for (const [id, party] of base.parties) {
    if (party.faction !== 'ant' || preserve.has(id)) newParties.set(id, party);
  }

  // Rebuild ant parties from the carried assignments, in scaffold order
  // for determinism.
  for (const assignment of roster.partyAssignments) {
    if (preserve.has(assignment.partyId)) continue; // kept verbatim above
    const meta = scaffold.get(assignment.partyId);
    if (!meta) continue; // assignment with no scaffold slot → skip
    const cap = slotCapForParty(assignment.partyId);
    const units: Unit[] = [];
    let slots = 0;
    for (const unitId of assignment.unitIds) {
      const wu = worldUnitById.get(unitId);
      if (!wu) continue;
      const tmpl = base.unitTemplates.get(wu.templateId);
      if (!tmpl) continue;
      if (slots + tmpl.slotCost > cap) {
        trimmedUnitIds.push(unitId);
        continue;
      }
      const built = rebuildUnit(wu, tmpl);
      units.push(built);
      if (built.levelBonus !== undefined) {
        leveledUnits.push({
          unitId: built.id,
          level: built.level,
          levelBonus: built.levelBonus,
        });
      }
      slots += tmpl.slotCost;
    }
    if (units.length === 0) {
      droppedParties.push(assignment.partyId);
      continue;
    }
    const leaderUnit = units.find((u) => u.id === assignment.leaderId) ?? units[0];
    if (!leaderUnit) {
      droppedParties.push(assignment.partyId);
      continue;
    }
    const formation = assignFormation(units, base.unitTemplates);
    newParties.set(assignment.partyId, {
      id: assignment.partyId,
      faction: 'ant',
      units,
      leaderId: leaderUnit.id,
      location: meta.location,
      orders: [],
      posture: meta.posture,
      strategyModifiers: [],
      jellyDoses: 0,
      leaderless: false,
      formation,
    });
    rebuiltParties.push(assignment.partyId);
    antUnitsPlaced += units.length;
  }

  // Any scaffold party with no carried assignment is dropped (its units
  // didn't survive). Record it so the summary can show roster attrition.
  for (const partyId of scaffold.keys()) {
    if (preserve.has(partyId)) continue; // verbatim, not a roster slot
    const hadAssignment = roster.partyAssignments.some((a) => a.partyId === partyId);
    if (!hadAssignment && !droppedParties.includes(partyId)) {
      droppedParties.push(partyId);
    }
  }

  return {
    state: { ...base, parties: newParties },
    report: { rebuiltParties, droppedParties, trimmedUnitIds, antUnitsPlaced, leveledUnits },
  };
};

/**
 * Extract the static ant-roster scaffold (party id → starting location
 * + posture) from a freshly-loaded scenario's ant parties. The world
 * loop passes this to `injectWorldRoster` so carried units land at the
 * canonical L1 ant positions.
 */
export const scaffoldFromState = (
  state: GameState,
): Map<PartyId, { location: Party['location']; posture: Party['posture'] }> => {
  const scaffold = new Map<PartyId, { location: Party['location']; posture: Party['posture'] }>();
  for (const [id, party] of state.parties) {
    if (party.faction !== 'ant') continue;
    scaffold.set(id, { location: party.location, posture: party.posture });
  }
  return scaffold;
};
