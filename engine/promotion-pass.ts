/**
 * Shared promotion-pass machinery, used by both:
 *
 *   - `engine/charisma.ts` `applyCharismaPromotions` — charisma ≥ 70 +
 *     on-home-base "report to camp" promotions.
 *   - `engine/behavior-promotion.ts` `applyBehaviorPromotions` — L1
 *     iteration #9 field promotions gated on party Aggression.
 *
 * The two paths differ only in the per-party gate (home-post vs.
 * aggression threshold) and the per-unit eligibility check; the
 * iteration / event emission / state-merge shape is identical, so it
 * lives here. Extracted to keep both call sites readable and to avoid
 * the jscpd duplication these two paths previously triggered.
 */

import { PROMOTION_TREE, promoteUnit } from './charisma.ts';
import type { GameState, Party, PartyId, ReplayEvent, Unit, UnitId } from './types.ts';

export interface PromotionPassOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

export interface PromotionPassPredicates {
  /** True iff this party participates in the promotion pass at all. */
  readonly partyGate: (party: Party, state: GameState) => boolean;
  /** True iff this unit is eligible inside a participating party. */
  readonly unitEligible: (unit: Unit) => boolean;
}

/**
 * Run a promotion pass over every party in `state`. Parties failing
 * `partyGate` are passed through; participating parties have their
 * units sorted by id (deterministic), each eligible unit on
 * `PROMOTION_TREE` is promoted in-place, and one `unit-promoted` event
 * is emitted per swap. Returns the input state by reference when
 * nothing changes — important for the gated-inert pattern.
 */
export const runPromotionPass = (
  state: GameState,
  turn: number,
  tick: () => number,
  predicates: PromotionPassPredicates,
): PromotionPassOutcome => {
  const events: ReplayEvent[] = [];
  let changedAny = false;
  const newParties = new Map<PartyId, Party>();
  for (const [id, party] of state.parties) {
    if (!predicates.partyGate(party, state)) {
      newParties.set(id, party);
      continue;
    }
    const sortedUnits = [...party.units].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const idToPromoted = new Map<UnitId, Unit>();
    for (const u of sortedUnits) {
      if (!predicates.unitEligible(u)) continue;
      const toTemplateId = PROMOTION_TREE.get(u.templateId);
      if (!toTemplateId) continue;
      const toTemplate = state.unitTemplates.get(toTemplateId);
      if (!toTemplate) continue;
      idToPromoted.set(u.id, promoteUnit(u, toTemplate));
      events.push({
        kind: 'unit-promoted',
        turn,
        tick: tick(),
        partyId: party.id,
        unitId: u.id,
        fromTemplate: u.templateId,
        toTemplate: toTemplate.id,
      });
    }
    if (idToPromoted.size > 0) {
      const newUnits = party.units.map((u) => idToPromoted.get(u.id) ?? u);
      newParties.set(id, { ...party, units: newUnits });
      changedAny = true;
    } else {
      newParties.set(id, party);
    }
  }
  if (!changedAny) return { state, events };
  return { state: { ...state, parties: newParties }, events };
};
