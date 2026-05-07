import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { sameCoord } from '../engine/coord.ts';
import { partyIdForKind } from '../engine/neutrals.ts';
import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import type {
  AbilityId,
  GameState,
  MoveOrder,
  NeutralStatus,
  Party,
  PartyId,
  PheroTrailEntry,
  Post,
  PostId,
  TileCoord,
} from '../engine/types.ts';

import { postsOfType, SOAP_DISH_TYPE, TOWEL_RACK_TYPE } from './policy-helpers.ts';
import { isWebThreatened, spiderL1 } from './spider-l1.ts';

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
  let next = replaceParty(state, { ...party, location });
  // Seed a fresh pheromone trail at the new location so the spider
  // AI's trail-based scans (rec 1.5) can see this party. Without
  // this, tests that bypass end-of-turn would leave the trail empty.
  if (party.faction === 'ant') {
    const fresh: PheroTrailEntry = {
      plane: location.plane,
      x: location.x,
      y: location.y,
      ageInTurns: 0,
    };
    const trails = new Map(next.pheroTrails);
    trails.set(partyId, [fresh]);
    next = { ...next, pheroTrails: trails };
  }
  return next;
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

  it('round-9 placement softens deep-raider off the (4-5, 4-5) ant approach lane', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const placement = spiderL1.placement;
    expect(placement).toBeDefined();
    const placed = placement!(state, data, createRng(1));
    const raider = placed.parties.get('deep-raider' as PartyId);
    expect(raider?.location).toEqual({ plane: 'floor', x: 7, y: 3 });
    // The (4-5, 4-5) box must be unobstructed by the raider on turn 0.
    expect(raider?.location.x).toBeGreaterThan(5);
    const silk = placed.parties.get('silk-line' as PartyId);
    expect(silk?.location).toEqual({ plane: 'ceiling', x: 7, y: 7 });
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

  describe('round 8 — opportunistic hypnotize', () => {
    const HYPNOTIZE: AbilityId = 'hypnotize' as AbilityId;

    it('issues a hypnotize order when co-located with an eligible neutral', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      // Move the cockroaches neutral to silk-line's tile so they are
      // co-located.
      const cockroachId = partyIdForKind('cockroaches');
      const cockroach = isolated.parties.get(cockroachId);
      const silk = isolated.parties.get('silk-line' as PartyId);
      if (!cockroach || !silk) throw new Error('fixture missing');
      const moved = replaceParty(isolated, { ...cockroach, location: silk.location });
      const next = spiderL1.decide(moved, data, createRng(1));
      const silkAfter = next.parties.get('silk-line' as PartyId);
      const hypnoOrder = silkAfter?.orders.find((o) => o.kind === 'use-ability');
      expect(hypnoOrder).toBeDefined();
      expect(hypnoOrder?.abilityId).toBe(HYPNOTIZE);
      expect(hypnoOrder?.target).toBe(cockroachId);
    });

    it('does NOT issue a hypnotize against stinkbugs (value-0 skip)', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      const stinkId = partyIdForKind('stinkbugs');
      const stink = isolated.parties.get(stinkId);
      const silk = isolated.parties.get('silk-line' as PartyId);
      if (!stink || !silk) throw new Error('fixture missing');
      const moved = replaceParty(isolated, { ...stink, location: silk.location });
      const next = spiderL1.decide(moved, data, createRng(1));
      const silkAfter = next.parties.get('silk-line' as PartyId);
      const hypnoOrder = silkAfter?.orders.find(
        (o) => o.kind === 'use-ability' && o.abilityId === HYPNOTIZE,
      );
      expect(hypnoOrder).toBeUndefined();
    });

    it('does NOT issue a hypnotize against a neutral in the rebound immunity window', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      const cockroachId = partyIdForKind('cockroaches');
      const cockroach = isolated.parties.get(cockroachId);
      const silk = isolated.parties.get('silk-line' as PartyId);
      if (!cockroach || !silk) throw new Error('fixture missing');
      let s = replaceParty(isolated, { ...cockroach, location: silk.location });
      // Mark the neutral as in-rebound.
      const status = s.neutralStatus.get(cockroachId)!;
      const newStatus = new Map<PartyId, NeutralStatus>(s.neutralStatus);
      newStatus.set(cockroachId, { ...status, spiderImmunityRemaining: 5 });
      s = { ...s, neutralStatus: newStatus };
      const next = spiderL1.decide(s, data, createRng(1));
      const silkAfter = next.parties.get('silk-line' as PartyId);
      const hypnoOrder = silkAfter?.orders.find(
        (o) => o.kind === 'use-ability' && o.abilityId === HYPNOTIZE,
      );
      expect(hypnoOrder).toBeUndefined();
    });
  });

  describe('round 13 — emergency-defense recall', () => {
    /**
     * Seed a single fresh (age 0) trail entry at `loc` for `partyId`,
     * overwriting the existing trail. Mirrors the test-fixture pattern
     * used elsewhere (moveAntPartyTo) but lets us independently set
     * the trail without moving the actual party — useful when probing
     * `isWebThreatened` directly with a synthetic fixture.
     */
    const setTrailEntry = (
      state: GameState,
      partyId: PartyId,
      loc: TileCoord,
      ageInTurns = 0,
    ): GameState => {
      const fresh: PheroTrailEntry = {
        plane: loc.plane,
        x: loc.x,
        y: loc.y,
        ageInTurns,
      };
      const trails = new Map(state.pheroTrails);
      trails.set(partyId, [fresh]);
      return { ...state, pheroTrails: trails };
    };

    it('isWebThreatened returns true when a fresh ant trail entry sits on the spider-web tile (ceiling 9, 9)', () => {
      const { state: initial } = loadScenario(DATA_DIR, 1);
      const web = requirePost(initial, 'spider-web' as PostId);
      // Drop any pre-existing trails so only our fixture matters.
      const cleared: GameState = {
        ...initial,
        pheroTrails: new Map<PartyId, readonly PheroTrailEntry[]>(),
      };
      const seeded = setTrailEntry(cleared, 'pathfinders' as PartyId, web.location);
      expect(isWebThreatened(seeded, web.location)).toBe(true);
    });

    it('isWebThreatened returns false when all ant trail entries are far (floor SW corner)', () => {
      const { state: initial } = loadScenario(DATA_DIR, 1);
      const web = requirePost(initial, 'spider-web' as PostId);
      const cleared: GameState = {
        ...initial,
        pheroTrails: new Map<PartyId, readonly PheroTrailEntry[]>(),
      };
      // Seed every ant party at floor (0, 0) — far from ceiling (9, 9).
      let seeded = cleared;
      for (const [id, party] of cleared.parties) {
        if (party.faction !== 'ant') continue;
        seeded = setTrailEntry(seeded, id, { plane: 'floor', x: 0, y: 0 });
      }
      expect(isWebThreatened(seeded, web.location)).toBe(false);
    });

    it('isWebThreatened returns true when an ant is on the floor at (web.x, web.y) — dive-variant launch tile', () => {
      const { state: initial } = loadScenario(DATA_DIR, 1);
      const web = requirePost(initial, 'spider-web' as PostId);
      const cleared: GameState = {
        ...initial,
        pheroTrails: new Map<PartyId, readonly PheroTrailEntry[]>(),
      };
      // Seed a trail entry on the floor at (web.x, web.y) — this is
      // the plane-switch launch tile for a dive into the web.
      const launch: TileCoord = { plane: 'floor', x: web.location.x, y: web.location.y };
      const seeded = setTrailEntry(cleared, 'pathfinders' as PartyId, launch);
      expect(isWebThreatened(seeded, web.location)).toBe(true);
    });

    it('emergency override redirects silk-line toward the spider-web (not toward storm-drain)', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const web = requirePost(initial, 'spider-web' as PostId);
      // Place silk-line away from the web so its recall step is a
      // strict move (not a hold) — start from a ceiling tile a few
      // steps off the web.
      const silk = initial.parties.get('silk-line' as PartyId);
      if (!silk) throw new Error('silk-line missing');
      let state = replaceParty(initial, {
        ...silk,
        location: { plane: 'ceiling', x: 5, y: 5 },
      });
      // Clear any pre-existing pheromone trails and seed a fresh
      // age-0 trail entry on the web tile to trigger the emergency.
      state = { ...state, pheroTrails: new Map() };
      state = setTrailEntry(state, 'pathfinders' as PartyId, web.location);

      const next = spiderL1.decide(state, data, createRng(1));
      const silkAfter = next.parties.get('silk-line' as PartyId);
      // Find the move-to order (skipping any prepended hypnotize).
      const moveOrder = silkAfter?.orders.find((o) => o.kind === 'move-to');
      expect(moveOrder).toBeDefined();
      // The recall target is the web's plane (ceiling). Storm-drain
      // is on the floor, so the order must point to the ceiling.
      expect(moveOrder?.target.plane).toBe('ceiling');
      // Step toward the web from (5, 5) on the ceiling: each axis
      // increments toward (9, 9), so the step lands at (6, 6).
      expect(moveOrder?.target).toEqual({ plane: 'ceiling', x: 6, y: 6 });
    });

    it('emergency override emits a spider-emergency-defense replay event with the recall list', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const web = requirePost(initial, 'spider-web' as PostId);
      const silk = initial.parties.get('silk-line' as PartyId);
      if (!silk) throw new Error('silk-line missing');
      let state = replaceParty(initial, {
        ...silk,
        location: { plane: 'ceiling', x: 5, y: 5 },
      });
      state = { ...state, pheroTrails: new Map() };
      state = setTrailEntry(state, 'pathfinders' as PartyId, web.location);

      const next = spiderL1.decide(state, data, createRng(1));
      const queued = next.pendingPolicyEvents ?? [];
      const emergencyEvent = queued.find((e) => e.kind === 'spider-emergency-defense');
      expect(emergencyEvent).toBeDefined();
      if (emergencyEvent?.kind === 'spider-emergency-defense') {
        expect(emergencyEvent.recalledPartyIds).toContain('silk-line' as PartyId);
        expect(emergencyEvent.threatTrailEntries.length).toBeGreaterThan(0);
      }
    });

    it('advance-scout is NOT recalled during emergency (keeps soap-dish offensive order)', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const web = requirePost(initial, 'spider-web' as PostId);
      // Trigger emergency by seeding a fresh trail at the web tile.
      let state: GameState = { ...initial, pheroTrails: new Map() };
      state = setTrailEntry(state, 'pathfinders' as PartyId, web.location);

      const next = spiderL1.decide(state, data, createRng(1));

      // Sanity: emergency actually fired.
      expect(isWebThreatened(state, web.location)).toBe(true);

      // advance-scout's offensive order toward soap-dish must still be
      // present — Round 13 retune dropped it from the recall list.
      const soap = postsOfType(state, SOAP_DISH_TYPE)[0];
      expect(soap).toBeDefined();
      const scout = next.parties.get('advance-scout' as PartyId);
      expect(scout).toBeDefined();
      const moveOrder = scout?.orders.find((o) => o.kind === 'move-to');
      expect(moveOrder).toBeDefined();
      expect(moveOrder?.target).toEqual(soap!.location);

      // And: the emergency replay event's recall list must NOT contain
      // advance-scout (or deep-raider).
      const queued = next.pendingPolicyEvents ?? [];
      const emergencyEvent = queued.find((e) => e.kind === 'spider-emergency-defense');
      expect(emergencyEvent).toBeDefined();
      if (emergencyEvent?.kind === 'spider-emergency-defense') {
        expect(emergencyEvent.recalledPartyIds).not.toContain('advance-scout' as PartyId);
        expect(emergencyEvent.recalledPartyIds).not.toContain('deep-raider' as PartyId);
      }
    });
  });
});
