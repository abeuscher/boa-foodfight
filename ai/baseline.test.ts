import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import type { Faction, MoveOrder, PartyId, PostId } from '../engine/types.ts';

import { baselinePlayer } from './baseline.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const setPostOwner = (
  state: ReturnType<typeof loadScenario>['state'],
  postId: PostId,
  owner: Faction,
): ReturnType<typeof loadScenario>['state'] => {
  const posts = new Map(state.posts);
  const post = posts.get(postId);
  if (!post) throw new Error(`unknown post ${postId}`);
  posts.set(postId, { ...post, owner });
  return { ...state, posts };
};

describe('baselinePlayer', () => {
  it('declares its identity', () => {
    expect(baselinePlayer.name).toBe('baseline-staging');
    expect(baselinePlayer.faction).toBe('ant');
  });

  it('queen-guard is held in place (no orders)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = baselinePlayer.decide(state, data, createRng(1));
    const queenGuard = next.parties.get('queen-guard' as PartyId);
    expect(queenGuard?.orders).toHaveLength(0);
  });

  it('first-stage target is soap-dish; field parties get a move-to toward it', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = baselinePlayer.decide(state, data, createRng(1));
    const soapDish = state.posts.get('soap-dish' as PostId)!;
    let fieldOrdersIssued = 0;
    for (const party of next.parties.values()) {
      if (party.faction !== 'ant') continue;
      if (party.id === ('queen-guard' as PartyId)) continue;
      expect(party.orders).toHaveLength(1);
      const order = party.orders[0] as MoveOrder;
      expect(order.kind).toBe('move-to');
      expect(order.target).toEqual(soapDish.location);
      fieldOrdersIssued += 1;
    }
    expect(fieldOrdersIssued).toBeGreaterThan(0);
  });

  it('after capturing soap-dish, retargets to towel-rack', () => {
    const initial = loadScenario(DATA_DIR, 1);
    const state = setPostOwner(initial.state, 'soap-dish' as PostId, 'ant');
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const towelRack = state.posts.get('towel-rack' as PostId)!;
    const sample = [...next.parties.values()].find(
      (p) => p.faction === 'ant' && p.id !== ('queen-guard' as PartyId),
    );
    const order = sample?.orders[0] as MoveOrder;
    expect(order.target).toEqual(towelRack.location);
  });

  it('after capturing soap-dish + towel-rack, retargets to wall-crack', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = setPostOwner(initial.state, 'soap-dish' as PostId, 'ant');
    state = setPostOwner(state, 'towel-rack' as PostId, 'ant');
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const wallCrack = state.posts.get('wall-crack' as PostId)!;
    const sample = [...next.parties.values()].find(
      (p) => p.faction === 'ant' && p.id !== ('queen-guard' as PartyId),
    );
    const order = sample?.orders[0] as MoveOrder;
    expect(order.target).toEqual(wallCrack.location);
  });

  it('after all foothold POSTs are captured, retargets to spider-web', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = setPostOwner(initial.state, 'soap-dish' as PostId, 'ant');
    state = setPostOwner(state, 'towel-rack' as PostId, 'ant');
    state = setPostOwner(state, 'wall-crack' as PostId, 'ant');
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const spiderWeb = state.posts.get('spider-web' as PostId)!;
    const sample = [...next.parties.values()].find(
      (p) => p.faction === 'ant' && p.id !== ('queen-guard' as PartyId),
    );
    const order = sample?.orders[0] as MoveOrder;
    expect(order.target).toEqual(spiderWeb.location);
  });

  it('does not modify spider parties', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = baselinePlayer.decide(state, data, createRng(1));
    for (const [id, party] of state.parties) {
      if (party.faction !== 'spider') continue;
      const after = next.parties.get(id);
      expect(after?.orders).toBe(party.orders);
    }
  });

  it('is deterministic for a given seed', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const a = baselinePlayer.decide(state, data, createRng(42));
    const b = baselinePlayer.decide(state, data, createRng(42));
    for (const [id, partyA] of a.parties) {
      const partyB = b.parties.get(id);
      expect(partyB?.orders).toEqual(partyA.orders);
    }
  });
});
