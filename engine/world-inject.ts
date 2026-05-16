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
 * respawn for free). The 8-slot cap (12 for the queen guard) is
 * enforced — overflow carried units are trimmed deterministically
 * (roster order) and reported.
 *
 * Each rebuilt unit keeps its carried `level`, `xp`, `charisma`,
 * `promoted` flag (and thus its promoted `templateId`). MP slots are
 * re-seeded fresh per-scenario (decision (b): MP is per-scenario).
 *
 * ## Level-up stat folding — documented Phase-B follow-up
 *
 * The B3 `levelUpBonus` is persisted + computed, but folding the bonus
 * into LIVE combat stats would require forking `UnitTemplate` (shared,
 * immutable scenario data keyed by templateId across gold-table,
 * promotion-tree, formation, etc.). Per the hard Phase-B constraint
 * "the scenario engine itself should not change behavior — Phase B
 * wraps it", we deliberately do NOT fork templates in this milestone.
 * Level/XP/charisma/promoted/item all carry and are visible in saves
 * and the world-loop summary; the stat-delta application into combat
 * is the Phase-B follow-up (alongside the full shop and a real L2).
 * `promoted` units DO get their stronger stats already, because
 * promotion swaps `templateId` to an evolved template that the engine
 * already knows.
 *
 * Determinism: pure transformation, no RNG, no I/O.
 *
 * Imports allowed: `engine/types`, `engine/world-state`, `engine/mp-tiers`,
 * `engine/charisma`, `engine/formation`.
 */

import { isPromotableTemplate } from './charisma.ts';
import { assignFormation } from './formation.ts';
import { INITIAL_MP_SLOTS, isCasterTemplate } from './mp-tiers.ts';
import type { GameState, Party, PartyId, Unit, UnitId, UnitTemplate } from './types.ts';
import type { WorldRoster } from './world-state.ts';

/** Default party slot cap in Tier 1 (game-outline "Campaign structure"). */
const PARTY_SLOT_CAP = 8;
/** The queen-guard's exceptional 12-slot capacity (game-outline). */
const QUEEN_GUARD_SLOT_CAP = 12;
const QUEEN_GUARD_PARTY_ID = 'queen-guard' as PartyId;

export interface InjectReport {
  /** Party ids that were rebuilt from the carried roster. */
  readonly rebuiltParties: readonly PartyId[];
  /** Scaffold party ids dropped because no carried units survived. */
  readonly droppedParties: readonly PartyId[];
  /** Carried unit ids trimmed because their party exceeded the slot cap. */
  readonly trimmedUnitIds: readonly UnitId[];
  /** Total ant units placed into the scenario. */
  readonly antUnitsPlaced: number;
}

export interface InjectResult {
  readonly state: GameState;
  readonly report: InjectReport;
}

const slotCapForParty = (partyId: PartyId): number =>
  partyId === QUEEN_GUARD_PARTY_ID ? QUEEN_GUARD_SLOT_CAP : PARTY_SLOT_CAP;

/**
 * Rebuild a single `Unit` from a carried world unit. Re-seeds the
 * per-scenario MP pool (caster-eligible units only) and charisma
 * (promotable templates only); carries level / xp / promoted / the
 * carried charisma value forward. currentHp is the unit's carried HP
 * (template-max post-heal-between).
 */
const rebuildUnit = (worldUnit: WorldRoster['units'][number], tmpl: UnitTemplate): Unit => {
  const mpField = isCasterTemplate(tmpl) ? { mpSlots: INITIAL_MP_SLOTS } : {};
  // Carried charisma wins; but only promotable templates carry the
  // field at all (mirrors loadScenario's seeding rule).
  const charismaField = isPromotableTemplate(tmpl.id) ? { charisma: worldUnit.charisma } : {};
  const promotedField = worldUnit.promoted ? { promoted: true } : {};
  return {
    id: worldUnit.id,
    templateId: tmpl.id,
    currentHp: worldUnit.currentHp,
    level: worldUnit.level,
    xp: worldUnit.xp,
    ...mpField,
    ...charismaField,
    ...promotedField,
  };
};

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
): InjectResult => {
  const rebuiltParties: PartyId[] = [];
  const droppedParties: PartyId[] = [];
  const trimmedUnitIds: UnitId[] = [];
  let antUnitsPlaced = 0;

  const worldUnitById = new Map(roster.units.map((u) => [u.id, u] as const));
  const newParties = new Map<PartyId, Party>();

  // Keep every non-ant (spider / neutral) party verbatim.
  for (const [id, party] of base.parties) {
    if (party.faction !== 'ant') newParties.set(id, party);
  }

  // Rebuild ant parties from the carried assignments, in scaffold order
  // for determinism.
  for (const assignment of roster.partyAssignments) {
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
      units.push(rebuildUnit(wu, tmpl));
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
    const hadAssignment = roster.partyAssignments.some((a) => a.partyId === partyId);
    if (!hadAssignment && !droppedParties.includes(partyId)) {
      droppedParties.push(partyId);
    }
  }

  return {
    state: { ...base, parties: newParties },
    report: { rebuiltParties, droppedParties, trimmedUnitIds, antUnitsPlaced },
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
