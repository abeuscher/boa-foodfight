/**
 * Round 28 — POST-occupation combat bonus.
 *
 * Every non-base POST owned by a faction grants that faction +1 attack
 * and +1 armor party-wide (folded additively into combat math, same
 * lane as item / phase / plane-affinity offsets). Home-base POSTs
 * (storm-drain, spider-web) are excluded — they're seeded fixed
 * ownership and would tilt the baseline regardless of player action.
 *
 * Pure: no I/O, no RNG. Counts ownership from `state.posts` directly.
 *
 * Imports allowed: `engine/types` only (leaf module; consumed by
 * `engine/battle` to seed the per-faction combat offset).
 */

import type { Faction, GameState, PostId } from './types.ts';

/** Home-base POST ids excluded from the bonus. Both are spec-locked
 * unique ids (see CONTRACTS.md "Reconciler cross-file checks"). */
const HOME_BASE_POST_IDS: readonly PostId[] = ['storm-drain' as PostId, 'spider-web' as PostId];

/**
 * Per-faction flat stat offset from POST occupation. Mirrors the
 * shape of `ItemStatOffset` in `engine/item-effects.ts` but covers
 * just the two combat dimensions the bonus affects.
 */
export interface PostOccupationOffset {
  readonly attack: number;
  readonly armor: number;
}

const ZERO_OFFSET: PostOccupationOffset = { attack: 0, armor: 0 };

export interface PostOccupationOffsets {
  readonly ant: PostOccupationOffset;
  readonly spider: PostOccupationOffset;
}

/**
 * True iff `postId` is a home-base POST (storm-drain or spider-web).
 * Exported so call sites that already iterate `state.posts` can
 * filter consistently.
 */
export const isHomeBasePost = (postId: PostId): boolean => {
  for (const id of HOME_BASE_POST_IDS) {
    if (postId === id) return true;
  }
  return false;
};

/**
 * Count owned non-base POSTs per faction. A POST owned by a faction
 * AND not in the home-base exclusion list contributes one toward
 * that faction's bonus. Captures-in-progress (round 17) do NOT
 * count: ownership only flips when the hold completes, so the
 * `owner` field is the source of truth.
 */
export const countNonBasePostsOwned = (state: GameState, faction: Faction): number => {
  let count = 0;
  for (const [postId, post] of state.posts) {
    if (isHomeBasePost(postId)) continue;
    if (post.owner !== faction) continue;
    count += 1;
  }
  return count;
};

/**
 * Per-POST cap on the additive bonus (mechanics spec §28). The
 * round-28 bonus is +1 attack / +1 armor per owned non-base POST,
 * capped at `MAX_BONUS_POINTS` so a faction that has snowballed every
 * POST doesn't compound a +5/+5 offset and trivialize combat. The cap
 * was set after the initial gate-pass ran outside the [50%, 70%] band
 * with raw +N scaling.
 */
export const MAX_BONUS_POINTS = 1;

/**
 * Compute the per-faction POST-occupation offsets for a `GameState`.
 * Bonus is +1 attack / +1 armor per owned non-base POST (capped at
 * `MAX_BONUS_POINTS`), applied party-wide to every battle that faction
 * participates in this turn.
 *
 * Determinism: pure read off `state.posts`; no RNG, no ordering
 * dependence (Map iteration order is preserved by the engine's state
 * shape but the count is order-independent anyway).
 */
export const computePostOccupationOffsets = (state: GameState): PostOccupationOffsets => {
  const antPosts = Math.min(MAX_BONUS_POINTS, countNonBasePostsOwned(state, 'ant'));
  const spiderPosts = Math.min(MAX_BONUS_POINTS, countNonBasePostsOwned(state, 'spider'));
  return {
    ant: antPosts === 0 ? ZERO_OFFSET : { attack: antPosts, armor: antPosts },
    spider: spiderPosts === 0 ? ZERO_OFFSET : { attack: spiderPosts, armor: spiderPosts },
  };
};

/**
 * Look up the offset for a specific faction. Neutral always returns
 * the zero offset (neutrals don't carry the bonus — they don't own
 * POSTs in the round-28 sense).
 */
export const offsetForFaction = (
  offsets: PostOccupationOffsets,
  faction: Faction,
): PostOccupationOffset => {
  if (faction === 'ant') return offsets.ant;
  if (faction === 'spider') return offsets.spider;
  return ZERO_OFFSET;
};
