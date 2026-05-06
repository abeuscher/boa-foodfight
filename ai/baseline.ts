/**
 * Baseline player AI — the "locked reference" the spec calls for.
 *
 * This policy is held fixed forever. All Phase 4 tuning (enemy pattern,
 * starting circumstances, battlefield, scenario goals) is measured AGAINST
 * this AI's win rate. If this policy changes, the win-rate target
 * (65–80%) becomes meaningless.
 *
 * Strategy: "soap-dish staging."
 *   1. Capture soap-dish (mid-floor, contestable).
 *   2. Capture towel-rack (floor, paired with wall-crack).
 *   3. Step through the pair to capture wall-crack on the wall plane.
 *   4. Push to spider-web on the ceiling and capture it for victory.
 *
 * Field parties chase the current stage target. The Queen's home guard
 * holds at the storm-drain (the Queen is immobile per spec anyway).
 */

import { sameCoord } from '../engine/coord.ts';
import type { ScenarioData } from '../engine/state.ts';
import type {
  Faction,
  GameState,
  MoveOrder,
  Order,
  Party,
  PartyId,
  Post,
  Rng,
} from '../engine/types.ts';

import { nextStageTarget, SPIDER_WEB } from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

const FACTION: Faction = 'ant';

const QUEEN_PARTY: PartyId = 'queen-guard' as PartyId;

/**
 * Returns the current strategic target POST, or undefined if every
 * stage POST and the spider-web are already ours. Walks the type
 * chain (soap-dish → towel-rack → wall-crack) via `nextStageTarget`
 * which handles per-seed POST randomization (multiple instances of
 * each type, suffixed `-1`, `-2`, ...). Falls through to spider-web
 * once every mid-POST is ant-owned.
 */
const currentStageTarget = (state: GameState): Post | undefined => {
  const next = nextStageTarget(state);
  if (next) return next;
  const web = state.posts.get(SPIDER_WEB);
  if (web && web.owner !== FACTION) return web;
  return undefined;
};

const moveOrder = (target: Post): MoveOrder => ({ kind: 'move-to', target: target.location });

const ordersForParty = (state: GameState, party: Party): readonly Order[] => {
  // Queen's home guard never moves. The Queen is immobile per spec; the rest
  // of the guard stays to defend the home base.
  if (party.id === QUEEN_PARTY) return [];

  // Leaderless parties auto-retreat per the battle module — don't override.
  if (party.leaderless) return party.orders;

  const target = currentStageTarget(state);
  if (!target) {
    // Every stage POST is ours but the spider-web victory check hasn't
    // fired yet (most likely the win-condition resolution is pending).
    // Hold so we don't issue spurious moves.
    return [];
  }

  // If we're already standing on the target tile, hold — capture happens
  // at end-of-turn anyway.
  if (sameCoord(party.location, target.location)) return [];

  return [moveOrder(target)];
};

/**
 * Field parties charge as soon as the AI starts; the rosters seed them as
 * `run` or `defend` to encode their initial disposition, but once we're
 * issuing offensive orders we want full damage. The Queen's home guard
 * keeps its `defend` posture (the spec wants brutal home-base defense).
 */
const desiredPosture = (party: Party): Party['posture'] => {
  if (party.id === QUEEN_PARTY) return 'defend';
  return 'fight';
};

export const baselinePlayer: AIPolicy = {
  name: 'baseline-staging',
  faction: FACTION,
  decide(state: GameState, _scenario: ScenarioData, _rng: Rng): GameState {
    const nextParties = new Map(state.parties);
    for (const [id, party] of state.parties) {
      if (party.faction !== FACTION) continue;
      const orders = ordersForParty(state, party);
      const posture = desiredPosture(party);
      const ordersChanged = orders !== party.orders;
      const postureChanged = posture !== party.posture;
      if (!ordersChanged && !postureChanged) continue;
      nextParties.set(id, { ...party, orders, posture });
    }
    return { ...state, parties: nextParties };
  },
};
