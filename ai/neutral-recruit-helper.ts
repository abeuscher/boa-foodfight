/**
 * Round-10 shared helpers for neutral-recruit AI behavior.
 *
 * Round 9 wired a recruit-on-neutral branch into baseline.ts only,
 * which fired exactly once across 100 games (random co-location with
 * a cockroach). Round 10 spreads the same opportunistic recruit
 * pattern across every ant variant, plus an optional one-tile detour
 * that nudges the baseline toward nearby cockroaches/mice when no
 * battle is already engaged.
 *
 * Design notes:
 *
 *  - Stinkbugs are always skipped: the engine spawns a 5-tile damage
 *    zone on a failed recruit attempt against stinkbugs, which the
 *    ants would then have to walk through. Cockroaches (8 units of
 *    attack-6 / agility-7 on conversion) and mice (3 units) are both
 *    safe to attempt.
 *
 *  - Cockroaches outrank mice 2:1 by recruit value. The detour helper
 *    breaks ties in favor of cockroaches and falls back to mice only
 *    when no cockroach is in range.
 *
 *  - Neutrals already converted to ant (faction === 'ant') and those
 *    currently spider-hypnotized (engine consumes the recruit order
 *    silently) are filtered out.
 *
 *  - Co-location uses `sameCoord`. The detour radius is Chebyshev 3,
 *    same plane only — neutrals can't plane-switch so cross-plane
 *    detours are wasted moves.
 *
 *  - This file lives outside `policy-helpers.ts` because that path is
 *    locked from designer envelopes (`harness/coevo-apply.ts`
 *    `STRATEGY_LOCKED_PATHS`). Keeping the helper here lets the
 *    coevolution apply step land cleanly while still letting every
 *    variant share one implementation.
 */

import { partyHasAbility } from '../engine/abilities.ts';
import { distance, sameCoord } from '../engine/coord.ts';
import type {
  AbilityId,
  AbilityOrder,
  GameState,
  NeutralDecision,
  NeutralKind,
  Order,
  Party,
  PartyId,
  Posture,
  Rng,
  TileCoord,
  UnitTemplate,
  UnitTemplateId,
} from '../engine/types.ts';

/** Recruit ability id, branded for type safety. */
export const RECRUIT_ABILITY: AbilityId = 'recruit' as AbilityId;

/**
 * Round 11 — "decide once, commit for 5 turns" tuning. The baseline-
 * only mechanic that fixes the round-10 single-cockroach detour churn:
 * an eligible party either commits to a 5-turn pursuit OR a 5-turn
 * ignore window, with the choice gated by a 1-in-3 dice roll.
 */
export const NEUTRAL_FOLLOW_PROBABILITY = 1 / 3;
export const NEUTRAL_DECISION_DURATION = 5;
export const NEUTRAL_DETECTION_RADIUS = 3;
const ANT_SCOUT_TEMPLATE: UnitTemplateId = 'ant-scout' as UnitTemplateId;
const ANT_MAGE_TEMPLATE: UnitTemplateId = 'ant-mage' as UnitTemplateId;

/** Per-kind recruit value used by both opportunistic and detour
 * branches. Cockroaches (8 units) > mice (3 units) >> stinkbugs
 * (failure spawns a damage zone, never attempted). */
export const NEUTRAL_RECRUIT_VALUE: Readonly<Record<NeutralKind, number>> = {
  cockroaches: 2,
  mice: 1,
  stinkbugs: 0,
};

/** Chebyshev radius for the baseline detour branch. Bigger than this
 * and the detour costs too much; smaller and the detour fires too
 * rarely to matter. 3 picks up tiles that would close to co-location
 * within 1-2 turns under the engine's 1-tile-per-turn movement rule. */
export const RECRUIT_DETOUR_RADIUS = 3;

/** True iff the neutral party is a legitimate recruit candidate:
 * exists in `state.neutralStatus`, kind has positive value (rules
 * out stinkbugs), at least one living unit, and not currently
 * spider-hypnotized (the engine consumes the order silently in that
 * case so the attempt is wasted). */
const isRecruitableNeutral = (state: GameState, candidate: Party): boolean => {
  if (candidate.faction !== 'neutral') return false;
  if (candidate.units.every((u) => u.currentHp <= 0)) return false;
  const status = state.neutralStatus.get(candidate.id);
  if (!status) return false;
  if (status.hypnotizedBy === 'spider' && status.hypnoticControlRemaining > 0) return false;
  return (NEUTRAL_RECRUIT_VALUE[status.kind] ?? 0) > 0;
};

/**
 * Returns the highest-value recruitable neutral co-located with
 * `party`, or undefined if none. Tie-breaks by lex party-id for
 * determinism. The opportunistic branch every variant runs.
 */
export const findRecruitableNeutralAt = (state: GameState, party: Party): PartyId | undefined => {
  let best: { id: PartyId; value: number } | undefined;
  for (const [id, candidate] of state.parties) {
    if (!sameCoord(candidate.location, party.location)) continue;
    if (!isRecruitableNeutral(state, candidate)) continue;
    const status = state.neutralStatus.get(id);
    if (!status) continue;
    const value = NEUTRAL_RECRUIT_VALUE[status.kind] ?? 0;
    if (!best || value > best.value || (value === best.value && id < best.id)) {
      best = { id, value };
    }
  }
  return best?.id;
};

/**
 * Detour helper: returns the highest-value recruitable neutral within
 * Chebyshev `RECRUIT_DETOUR_RADIUS` of `party`, on the same plane,
 * excluding co-located ones (those are already handled by the
 * opportunistic branch). Tie-breaks: higher value first, then closer
 * (lower Chebyshev distance), then lex party-id.
 *
 * Use only when the calling variant has decided the party is not
 * already engaged in a more important task — the detour shifts the
 * party's move-to off its current plan by one tile.
 */
