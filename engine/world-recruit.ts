/**
 * Roadmap §7.10 — Anthill recruit operator.
 *
 * Distinct system from the Grasshopper shop (`engine/world-shop.ts`):
 * Recruit (nursery, new units) vs. Shop (trader, items) are two
 * separate things — kept in separate modules to keep that boundary
 * explicit. World-loop layer, ungated per §7.6: runs *between*
 * scenarios, never inside `runScenario`, touches no combat / sim
 * path. Pure: no I/O; the recruited unit's id is derived
 * deterministically from the campaign `rngSeed` + roster size
 * (mirrors `applyShopPurchase`) so save/resume reproduces.
 *
 * The recruit catalog (`data/level-N/recruits.json`, schema
 * `engine/schemas/recruits.ts`) is the authoritative source of the
 * recruitable set + cost + per-scenario availability; it is passed
 * in (the operator does not load files).
 *
 * Recruit arrival level (Exchange #6 / §7.10 design ruling): the
 * **median level across the full roster** (deployed + barracks alike,
 * no filter), **minus one**, **clamped to a level-1 minimum**. Even
 * counts use the lower median (deterministic integer; no rounding).
 * Because the median spans the whole roster including barracks-bound
 * units, rapid mass-recruiting drags the median down so later
 * recruits arrive weaker — an intentional soft-cap (human-ruled).
 */

import { INITIAL_CHARISMA, isPromotableTemplate } from './charisma.ts';
import { createRng } from './rng.ts';
import type { RecruitsFile } from './schemas/recruits.ts';
import type { UnitId, UnitTemplate, UnitTemplateId } from './types.ts';
import { cumulativeLevelBonus } from './world-levelup.ts';
import type { WorldRoster, WorldState, WorldUnit } from './world-state.ts';

export interface RecruitResult {
  readonly state: WorldState;
  /** True iff the recruit applied. When false, `state` is the input
   * unchanged and `error` explains why (UI-surfaceable). */
  readonly ok: boolean;
  readonly error?: string;
  readonly recruitedUnitId?: UnitId;
}

/**
 * Recruit arrival level: lower-median roster level − 1, floored at 1.
 * Empty roster ⇒ level 1. Exported for the UI preview ("Recruits at
 * level: N") so the list shows the true buy, not a base-stat preview.
 */
export const recruitArrivalLevel = (roster: WorldRoster): number => {
  if (roster.units.length === 0) return 1;
  const levels = roster.units.map((u) => u.level).sort((a, b) => a - b);
  const mid = levels[Math.floor((levels.length - 1) / 2)];
  const median = mid ?? 1;
  return Math.max(1, median - 1);
};

export const recruitUnit = (
  state: WorldState,
  templateId: UnitTemplateId,
  catalog: RecruitsFile,
  templates: readonly UnitTemplate[],
): RecruitResult => {
  const entry = catalog.recruits.find((r) => r.templateId === templateId);
  if (!entry) {
    return { state, ok: false, error: `'${String(templateId)}' is not recruitable here` };
  }
  const tmpl = templates.find((t) => t.id === templateId);
  if (!tmpl) {
    return { state, ok: false, error: `unknown template '${String(templateId)}'` };
  }
  if (state.gold < entry.cost) {
    return { state, ok: false, error: 'insufficient gold' };
  }

  const level = recruitArrivalLevel(state.roster);
  const rng = createRng(state.rngSeed).fork(`anthill-recruit-${String(state.roster.units.length)}`);
  const tag = rng.int(1_000_000);
  const recruitedUnitId = `recruit-${String(tag).padStart(6, '0')}-${String(templateId)}` as UnitId;

  // Level ≤ 1 ⇒ cumulativeLevelBonus is all-zero; omit levelUpBonus so
  // a level-1 recruit's save stays byte-identical to the flat-state
  // (pre-scaling) shape — same discipline as never-leveled units.
  const cb = cumulativeLevelBonus(level, tmpl);
  const leveled =
    level > 1
      ? {
          levelUpBonus: {
            hp: cb.hp,
            attack: cb.attack,
            agility: cb.agility,
            intelligence: cb.intelligence,
          },
        }
      : {};

  const newUnit: WorldUnit = {
    id: recruitedUnitId,
    templateId,
    // Bought fresh at full effective HP (rested at the home base).
    currentHp: tmpl.baseStats.hp + cb.hp,
    level,
    xp: 0,
    // Same rule loadScenario uses: charisma only on promotable
    // templates (queens / specialty / neutrals can't promote).
    charisma: isPromotableTemplate(templateId) ? INITIAL_CHARISMA : 0,
    promoted: false,
    item: null,
    ...leveled,
  };

  const roster: WorldRoster = {
    ...state.roster,
    units: [...state.roster.units, newUnit],
  };
  return {
    state: { ...state, gold: state.gold - entry.cost, roster },
    ok: true,
    recruitedUnitId,
  };
};
