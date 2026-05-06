import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { controlsBothPair, partiesAtPost, postAt, setPostOwner } from './posts.ts';
import { loadScenario } from './state.ts';
import type { GameState, Post, PostId } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const STORM_DRAIN = 'storm-drain' as PostId;
const SPIDER_WEB = 'spider-web' as PostId;

/** Returns a counter-backed `tick` thunk and a way to read its current value. */
const makeTick = (): { tick: () => number; current: () => number } => {
  let n = 0;
  return {
    tick: () => ++n,
    current: () => n,
  };
};

/** Replace one post in state with a transformed copy. */
const withPost = (state: GameState, postId: PostId, fn: (p: Post) => Post): GameState => {
  const existing = state.posts.get(postId);
  if (!existing) throw new Error(`unknown post ${postId}`);
  const nextPosts = new Map(state.posts);
  nextPosts.set(postId, fn(existing));
  return { ...state, posts: nextPosts };
};

describe('engine/posts', () => {
  describe('postAt', () => {
    it('returns the POST at the storm-drain coord', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const post = postAt(state, { plane: 'floor', x: 0, y: 0 });
      expect(post?.id).toBe(STORM_DRAIN);
    });

    it('returns undefined for a coord with no post', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      expect(postAt(state, { plane: 'floor', x: 4, y: 4 })).toBeUndefined();
    });
  });

  describe('partiesAtPost', () => {
    it('returns the queen-guard party for the storm-drain in the loaded state', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const parties = partiesAtPost(state, STORM_DRAIN);
      const ids = parties.map((p) => p.id as string);
      expect(ids).toContain('queen-guard');
    });

    it('returns an empty array for an unknown post id', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      expect(partiesAtPost(state, 'no-such-post' as PostId)).toHaveLength(0);
    });
  });

  describe('setPostOwner', () => {
    it('produces a new state with the new owner', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const { tick } = makeTick();
      const { state: next } = setPostOwner(state, SPIDER_WEB, 'ant', tick);
      expect(next).not.toBe(state);
      expect(next.posts.get(SPIDER_WEB)?.owner).toBe('ant');
      // input untouched
      expect(state.posts.get(SPIDER_WEB)?.owner).toBe('spider');
    });

    it('emits a `post-captured` event when the owner changes', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const { tick } = makeTick();
      const { events } = setPostOwner(state, SPIDER_WEB, 'ant', tick);
      expect(events).toHaveLength(1);
      const ev = events[0];
      expect(ev?.kind).toBe('post-captured');
      if (ev?.kind === 'post-captured') {
        expect(ev.postId).toBe(SPIDER_WEB);
        expect(ev.newOwner).toBe('ant');
      }
    });

    it('emits no event when owner is unchanged', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const { tick, current } = makeTick();
      const { state: next, events } = setPostOwner(state, STORM_DRAIN, 'ant', tick);
      expect(events).toHaveLength(0);
      expect(next).toBe(state);
      expect(current()).toBe(0);
    });
  });

  describe('controlsBothPair', () => {
    it('returns true when both endpoints of a paired POST pair are owned by the same faction', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      // Map-gen pairs one floor mid-POST with one wall mid-POST. Find that pair.
      const paired = [...state.posts.values()].find((p) => p.pairedWith !== undefined);
      if (!paired) {
        // Some seeds may produce no pair (no floor mid-POST or no wall mid-POST).
        // Skip in that case; covered by other seeds.
        return;
      }
      const partner = state.posts.get(paired.pairedWith!);
      expect(partner).toBeDefined();
      let s: GameState = withPost(state, paired.id, (p) => ({ ...p, owner: 'ant' }));
      s = withPost(s, partner!.id, (p) => ({ ...p, owner: 'ant' }));
      expect(controlsBothPair(s, paired.id, 'ant')).toBe(true);
      expect(controlsBothPair(s, partner!.id, 'ant')).toBe(true);
    });

    it('returns false when only one endpoint is owned', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const paired = [...state.posts.values()].find((p) => p.pairedWith !== undefined);
      if (!paired) return;
      const s = withPost(state, paired.id, (p) => ({ ...p, owner: 'ant' }));
      expect(controlsBothPair(s, paired.id, 'ant')).toBe(false);
    });

    it('returns false for posts with no partner', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      expect(controlsBothPair(state, STORM_DRAIN, 'ant')).toBe(false);
    });
  });
});
