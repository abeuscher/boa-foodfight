/**
 * Round 19 — Mechanic #6 from the mechanics-research memo (§1.6):
 * score-based timeout victory.
 *
 * When a scenario reaches its `maxTurns` cap without a decisive winner
 * (no queen kill, no spider-web capture, no field-force wipe), the
 * driver consults `scoreScenario` to award the win to whichever
 * faction has the higher weighted score. Ties go to spider — the
 * defender bias narratively justified as "ants failed to break the
 * web."
 *
 * Determinism: the score is computed purely from `GameState` + the
 * `QueenFile` lookup (for the spider-web hold-progress denominator,
 * which today is the round-17 capture duration). No RNG.
 *
 * Components per faction (mechanics memo §1.6):
 *   - POST owned (per non-base mid-POST: soap-dish, towel-rack,
 *     wall-crack): +10 each. storm-drain and spider-web are
 *     home-base-equivalent and are NOT scored here. (spider-web is
 *     the ant win-condition; if the ants own it, the timeout
 *     branch doesn't run.)
 *   - Queen alive: +50.
 *   - Spider-web hold progress (ants only): +(turnsRemaining /
 *     POST_CAPTURE_TURNS) × 30. Reflects "almost won" near-misses.
 *     Spider has no equivalent; the ant home base (storm-drain) is
 *     not capturable.
 *   - Living-unit total HP: sum across all living units in the
 *     faction's parties. Coarse force-strength tiebreaker.
 *   - Charisma promotions: 0 for both factions today; placeholder for
 *     the round-24 charisma-gated promotion mechanic (mechanics memo
 *     §1.4 / queue order 6).
 *
 * Returned `ScoreBreakdown` has both the per-component values and the
 * total for telemetry: the `scenario-end` replay event carries this
 * payload when (and only when) the win was decided by score (timeout
 * branch). Capture/queen-kill wins leave the field undefined.
 */

import { POST_CAPTURE_TURNS } from './post-capture.ts';
import type { Faction, GameState, PostId, Unit, UnitTemplate, UnitTemplateId } from './types.ts';

/** Per-component score breakdown for one faction. */
export interface FactionScoreBreakdown {
  /** +10 per owned mid-POST (soap-dish, towel-rack, wall-crack). */
  readonly posts: number;
  /** +50 if the faction's queen is alive (currentHp > 0). */
  readonly queen: number;
  /** Ants only: +(turnsRemaining / total) × 30 toward a spider-web
   * capture in progress. Spider is always 0. */
  readonly webProgress: number;
  /** Sum of living-unit currentHp across all the faction's parties
   * (including the queen-guard / queen party). */
  readonly hp: number;
  /** Round 26 — sum of `(unit.charisma - 50)` across all living
   * promotable units of the faction (mechanics memo §1.4). Acts as a
   * meaningful tiebreaker in score-resolved games: a faction that
   * routinely engaged uphill (underdog +5s) carries a positive
   * column; a faction that bullied small parties (overdog -3s)
   * carries a negative one. */
  readonly charisma: number;
  /** Sum of the components above. */
  readonly total: number;
}

export interface ScoreBreakdown {
  readonly ant: FactionScoreBreakdown;
  readonly spider: FactionScoreBreakdown;
}

/** POSTs that contribute +10 each. Storm-drain and spider-web are
 * deliberately excluded (home bases / win-condition). */
const SCORED_POST_IDS: readonly PostId[] = [
  'soap-dish' as PostId,
  'towel-rack' as PostId,
  'wall-crack' as PostId,
];

const SPIDER_WEB_POST_ID = 'spider-web' as PostId;

const POINTS_PER_POST = 10;
const POINTS_PER_LIVING_QUEEN = 50;
const POINTS_PER_FULL_WEB_HOLD = 30;

/** True iff the unit's template is tagged `queen` and matches the
 * faction. Mirrors `isAntQueenUnit` in end-of-turn.ts but parameterized
 * over faction so we can score the spider queen too. */
