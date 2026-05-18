/**
 * Phase-B follow-up — between-scenario army-organization operators.
 *
 * Pure `WorldRoster → WorldRoster` transforms the Organize Army UI
 * binds to: move a unit between parties, swap a leader, create /
 * disband a party, equip / unequip an item, plus read accessors
 * (party slot usage, effective unit stats).
 *
 * Engine-freeze boundary (roadmap §7.6): this is the between-scenario
 * world-loop layer. It never executes inside `runScenario`, touches no
 * combat / sim path, and is validated by ordinary behavioral tests —
 * no gate-29 replay involvement. It reuses the single-source-of-truth
 * slot cap from `world-inject` (roadmap §7.5: 9 standard, 12
 * queen-guard) rather than re-declaring it.
 *
 * Every operator is pure: no RNG, no I/O, inputs never mutated. Each
 * returns a fresh roster plus an `ok` / `error` so the UI can surface
 * a rejection reason instead of failing silently. On failure the
 * input roster is returned unchanged (mirrors `world-shop`).
 */

import type { ItemId, PartyId, Stats, UnitId, UnitTemplate, UnitTemplateId } from './types.ts';
import { slotCapForParty, QUEEN_GUARD_PARTY_ID } from './world-inject.ts';
import { effectiveStats } from './world-levelup.ts';
import type { WorldPartyAssignment, WorldRoster, WorldUnit } from './world-state.ts';

export interface OrganizeResult {
  readonly roster: WorldRoster;
  /** True iff the operation applied. When false, `roster` is the input
   * unchanged and `error` explains why (suitable for a UI toast). */
  readonly ok: boolean;
  readonly error?: string;
}

export interface PartySlotUsage {
  readonly used: number;
  readonly cap: number;
  readonly free: number;
}

const fail = (roster: WorldRoster, error: string): OrganizeResult => ({
  roster,
  ok: false,
  error,
});

const done = (roster: WorldRoster): OrganizeResult => ({ roster, ok: true });

const templateMap = (templates: readonly UnitTemplate[]): Map<UnitTemplateId, UnitTemplate> =>
  new Map(templates.map((t) => [t.id, t]));

/** Slot cost of a unit. An unknown template is a data inconsistency;
 * treated defensively as 1 (mirrors `world-shop`'s defensive defaults)
 * rather than throwing inside a pure transform. */
const slotCostOf = (unit: WorldUnit, tmap: Map<UnitTemplateId, UnitTemplate>): number =>
  tmap.get(unit.templateId)?.slotCost ?? 1;

const unitById = (roster: WorldRoster, id: UnitId): WorldUnit | undefined =>
  roster.units.find((u) => u.id === id);

const isLeaderEligible = (unit: WorldUnit, tmap: Map<UnitTemplateId, UnitTemplate>): boolean =>
  tmap.get(unit.templateId)?.tags.includes('leader-eligible') ?? true;

/** Remove a unit id from every assignment. Empty assignments are
 * dropped; an assignment that loses its leader but keeps members has
 * its leader reassigned to the first remaining member (deterministic,
 * roster order). Returns the rebuilt assignment list. */
const detachUnit = (
  assignments: readonly WorldPartyAssignment[],
  unitId: UnitId,
): WorldPartyAssignment[] => {
  const next: WorldPartyAssignment[] = [];
  for (const a of assignments) {
    if (!a.unitIds.includes(unitId)) {
      next.push(a);
      continue;
    }
    const unitIds = a.unitIds.filter((id) => id !== unitId);
    const first = unitIds[0];
    if (first === undefined) continue;
    const leaderId = a.leaderId === unitId ? first : a.leaderId;
    next.push({ partyId: a.partyId, unitIds, leaderId });
  }
  return next;
};

const usedSlots = (
  assignment: WorldPartyAssignment,
  roster: WorldRoster,
  tmap: Map<UnitTemplateId, UnitTemplate>,
): number =>
  assignment.unitIds.reduce((sum, id) => {
    const u = unitById(roster, id);
    return sum + (u ? slotCostOf(u, tmap) : 0);
  }, 0);

// --- Read accessors -------------------------------------------------------

/** Slot usage for a party. A party id with no assignment reports
 * `used: 0` against its cap (useful for the UI's "can this hold X?"). */
export const partySlotUsage = (
  roster: WorldRoster,
  partyId: PartyId,
  templates: readonly UnitTemplate[],
): PartySlotUsage => {
  const cap = slotCapForParty(partyId);
  const assignment = roster.partyAssignments.find((a) => a.partyId === partyId);
  const used = assignment ? usedSlots(assignment, roster, templateMap(templates)) : 0;
  return { used, cap, free: cap - used };
};

/** A unit's final stats = template base + campaign level-up bonus.
 * `undefined` when the unit's template isn't in `templates` (the UI
 * should treat that as "stats unavailable", not zero). */
export const unitEffectiveStats = (
  unit: WorldUnit,
  templates: readonly UnitTemplate[],
): Stats | undefined => {
  const tmpl = templateMap(templates).get(unit.templateId);
  if (!tmpl) return undefined;
  return effectiveStats(tmpl.baseStats, unit);
};

// --- Mutating operators ---------------------------------------------------

/**
 * Move a unit into an existing party. The unit may be idle (in no
 * party) or in another party. To form a brand-new party use
 * `createParty`. Rejected if: unknown unit, target party doesn't
 * exist, or the move would exceed the target's slot cap. Moving a
 * unit into the party it's already in is an idempotent success.
 */
