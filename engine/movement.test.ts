import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { coordKey, sameCoord } from './coord.ts';
import { resolveMovement } from './movement.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import type {
  GameState,
  Order,
  Party,
  PartyId,
  ReplayEvent,
  Terrain,
  Tile,
  TileCoord,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const setOrders = (state: GameState, partyId: PartyId, orders: readonly Order[]): GameState => {
  const parties = new Map(state.parties);
  const party = parties.get(partyId);
  if (!party) throw new Error(`no such party: ${String(partyId)}`);
  parties.set(partyId, { ...party, orders });
  return { ...state, parties };
};

const setLocation = (state: GameState, partyId: PartyId, location: TileCoord): GameState => {
  const parties = new Map(state.parties);
  const party = parties.get(partyId);
  if (!party) throw new Error(`no such party: ${String(partyId)}`);
  parties.set(partyId, { ...party, location });
  return { ...state, parties };
};

const setTerrain = (state: GameState, coord: TileCoord, terrain: Terrain): GameState => {
  const tiles = new Map(state.tiles);
  const key = coordKey(coord);
  const tile = tiles.get(key);
  if (!tile) throw new Error(`no such tile: ${key}`);
  const next: Tile = { coord: tile.coord, terrain };
  tiles.set(key, next);
  return { ...state, tiles };
};

const partyMovedEvents = (events: readonly ReplayEvent[]): readonly ReplayEvent[] =>
  events.filter((e) => e.kind === 'party-moved');

