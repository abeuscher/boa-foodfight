/**
 * Phase B (B3) — between-scenario level-up application.
 *
 * Converts accumulated XP into levels + stat growth. Runs in the world
 * loop after extraction, before the next scenario is injected. The
 * scenario engine never level-ups mid-scenario — leveling is a
 * world-loop concern (game-outline "Experience and leveling": "Level-ups
 * are processed in the world loop between scenarios").
 *
 * ## Level curve (documented + deterministic)
 *
 * Triangular cumulative cost:
 *
 *     xpForLevel(n) = 100 * (n - 1) * n / 2
 *
 * So the *total* XP required to be level `n` is:
 *
 *     L1 = 0, L2 = 100, L3 = 300, L4 = 600, L5 = 1000, ...
 *
 * (The per-level step grows by 100 each level: 100, 200, 300, ...). A
 * unit's level is the highest `n` whose threshold its XP meets. A unit
 * can gain multiple levels at once if it banked a lot of XP.
 *
 * ## Stat growth (documented + deterministic)
 *
 * Every level gained grants `+2 HP`. In addition, `+1` to the unit's
 * *primary* stat, chosen by template tag (first match wins):
 *
 *   - `caster` / intelligence-tagged → +1 intelligence
 *   - `archer` / ranged → +1 agility
 *   - `melee` / infantry / default → +1 attack
 *
 * Stat growth is tracked as a per-unit `levelUpBonus` delta that
 * `engine/world-inject` folds onto the template base stats when it
 * rebuilds the next scenario's parties. We do NOT mutate
 * `UnitTemplate` (templates are shared, immutable scenario data) — the
 * bonus rides on the world unit so two units of the same template can
 * have diverged.
 *
 * Determinism: pure integer math; no RNG, no I/O. (The campaign
 * `rngSeed` is reserved for `world-shop`; level-ups are fully
 * deterministic from XP so no seed is consumed here.)
 *
 * Imports allowed: `engine/types`, `engine/world-state`.
 */

import type { Stats, UnitTemplate, UnitTemplateId } from './types.ts';
import type { WorldLevelUpBonus, WorldRoster, WorldUnit } from './world-state.ts';

/** HP granted per level gained. */
export const HP_PER_LEVEL = 2;
/** Primary-stat points granted per level gained. */
export const PRIMARY_STAT_PER_LEVEL = 1;
/** Per-level XP step coefficient (triangular). */
const XP_STEP = 100;

/**
 * Total XP required to *be* level `n` (cumulative). Level 1 is free
 * (threshold 0). Triangular: 0, 100, 300, 600, 1000, ...
 */
export const xpForLevel = (n: number): number => {
  if (n <= 1) return 0;
  return (XP_STEP * (n - 1) * n) / 2;
};

/**
 * The level a unit with `xp` total XP should be at. Walks the
 * triangular curve until the next threshold exceeds `xp`. Bounded by a
 * sane cap so a corrupt huge XP value can't loop unbounded.
 */
export const levelForXp = (xp: number): number => {
  let level = 1;
  // 99 is far beyond any Tier-1 reachable level; acts as a guard rail.
  while (level < 99 && xp >= xpForLevel(level + 1)) level += 1;
  return level;
};

/**
 * Per-unit additive stat bonus accumulated from level-ups across the
 * campaign. The shape lives in `engine/world-state.ts`
 * (`WorldLevelUpBonus`) so it is serializable without a circular
 * import; re-exported here as the level-up subsystem's public name.
 */
export type LevelUpBonus = WorldLevelUpBonus;

const ZERO_BONUS: LevelUpBonus = { hp: 0, attack: 0, agility: 0, intelligence: 0 };

/**
 * Phase-B-followup — the per-`Unit` combat stat delta shape (engine
 * `Unit.levelBonus`). Superset of `WorldLevelUpBonus`: adds an `armor`
 * lane so the additive combat offset has the same five dimensions as
 * the other lanes (the level curve never grants armor, so it stays 0,
 * but the field exists for completeness / future tuning).
 */
export interface CombatLevelBonus {
  readonly attack: number;
  readonly armor: number;
  readonly hp: number;
  readonly agility: number;
  readonly intelligence: number;
}

export const ZERO_COMBAT_LEVEL_BONUS: CombatLevelBonus = {
  attack: 0,
  armor: 0,
  hp: 0,
  agility: 0,
  intelligence: 0,
};

/** Which stat a template's level-ups pour into (first tag match wins). */
export type PrimaryStat = 'attack' | 'agility' | 'intelligence';

export const primaryStatForTemplate = (tmpl: UnitTemplate | undefined): PrimaryStat => {
  if (!tmpl) return 'attack';
  const tags = tmpl.tags;
  if (tags.includes('caster') || tmpl.baseStats.intelligence >= 5) return 'intelligence';
  if (tags.includes('archer') || tags.includes('ranged') || tags.includes('scout')) {
    return 'agility';
  }
  return 'attack';
};

