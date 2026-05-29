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
  Post,
  PostId,
  ReplayEvent,
  Terrain,
  Tile,
  TileCoord,
  Unit,
  UnitId,
  UnitTemplateId,
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

  it('detours around a blocking obstacle row to reach the target', () => {
    // Regression: the old Manhattan-greedy walker stalled when both
    // axis-progress neighbors were obstacles, because lateral neighbors
    // were filtered (tie or increase in Manhattan distance). With BFS
    // the party routes laterally and resumes progress. Setup mirrors
    // the user-reported case (A3 → A9 with A4 / B4 obstacles).
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = 'vanguard-alpha' as PartyId;
    const here: TileCoord = { plane: 'floor', x: 5, y: 3 };
    const open: Terrain = { kind: 'open', movementCost: 1, defenseModifier: 0 };
    // Carve a guaranteed-clear corridor so random-map obstacles can't
    // confound the assertion (seed=1 also drops obstacles on the floor).
    let s = state;
    for (let y = 3; y <= 9; y++) {
      for (let x = 5; x <= 7; x++) {
        s = setTerrain(s, { plane: 'floor', x, y }, open);
      }
    }
    s = setLocation(s, partyId, here);
    const obstacle: Terrain = { kind: 'obstacle', movementCost: 99, defenseModifier: 0 };
    s = setTerrain(s, { plane: 'floor', x: 5, y: 4 }, obstacle);
    s = setTerrain(s, { plane: 'floor', x: 6, y: 4 }, obstacle);

    const target: TileCoord = { plane: 'floor', x: 5, y: 9 };
    s = setOrders(s, partyId, [{ kind: 'move-to', target }]);

    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    const myMoves = partyMovedEvents(out.events).filter(
      (e) => e.kind === 'party-moved' && e.partyId === partyId,
    );
    // The party should have moved at least one tile (greedy stalled here).
    expect(myMoves.length).toBeGreaterThan(0);
    // Must not have stepped onto either obstacle tile.
    for (const ev of myMoves) {
      if (ev.kind !== 'party-moved') continue;
      const blocked = sameCoord(ev.to, { plane: 'floor', x: 5, y: 4 });
      const blocked2 = sameCoord(ev.to, { plane: 'floor', x: 6, y: 4 });
      expect(blocked || blocked2).toBe(false);
    }
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

describe('resolveMovement: spider-corner-cross + ant-plane-switch (rec 1.4)', () => {
  it('a spider party at a wall-to-wall corner crosses in one step and emits corner-crossed', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // Pick advance-scout (spider). Place it at the NE corner of north-wall
    // (x=9, y=5) and order it to east-wall (9, 5). The engine should
    // resolve the corner adjacency on a single tile of allowance.
    const partyId = 'advance-scout' as PartyId;
    const start: TileCoord = { plane: 'north-wall', x: 9, y: 5 };
    const target: TileCoord = { plane: 'east-wall', x: 9, y: 5 };
    let s = setLocation(state, partyId, start);
    s = setOrders(s, partyId, [{ kind: 'move-to', target }]);

    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    const after = out.state.parties.get(partyId);
    expect(after?.location.plane).toBe('east-wall');
    const cornerEvents = out.events.filter(
      (e): e is Extract<ReplayEvent, { kind: 'corner-crossed' }> => e.kind === 'corner-crossed',
    );
    const myCornerEvents = cornerEvents.filter((e) => e.partyId === partyId);
    expect(myCornerEvents.length).toBeGreaterThanOrEqual(1);
    expect(myCornerEvents[0]?.from.plane).toBe('north-wall');
    expect(myCornerEvents[0]?.to.plane).toBe('east-wall');
  });

  it('an ant party at a wall-to-wall corner does NOT auto-cross', () => {
    // Build an ant party WITHOUT ant-plane-switch (no ant-mage), drop it
    // at the same NE corner, and confirm the engine refuses the corner
    // cross (ant must walk floor/ceiling or use ant-plane-switch).
    const { state } = loadScenario(DATA_DIR, 1);
    // vanguard-alpha contains no ant-mage in the locked roster, but to
    // be safe we use the queen-guard variant: just test using a roster
    // party we *know* lacks the mage. Use 'vanguard-alpha' (footmen +
    // archers + scout, no mage).
    const partyId = 'vanguard-alpha' as PartyId;
    const start: TileCoord = { plane: 'north-wall', x: 9, y: 5 };
    const target: TileCoord = { plane: 'east-wall', x: 9, y: 5 };
    let s = setLocation(state, partyId, start);
    s = setOrders(s, partyId, [{ kind: 'move-to', target }]);

    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    const after = out.state.parties.get(partyId);
    // Without an ant-plane-switch ability, no corner cross is allowed —
    // the move stalls and the party stays on north-wall.
    expect(after?.location.plane).toBe('north-wall');
    const cornerEvents = out.events.filter(
      (e) => e.kind === 'corner-crossed' && e.partyId === partyId,
    );
    expect(cornerEvents).toHaveLength(0);
  });

  it('an ant party with ant-plane-switch teleports cross-plane (existing semantics)', () => {
    // pathfinders contains an ant-mage with ant-plane-switch. Order it
    // from floor (1, 1) to ceiling (1, 1) — the engine's
    // `tryPlaneTransition` should fire ant-plane-switch and land the
    // party on the same (x, y) of the ceiling.
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = 'pathfinders' as PartyId;
    const start: TileCoord = { plane: 'floor', x: 1, y: 1 };
    const target: TileCoord = { plane: 'ceiling', x: 1, y: 1 };
    let s = setLocation(state, partyId, start);
    s = setOrders(s, partyId, [{ kind: 'move-to', target }]);

    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    const after = out.state.parties.get(partyId);
    expect(after?.location).toEqual(target);
    // The teleport is NOT a corner cross — corner-crossed only fires
    // for wall-to-wall edges.
    const cornerEvents = out.events.filter(
      (e) => e.kind === 'corner-crossed' && e.partyId === partyId,
    );
    expect(cornerEvents).toHaveLength(0);
  });
});

describe('resolveMovement: ant-scout-majority bonus (round 7 feature 1)', () => {
  // Helpers for building parties with custom unit composition. We re-use
  // the unit ids the loader already minted; the only thing that matters
  // for the allowance check is `templateId` + `currentHp`.
  const buildUnit = (templateId: string, seq: number, hp = 5): Unit => ({
    id: `u-test-${String(seq)}-${templateId}` as UnitId,
    templateId: templateId as UnitTemplateId,
    currentHp: hp,
    level: 1,
    xp: 0,
  });

  const setUnits = (state: GameState, partyId: PartyId, units: readonly Unit[]): GameState => {
    const parties = new Map(state.parties);
    const party = parties.get(partyId);
    if (!party) throw new Error(`no such party: ${String(partyId)}`);
    const leaderId = units[0]?.id ?? party.leaderId;
    parties.set(partyId, { ...party, units, leaderId });
    return { ...state, parties };
  };

  it('a strict-majority ant-scout party (2-of-3) moves 3 tiles on east-wall (bonus fires)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = 'vanguard-alpha' as PartyId;
    let s = setLocation(state, partyId, { plane: 'east-wall', x: 0, y: 5 });
    // 2 ant-scouts + 1 ant-footman = strict majority scouts (2/3 > 1/2).
    s = setUnits(s, partyId, [
      buildUnit('ant-scout', 1),
      buildUnit('ant-scout', 2),
      buildUnit('ant-footman', 3),
    ]);
    s = setOrders(s, partyId, [{ kind: 'move-to', target: { plane: 'east-wall', x: 9, y: 5 } }]);
    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    const after = out.state.parties.get(partyId);
    // Without the bonus, ant-on-wall is 2/turn -> would land on (2, 5).
    // The scout-majority bonus elevates the allowance to 3 -> (3, 5).
    expect(after?.location).toEqual({ plane: 'east-wall', x: 3, y: 5 });
  });

  it('a 50/50 split (1-of-2 ant-scouts) does NOT trigger the bonus on east-wall', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = 'vanguard-alpha' as PartyId;
    let s = setLocation(state, partyId, { plane: 'east-wall', x: 0, y: 5 });
    // 1 scout + 1 footman = 50/50, NOT strict majority.
    s = setUnits(s, partyId, [buildUnit('ant-scout', 1), buildUnit('ant-footman', 2)]);
    s = setOrders(s, partyId, [{ kind: 'move-to', target: { plane: 'east-wall', x: 9, y: 5 } }]);
    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    const after = out.state.parties.get(partyId);
    // No bonus -> ant on wall is 2/turn; should land on x=2.
    expect(after?.location).toEqual({ plane: 'east-wall', x: 2, y: 5 });
  });

  it('a full-scout ant party on east-wall moves 3 tiles (bonus does NOT compound)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = 'vanguard-alpha' as PartyId;
    let s = setLocation(state, partyId, { plane: 'east-wall', x: 0, y: 5 });
    // 3 ant-scouts -> strict majority (3/3).
    s = setUnits(s, partyId, [
      buildUnit('ant-scout', 1),
      buildUnit('ant-scout', 2),
      buildUnit('ant-scout', 3),
    ]);
    s = setOrders(s, partyId, [{ kind: 'move-to', target: { plane: 'east-wall', x: 9, y: 5 } }]);
    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    const after = out.state.parties.get(partyId);
    // Wall ants normally move 2/turn; with bonus capped at 3 — should
    // land on x=3, not x=4 or higher (no compounding).
    expect(after?.location).toEqual({ plane: 'east-wall', x: 3, y: 5 });
  });

  it('a spider-scout-majority party does NOT receive the bonus', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // advance-scout has 3 spider-scout + 1 spider-soldier — already scout-
    // majority by template, but they are SPIDER scouts, not ant. Place on
    // floor (where spider default is 3, but the round-7 ant bonus would
    // have meant nothing different anyway). The point is the bonus is
    // ant-only, so on a wall plane spiders stay at their existing 3
    // (their normal wall allowance), and never go higher.
    const partyId = 'advance-scout' as PartyId;
    let s = setLocation(state, partyId, { plane: 'east-wall', x: 0, y: 5 });
    s = setOrders(s, partyId, [{ kind: 'move-to', target: { plane: 'east-wall', x: 9, y: 5 } }]);
    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    const after = out.state.parties.get(partyId);
    // Spider on wall -> 3/turn. The ant-only bonus didn't compound, so
    // we still see 3 tiles, not 4 or 5.
    expect(after?.location).toEqual({ plane: 'east-wall', x: 3, y: 5 });
  });
});

