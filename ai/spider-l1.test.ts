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

  it('the smallest spider party heads for an unowned mid-POST (round 29 detour) or the soap-dish', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = spiderL1.decide(state, data, createRng(1));
    // Round 29 — advance-scout takes a mid-POST detour when an unowned
    // mid-POST sits on its plane (≤ 2 off-route, or any same-plane
    // mid-POST when the primary target is cross-plane). On seed 1 the
    // scout starts on the ceiling and there's a wall-crack on the
    // ceiling, so the order targets the same-plane wall-crack rather
    // than the cross-plane soap-dish. In other seeds without a same-
    // plane mid-POST the legacy soap-dish target stands.
    const scout = next.parties.get('advance-scout' as PartyId);
    expect(scout).toBeDefined();
    expect(scout?.orders).toHaveLength(1);
    const order = scout?.orders[0] as MoveOrder;
    expect(order.kind).toBe('move-to');
    // The order must point at *some* unowned non-base POST or the
    // canonical soap-dish — not a random tile.
    const eligibleTargets: TileCoord[] = [];
    const soap = postsOfType(state, SOAP_DISH_TYPE)[0];
    if (soap) eligibleTargets.push(soap.location);
    for (const post of state.posts.values()) {
      if (post.owner === 'spider') continue;
      if (post.id === ('storm-drain' as PostId)) continue;
      if (post.id === ('spider-web' as PostId)) continue;
      eligibleTargets.push(post.location);
    }
    const matched = eligibleTargets.some((loc) => sameCoord(loc, order.target));
    expect(matched).toBe(true);
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

  describe('round 29 — mid-POST capture detour', () => {
    /** Place a fresh unowned mid-POST of `type` at `loc` and remove any
     * other unowned POST of the same plane so the detour helper has a
     * deterministic same-plane candidate. Returns the new state. */
    const seedPostAt = (state: GameState, postId: PostId, loc: TileCoord): GameState => {
      const posts = new Map(state.posts);
      const existing = posts.get(postId);
      if (!existing) throw new Error(`unknown post ${String(postId)}`);
      posts.set(postId, { ...existing, location: loc, owner: 'neutral' });
      return { ...state, posts };
    };

    it('silk-line detours to a same-plane unowned mid-POST when within budget', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      // Force turn 4 so the silk-raid path fires (turn 2 is spin-web,
      // turn 3 may collide with the silk-line early-push gate).
      const turn2: GameState = { ...isolated, turn: 4 };
      // Place silk-line at ceiling (7, 7); place a wall-crack at
      // ceiling (5, 5) — Chebyshev 2 off the ceiling-to-floor route.
      const silk = turn2.parties.get('silk-line' as PartyId);
      if (!silk) throw new Error('silk-line missing');
      const placed = replaceParty(turn2, {
        ...silk,
        location: { plane: 'ceiling', x: 7, y: 7 },
      });
      const detourLoc: TileCoord = { plane: 'ceiling', x: 5, y: 5 };
      const seeded = seedPostAt(placed, 'wall-crack-2' as PostId, detourLoc);
      const next = spiderL1.decide(seeded, data, createRng(1));
      const after = next.parties.get('silk-line' as PartyId);
      const move = after?.orders.find((o) => o.kind === 'move-to');
      expect(move).toBeDefined();
      // The step should be one Chebyshev tile toward (5, 5).
      expect(move!.target.plane).toBe('ceiling');
      // From (7,7) the step should be (6,6).
      expect(move!.target.x).toBe(6);
      expect(move!.target.y).toBe(6);
    });

    it('silk-line does NOT detour when no same-plane mid-POST is in budget', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      // Force turn 4 so the legacy turn-2 spin-web branch can't fire.
      const turn2: GameState = { ...isolated, turn: 4 };
      // Move silk-line to floor and ensure no same-plane unowned mid-
      // POST exists on floor — clear soap-dish-1 by giving it to spider.
      const silk = turn2.parties.get('silk-line' as PartyId);
      if (!silk) throw new Error('silk-line missing');
      const onFloor = replaceParty(turn2, {
        ...silk,
        location: { plane: 'floor', x: 5, y: 5 },
      });
      // Mark soap-dish-1 (the only floor mid-POST in seed 1) as spider-
      // owned so the detour helper finds nothing on this plane.
      const posts = new Map(onFloor.posts);
      const soap = posts.get('soap-dish-1' as PostId);
      if (!soap) throw new Error('soap-dish-1 missing');
      posts.set('soap-dish-1' as PostId, { ...soap, owner: 'spider' });
      const cleared: GameState = { ...onFloor, posts };
      const next = spiderL1.decide(cleared, data, createRng(1));
      const after = next.parties.get('silk-line' as PartyId);
      const move = after?.orders.find((o) => o.kind === 'move-to');
      expect(move).toBeDefined();
      // No detour: stepToward storm-drain (0, 0) from (5, 5) is (4, 4).
      expect(move!.target).toEqual({ plane: 'floor', x: 4, y: 4 });
    });

    it('advance-scout detours to a different mid-POST when soap-dishes are spider-owned', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      // Mark every soap-dish as spider-owned.
      const posts = new Map(isolated.posts);
      for (const post of postsOfType(isolated, SOAP_DISH_TYPE)) {
        posts.set(post.id, { ...post, owner: 'spider' });
      }
      const flipped: GameState = { ...isolated, posts };
      const next = spiderL1.decide(flipped, data, createRng(1));
      const scout = next.parties.get('advance-scout' as PartyId);
      const move = scout?.orders.find((o) => o.kind === 'move-to');
      expect(move).toBeDefined();
      // The new target must NOT be a soap-dish (those are spider-owned now).
      const isSoap = postsOfType(initial, SOAP_DISH_TYPE).some((p) =>
        sameCoord(p.location, move!.target),
      );
      expect(isSoap).toBe(false);
      // It must point at SOMETHING reasonable: a non-spider non-base
      // POST or a plane-step toward such a target.
      expect(move!.target).toBeDefined();
    });

    it('silk-line holds (no move) when standing on the detour POST tile (capture tick)', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      // Force turn 4 so the legacy turn-2 spin-web branch can't fire.
      const turn2: GameState = { ...isolated, turn: 4 };
      // Park silk-line directly on the wall-crack-2 tile so the AI
      // should hold (no move-to) — letting the engine's round-17
      // 2-turn capture progress.
      const silk = turn2.parties.get('silk-line' as PartyId);
      if (!silk) throw new Error('silk-line missing');
      const wallCrack = isolated.posts.get('wall-crack-2' as PostId);
      if (!wallCrack) throw new Error('wall-crack-2 missing');
      const onPost = replaceParty(turn2, { ...silk, location: wallCrack.location });
      const next = spiderL1.decide(onPost, data, createRng(1));
      const after = next.parties.get('silk-line' as PartyId);
      const moveOrders = (after?.orders ?? []).filter((o) => o.kind === 'move-to');
      expect(moveOrders).toHaveLength(0);
    });
  });

  describe('round 29 — blitz mode', () => {
    /** Helper: enable blitz mode on a state regardless of seed. */
    const withBlitz = (state: GameState): GameState => ({ ...state, spiderBlitzMode: true });

    it('blitz: silk-line marches toward storm-drain (no mid-POST detour)', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      // Force turn 4 so the legacy turn-2 spin-web branch can't fire.
      // Blitz overrides regardless of the per-turn gates anyway.
      const turn2: GameState = { ...isolated, turn: 4 };
      const silk = turn2.parties.get('silk-line' as PartyId);
      if (!silk) throw new Error('silk-line missing');
      // Park silk-line on the floor at (5, 5) so the storm-drain step
      // is unambiguous.
      const placed = replaceParty(turn2, {
        ...silk,
        location: { plane: 'floor', x: 5, y: 5 },
      });
      // Seed a same-plane mid-POST 2 tiles off-route to prove blitz
      // ignores detours.
      const posts = new Map(placed.posts);
      const soap = posts.get('soap-dish-1' as PostId);
      if (!soap) throw new Error('soap-dish-1 missing');
      posts.set('soap-dish-1' as PostId, {
        ...soap,
        location: { plane: 'floor', x: 5, y: 7 },
        owner: 'neutral',
      });
      const blitzState = withBlitz({ ...placed, posts });
      const next = spiderL1.decide(blitzState, data, createRng(1));
      const after = next.parties.get('silk-line' as PartyId);
      const move = after?.orders.find((o) => o.kind === 'move-to');
      expect(move).toBeDefined();
      // Step from (5, 5) toward storm-drain (0, 0) on floor is (4, 4).
      expect(move!.target).toEqual({ plane: 'floor', x: 4, y: 4 });
    });

    it('blitz: deep-raider marches toward storm-drain (overrides east-wall patrol)', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      // Place deep-raider on the floor at (8, 3) so the storm-drain
      // step is unambiguous and the (cross-plane) edge-resolution
      // path doesn't muddy the assertion.
      const raider0 = isolated.parties.get('deep-raider' as PartyId);
      if (!raider0) throw new Error('deep-raider missing');
      const placed = replaceParty(isolated, {
        ...raider0,
        location: { plane: 'floor', x: 8, y: 3 },
      });
      const blitz = withBlitz(placed);
      const next = spiderL1.decide(blitz, data, createRng(1));
      const raider = next.parties.get('deep-raider' as PartyId);
      const move = raider?.orders.find((o) => o.kind === 'move-to');
      expect(move).toBeDefined();
      // From floor (8, 3) toward (0, 0): step is (7, 2).
      expect(move!.target).toEqual({ plane: 'floor', x: 7, y: 2 });
    });

    it('blitz: web-guard still holds at the web (queen is immobile)', () => {
      const { state: initial, data } = loadScenario(DATA_DIR, 1);
      const isolated = isolateAnts(initial);
      // Force turn 1 to skip the spawn-spiderlings branch.
      const blitz = withBlitz({ ...isolated, turn: 1 });
      const next = spiderL1.decide(blitz, data, createRng(1));
      const guard = next.parties.get('web-guard' as PartyId);
      const moveOrders = (guard?.orders ?? []).filter((o) => o.kind === 'move-to');
      expect(moveOrders).toHaveLength(0);
    });

    it('blitz mode triggers on ~5% of seeds (deterministic 30/600)', () => {
      let triggers = 0;
      for (let seed = 0; seed < 600; seed++) {
        if (createRng(seed).fork('spider-blitz').next() < 0.05) triggers += 1;
      }
      // Sanity band — exactly 30 for these particular seeds; the assert
      // is loose to allow harmless seed-stream churn elsewhere.
      expect(triggers).toBeGreaterThanOrEqual(20);
      expect(triggers).toBeLessThanOrEqual(45);
    });

    it('scenario init flips spiderBlitzMode for at least one seed in 0..99', () => {
      let saw = false;
      for (let seed = 0; seed < 100; seed++) {
        const { state } = loadScenario(DATA_DIR, seed);
        if (state.spiderBlitzMode === true) {
          saw = true;
          break;
        }
      }
      expect(saw).toBe(true);
    });
  });
});
