/**
 * L1-iteration #9 — behavior-gated promotions.
 *
 * A "field promotion" path that runs alongside the round-26 charisma-
 * gated path. Where charisma requires the unit to return to home base
 * + charisma ≥ 70, behavior gating uses the per-party Aggression /
 * Discipline accrual shipped in #8: a party that has *earned* enough
 * Aggression (≥ AGGRESSION_PROMOTION_THRESHOLD) promotes any of its
 * units whose template is on `PROMOTION_TREE`, in place, without the
 * home-base detour. The OB-extract framing — "earned through play, not
 * paperwork" — is what makes this distinct from charisma's "report
 * back to base" model.
 *
 * Mutually idempotent with the charisma path: both consult the
 * existing `Unit.promoted` flag, so a unit promoted by either route is
 * a no-op for the other. The PROMOTION_TREE itself is shared with
 * charisma — the candidate doc deliberately keeps the *destination*
 * template set the same; only the *trigger* differs. Both call sites
 * share `runPromotionPass` so the iteration / event / state-merge
 * shape can't drift.
 */

import { PROMOTION_TREE } from './charisma.ts';
import { runPromotionPass } from './promotion-pass.ts';
import type { GameState, ReplayEvent, Unit } from './types.ts';

/**
 * Aggression floor at which a party's eligible units field-promote.
 * Tuned against the Chunk-5b accrual rate (+1 per battle, ant side):
 * 30 ≈ a player who's been actively engaging through the mid-game.
 * Single-step, hard threshold (no decay re-eligibility — `promoted`
 * is set on first fire).
 */
export const AGGRESSION_PROMOTION_THRESHOLD = 30;

export interface BehaviorPromotionOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

const isBehaviorEligible = (unit: Unit): boolean => {
  if (unit.currentHp <= 0) return false;
  if (unit.promoted === true) return false;
  return PROMOTION_TREE.has(unit.templateId);
};

export const applyBehaviorPromotions = (
  state: GameState,
  turn: number,
  tick: () => number,
): BehaviorPromotionOutcome =>
  runPromotionPass(state, turn, tick, {
    partyGate: (party) => (party.aggression ?? 0) >= AGGRESSION_PROMOTION_THRESHOLD,
    unitEligible: isBehaviorEligible,
  });
