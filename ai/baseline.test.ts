import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import type { Faction, GameState, MoveOrder, PartyId, Post, PostId } from '../engine/types.ts';

import { baselinePlayer } from './baseline.ts';
import { postsOfType, SOAP_DISH_TYPE, TOWEL_RACK_TYPE, WALL_CRACK_TYPE } from './policy-helpers.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const setAllOfTypeOwned = (state: GameState, type: string, owner: Faction): GameState => {
  const posts = new Map(state.posts);
  for (const post of postsOfType(state, type)) {
    posts.set(post.id, { ...post, owner });
  }
  return { ...state, posts };
};

const firstPostOfType = (state: GameState, type: string): Post => {
  const all = postsOfType(state, type);
  if (all.length === 0) throw new Error(`no post of type '${type}'`);
  return all[0]!;
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

  it('first-stage target is the first soap-dish; field parties get a move-to toward it', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = baselinePlayer.decide(state, data, createRng(1));
    const soap = firstPostOfType(state, SOAP_DISH_TYPE);
    let fieldOrdersIssued = 0;
    for (const party of next.parties.values()) {
      if (party.faction !== 'ant') continue;
      if (party.id === ('queen-guard' as PartyId)) continue;
      expect(party.orders).toHaveLength(1);
      const order = party.orders[0] as MoveOrder;
      expect(order.kind).toBe('move-to');
      expect(order.target).toEqual(soap.location);
      fieldOrdersIssued += 1;
    }
    expect(fieldOrdersIssued).toBeGreaterThan(0);
  });

  it('after every soap-dish is owned, retargets to towel-rack', () => {
    const initial = loadScenario(DATA_DIR, 1);
    const state = setAllOfTypeOwned(initial.state, SOAP_DISH_TYPE, 'ant');
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const towel = firstPostOfType(state, TOWEL_RACK_TYPE);
    const sample = [...next.parties.values()].find(
      (p) => p.faction === 'ant' && p.id !== ('queen-guard' as PartyId),
    );
    const order = sample?.orders[0] as MoveOrder;
    expect(order.target).toEqual(towel.location);
  });

  it('after soap-dish + towel-rack are owned, retargets to wall-crack', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = setAllOfTypeOwned(initial.state, SOAP_DISH_TYPE, 'ant');
    state = setAllOfTypeOwned(state, TOWEL_RACK_TYPE, 'ant');
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const crack = firstPostOfType(state, WALL_CRACK_TYPE);
    const sample = [...next.parties.values()].find(
      (p) => p.faction === 'ant' && p.id !== ('queen-guard' as PartyId),
    );
    const order = sample?.orders[0] as MoveOrder;
    expect(order.target).toEqual(crack.location);
  });

  it('after all foothold POSTs are owned, retargets to spider-web', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = setAllOfTypeOwned(initial.state, SOAP_DISH_TYPE, 'ant');
    state = setAllOfTypeOwned(state, TOWEL_RACK_TYPE, 'ant');
    state = setAllOfTypeOwned(state, WALL_CRACK_TYPE, 'ant');
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
