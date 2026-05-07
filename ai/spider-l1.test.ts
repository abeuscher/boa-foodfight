import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { sameCoord } from '../engine/coord.ts';
import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import type {
  GameState,
  MoveOrder,
  Party,
  PartyId,
  Post,
  PostId,
  TileCoord,
} from '../engine/types.ts';

import { postsOfType, SOAP_DISH_TYPE, TOWEL_RACK_TYPE } from './policy-helpers.ts';
import { spiderL1 } from './spider-l1.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const requirePost = (state: GameState, id: PostId): Post => {
  const post = state.posts.get(id);
  if (!post) throw new Error(`unknown post ${String(id)}`);
  return post;
};

const replaceParty = (state: GameState, party: Party): GameState => {
  const parties = new Map(state.parties);
  parties.set(party.id, party);
  return { ...state, parties };
};

const moveAntPartyTo = (state: GameState, partyId: PartyId, location: TileCoord): GameState => {
  const party = state.parties.get(partyId);
  if (!party) throw new Error(`unknown party ${String(partyId)}`);
  return replaceParty(state, { ...party, location });
};

/** Move every ant party far from any plane-transition POST so no threat triggers. */
const isolateAnts = (state: GameState): GameState => {
  let next = state;
  const stash: TileCoord = { plane: 'floor', x: 0, y: 0 };
  for (const [id, party] of state.parties) {
    if (party.faction !== 'ant') continue;
    next = moveAntPartyTo(next, id, stash);
  }
  return next;
};

describe('spiderL1', () => {
  it('declares its identity', () => {
    expect(spiderL1.name).toBe('spider-l1');
    expect(spiderL1.faction).toBe('spider');
  });

  it('web-guard receives no orders (hunkers at the web)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = spiderL1.decide(state, data, createRng(1));
    const webGuard = next.parties.get('web-guard' as PartyId);
    expect(webGuard?.orders).toEqual([]);
  });

  it('the smallest spider party is sent toward the first soap-dish', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = spiderL1.decide(state, data, createRng(1));
    // The smallest party (4 slots) is `advance-scout`.
    const soap = postsOfType(state, SOAP_DISH_TYPE)[0];
    expect(soap).toBeDefined();
    const scout = next.parties.get('advance-scout' as PartyId);
    expect(scout).toBeDefined();
    expect(scout?.orders).toHaveLength(1);
    const order = scout?.orders[0] as MoveOrder;
    expect(order.kind).toBe('move-to');
    expect(order.target).toEqual(soap!.location);
  });

  it('does not modify ant parties (orders identity preserved)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = spiderL1.decide(state, data, createRng(1));
    for (const [id, before] of state.parties) {
      if (before.faction !== 'ant') continue;
      const after = next.parties.get(id);
      expect(after?.orders).toBe(before.orders);
    }
  });

  it('is deterministic for a given seed', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const a = spiderL1.decide(state, data, createRng(42));
    const b = spiderL1.decide(state, data, createRng(42));
    for (const [id, partyA] of a.parties) {
      const partyB = b.parties.get(id);
      expect(partyB?.orders).toEqual(partyA.orders);
    }
  });

  it('an ant adjacent to a towel-rack triggers a non-scout responder toward that POST', () => {
    const { state: initial, data } = loadScenario(DATA_DIR, 1);
    const towels = postsOfType(initial, TOWEL_RACK_TYPE);
    if (towels.length === 0) return; // can't test with no towel-rack on this seed
    const towel = towels[0]!;
    // Place vanguard-alpha one tile away from the towel-rack.
    const adjacent: TileCoord = {
      plane: towel.location.plane,
      x: Math.max(0, towel.location.x - 1),
      y: towel.location.y,
    };
    let state = isolateAnts(initial);
    state = moveAntPartyTo(state, 'vanguard-alpha' as PartyId, adjacent);

    const next = spiderL1.decide(state, data, createRng(1));

    const scout = next.parties.get('advance-scout' as PartyId);
    let responderCount = 0;
    for (const party of next.parties.values()) {
      if (party.faction !== 'spider') continue;
      if (party.id === ('web-guard' as PartyId)) continue;
      if (party.id === scout?.id) continue;
      const order = party.orders[0];
      if (order?.kind === 'move-to' && sameCoord(order.target, towel.location)) {
        responderCount += 1;
      }
    }
    expect(responderCount).toBeGreaterThanOrEqual(1);
  });

  it('with no threat, non-scout patrol parties hold position (no orders)', () => {
    const { state: initial, data } = loadScenario(DATA_DIR, 1);
    const state = isolateAnts(initial);

    const next = spiderL1.decide(state, data, createRng(1));
    const scout = next.parties.get('advance-scout' as PartyId);

    // Each non-web-guard, non-scout, non-deep-raider spider party should
    // hold position when there's no threat (the 6-plane geometry made
    // spider-web pile-ups overwhelming, so default patrol is to anchor
    // in place). The deep-raider is excluded because it has its own
    // dedicated logic (proactive descent toward the floor door /
    // storm-drain column) that intentionally moves every turn — it's
    // a forward-pressure party, not a patrol party.
    let patrolCount = 0;
    for (const party of next.parties.values()) {
      if (party.faction !== 'spider') continue;
      if (party.id === ('web-guard' as PartyId)) continue;
      if (party.id === ('deep-raider' as PartyId)) continue;
      if (party.id === scout?.id) continue;
      patrolCount += 1;
      expect(party.orders).toEqual([]);
    }
    expect(patrolCount).toBeGreaterThan(0);
  });

  it('leaderless spider parties keep their orders unchanged', () => {
    const { state: initial, data } = loadScenario(DATA_DIR, 1);
    // Mark silk-line leaderless with a sentinel set of pre-existing orders.
    const silk = initial.parties.get('silk-line' as PartyId);
    if (!silk) throw new Error('silk-line missing');
    const sentinelOrders: readonly MoveOrder[] = [
      { kind: 'move-to', target: { plane: 'ceiling', x: 0, y: 0 } },
    ];
    const state = replaceParty(initial, {
      ...silk,
      leaderless: true,
      orders: sentinelOrders,
    });

    const next = spiderL1.decide(state, data, createRng(1));
    const after = next.parties.get('silk-line' as PartyId);
    expect(after?.leaderless).toBe(true);
    expect(after?.orders).toBe(sentinelOrders);
  });

  it('a spider already standing on the spider-web tile holds (no orders)', () => {
    const { state: initial, data } = loadScenario(DATA_DIR, 1);
    const web = requirePost(initial, 'spider-web' as PostId);
    // Place silk-line directly on the web tile.
    const silk = initial.parties.get('silk-line' as PartyId);
    if (!silk) throw new Error('silk-line missing');
    let state = replaceParty(initial, { ...silk, location: web.location });
    // And remove any threat so silk-line isn't pulled away as a responder.
    state = isolateAnts(state);

    const next = spiderL1.decide(state, data, createRng(1));
    const after = next.parties.get('silk-line' as PartyId);
    expect(after?.orders).toEqual([]);
  });
});