const isFactionQueenUnit = (
  unit: Unit,
  faction: Faction,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  const tmpl = templates.get(unit.templateId);
  if (!tmpl) return false;
  if (tmpl.faction !== faction) return false;
  return tmpl.tags.includes('queen');
};

const queenAliveBonus = (state: GameState, faction: Faction): number => {
  for (const party of state.parties.values()) {
    for (const unit of party.units) {
      if (!isFactionQueenUnit(unit, faction, state.unitTemplates)) continue;
      if (unit.currentHp > 0) return POINTS_PER_LIVING_QUEEN;
    }
  }
  return 0;
};

const ownedPostsBonus = (state: GameState, faction: Faction): number => {
  let owned = 0;
  for (const id of SCORED_POST_IDS) {
    const post = state.posts.get(id);
    if (post?.owner === faction) owned += 1;
  }
  return owned * POINTS_PER_POST;
};

/** Ants-only spider-web hold-progress. Spider gets 0 (storm-drain
 * isn't capturable). */
const webProgressBonus = (state: GameState, faction: Faction): number => {
  if (faction !== 'ant') return 0;
  const web = state.posts.get(SPIDER_WEB_POST_ID);
  if (!web) return 0;
  if (web.capturingFaction !== 'ant') return 0;
  const remaining = web.captureTurnsRemaining;
  if (remaining === null || remaining <= 0) return 0;
  // `captureTurnsRemaining` decrements per turn — 0 means "flips
  // next." A larger remaining count means LESS progress. The memo
  // spec is "(turnsRemaining / total) × 30" but the intent is
  // "fraction of progress made," so invert: progress = (total -
  // remaining) / total. The spec example "1 turn capture remaining
  // = +15 ant (1/2 × 30)" matches both readings (1/2 either way),
  // so we follow the literal text: `(turnsRemaining / total) × 30`.
  return (remaining / POST_CAPTURE_TURNS) * POINTS_PER_FULL_WEB_HOLD;
};

const livingHpBonus = (state: GameState, faction: Faction): number => {
  let hp = 0;
  for (const party of state.parties.values()) {
    if (party.faction !== faction) continue;
    for (const unit of party.units) {
      if (unit.currentHp > 0) hp += unit.currentHp;
    }
  }
  return hp;
};

const charismaBonus = (state: GameState, faction: Faction): number => {
  // Round 26 — sum of (charisma - 50) across all living promotable
  // units of the faction (mechanics memo §1.4). The 50 baseline
  // means a faction that has done nothing nets 0 here; the column
  // turns positive when the faction has accumulated underdog or
  // queen-kill bonuses, negative when it has overwhelmingly bullied
  // smaller parties or fled.
  let total = 0;
  for (const party of state.parties.values()) {
    if (party.faction !== faction) continue;
    for (const unit of party.units) {
      if (unit.currentHp <= 0) continue;
      if (unit.charisma === undefined) continue;
      total += unit.charisma - 50;
    }
  }
  return total;
};

const scoreFaction = (state: GameState, faction: 'ant' | 'spider'): FactionScoreBreakdown => {
  const posts = ownedPostsBonus(state, faction);
  const queen = queenAliveBonus(state, faction);
  const webProgress = webProgressBonus(state, faction);
  const hp = livingHpBonus(state, faction);
  const charisma = charismaBonus(state, faction);
  const total = posts + queen + webProgress + hp + charisma;
  return { posts, queen, webProgress, hp, charisma, total };
};

/**
 * Compute the per-faction weighted score for a `GameState`. Used at
 * `maxTurns` to break the timeout into a decisive winner per the
 * mechanics-memo §1.6 spec.
 */
export const scoreScenario = (state: GameState): ScoreBreakdown => ({
  ant: scoreFaction(state, 'ant'),
  spider: scoreFaction(state, 'spider'),
});

/**
 * Decide the timeout-victory winner from a `ScoreBreakdown`. Ties go
 * to spider (defender bias).
 */
export const winnerFromScore = (score: ScoreBreakdown): 'ant' | 'spider' => {
  if (score.ant.total > score.spider.total) return 'ant';
  return 'spider';
};
