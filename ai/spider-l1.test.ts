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
import { isWebUnderHealThreat, spiderL1 } from './spider-l1.ts';

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

  it('round-23 placement softens deep-raider further off the rush/flank approach lane', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const placement = spiderL1.placement;
    expect(placement).toBeDefined();
    const placed = placement!(state, data, createRng(1));
    const raider = placed.parties.get('deep-raider' as PartyId);
    // Round 23 — pulled one column east from r9's (7, 3) to (8, 3)
    // so rush's vanguard-bravo (3, 3) staging tile and flank's (5, 5)
    // ceiling waypoint stay outside the raider's first-2-turn reach.
    // The raider remains in the storm-drain column for the
    // forward-pressure path.
    expect(raider?.location).toEqual({ plane: 'floor', x: 8, y: 3 });
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

  describe('round 18 — heal-priority web-guard', () => {
    const WEB_MEND: AbilityId = 'web-mend' as AbilityId;
    const SPIDER_WEB_ID = 'spider-web' as PostId;

    /** Reset the web-guard's HP to a fraction of the queen's max HP so
     * the heal trigger has slack to fire. The queen template carries
     * web-mend; we knock her HP down by 5 so heal can land. */
    const woundWebGuard = (state: GameState): GameState => {
      const guard = state.parties.get('web-guard' as PartyId);
      if (!guard) throw new Error('web-guard missing');
      const newUnits = guard.units.map((u) => ({ ...u, currentHp: Math.max(1, u.currentHp - 5) }));
      return replaceParty(state, { ...guard, units: newUnits });
    };

    it('isWebUnderHealThreat returns true for an ant on the ceiling near the web', () => {
      const { state: initial } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      const web = requirePost(isolated, SPIDER_WEB_ID);
      // Place pathfinders within radius 3 of the web on the ceiling.
      const close: TileCoord = {
        plane: web.location.plane,
        x: web.location.x - 3,
        y: web.location.y,
      };
      const moved = moveAntPartyTo(isolated, 'pathfinders' as PartyId, close);
      expect(isWebUnderHealThreat(moved, web.location)).toBe(true);
    });

    it('isWebUnderHealThreat returns false when no ants are near the web', () => {
      const { state: initial } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      const web = requirePost(isolated, SPIDER_WEB_ID);
      // After isolateAnts every ant party is at floor (0, 0); web is on
      // ceiling (9, 9). The floor-column escape clause checks (web.x,
      // web.y) on the floor (= floor (9, 9)), not (0, 0), so this is
      // out of range on every dimension.
      expect(isWebUnderHealThreat(isolated, web.location)).toBe(false);
    });

    it('web-guard fires web-mend when the heal threat is active and the queen is wounded', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      const wounded = woundWebGuard(isolated);
      const web = requirePost(wounded, SPIDER_WEB_ID);
      // Place pathfinders 2 tiles away from the web on the ceiling.
      const close: TileCoord = {
        plane: web.location.plane,
        x: web.location.x - 2,
        y: web.location.y,
      };
      const threatened = moveAntPartyTo(wounded, 'pathfinders' as PartyId, close);
      const next = spiderL1.decide(threatened, data, createRng(1));
      const guard = next.parties.get('web-guard' as PartyId);
      const mendOrder = guard?.orders.find(
        (o) => o.kind === 'use-ability' && o.abilityId === WEB_MEND,
      );
      expect(mendOrder).toBeDefined();
    });

    it('web-guard does NOT fire web-mend when the queen is at full HP', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      // Threat is active, but no wounding — the queen is at 100% HP.
      const web = requirePost(isolated, SPIDER_WEB_ID);
      const close: TileCoord = {
        plane: web.location.plane,
        x: web.location.x - 1,
        y: web.location.y,
      };
      const threatened = moveAntPartyTo(isolated, 'pathfinders' as PartyId, close);
      // Use turn 1 so the round-3 spawn-spiderlings branch can't fire.
      const next = spiderL1.decide({ ...threatened, turn: 1 }, data, createRng(1));
      const guard = next.parties.get('web-guard' as PartyId);
      const mendOrder = guard?.orders.find(
        (o) => o.kind === 'use-ability' && o.abilityId === WEB_MEND,
      );
      expect(mendOrder).toBeUndefined();
    });

    it('web-guard does NOT fire web-mend with no threat (idle baseline preserved)', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      const wounded = woundWebGuard(isolated);
      // Use turn 1 to skip the round-3 spawn-spiderlings branch.
      const next = spiderL1.decide({ ...wounded, turn: 1 }, data, createRng(1));
      const guard = next.parties.get('web-guard' as PartyId);
      expect(guard?.orders).toEqual([]);
    });
  });

  describe('round 16 — pre-battle threat assessment (spider side)', () => {
    it('web-guard never queues a threat-flee even when a strong ant is co-located', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const guardId = 'web-guard' as PartyId;
      const guard = initial.parties.get(guardId);
      const pf = initial.parties.get('pathfinders' as PartyId);
      if (!guard || !pf) throw new Error('fixture missing');
      // Co-locate pathfinders ON the web-guard tile (next-step
      // detection treats the current tile as the arrival when the
      // party has no move order — but web-guard never moves, so the
      // exempt set is the only thing that keeps it from fleeing).
      const moved = replaceParty(initial, { ...pf, location: guard.location });
      for (let seed = 1; seed <= 8; seed++) {
        const next = spiderL1.decide(moved, data, createRng(seed));
        const after = next.parties.get(guardId);
        const fleeOrders = (after?.orders ?? []).filter((o) => o.kind === 'flee');
        expect(fleeOrders.length).toBe(0);
      }
    });

    it('a non-exempt spider party stepping into a much stronger ant party may queue a flee', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      const silk = isolated.parties.get('silk-line' as PartyId);
      const pf = isolated.parties.get('pathfinders' as PartyId);
      if (!silk || !pf) throw new Error('fixture missing');
      // Put pathfinders ONE TILE away from silk-line on its current
      // plane so silk-line's storm-drain raid step lands on
      // pathfinders. Pathfinders is the strongest field party, so
      // the loss-prob will be high.
      const next1: GameState = {
        ...isolated,
        parties: new Map([
          ...isolated.parties,
          [
            silk.id,
            {
              ...silk,
              // Knock silk-line's HP down so its power vs pathfinders
              // is heavily lopsided. Keeping the unit alive (HP=1)
              // means the round-15 trigger may also fire — we
              // explicitly check for the threat-prediction event in
              // the sidecar, not the order itself.
              units: silk.units.map((u) => ({ ...u, currentHp: 1 })),
            },
          ],
        ]),
      };
      // Place pathfinders on silk's plane next to silk's tile.
      const next2 = moveAntPartyTo(next1, pf.id, {
        plane: silk.location.plane,
        x: silk.location.x,
        y: Math.max(0, silk.location.y - 1),
      });
      // Try several seeds — at least one should fire the threat
      // trigger.
      let saw = false;
      for (let seed = 1; seed <= 32; seed++) {
        const after = spiderL1.decide(next2, data, createRng(seed));
        const events = after.pendingPolicyEvents ?? [];
        if (
          events.some((e) => e.kind === 'flee-queued' && e.partyId === ('silk-line' as PartyId))
        ) {
          saw = true;
          break;
        }
      }
      expect(saw).toBe(true);
    });
  });
});
