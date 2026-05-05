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
  PostId,
  Rng,
} from '../engine/types.ts';

import type { AIPolicy } from './types.ts';

const FACTION: Faction = 'ant';

const QUEEN_PARTY: PartyId = 'queen-guard' as PartyId;

/** Spec-locked POST ids in the order the staging strategy targets them. */
const STAGE_TARGETS: readonly PostId[] = [
  'soap-dish' as PostId,
  'towel-rack' as PostId,
  'wall-crack' as PostId,
  'spider-web' as PostId,
];

const findPost = (state: GameState, id: PostId): Post | undefined => state.posts.get(id);

/** Returns the current strategic target POST, or undefined if every stage POST is already ours. */
const currentStageTarget = (state: GameState): Post | undefined => {
  for (const id of STAGE_TARGETS) {
    const post = findPost(state, id);
    if (!post) continue;
    if (post.owner !== FACTION) return post;
  }
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

export const baselinePlayer: AIPolicy = {
  name: 'baseline-staging',
  faction: FACTION,
  decide(state: GameState, _scenario: ScenarioData, _rng: Rng): GameState {
    const nextParties = new Map(state.parties);
    for (const [id, party] of state.parties) {
      if (party.faction !== FACTION) continue;
      const orders = ordersForParty(state, party);
      if (orders === party.orders) continue;
      nextParties.set(id, { ...party, orders });
    }
    return { ...state, parties: nextParties };
  },
};
