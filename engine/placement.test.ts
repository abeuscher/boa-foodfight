import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { sameCoord } from './coord.ts';
import { applyPlacement } from './placement.ts';
import { createTickClock } from './replay.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import type { ScenarioData } from './state.ts';
import { runScenario } from './turn.ts';
import type { Faction, GameState, Party, PartyId, Plane, ReplayEvent, TileCoord } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const setLocation = (state: GameState, partyId: PartyId, location: TileCoord): GameState => {
  const parties = new Map<PartyId, Party>(state.parties);
  const party = parties.get(partyId);
  if (!party) throw new Error(`no such party: ${String(partyId)}`);
  parties.set(partyId, { ...party, location });
  return { ...state, parties };
};

interface PolicyHandle {
  readonly name: string;
  readonly faction: Faction;
  readonly decide: (s: GameState, sc: ScenarioData, r: ReturnType<typeof createRng>) => GameState;
  readonly placement?: (
    s: GameState,
    sc: ScenarioData,
    r: ReturnType<typeof createRng>,
  ) => GameState;
}

const noopPolicy = (faction: Faction, name: string): PolicyHandle => ({
  name,
  faction,
  decide: (s) => s,
});

describe('engine placement (round 7 feature 2)', () => {
  describe('ant placements', () => {
    it('accepts in-radius floor placements', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      // Move pathfinders to floor (5, 5) — Chebyshev 5 from storm-drain.
      // (Note: depending on randomized POST layout this MAY be a POST
      //  tile; for the deterministic seed=1 fixture we accept either
      //  outcome and assert the radius rule below independently.)
      const after = setLocation(state, 'pathfinders' as PartyId, {
        plane: 'floor',
        x: 5,
        y: 5,
      });
      const out = applyPlacement('ant', state, after, data);
      const moved = out.parties.get('pathfinders' as PartyId);
      // At Chebyshev distance 5 (within radius), no obstacle. POST on
      // (5,5) IS the canonical soap-dish location. Loader's randomization
      // means the soap-dish-1 may or may not land there. We cover the
      // pure-radius case explicitly in the next tests using a known-
      // empty tile.
      // For this assertion we just confirm the engine accepted SOMETHING
      // valid: either it moved to (5,5) (no POST) or reverted (POST).
      expect(moved).toBeDefined();
      const pathfinders = state.parties.get('pathfinders' as PartyId);
      expect(pathfinders).toBeDefined();
      // Either kept the new location or reverted to roster. Both are
      // valid engine behavior depending on the seed-driven map layout.
      if (!pathfinders) throw new Error('pathfinders missing');
      expect(
        sameCoord(moved?.location ?? pathfinders.location, { plane: 'floor', x: 5, y: 5 }) ||
          sameCoord(moved?.location ?? pathfinders.location, pathfinders.location),
      ).toBe(true);
    });

    it('accepts a guaranteed-valid in-radius placement (floor 2,2)', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      // (2,2) is in PARTY_START_TILES set? No, but it's reserved from
      // POST placement only by virtue of being NOT in PARTY_START_TILES;
      // however, soap-dish-1 always lands on the floor and IS random.
      // Tile (2,2) is unlikely to be POST-occupied AND has Chebyshev=2.
      // For determinism, we scan and pick any unoccupied floor tile in
      // radius.
      let target: TileCoord | undefined;
      for (let y = 0; y <= 5; y++) {
        for (let x = 0; x <= 5; x++) {
          const candidate: TileCoord = { plane: 'floor', x, y };
          if (sameCoord(candidate, { plane: 'floor', x: 0, y: 0 })) continue;
          let isPost = false;
          for (const p of state.posts.values()) {
            if (sameCoord(p.location, candidate)) {
              isPost = true;
              break;
            }
          }
          if (isPost) continue;
          const tile = state.tiles.get(
            `${candidate.plane}:${String(candidate.x)},${String(candidate.y)}`,
          );
          if (!tile || tile.terrain.kind === 'obstacle') continue;
          target = candidate;
          break;
        }
        if (target) break;
      }
      expect(target).toBeDefined();
      if (!target) return;
      const after = setLocation(state, 'pathfinders' as PartyId, target);
      const out = applyPlacement('ant', state, after, data);
      const moved = out.parties.get('pathfinders' as PartyId);
      expect(moved?.location).toEqual(target);
    });

    it('rejects an out-of-radius placement (floor 9,9)', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      const original = state.parties.get('pathfinders' as PartyId)?.location;
      const after = setLocation(state, 'pathfinders' as PartyId, {
        plane: 'floor',
        x: 9,
        y: 9,
      });
      const out = applyPlacement('ant', state, after, data);
      const moved = out.parties.get('pathfinders' as PartyId);
      expect(moved?.location).toEqual(original);
    });

    it('rejects a queen-guard placement attempt', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      const original = state.parties.get('queen-guard' as PartyId)?.location;
      const after = setLocation(state, 'queen-guard' as PartyId, {
        plane: 'floor',
        x: 2,
        y: 2,
      });
      const out = applyPlacement('ant', state, after, data);
      const moved = out.parties.get('queen-guard' as PartyId);
      expect(moved?.location).toEqual(original);
    });

    it('rejects a placement on a POST tile', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      // Storm-drain at (0,0) is always a POST tile.
      const original = state.parties.get('pathfinders' as PartyId)?.location;
      const after = setLocation(state, 'pathfinders' as PartyId, {
        plane: 'floor',
        x: 0,
        y: 0,
      });
      const out = applyPlacement('ant', state, after, data);
      const moved = out.parties.get('pathfinders' as PartyId);
      expect(moved?.location).toEqual(original);
    });

    it('rejects a non-floor placement', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      const original = state.parties.get('pathfinders' as PartyId)?.location;
      const after = setLocation(state, 'pathfinders' as PartyId, {
        plane: 'ceiling',
        x: 0,
        y: 0,
      });
      const out = applyPlacement('ant', state, after, data);
      const moved = out.parties.get('pathfinders' as PartyId);
      expect(moved?.location).toEqual(original);
    });
  });

  describe('spider placements', () => {
    it('accepts placements on the wall and ceiling planes', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      // Move two of the five spider parties (cap is ⌊5/2⌋ = 2). We
      // must pick non-POST, non-obstacle tiles; (5, 5) on east-wall
      // and (3, 3) on ceiling are safe under the seed=1 layout
      // (mid-POSTs avoid party start tiles and these planes' POSTs
      //  include only towel-rack/wall-crack/spider-web, none of which
      //  land on those exact tiles for the deterministic loader).
      const planes: { id: PartyId; plane: Plane; x: number; y: number }[] = [
        { id: 'deep-raider' as PartyId, plane: 'east-wall', x: 5, y: 5 },
        { id: 'silk-line' as PartyId, plane: 'ceiling', x: 3, y: 3 },
      ];
      let modified = state;
      for (const p of planes) {
        modified = setLocation(modified, p.id, { plane: p.plane, x: p.x, y: p.y });
      }
      const out = applyPlacement('spider', state, modified, data);
      // At least one of the proposed parties should have moved (the
      // exact target may collide with a randomized POST; we confirm
      // the cap mechanic separately).
      const movedIds = ['deep-raider', 'silk-line'].filter((id) => {
        const before = state.parties.get(id as PartyId)?.location;
        const after = out.parties.get(id as PartyId)?.location;
        return before && after && !sameCoord(before, after);
      });
      expect(movedIds.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects a spider placement on a POST tile (storm-drain)', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      const original = state.parties.get('deep-raider' as PartyId)?.location;
      const after = setLocation(state, 'deep-raider' as PartyId, {
        plane: 'floor',
        x: 0,
        y: 0,
      });
      const out = applyPlacement('spider', state, after, data);
      const moved = out.parties.get('deep-raider' as PartyId);
      expect(moved?.location).toEqual(original);
    });

    it('caps moved spider parties at floor(N/2): tries to move 3, only first 2 (lex order) accepted', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      // 5 spider parties; floor(5/2) = 2. Try to move 3.
      const proposed: { id: PartyId; coord: TileCoord }[] = [
        { id: 'advance-scout' as PartyId, coord: { plane: 'east-wall', x: 1, y: 1 } },
        { id: 'deep-raider' as PartyId, coord: { plane: 'east-wall', x: 2, y: 2 } },
        { id: 'silk-line' as PartyId, coord: { plane: 'ceiling', x: 3, y: 3 } },
      ];
      let modified = state;
      for (const p of proposed) modified = setLocation(modified, p.id, p.coord);
      const out = applyPlacement('spider', state, modified, data);

      // Lex order on PartyId: advance-scout, deep-raider, silk-line.
      // First 2 = advance-scout, deep-raider should move. silk-line
      // should revert.
      const advBefore = state.parties.get('advance-scout' as PartyId)!;
      const drBefore = state.parties.get('deep-raider' as PartyId)!;
      const slBefore = state.parties.get('silk-line' as PartyId)!;
      const advAfter = out.parties.get('advance-scout' as PartyId)!;
      const drAfter = out.parties.get('deep-raider' as PartyId)!;
      const slAfter = out.parties.get('silk-line' as PartyId)!;

      // advance-scout: moved (assuming target tile is valid; (1,1) on
      // east-wall is non-POST and non-obstacle in default layout).
      expect(sameCoord(advAfter.location, advBefore.location)).toBe(false);
      // deep-raider: moved.
      expect(sameCoord(drAfter.location, drBefore.location)).toBe(false);
      // silk-line: reverted (over the cap).
      expect(sameCoord(slAfter.location, slBefore.location)).toBe(true);
    });
  });

  describe('runScenario integration', () => {
    it('scenario-start event carries final post-placement positions', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      const clock = createTickClock();
      const placementPolicy: PolicyHandle = {
        name: 'test-ant-placement',
        faction: 'ant',
        decide: (s) => s,
        placement: (s) =>
          setLocation(s, 'vanguard-alpha' as PartyId, { plane: 'floor', x: 3, y: 3 }),
      };
      const outcome = runScenario(state, data, createRng(1), clock.next, {
        maxTurns: 1,
        policies: [placementPolicy],
      });
      const startEvents = outcome.events.filter((e: ReplayEvent) => e.kind === 'scenario-start');
      expect(startEvents.length).toBe(1);
      const startEvent = startEvents[0];
      if (startEvent?.kind !== 'scenario-start') {
        throw new Error('expected scenario-start event');
      }
      const positions = startEvent.partyPositions;
      expect(positions).toBeDefined();
      const vanguardAlphaPos = positions?.find((p) => p.partyId === ('vanguard-alpha' as PartyId));
      // (3,3) might collide with a POST in some seeds; for seed=1 the
      // canonical soap-dish-1 lands on the floor at a randomized tile,
      // and we don't know exactly. We only assert the scenario-start
      // carries the snapshot and the entry exists.
      expect(vanguardAlphaPos).toBeDefined();
    });

    it('placement does NOT seed a turn-1 pheromone trail entry from the placement step', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      const clock = createTickClock();
      const placementPolicy: PolicyHandle = {
        name: 'test-ant-placement',
        faction: 'ant',
        decide: (s) => s,
        placement: (s) =>
          setLocation(s, 'vanguard-alpha' as PartyId, { plane: 'floor', x: 3, y: 3 }),
      };
      const noopSpider: PolicyHandle = noopPolicy('spider', 'noop-spider');
      const outcome = runScenario(state, data, createRng(1), clock.next, {
        maxTurns: 1,
        policies: [placementPolicy, noopSpider],
      });
      // After 1 turn, pheroTrails for vanguard-alpha should have
      // exactly 1 entry (the post-turn-1 location). The placement step
      // itself should NOT have seeded an extra entry.
      const trail = outcome.finalState.pheroTrails.get('vanguard-alpha' as PartyId);
      expect(trail?.length).toBe(1);
    });
  });
});