describe('resolveMovement: one-way paired-POST transition (L8 Skylight, §3.4)', () => {
  // floor (3,3) ↔ ceiling (3,3): an interior tile (no shared cube edge
  // between floor and ceiling), so the only cross-plane route is the
  // paired-POST step — `tryPlaneTransition` step 3 — never edge
  // adjacency. Using a non-mage party rules out the ant-plane-switch
  // teleport path too, isolating exactly the paired-POST behavior.
  const SKY: TileCoord = { plane: 'floor', x: 3, y: 3 };
  const CEIL: TileCoord = { plane: 'ceiling', x: 3, y: 3 };

  const atSkyOrCeil = (c: TileCoord): boolean => sameCoord(c, SKY) || sameCoord(c, CEIL);

  const mkPost = (id: string, location: TileCoord, pairedWith: string, oneWay: boolean): Post => ({
    id: id as PostId,
    name: id,
    location,
    owner: 'ant',
    defensiveBonus: 0,
    healingRate: 0,
    pairedWith: pairedWith as PostId,
    ...(oneWay ? { oneWay: true } : {}),
    tags: [],
    capturingFaction: null,
    captureTurnsRemaining: null,
  });

  const nonMageAntParty = (state: GameState): PartyId => {
    for (const p of state.parties.values()) {
      if (p.faction !== 'ant') continue;
      const hasMage = p.units.some((u) =>
        (
          state.unitTemplates.get(u.templateId)?.abilities as readonly string[] | undefined
        )?.includes('ant-plane-switch'),
      );
      if (!hasMage) return p.id;
    }
    throw new Error('no non-mage ant party in L1 roster');
  };

  // Skylight is the floor-side post (oneWay): it may be LEFT through
  // its pair (floor→ceiling) but never ENTERED via one (ceiling→floor
  // is forbidden). Pairing is mutual so AI/viewer still see a linked
  // pair.
  // `postAt` returns the first post matching a coord; L1 seeds park a
  // generated POST on these tiles (e.g. soap-dish-1 @ floor 3,3), so
  // drop any colliding post before injecting the Skylight pair.
  const withSkylight = (state: GameState, skyOneWay: boolean): GameState => {
    const posts = new Map<PostId, Post>();
    for (const [id, p] of state.posts) {
      if (!atSkyOrCeil(p.location)) posts.set(id, p);
    }
    const skyFloor = mkPost('sky-floor', SKY, 'sky-ceil', skyOneWay);
    const skyCeil = mkPost('sky-ceil', CEIL, 'sky-floor', false);
    posts.set(skyFloor.id, skyFloor);
    posts.set(skyCeil.id, skyCeil);
    return { ...state, posts };
  };

  it('allows the leave direction: floor→ceiling through the one-way Skylight', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = nonMageAntParty(state);
    let s = withSkylight(state, true);
    s = setLocation(s, partyId, SKY);
    s = setOrders(s, partyId, [{ kind: 'move-to', target: CEIL }]);
    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    expect(out.state.parties.get(partyId)?.location).toEqual(CEIL);
  });

  it('blocks the enter direction: ceiling→floor through the one-way Skylight', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = nonMageAntParty(state);
    let s = withSkylight(state, true);
    s = setLocation(s, partyId, CEIL);
    s = setOrders(s, partyId, [{ kind: 'move-to', target: SKY }]);
    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    // No transition, no floor↔ceiling edge, no teleport → stays put.
    expect(out.state.parties.get(partyId)?.location).toEqual(CEIL);
  });

  it('without oneWay the same pair transits BOTH ways (proves the flag is the gate)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = nonMageAntParty(state);
    let s = withSkylight(state, false);
    s = setLocation(s, partyId, CEIL);
    s = setOrders(s, partyId, [{ kind: 'move-to', target: SKY }]);
    const out = resolveMovement(s, createRng(s.seed), makeTickClock());
    expect(out.state.parties.get(partyId)?.location).toEqual(SKY);
  });
});
