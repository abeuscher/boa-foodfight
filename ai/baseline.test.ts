import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import type { Faction, GameState, MoveOrder, PartyId, Post, PostId } from '../engine/types.ts';

import { baselinePlayer } from './baseline.ts';
import {
  CEILING_CAPABLE,
  postsOfType,
  SOAP_DISH_TYPE,
  TOWEL_RACK_TYPE,
  WALL_CRACK_TYPE,
} from './policy-helpers.ts';

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

/**
 * Forces the round-3 `deep-raider` spider party into a leaderless
 * state so the baseline's east-wall awareness branch (vanguard-bravo
 * detours via the wall-crack ladder while deep-raider lives) is
 * disabled. Tests that assert the canonical commit-phase pathing for
 * ALL field parties use this helper to neutralize the detour gate.
 */
const neutralizeDeepRaider = (state: GameState): GameState => {
  const dr = state.parties.get('deep-raider' as PartyId);
  if (!dr) return state;
  const parties = new Map(state.parties);
  parties.set(dr.id, { ...dr, leaderless: true });
  return { ...state, parties };
};

/**
 * Most tests below want to assert *movement* targets, which the
 * ceiling-capable parties don't issue on turn 0 (they fire a turn-0
 * `jelly-apply` self-buff). Bumping `state.turn` to 1 sidesteps that
 * branch so the staging assertions check the canonical move-to chain.
 */
const advancePastOpening = (state: GameState): GameState => ({ ...state, turn: 1 });

describe('baselinePlayer', () => {
  it('declares its identity', () => {
    expect(baselinePlayer.name).toBe('baseline-staging');
    expect(baselinePlayer.faction).toBe('ant');
  });

  it('queen-guard is held in place (no orders, defend posture)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = baselinePlayer.decide(state, data, createRng(1));
    const queenGuard = next.parties.get('queen-guard' as PartyId);
    expect(queenGuard?.orders).toHaveLength(0);
    expect(queenGuard?.posture).toBe('defend');
  });

  it('ceiling-capable parties pre-buff with jelly-apply on turn 0', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    expect(state.turn).toBe(0);
    const next = baselinePlayer.decide(state, data, createRng(1));
    for (const partyId of CEILING_CAPABLE) {
      const party = next.parties.get(partyId);
      expect(party?.orders).toHaveLength(1);
      const order = party?.orders[0];
      expect(order?.kind).toBe('use-ability');
      if (order?.kind !== 'use-ability') throw new Error('expected ability order');
      expect(order.abilityId).toBe('jelly-apply');
      expect(order.target).toBe(partyId);
    }
  });

  it('first-stage target is the first soap-dish; field parties get a move-to toward it', () => {
    const initial = loadScenario(DATA_DIR, 1);
    const state = advancePastOpening(initial.state);
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
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
    let state = advancePastOpening(initial.state);
    state = setAllOfTypeOwned(state, SOAP_DISH_TYPE, 'ant');
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
    let state = advancePastOpening(initial.state);
    state = setAllOfTypeOwned(state, SOAP_DISH_TYPE, 'ant');
    state = setAllOfTypeOwned(state, TOWEL_RACK_TYPE, 'ant');
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const crack = firstPostOfType(state, WALL_CRACK_TYPE);
    const sample = [...next.parties.values()].find(
      (p) => p.faction === 'ant' && p.id !== ('queen-guard' as PartyId),
    );
    const order = sample?.orders[0] as MoveOrder;
    expect(order.target).toEqual(crack.location);
  });

  it('after all foothold POSTs are owned and deep-raider is neutralized, every field party commits to spider-web', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    state = setAllOfTypeOwned(state, SOAP_DISH_TYPE, 'ant');
    state = setAllOfTypeOwned(state, TOWEL_RACK_TYPE, 'ant');
    state = setAllOfTypeOwned(state, WALL_CRACK_TYPE, 'ant');
    state = neutralizeDeepRaider(state);
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const spiderWeb = state.posts.get('spider-web' as PostId)!;
    let fieldOrdersIssued = 0;
    for (const party of next.parties.values()) {
      if (party.faction !== 'ant') continue;
      if (party.id === ('queen-guard' as PartyId)) continue;
      expect(party.orders).toHaveLength(1);
      const order = party.orders[0] as MoveOrder;
      expect(order.kind).toBe('move-to');
      expect(order.target).toEqual(spiderWeb.location);
      fieldOrdersIssued += 1;
    }
    expect(fieldOrdersIssued).toBeGreaterThan(0);
  });

  it('east-wall awareness: vanguard-bravo detours through a captured wall-crack while deep-raider is alive', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    state = setAllOfTypeOwned(state, SOAP_DISH_TYPE, 'ant');
    state = setAllOfTypeOwned(state, TOWEL_RACK_TYPE, 'ant');
    state = setAllOfTypeOwned(state, WALL_CRACK_TYPE, 'ant');
    // deep-raider untouched: alive on east-wall (5,5).
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const bravo = next.parties.get('vanguard-bravo' as PartyId);
    expect(bravo?.orders).toHaveLength(1);
    const order = bravo?.orders[0] as MoveOrder;
    expect(order.kind).toBe('move-to');
    const crack = firstPostOfType(state, WALL_CRACK_TYPE);
    expect(order.target).toEqual(crack.location);
  });

  it('east-wall awareness clears: once deep-raider is leaderless, vanguard-bravo commits direct to spider-web', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    state = setAllOfTypeOwned(state, SOAP_DISH_TYPE, 'ant');
    state = setAllOfTypeOwned(state, TOWEL_RACK_TYPE, 'ant');
    state = setAllOfTypeOwned(state, WALL_CRACK_TYPE, 'ant');
    state = neutralizeDeepRaider(state);
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const bravo = next.parties.get('vanguard-bravo' as PartyId);
    const order = bravo?.orders[0] as MoveOrder;
    const web = state.posts.get('spider-web' as PostId)!;
    expect(order.target).toEqual(web.location);
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