export const moveUnit = (
  roster: WorldRoster,
  unitId: UnitId,
  toPartyId: PartyId,
  templates: readonly UnitTemplate[],
): OrganizeResult => {
  const unit = unitById(roster, unitId);
  if (!unit) return fail(roster, `unknown unit '${String(unitId)}'`);
  const target = roster.partyAssignments.find((a) => a.partyId === toPartyId);
  if (!target) {
    return fail(roster, `party '${String(toPartyId)}' does not exist (use createParty)`);
  }
  if (target.unitIds.includes(unitId)) return done(roster);

  const tmap = templateMap(templates);
  if (usedSlots(target, roster, tmap) + slotCostOf(unit, tmap) > slotCapForParty(toPartyId)) {
    return fail(roster, `party '${String(toPartyId)}' is at slot capacity`);
  }

  const detached = detachUnit(roster.partyAssignments, unitId);
  const partyAssignments = detached.map((a) =>
    a.partyId === toPartyId ? { ...a, unitIds: [...a.unitIds, unitId] } : a,
  );
  return done({ ...roster, partyAssignments });
};

/**
 * Form a new party from existing units. Units already in other
 * parties are pulled out of them (composable regrouping). Rejected
 * if: party id already exists, empty/duplicate/unknown unit list,
 * leader not in the set, leader not `leader-eligible`, or the set
 * exceeds the new party's slot cap.
 */
export const createParty = (
  roster: WorldRoster,
  partyId: PartyId,
  unitIds: readonly UnitId[],
  leaderId: UnitId,
  templates: readonly UnitTemplate[],
): OrganizeResult => {
  if (roster.partyAssignments.some((a) => a.partyId === partyId)) {
    return fail(roster, `party '${String(partyId)}' already exists`);
  }
  if (unitIds.length === 0) return fail(roster, 'cannot create an empty party');
  if (new Set(unitIds).size !== unitIds.length) {
    return fail(roster, 'duplicate unit ids in party');
  }
  const units = unitIds.map((id) => unitById(roster, id));
  if (units.some((u) => u === undefined)) {
    return fail(roster, 'party references an unknown unit');
  }
  if (!unitIds.includes(leaderId)) {
    return fail(roster, 'leader must be a member of the party');
  }
  const tmap = templateMap(templates);
  const leader = unitById(roster, leaderId);
  if (leader && !isLeaderEligible(leader, tmap)) {
    return fail(roster, `unit '${String(leaderId)}' is not leader-eligible`);
  }
  const total = (units as WorldUnit[]).reduce((s, u) => s + slotCostOf(u, tmap), 0);
  if (total > slotCapForParty(partyId)) {
    return fail(roster, `party '${String(partyId)}' would exceed slot capacity`);
  }

  let partyAssignments: WorldPartyAssignment[] = [...roster.partyAssignments];
  for (const id of unitIds) partyAssignments = detachUnit(partyAssignments, id);
  partyAssignments.push({ partyId, unitIds: [...unitIds], leaderId });
  return done({ ...roster, partyAssignments });
};

/**
 * Disband a party. Its units stay in the roster pool (become idle —
 * still in `roster.units`, in no assignment). The queen-guard party is
 * structural (the immobile queen's home) and cannot be disbanded.
 */
export const disbandParty = (roster: WorldRoster, partyId: PartyId): OrganizeResult => {
  if (!roster.partyAssignments.some((a) => a.partyId === partyId)) {
    return fail(roster, `party '${String(partyId)}' does not exist`);
  }
  if (partyId === QUEEN_GUARD_PARTY_ID) {
    return fail(roster, 'the queen-guard party cannot be disbanded');
  }
  return done({
    ...roster,
    partyAssignments: roster.partyAssignments.filter((a) => a.partyId !== partyId),
  });
};

/**
 * Promote a different party member to leader. Rejected if the party
 * doesn't exist, the unit isn't in it, or the unit isn't
 * `leader-eligible`.
 */
export const swapLeader = (
  roster: WorldRoster,
  partyId: PartyId,
  newLeaderId: UnitId,
  templates: readonly UnitTemplate[],
): OrganizeResult => {
  const assignment = roster.partyAssignments.find((a) => a.partyId === partyId);
  if (!assignment) return fail(roster, `party '${String(partyId)}' does not exist`);
  if (!assignment.unitIds.includes(newLeaderId)) {
    return fail(roster, `unit '${String(newLeaderId)}' is not in party '${String(partyId)}'`);
  }
  const leader = unitById(roster, newLeaderId);
  if (leader && !isLeaderEligible(leader, templateMap(templates))) {
    return fail(roster, `unit '${String(newLeaderId)}' is not leader-eligible`);
  }
  return done({
    ...roster,
    partyAssignments: roster.partyAssignments.map((a) =>
      a.partyId === partyId ? { ...a, leaderId: newLeaderId } : a,
    ),
  });
};

/**
 * Equip (or, with `null`, clear) a unit's persistent item. One item
 * per unit by construction (single field). Rejected only for an
 * unknown unit.
 */
export const equipItem = (
  roster: WorldRoster,
  unitId: UnitId,
  itemId: ItemId | null,
): OrganizeResult => {
  if (!unitById(roster, unitId)) return fail(roster, `unknown unit '${String(unitId)}'`);
  return done({
    ...roster,
    units: roster.units.map((u) => (u.id === unitId ? { ...u, item: itemId } : u)),
  });
};