/**
 * The stat growth from gaining `levelsGained` levels with `primary` as
 * the template's primary stat. Every level grants `+HP_PER_LEVEL` hp
 * plus `+PRIMARY_STAT_PER_LEVEL` to the primary stat. Sole owner of the
 * per-level growth math — `applyLevelUp` (XP-driven, accumulating onto a
 * prior bonus) and `cumulativeLevelBonus` (level-driven, from scratch)
 * both delegate here so the curve lives in exactly one place.
 */
const growthForLevels = (levelsGained: number, primary: PrimaryStat): LevelUpBonus => {
  const g = Math.max(0, levelsGained);
  const primaryGrant = g * PRIMARY_STAT_PER_LEVEL;
  return {
    hp: g * HP_PER_LEVEL,
    attack: primary === 'attack' ? primaryGrant : 0,
    agility: primary === 'agility' ? primaryGrant : 0,
    intelligence: primary === 'intelligence' ? primaryGrant : 0,
  };
};

/**
 * Phase-B-followup — the cumulative per-`Unit` combat bonus for a unit
 * that is currently `level`. Pure function of `level` + template
 * primary stat (level 1 → zero bonus; deterministic). Reuses the single
 * `growthForLevels` curve owner so the combat-side delta can never
 * diverge from the XP-side accumulation. Returns the all-zero bonus for
 * level ≤ 1 so a never-leveled unit is a strict no-op in combat.
 */
export const cumulativeLevelBonus = (
  level: number,
  tmpl: UnitTemplate | undefined,
): CombatLevelBonus => {
  if (level <= 1) return ZERO_COMBAT_LEVEL_BONUS;
  const growth = growthForLevels(level - 1, primaryStatForTemplate(tmpl));
  return {
    attack: growth.attack,
    armor: 0,
    hp: growth.hp,
    agility: growth.agility,
    intelligence: growth.intelligence,
  };
};

/** A `WorldUnit` after a level-up pass — `levelUpBonus` is now set. */
export type LeveledWorldUnit = WorldUnit & { readonly levelUpBonus: LevelUpBonus };

export interface LevelUpResult {
  readonly unit: LeveledWorldUnit;
  readonly levelsGained: number;
}

/**
 * Apply XP → level for a single world unit. Recomputes the unit's level
 * from its total XP, accumulates the per-level stat growth onto the
 * (possibly pre-existing) `levelUpBonus`, and re-heals `currentHp` to
 * the new effective max (template hp + bonus hp) — units are at the
 * home base, fully rested (decision (a)).
 */
export const applyLevelUp = (
  unit: WorldUnit,
  tmpl: UnitTemplate | undefined,
  templateMaxHp: number,
): LevelUpResult => {
  const prior = unit.levelUpBonus ?? ZERO_BONUS;
  const newLevel = levelForXp(unit.xp);
  const levelsGained = Math.max(0, newLevel - unit.level);
  if (levelsGained === 0) {
    const healed = templateMaxHp + prior.hp;
    return {
      unit: { ...unit, currentHp: healed, levelUpBonus: prior },
      levelsGained: 0,
    };
  }
  const growth = growthForLevels(levelsGained, primaryStatForTemplate(tmpl));
  const bonus: LevelUpBonus = {
    hp: prior.hp + growth.hp,
    attack: prior.attack + growth.attack,
    agility: prior.agility + growth.agility,
    intelligence: prior.intelligence + growth.intelligence,
  };
  return {
    unit: {
      ...unit,
      level: newLevel,
      currentHp: templateMaxHp + bonus.hp,
      levelUpBonus: bonus,
    },
    levelsGained,
  };
};

export interface RosterLevelUpOutcome {
  readonly roster: WorldRoster;
  /** Total levels gained across the whole roster (for the summary). */
  readonly totalLevelsGained: number;
  /** Number of distinct units that gained at least one level. */
  readonly unitsLeveled: number;
}

/**
 * Apply level-ups across an entire roster. `templates` is the scenario
 * template map (any scenario's — base stats are stable across the
 * stub-L2 milestone). Deterministic in roster order.
 */
export const applyRosterLevelUps = (
  roster: WorldRoster,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): RosterLevelUpOutcome => {
  let totalLevelsGained = 0;
  let unitsLeveled = 0;
  const units = roster.units.map((u) => {
    const tmpl = templates.get(u.templateId);
    const maxHp = tmpl ? tmpl.baseStats.hp : u.currentHp;
    const result = applyLevelUp(u, tmpl, maxHp);
    if (result.levelsGained > 0) {
      totalLevelsGained += result.levelsGained;
      unitsLeveled += 1;
    }
    return result.unit;
  });
  return {
    roster: { ...roster, units },
    totalLevelsGained,
    unitsLeveled,
  };
};

/**
 * Fold a unit's `levelUpBonus` onto a template's base stats. Used by
 * `world-inject` to produce the next scenario's effective unit stats.
 * Returns the base stats unchanged when the unit has no recorded bonus.
 */
export const effectiveStats = (base: Stats, unit: WorldUnit): Stats => {
  const bonus = unit.levelUpBonus;
  if (!bonus) return base;
  return {
    ...base,
    hp: base.hp + bonus.hp,
    attack: base.attack + bonus.attack,
    agility: base.agility + bonus.agility,
    intelligence: base.intelligence + bonus.intelligence,
  };
};