describe('resolveMovement', () => {
  it('emits no events for a party with no orders', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // Strip orders from every party (they should already be []).
    let s = state;
    for (const id of s.parties.keys()) {
      s = setOrders(s, id, []);
    }
    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    expect(partyMovedEvents(out.events)).toHaveLength(0);
    // Locations preserved.
    for (const [id, p] of state.parties) {
      const after = out.state.parties.get(id);
      expect(after).toBeDefined();
      expect(sameCoord(after?.location ?? p.location, p.location)).toBe(true);
    }
  });

  it('moves a party one tile toward an adjacent open target and emits one event', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // Pick `vanguard-alpha` (floor, x=1,y=0). Order it to (2,0).
    const partyId = 'vanguard-alpha' as PartyId;
    const target: TileCoord = { plane: 'floor', x: 2, y: 0 };
    const order: Order = { kind: 'move-to', target };
    const s = setOrders(state, partyId, [order]);

    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    const moves = partyMovedEvents(out.events).filter(
      (e): e is Extract<ReplayEvent, { kind: 'party-moved' }> => e.kind === 'party-moved',
    );
    const myMoves = moves.filter((e) => e.partyId === partyId);
    expect(myMoves.length).toBeGreaterThanOrEqual(1);
    const first = myMoves[0];
    expect(first).toBeDefined();
    expect(first?.from).toEqual({ plane: 'floor', x: 1, y: 0 });
    expect(first?.to).toEqual({ plane: 'floor', x: 2, y: 0 });

    const after = out.state.parties.get(partyId);
    expect(after?.location).toEqual(target);
    // Order completed -> dropped.
    expect(after?.orders).toHaveLength(0);
  });

  it('does not move a party blocked on all sides by obstacles', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = 'vanguard-alpha' as PartyId;

    // Place the party at an interior tile so it has 4 in-plane neighbors.
    const here: TileCoord = { plane: 'floor', x: 5, y: 5 };
    let s = setLocation(state, partyId, here);

    const obstacle: Terrain = { kind: 'obstacle', movementCost: 99, defenseModifier: 0 };
    for (const offset of [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ]) {
      s = setTerrain(s, { plane: 'floor', x: here.x + offset.dx, y: here.y + offset.dy }, obstacle);
    }

    const target: TileCoord = { plane: 'floor', x: 9, y: 9 };
    s = setOrders(s, partyId, [{ kind: 'move-to', target }]);

    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    const myMoves = partyMovedEvents(out.events).filter(
      (e) => e.kind === 'party-moved' && e.partyId === partyId,
    );
    expect(myMoves).toHaveLength(0);
    expect(out.state.parties.get(partyId)?.location).toEqual(here);
    // Order is retained so the party will try again next turn.
    expect(out.state.parties.get(partyId)?.orders.length).toBe(1);
  });

  it('reports a collision when opposing-faction parties end on the same tile', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const antId = 'vanguard-alpha' as PartyId;
    const spiderId = 'advance-scout' as PartyId;

    // Force both onto the floor plane at adjacent coords, with orders to walk
    // onto a shared meeting tile.
    const meeting: TileCoord = { plane: 'floor', x: 5, y: 5 };

    let s = setLocation(state, antId, { plane: 'floor', x: 4, y: 5 });
    s = setLocation(s, spiderId, { plane: 'floor', x: 6, y: 5 });
    s = setOrders(s, antId, [{ kind: 'move-to', target: meeting }]);
    s = setOrders(s, spiderId, [{ kind: 'move-to', target: meeting }]);

    const out = resolveMovement(s, createRng(s.seed), makeTickClock());

    expect(out.state.parties.get(antId)?.location).toEqual(meeting);
    expect(out.state.parties.get(spiderId)?.location).toEqual(meeting);

    const found = out.collisions.some(([a, b]) => {
      const pair = new Set<PartyId>([a, b]);
      return pair.has(antId) && pair.has(spiderId);
    });
    expect(found).toBe(true);
  });

  it('is deterministic given identical state and seed', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = 'vanguard-alpha' as PartyId;
    const s = setOrders(state, partyId, [
      { kind: 'move-to', target: { plane: 'floor', x: 5, y: 4 } },
    ]);

    const a = resolveMovement(s, createRng(s.seed), makeTickClock());
    const b = resolveMovement(s, createRng(s.seed), makeTickClock());

    expect(a.events).toEqual(b.events);
    expect(a.collisions).toEqual(b.collisions);
    for (const id of a.state.parties.keys()) {
      expect(a.state.parties.get(id)?.location).toEqual(b.state.parties.get(id)?.location);
    }
  });

  it('is independent of input party-map iteration order', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = 'vanguard-alpha' as PartyId;
    const sBase = setOrders(state, partyId, [
      { kind: 'move-to', target: { plane: 'floor', x: 5, y: 4 } },
    ]);

    // Build a second state whose `parties` map is the reverse of the first's.
    const reversedEntries: [PartyId, Party][] = [...sBase.parties.entries()].reverse();
    const reversedParties = new Map<PartyId, Party>(reversedEntries);
    const sShuffled: GameState = { ...sBase, parties: reversedParties };

    const a = resolveMovement(sBase, createRng(sBase.seed), makeTickClock());
    const b = resolveMovement(sShuffled, createRng(sShuffled.seed), makeTickClock());

    expect(a.events).toEqual(b.events);
    expect(a.collisions).toEqual(b.collisions);
    for (const id of a.state.parties.keys()) {
      expect(a.state.parties.get(id)?.location).toEqual(b.state.parties.get(id)?.location);
    }
  });

  it('stamps party-moved events with monotonically increasing ticks', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = 'vanguard-alpha' as PartyId;
    // A multi-step order so multiple events are emitted by one party.
    const s = setOrders(state, partyId, [
      { kind: 'move-to', target: { plane: 'floor', x: 4, y: 0 } },
    ]);
    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    const moves = partyMovedEvents(out.events);
    expect(moves.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < moves.length; i++) {
      const prev = moves[i - 1];
      const cur = moves[i];
      expect(prev).toBeDefined();
      expect(cur).toBeDefined();
      if (prev && cur) expect(cur.tick).toBeGreaterThan(prev.tick);
    }
  });

  it('exposes UnitTemplateId so movement allowance pulls real templates', () => {
    // Sanity: ensure templates load (guards against regressions in the fixture).
    const { state } = loadScenario(DATA_DIR, 1);
    const someId = [...state.unitTemplates.keys()][0];
    expect(someId).toBeDefined();
  });
});
