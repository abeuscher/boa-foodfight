/**
 * Phase B — minimal shop / recruit hook (deliberately NOT over-built).
 *
 * The Phase-B exit criteria only strictly require roster/gold/XP
 * carryover + auto-save. The roadmap lists shop + recruit under "Work"
 * but the milestone is not blocked on a full shop UI (roadmap §6.5: the
 * full multi-item shop / party-rearrangement UI is a Phase-B follow-up).
 * This module is the minimum that makes the data path exist + be tested:
 * a single `applyShopPurchase` that recruits one mercenary unit.
 *
 * One unit type is available: `mouse-merc` (game-outline "Shops": "one
 * mouse mercenary available at high cost" — price 500, matching
 * `data/level-1/shop.json`). The world-loop runner calls this ONCE
 * between the two scenarios if gold >= cost, as a smoke test of the
 * recruit plumbing.
 *
 * Determinism: the new unit's id is derived from the campaign `rngSeed`
 * + the current roster size, so the recruit is reproducible on resume.
 * No `Math.random`, no I/O.
 *
 * Imports allowed: `engine/types`, `engine/world-state`, `engine/rng`.
 */

import { createRng } from './rng.ts';
import type { PartyId, UnitId, UnitTemplateId } from './types.ts';
import type { WorldRoster, WorldState } from './world-state.ts';

/** The only recruit available at the L1 grasshopper shoebox. */
export const MOUSE_MERC_TEMPLATE = 'mouse-merc' as UnitTemplateId;
/** Cost in gold (matches `data/level-1/shop.json` mouse-merc price). */
export const MOUSE_MERC_COST = 500;
/** mouse-merc template HP (matches `data/level-1/units.json`). */
const MOUSE_MERC_HP = 25;
/** Party id the recruited mercenary is placed into. */
export const MERC_PARTY_ID = 'mercenaries' as PartyId;

export interface RecruitPurchase {
  readonly kind: 'recruit';
  readonly templateId: UnitTemplateId;
  readonly cost: number;
}

export type ShopPurchase = RecruitPurchase;

export interface ShopPurchaseResult {
  readonly state: WorldState;
  /** True iff the purchase actually applied (enough gold, known kind). */
  readonly applied: boolean;
  /** The recruited unit id, when a recruit applied. */
  readonly recruitedUnitId?: UnitId;
}

/**
 * Apply a single shop purchase to a `WorldState`. Currently supports
 * the `recruit` kind only. On success: deducts `cost` gold, appends a
 * fresh full-HP `WorldUnit` to the roster, and adds it to (or creates)
 * the `mercenaries` party assignment. If the world state can't afford
 * the purchase, returns the state unchanged with `applied: false` (the
 * runner treats this as "skip the smoke test this campaign").
 *
 * The recruited unit id is deterministic: it folds the campaign
 * `rngSeed` and the current roster size through the seeded RNG so a
 * resumed campaign that re-runs the purchase produces the same id.
 */
export const applyShopPurchase = (ws: WorldState, purchase: ShopPurchase): ShopPurchaseResult => {
  if (purchase.kind !== 'recruit') return { state: ws, applied: false };
  if (ws.gold < purchase.cost) return { state: ws, applied: false };

  const rng = createRng(ws.rngSeed).fork(`shop-recruit-${String(ws.roster.units.length)}`);
  const tag = rng.int(1_000_000);
  const recruitedUnitId = `merc-${String(tag).padStart(6, '0')}-${String(
    purchase.templateId,
  )}` as UnitId;

  const newUnit = {
    id: recruitedUnitId,
    templateId: purchase.templateId,
    // Recruits are bought fresh at full HP. mouse-merc max HP is known
    // statically; an unknown template would default to 1 (defensive).
    currentHp: purchase.templateId === MOUSE_MERC_TEMPLATE ? MOUSE_MERC_HP : 1,
    level: 1,
    xp: 0,
    // mouse-merc is a specialty/mercenary template — not on the
    // promotion track, so charisma is 0 (mirrors loadScenario's rule
    // of not seeding charisma onto non-promotable templates).
    charisma: 0,
    promoted: false,
    item: null,
  };

  const units = [...ws.roster.units, newUnit];
  const existing = ws.roster.partyAssignments.find((a) => a.partyId === MERC_PARTY_ID);
  const partyAssignments = existing
    ? ws.roster.partyAssignments.map((a) =>
        a.partyId === MERC_PARTY_ID ? { ...a, unitIds: [...a.unitIds, recruitedUnitId] } : a,
      )
    : [
        ...ws.roster.partyAssignments,
        {
          partyId: MERC_PARTY_ID,
          unitIds: [recruitedUnitId],
          leaderId: recruitedUnitId,
        },
      ];

  const roster: WorldRoster = {
    faction: 'ant',
    units,
    partyAssignments,
  };
  return {
    state: { ...ws, gold: ws.gold - purchase.cost, roster },
    applied: true,
    recruitedUnitId,
  };
};
