/**
 * POST accessors: lookups by coord, parties-at-post, ownership change.
 *
 * Per CONTRACTS.md, this module imports only from `engine/types` and
 * `engine/coord` — never from `engine/state` (one-way dep). The
 * `setPostOwner` helper is the only function that mutates state, and it
 * does so by returning a new object — input state is not modified.
 */

import { sameCoord } from './coord.ts';
import { goldForPostCapture } from './gold-table.ts';
import type { Faction, GameState, Party, Post, PostId, ReplayEvent, TileCoord } from './types.ts';

/** Returns the Post located at `coord`, or undefined if none. */
export const postAt = (state: GameState, coord: TileCoord): Post | undefined => {
  for (const post of state.posts.values()) {
    if (sameCoord(post.location, coord)) return post;
  }
  return undefined;
};

/**
 * Returns every party currently standing on the given Post's tile, in
 * stable alphabetical id order. Returns an empty array if the post id is
 * unknown or no party is there. (More than one party may stand at a post,
 * e.g. two friendly parties stacking before being separated by movement.)
 */
export const partiesAtPost = (state: GameState, postId: PostId): readonly Party[] => {
  const post = state.posts.get(postId);
  if (!post) return [];
  const ids = [...state.parties.keys()].sort();
  const out: Party[] = [];
  for (const id of ids) {
    const party = state.parties.get(id);
    if (!party) continue;
    if (sameCoord(party.location, post.location)) out.push(party);
  }
  return out;
};

export interface SetPostOwnerOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

/**
 * Returns a new GameState with `postId`'s owner replaced by `newOwner`.
 * Emits a `post-captured` ReplayEvent iff the owner actually changed.
 * If the post id is unknown, returns the input state unchanged with no
 * events.
 *
 * `tick` is supplied as a thunk so the caller's monotonic counter advances
 * exactly once per emitted event, matching the convention used elsewhere
 * in the engine (see `engine/replay.ts`).
 */
export const setPostOwner = (
  state: GameState,
  postId: PostId,
  newOwner: Faction,
  tick: () => number,
): SetPostOwnerOutcome => {
  const existing = state.posts.get(postId);
  if (!existing) return { state, events: [] };
  if (existing.owner === newOwner) return { state, events: [] };

  const updated: Post = { ...existing, owner: newOwner };
  const nextPosts = new Map<PostId, Post>(state.posts);
  nextPosts.set(postId, updated);
  const events: ReplayEvent[] = [
    {
      kind: 'post-captured',
      turn: state.turn,
      tick: tick(),
      postId,
      newOwner,
    },
  ];
  // Round 12 — POST-capture gold. Faction-locked POSTs (storm-drain,
  // spider-web) award 0 by spec. Neutral captures (which don't happen
  // in practice but are technically allowed by the type) credit
  // nobody. We still emit the post-captured event regardless.
  let nextState: GameState = { ...state, posts: nextPosts };
  if (newOwner !== 'neutral') {
    const gold = goldForPostCapture(postId);
    if (gold > 0) {
      const newTotal = nextState.playerGold[newOwner] + gold;
      nextState = {
        ...nextState,
        playerGold: { ...nextState.playerGold, [newOwner]: newTotal },
      };
      events.push({
        kind: 'gold-earned',
        turn: state.turn,
        tick: tick(),
        faction: newOwner,
        source: 'post',
        sourceId: postId,
        amount: gold,
        newTotal,
      });
    }
  }
  return { state: nextState, events };
};

/**
 * True iff `faction` owns both endpoints of a paired-POST link involving
 * `postId`. Returns false if `postId` is unknown, has no partner, or the
 * partner post has been removed from state. Used by movement to decide
 * whether a plane-step between paired posts is allowed.
 */
export const controlsBothPair = (state: GameState, postId: PostId, faction: Faction): boolean => {
  const post = state.posts.get(postId);
  if (post?.pairedWith === undefined) return false;
  if (post.owner !== faction) return false;
  const partner = state.posts.get(post.pairedWith);
  if (!partner) return false;
  return partner.owner === faction;
};

// Round-1 instant `resolveCaptures` was removed in round 17 in favor
// of the 2-turn POST hold mechanic. See `engine/post-capture.ts` for
// the replacement: trigger + tick driven by movement and end-of-turn.
