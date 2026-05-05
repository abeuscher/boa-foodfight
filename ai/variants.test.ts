import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import type { MoveOrder, PartyId, PostId } from '../engine/types.ts';

import { flankPlayer } from './flank.ts';
import { rushPlayer } from './rush.ts';
import { turtlePlayer } from './turtle.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

describe('rush variant', () => {
  it('targets spider-web from turn 1', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = rushPlayer.decide(state, data, createRng(1));
    const web = state.posts.get('spider-web' as PostId);
    let fieldOrders = 0;
    for (const party of next.parties.values()) {
      if (party.faction !== 'ant' || party.id === ('queen-guard' as PartyId)) continue;
      expect(party.orders).toHaveLength(1);
      const order = party.orders[0] as MoveOrder;
      expect(order.target).toEqual(web?.location);
      fieldOrders += 1;
    }
    expect(fieldOrders).toBeGreaterThan(0);
  });

  it('queen-guard stays in place with defend posture', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = rushPlayer.decide(state, data, createRng(1));
    const queenGuard = next.parties.get('queen-guard' as PartyId);
    expect(queenGuard?.orders).toHaveLength(0);
    expect(queenGuard?.posture).toBe('defend');
  });
});

describe('turtle variant', () => {
  it('ceiling-capable parties hold while queen ultimate is uncharged', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    expect(state.queenUltimateCharge).toBe(0);
    const next = turtlePlayer.decide(state, data, createRng(1));
    for (const partyId of ['pathfinders', 'vanguard-bravo'] as PartyId[]) {
      const party = next.parties.get(partyId);
      expect(party?.orders).toHaveLength(0);
    }
  });

  it('floor vanguards capture floor POSTs even while uncharged (to trigger spider counter-push)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = turtlePlayer.decide(state, data, createRng(1));
    const soap = state.posts.get('soap-dish' as PostId);
    const vanguardAlpha = next.parties.get('vanguard-alpha' as PartyId);
    expect(vanguardAlpha?.orders).toHaveLength(1);
    const order = vanguardAlpha?.orders[0] as MoveOrder;
    expect(order.target).toEqual(soap?.location);
  });

  it('ceiling-capable parties push once charge crosses the unleash threshold', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const charged = { ...state, queenUltimateCharge: data.queen.ultimate.chargeMax };
    const next = turtlePlayer.decide(charged, data, createRng(1));
    const web = state.posts.get('spider-web' as PostId);
    for (const partyId of ['pathfinders', 'vanguard-bravo'] as PartyId[]) {
      const party = next.parties.get(partyId);
      expect(party?.orders).toHaveLength(1);
      const order = party?.orders[0] as MoveOrder;
      expect(order.target).toEqual(web?.location);
    }
  });
});

describe('flank variant', () => {
  it('ceiling-capable parties walk to opposite floor corners (genuine flank)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = flankPlayer.decide(state, data, createRng(1));
    const pathfinders = next.parties.get('pathfinders' as PartyId);
    const vanguardBravo = next.parties.get('vanguard-bravo' as PartyId);
    const pfOrder = pathfinders?.orders[0] as MoveOrder | undefined;
    const vbOrder = vanguardBravo?.orders[0] as MoveOrder | undefined;
    expect(pfOrder?.target).toEqual({ plane: 'floor', x: 0, y: 9 });
    expect(vbOrder?.target).toEqual({ plane: 'floor', x: 9, y: 0 });
  });

  it('vanguard-alpha still stages floor POSTs while pathfinders flanks', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = flankPlayer.decide(state, data, createRng(1));
    const vanguardAlpha = next.parties.get('vanguard-alpha' as PartyId);
    const order = vanguardAlpha?.orders[0] as MoveOrder | undefined;
    const soap = state.posts.get('soap-dish' as PostId);
    expect(order?.target.x).toBe(soap?.location.x);
    expect(order?.target.y).toBe(soap?.location.y);
  });
});