export const findRecruitableNeutralNear = (
  state: GameState,
  party: Party,
): { partyId: PartyId; location: TileCoord } | undefined => {
  let best: { id: PartyId; value: number; dist: number; location: TileCoord } | undefined;
  for (const [id, candidate] of state.parties) {
    if (candidate.location.plane !== party.location.plane) continue;
    if (sameCoord(candidate.location, party.location)) continue;
    const d = distance(party.location, candidate.location);
    if (d > RECRUIT_DETOUR_RADIUS) continue;
    if (!isRecruitableNeutral(state, candidate)) continue;
    const status = state.neutralStatus.get(id);
    if (!status) continue;
    const value = NEUTRAL_RECRUIT_VALUE[status.kind] ?? 0;
    const better =
      !best ||
      value > best.value ||
      (value === best.value && d < best.dist) ||
      (value === best.value && d === best.dist && id < best.id);
    if (better) best = { id, value, dist: d, location: candidate.location };
  }
  if (!best) return undefined;
  return { partyId: best.id, location: best.location };
};

/** One-tile Chebyshev step from `from` toward `target`. Used by the
 * detour branch so the party closes the gap by exactly one tile per
 * turn (engine movement rule). Plane is preserved (`findRecruitable
 * NeutralNear` already filters to same plane). */
export const stepTowardNeutral = (from: TileCoord, target: TileCoord): TileCoord => {
  const dx = Math.sign(target.x - from.x);
  const dy = Math.sign(target.y - from.y);
  return { plane: from.plane, x: from.x + dx, y: from.y + dy };
};

/** Constructs a recruit ability order. Both the opportunistic and
 * the eventual co-located fire after detour use this. */
export const recruitOrder = (target: PartyId): AbilityOrder => ({
  kind: 'use-ability',
  abilityId: RECRUIT_ABILITY,
  target,
});

/**
 * Per-variant opportunistic recruit decision. Returns the standard
 * `{ orders, posture }` shape variants emit when the party should
 * fire `recruit` this turn, or undefined when the party should fall
 * through to its main strategy. Wraps the ability-availability check
 * + co-location lookup + order construction so each variant doesn't
 * re-spell the same six-line block (which jscpd flags as a clone).
 */
export const tryOpportunisticRecruit = (
  state: GameState,
  party: Party,
): { orders: readonly Order[]; posture: Posture } | undefined => {
  if (!partyHasAbility(party, RECRUIT_ABILITY, state.unitTemplates)) return undefined;
  const target = findRecruitableNeutralAt(state, party);
  if (target === undefined) return undefined;
  return { orders: [recruitOrder(target)], posture: 'fight' };
};

/**
 * Round 11 — true iff `party` carries at least one living `ant-scout`
 * AND at least one living `ant-mage`. The eligibility filter for the
 * commit-or-abandon mechanic. By templateId rather than abilities so
 * the qualification is a structural roster property: queen-guard
 * (footman / archer / worker) and vanguard-bravo (footman / potato-bug
 * / archer / mage — no scout) are filtered out; only `pathfinders`
 * (mage + scout + archer) qualifies under the level-1 roster.
 */
export const partyHasScoutAndMage = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  let hasScout = false;
  let hasMage = false;
  for (const u of party.units) {
    if (u.currentHp <= 0) continue;
    const tmpl = templates.get(u.templateId);
    if (!tmpl) continue;
    if (tmpl.id === ANT_SCOUT_TEMPLATE) hasScout = true;
    if (tmpl.id === ANT_MAGE_TEMPLATE) hasMage = true;
    if (hasScout && hasMage) return true;
  }
  return false;
};

/**
 * Round 11 — roll a 1-in-3 dice (using the seeded RNG) to decide
 * whether the eligible party commits to pursuing the spotted neutral
 * for 5 turns or commits to ignoring all neutrals for 5 turns. The
 * dice roll is the only source of stochasticity — the commit window
 * length is fixed.
 */
export const decideNeutralFollow = (rng: Rng, neutralPartyId: PartyId): NeutralDecision => {
  if (rng.next() < NEUTRAL_FOLLOW_PROBABILITY) {
    return {
      kind: 'pursue',
      targetPartyId: neutralPartyId,
      turnsRemaining: NEUTRAL_DECISION_DURATION,
    };
  }
  return { kind: 'ignore', turnsRemaining: NEUTRAL_DECISION_DURATION };
};

/**
 * Round 11 — one-tile Chebyshev step toward the pursue target. Returns
 * `null` when the target party is gone (recruited / dead / despawned)
 * or when the party is already co-located (the opportunistic-recruit
 * branch handles co-location). The end-of-turn tick is responsible for
 * dropping a stale decision once the target disappears, but the AI
 * still tolerates a one-turn race where the decision survives a turn
 * past the target — return null and let the party fall through to its
 * main strategy that turn.
 */
export const pursueStep = (
  state: GameState,
  party: Party,
  decision: NeutralDecision,
): TileCoord | null => {
  if (decision.kind !== 'pursue') return null;
  const targetId = decision.targetPartyId;
  if (targetId === undefined) return null;
  const target = state.parties.get(targetId);
  if (!target) return null;
  if (target.leaderless) return null;
  if (!target.units.some((u) => u.currentHp > 0)) return null;
  if (target.location.plane !== party.location.plane) return null;
  if (sameCoord(target.location, party.location)) return null;
  return stepTowardNeutral(party.location, target.location);
};
