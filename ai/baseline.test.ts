import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { partyIdForKind } from '../engine/neutrals.ts';
import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import type {
  AbilityOrder,
  Faction,
  GameState,
  MoveOrder,
  NeutralKind,
  Party,
  PartyId,
  Post,
  PostId,
  TileCoord,
} from '../engine/types.ts';

import { baselinePlayer } from './baseline.ts';
import {
  CEILING_CAPABLE,
  fleeChanceFromLossProb,
  PATHFINDERS,
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
 * Most tests below want to assert *movement* targets, which the
 * ceiling-capable parties don't issue on turn 0 (they fire a turn-0
 * `jelly-apply` self-buff). Bumping `state.turn` to 1 sidesteps that
 * branch so the staging assertions check the canonical move-to chain.
 */
const advancePastOpening = (state: GameState): GameState => ({ ...state, turn: 1 });

/**
 * Moves the neutral party `neutralId` to the same tile as the ant
 * party `antId`. Used by the round-10 opportunistic-recruit test to
 * force a co-location scenario the random spawn rarely produces.
 */
const relocateNeutralCoLocated = (
  state: GameState,
  neutralId: PartyId,
  antId: PartyId,
): GameState => {
  const ant = state.parties.get(antId);
  if (!ant) throw new Error(`no ant party '${String(antId)}'`);
  return setNeutralLocation(state, neutralId, ant.location);
};

/**
 * Relocates a neutral party. Test-only: bypasses the engine's neutral
 * AI and sets up the geometry directly so the per-turn AI decision
 * branches see the desired arrangement.
 */
const setNeutralLocation = (
  state: GameState,
  neutralId: PartyId,
  location: TileCoord,
): GameState => {
  const party = state.parties.get(neutralId);
  if (!party) throw new Error(`no neutral party '${String(neutralId)}'`);
  const parties = new Map(state.parties);
  const updated: Party = { ...party, location };
  parties.set(neutralId, updated);
  return { ...state, parties };
};

/**
 * Ensures `state.neutralStatus` has an uncontrolled entry for the
 * given neutral kind. Used by the round-10 detour tests so the
 * `findRecruitableNeutralNear` helper sees a positive-value status.
 */
const ensureNeutralStatus = (
  state: GameState,
  neutralId: PartyId,
  kind: NeutralKind,
): GameState => {
  const map = new Map(state.neutralStatus);
  map.set(neutralId, {
    hypnotizedBy: null,
    hypnoticControlRemaining: 0,
    spiderImmunityRemaining: 0,
    kind,
  });
  return { ...state, neutralStatus: map };
};

describe('baselinePlayer', () => {
  it('declares its identity', () => {
    expect(baselinePlayer.name).toBe('baseline-staging');
    expect(baselinePlayer.faction).toBe('ant');
  });

  it('queen-guard worker fires jelly-apply at pathfinders each turn (round-6 supply line)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = baselinePlayer.decide(state, data, createRng(1));
    const queenGuard = next.parties.get('queen-guard' as PartyId);
    expect(queenGuard?.orders).toHaveLength(1);
    expect(queenGuard?.posture).toBe('defend');
    const order = queenGuard?.orders[0];
    expect(order?.kind).toBe('use-ability');
    if (order?.kind !== 'use-ability') throw new Error('expected ability order');
    expect(order.abilityId).toBe('jelly-apply');
    expect(order.target).toBe('pathfinders');
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

  it('vanguard-bravo dive triggers once any soap-dish is captured (stages until then)', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    // Capture only the FIRST soap-dish so bravo's gate flips.
    const dishes = postsOfType(state, SOAP_DISH_TYPE);
    expect(dishes.length).toBeGreaterThan(0);
    const posts = new Map(state.posts);
    posts.set(dishes[0]!.id, { ...dishes[0]!, owner: 'ant' });
    state = { ...state, posts };
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const web = state.posts.get('spider-web' as PostId)!;
    const bravo = next.parties.get('vanguard-bravo' as PartyId);
    const bvOrder = bravo?.orders[0] as MoveOrder;
    expect(bvOrder.kind).toBe('move-to');
    expect(bvOrder.target).toEqual({ plane: 'floor', x: web.location.x, y: web.location.y });
  });

  it('first-stage targets: vanguards stage toward soap-dish; pathfinders runs the dive line from turn 1', () => {
    const initial = loadScenario(DATA_DIR, 1);
    const state = advancePastOpening(initial.state);
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const soap = firstPostOfType(state, SOAP_DISH_TYPE);
    const web = state.posts.get('spider-web' as PostId)!;
    for (const partyId of ['vanguard-alpha', 'vanguard-bravo'] as PartyId[]) {
      const party = next.parties.get(partyId);
      const order = party?.orders[0] as MoveOrder;
      expect(order.kind).toBe('move-to');
      expect(order.target).toEqual(soap.location);
    }
    // Pathfinders runs the dive line on turn 1.
    const pf = next.parties.get('pathfinders' as PartyId);
    const pfOrder = pf?.orders[0] as MoveOrder;
    expect(pfOrder.kind).toBe('move-to');
    expect(pfOrder.target).toEqual({ plane: 'floor', x: web.location.x, y: web.location.y });
  });

  it('after every soap-dish is owned, vanguard-alpha retargets to towel-rack; vanguard-bravo joins the dive line', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    state = setAllOfTypeOwned(state, SOAP_DISH_TYPE, 'ant');
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const towel = firstPostOfType(state, TOWEL_RACK_TYPE);
    const web = state.posts.get('spider-web' as PostId)!;
    const alpha = next.parties.get('vanguard-alpha' as PartyId);
    const aOrder = alpha?.orders[0] as MoveOrder;
    expect(aOrder.kind).toBe('move-to');
    expect(aOrder.target).toEqual(towel.location);
    // With every soap-dish owned, bravo's dive gate has flipped.
    const bravo = next.parties.get('vanguard-bravo' as PartyId);
    const bOrder = bravo?.orders[0] as MoveOrder;
    expect(bOrder.kind).toBe('move-to');
    expect(bOrder.target).toEqual({ plane: 'floor', x: web.location.x, y: web.location.y });
  });

  it('after soap-dish + towel-rack are owned, vanguard-alpha retargets to wall-crack', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    state = setAllOfTypeOwned(state, SOAP_DISH_TYPE, 'ant');
    state = setAllOfTypeOwned(state, TOWEL_RACK_TYPE, 'ant');
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const crack = firstPostOfType(state, WALL_CRACK_TYPE);
    const alpha = next.parties.get('vanguard-alpha' as PartyId);
    const order = alpha?.orders[0] as MoveOrder;
    expect(order.kind).toBe('move-to');
    expect(order.target).toEqual(crack.location);
  });

  it('after all foothold POSTs are owned, vanguard-alpha commits to spider-web; vanguard-bravo joins the dive line', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    state = setAllOfTypeOwned(state, SOAP_DISH_TYPE, 'ant');
    state = setAllOfTypeOwned(state, TOWEL_RACK_TYPE, 'ant');
    state = setAllOfTypeOwned(state, WALL_CRACK_TYPE, 'ant');
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const spiderWeb = state.posts.get('spider-web' as PostId)!;
    const alpha = next.parties.get('vanguard-alpha' as PartyId);
    const alphaOrder = alpha?.orders[0] as MoveOrder;
    expect(alphaOrder.kind).toBe('move-to');
    expect(alphaOrder.target).toEqual(spiderWeb.location);
    // Pathfinders + vanguard-bravo on the dive line.
    const launchTile = {
      plane: 'floor' as const,
      x: spiderWeb.location.x,
      y: spiderWeb.location.y,
    };
    for (const partyId of ['pathfinders', 'vanguard-bravo'] as PartyId[]) {
      const p = next.parties.get(partyId);
      const o = p?.orders[0] as MoveOrder;
      expect(o.kind).toBe('move-to');
      expect(o.target).toEqual(launchTile);
    }
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

  it('round-10 opportunistic recruit fires when pathfinders is co-located with a cockroach', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    const cockroachId = partyIdForKind('cockroaches');
    state = relocateNeutralCoLocated(state, cockroachId, PATHFINDERS);
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const pf = next.parties.get(PATHFINDERS);
    expect(pf?.orders).toHaveLength(1);
    const order = pf?.orders[0] as AbilityOrder;
    expect(order.kind).toBe('use-ability');
    expect(order.abilityId).toBe('recruit');
    expect(order.target).toBe(cockroachId);
  });

  it('round-11 pursue roll: pathfinders stashes a 5-turn pursue decision and steps toward a Cheb-3 cockroach', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    const pfParty = state.parties.get(PATHFINDERS)!;
    // Place a cockroach within Chebyshev-3 on the same plane, not
    // co-located. Round-11 swaps the unconditional detour for a 1-in-3
    // dice; seed 10 happens to fall on the pursue side.
    const cockroachId = partyIdForKind('cockroaches');
    const cockroachLoc: TileCoord = {
      plane: pfParty.location.plane,
      x: pfParty.location.x + 1,
      y: pfParty.location.y + 3,
    };
    state = setNeutralLocation(state, cockroachId, cockroachLoc);
    state = ensureNeutralStatus(state, cockroachId, 'cockroaches');
    const next = baselinePlayer.decide(state, initial.data, createRng(10));
    const pf = next.parties.get(PATHFINDERS);
    expect(pf?.orders).toHaveLength(1);
    const order = pf?.orders[0] as MoveOrder;
    expect(order.kind).toBe('move-to');
    // One-tile Chebyshev step toward the cockroach.
    expect(order.target).toEqual({
      plane: pfParty.location.plane,
      x: pfParty.location.x + 1,
      y: pfParty.location.y + 1,
    });
    // Decision stashed: 5-turn pursue commitment with the target id.
    expect(pf?.neutralDecision).toEqual({
      kind: 'pursue',
      targetPartyId: cockroachId,
      turnsRemaining: 5,
    });
  });

  it('round-11 ignore roll: pathfinders stashes a 5-turn ignore decision and falls through to the dive line', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    const pfParty = state.parties.get(PATHFINDERS)!;
    const cockroachId = partyIdForKind('cockroaches');
    const cockroachLoc: TileCoord = {
      plane: pfParty.location.plane,
      x: pfParty.location.x + 1,
      y: pfParty.location.y + 3,
    };
    state = setNeutralLocation(state, cockroachId, cockroachLoc);
    state = ensureNeutralStatus(state, cockroachId, 'cockroaches');
    // Seed 1 rolls "ignore"; the party should head to the dive launch.
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const pf = next.parties.get(PATHFINDERS);
    const web = state.posts.get('spider-web' as PostId)!;
    const order = pf?.orders[0] as MoveOrder;
    expect(order.kind).toBe('move-to');
    expect(order.target).toEqual({ plane: 'floor', x: web.location.x, y: web.location.y });
    expect(pf?.neutralDecision).toEqual({ kind: 'ignore', turnsRemaining: 5 });
  });

  it('round-11 ignore decision blocks pursuit of a fresh cockroach for 5 turns', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    const pfParty = state.parties.get(PATHFINDERS)!;
    // Pre-stash an ignore decision on pathfinders (3 turns left). A
    // fresh cockroach within Chebyshev-3 must NOT divert the party.
    const parties = new Map(state.parties);
    parties.set(PATHFINDERS, {
      ...pfParty,
      neutralDecision: { kind: 'ignore', turnsRemaining: 3 },
    });
    state = { ...state, parties };
    const cockroachId = partyIdForKind('cockroaches');
    state = setNeutralLocation(state, cockroachId, {
      plane: pfParty.location.plane,
      x: pfParty.location.x + 1,
      y: pfParty.location.y + 1,
    });
    state = ensureNeutralStatus(state, cockroachId, 'cockroaches');
    const next = baselinePlayer.decide(state, initial.data, createRng(10));
    const pf = next.parties.get(PATHFINDERS);
    const web = state.posts.get('spider-web' as PostId)!;
    const order = pf?.orders[0] as MoveOrder;
    // Despite the seed-10 "pursue" roll, the active ignore decision
    // bypasses the dice branch entirely; the AI heads to the dive line.
    expect(order.kind).toBe('move-to');
    expect(order.target).toEqual({ plane: 'floor', x: web.location.x, y: web.location.y });
    // Decision is preserved (the engine end-of-turn tick decrements;
    // the AI doesn't rewrite it here).
    expect(pf?.neutralDecision).toEqual({ kind: 'ignore', turnsRemaining: 3 });
  });

  it('round-11 opportunistic recruit fires even with an active ignore decision', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    const pfParty = state.parties.get(PATHFINDERS)!;
    // Active ignore decision + co-located cockroach. The opportunistic
    // recruit branch must take precedence (the dice mechanic governs
    // detour, not co-located recruit).
    const parties = new Map(state.parties);
    parties.set(PATHFINDERS, {
      ...pfParty,
      neutralDecision: { kind: 'ignore', turnsRemaining: 4 },
    });
    state = { ...state, parties };
    const cockroachId = partyIdForKind('cockroaches');
    state = relocateNeutralCoLocated(state, cockroachId, PATHFINDERS);
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const pf = next.parties.get(PATHFINDERS);
    expect(pf?.orders).toHaveLength(1);
    const order = pf?.orders[0] as AbilityOrder;
    expect(order.kind).toBe('use-ability');
    expect(order.abilityId).toBe('recruit');
    expect(order.target).toBe(cockroachId);
  });

  it('round-11 detour does NOT fire toward a stinkbug within Chebyshev-3', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    const pfParty = state.parties.get(PATHFINDERS)!;
    const stinkbugId = partyIdForKind('stinkbugs');
    const stinkbugLoc: TileCoord = {
      plane: pfParty.location.plane,
      x: pfParty.location.x + 1,
      y: pfParty.location.y + 1,
    };
    state = setNeutralLocation(state, stinkbugId, stinkbugLoc);
    state = ensureNeutralStatus(state, stinkbugId, 'stinkbugs');
    // Move every other neutral far away so the only nearby candidate
    // is the stinkbug. Confirms the helper's stinkbug filter holds.
    const cockroachId = partyIdForKind('cockroaches');
    const miceId = partyIdForKind('mice');
    state = setNeutralLocation(state, cockroachId, { plane: 'east-wall', x: 0, y: 0 });
    state = setNeutralLocation(state, miceId, { plane: 'west-wall', x: 0, y: 0 });
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const pf = next.parties.get(PATHFINDERS);
    // Baseline kill-dive line: pathfinders heads to (web.x, web.y) on
    // the floor (the launch tile). Confirms the detour did NOT fire.
    const web = state.posts.get('spider-web' as PostId)!;
    const order = pf?.orders[0] as MoveOrder;
    expect(order.kind).toBe('move-to');
    expect(order.target).toEqual({ plane: 'floor', x: web.location.x, y: web.location.y });
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

  it('round-15 HP-threshold flee: a low-HP field party prepends a flee order', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const advanced = advancePastOpening(state);
    // Wound pathfinders down to ~10% HP per unit so the party's HP
    // fraction sinks below the 30% trigger.
    const pf = advanced.parties.get(PATHFINDERS);
    expect(pf).toBeDefined();
    const hurt: Party = {
      ...pf!,
      units: pf!.units.map((u) => ({ ...u, currentHp: 1 })),
    };
    const parties = new Map(advanced.parties);
    parties.set(PATHFINDERS, hurt);
    const wounded: GameState = { ...advanced, parties };
    const next = baselinePlayer.decide(wounded, data, createRng(1));
    const after = next.parties.get(PATHFINDERS);
    expect(after?.orders[0]?.kind).toBe('flee');
  });

  describe('fleeChanceFromLossProb (round 16)', () => {
    it('returns 0 at an even match (lossProb = 0.5)', () => {
      expect(fleeChanceFromLossProb(0.5)).toBe(0);
    });

    it('returns 0 below an even match', () => {
      expect(fleeChanceFromLossProb(0.4)).toBe(0);
      expect(fleeChanceFromLossProb(0)).toBe(0);
    });

    it('returns 0.8 at a hopeless match (lossProb = 1.0)', () => {
      expect(fleeChanceFromLossProb(1)).toBeCloseTo(0.8, 6);
    });

    it('matches the spec reference table at intermediate values', () => {
      expect(fleeChanceFromLossProb(0.6)).toBeCloseTo(0.16, 6);
      expect(fleeChanceFromLossProb(0.7)).toBeCloseTo(0.32, 6);
      expect(fleeChanceFromLossProb(0.8)).toBeCloseTo(0.48, 6);
      expect(fleeChanceFromLossProb(0.9)).toBeCloseTo(0.64, 6);
    });
  });

  it('round-15 queen-guard never flees, even at low HP', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const queenId = 'queen-guard' as PartyId;
    const guard = state.parties.get(queenId);
    expect(guard).toBeDefined();
    // Wound the queen-guard well below the 30% threshold.
    const hurt: Party = {
      ...guard!,
      units: guard!.units.map((u) => ({ ...u, currentHp: 1 })),
    };
    const parties = new Map(state.parties);
    parties.set(queenId, hurt);
    const wounded: GameState = { ...state, parties };
    const next = baselinePlayer.decide(wounded, data, createRng(1));
    const after = next.parties.get(queenId);
    // Queen-guard runs the framework's queenGuardOrders hook (jelly-
    // apply), never the flee-aware decideForParty inner closure.
    const fleeOrders = (after?.orders ?? []).filter((o) => o.kind === 'flee');
    expect(fleeOrders.length).toBe(0);
  });

  describe('round-16 pre-battle threat assessment', () => {
    /**
     * Move the ant pathfinders to one tile away from web-guard, drain
     * pathfinders to a thin sliver, and pump web-guard up. The next move
     * tile is web-guard's tile, so the threat-flee branch fires.
     */
    const placeWeakAntNextToStrongSpider = (state: GameState): GameState => {
      const guard = state.parties.get('web-guard' as PartyId);
      if (!guard) throw new Error('no web-guard');
      const pf = state.parties.get(PATHFINDERS);
      if (!pf) throw new Error('no pathfinders');
      // Park pathfinders one tile north of web-guard (same plane) so
      // its move-to-web step lands on web-guard.
      const here: TileCoord = {
        plane: guard.location.plane,
        x: guard.location.x,
        y: Math.max(0, guard.location.y - 1),
      };
      // Knock pathfinders down to ~50% HP per unit so its power vs
      // web-guard's full power is heavily lopsided but the round-15 HP
      // trigger does NOT fire (so we know it's the threat trigger).
      const weakPf: Party = {
        ...pf,
        location: here,
        units: pf.units.map((u) => ({ ...u, currentHp: Math.max(2, Math.floor(u.currentHp / 2)) })),
      };
      const parties = new Map(state.parties);
      parties.set(pf.id, weakPf);
      return { ...state, parties };
    };

    it('weak ant party stepping into strong spider party queues a flee (deterministic seed)', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      // Advance past turn 0 so the kill-dive line fires. Pathfinders
      // will then issue a move-to toward the web tile (one tile away
      // → that tile becomes the next-step destination).
      const advanced = advancePastOpening(state);
      const arranged = placeWeakAntNextToStrongSpider(advanced);
      // Try several seeds — the threat-flee fork rolls per turn, so at
      // least one seed must land below the ~64% flee chance for a 90%
      // loss-prob matchup. We assert that AT LEAST ONE of the first 8
      // seeds queues a flee (the trigger is probabilistic).
      let fleeSeen = false;
      let eventSeen = false;
      for (let seed = 1; seed <= 8; seed++) {
        const next = baselinePlayer.decide(arranged, data, createRng(seed));
        const pf = next.parties.get(PATHFINDERS);
        if (pf?.orders.some((o) => o.kind === 'flee')) fleeSeen = true;
        const events = next.pendingPolicyEvents ?? [];
        if (
          events.some(
            (e) =>
              e.kind === 'flee-queued' &&
              e.reason === 'threat-prediction' &&
              e.partyId === PATHFINDERS,
          )
        ) {
          eventSeen = true;
        }
      }
      expect(fleeSeen).toBe(true);
      expect(eventSeen).toBe(true);
    });

    it('even-match collision does NOT queue a threat-flee', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      const advanced = advancePastOpening(state);
      // Place pathfinders next to web-guard (so it would step onto it),
      // but leave both parties at full HP. Lanchester gives roughly a
      // close-to-50% loss-prob, so fleeChanceFromLossProb is near 0.
      const guard = advanced.parties.get('web-guard' as PartyId)!;
      const pf = advanced.parties.get(PATHFINDERS)!;
      const here: TileCoord = {
        plane: guard.location.plane,
        x: guard.location.x,
        y: Math.max(0, guard.location.y - 1),
      };
      // Make the two parties' powers exactly equal: clone the web-
      // guard's units onto pathfinders so estimateLossProbability
      // returns 0.5 → fleeChanceFromLossProb = 0 → never flees.
      const equalPf: Party = {
        ...pf,
        location: here,
        units: guard.units.map((u, idx) => ({
          ...u,
          id: `pf-clone-${String(idx)}` as Party['units'][number]['id'],
        })),
        leaderId: `pf-clone-0` as Party['leaderId'],
      };
      const parties = new Map(advanced.parties);
      parties.set(pf.id, equalPf);
      const arranged: GameState = { ...advanced, parties };
      // Try several seeds — none should queue a flee for an even
      // match.
      for (let seed = 1; seed <= 16; seed++) {
        const next = baselinePlayer.decide(arranged, data, createRng(seed));
        const after = next.parties.get(PATHFINDERS);
        const fleeCount = (after?.orders ?? []).filter((o) => o.kind === 'flee').length;
        expect(fleeCount).toBe(0);
      }
    });

    it('queen-guard never queues a threat-flee, even when about to be overwhelmed', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      // Co-locate the strong spider web-guard onto queen-guard's tile
      // so even a hypothetical "next tile" lookup hits an enemy. The
      // queen-guard runs the framework's queenGuardOrders hook (which
      // never reaches the threat-flee branch).
      const queenId = 'queen-guard' as PartyId;
      const queen = state.parties.get(queenId)!;
      const guard = state.parties.get('web-guard' as PartyId)!;
      const parties = new Map(state.parties);
      parties.set(guard.id, { ...guard, location: queen.location });
      const arranged: GameState = { ...state, parties };
      for (let seed = 1; seed <= 8; seed++) {
        const next = baselinePlayer.decide(arranged, data, createRng(seed));
        const after = next.parties.get(queenId);
        const fleeOrders = (after?.orders ?? []).filter((o) => o.kind === 'flee');
        expect(fleeOrders.length).toBe(0);
      }
    });

    it('flee-queued event payload carries the predicted enemy and loss probability', () => {
      const { state, data } = loadScenario(DATA_DIR, 1);
      const advanced = advancePastOpening(state);
      const arranged = placeWeakAntNextToStrongSpider(advanced);
      // Find a seed that fires the threat trigger so we can inspect
      // the event payload. Loop through seeds 1..32; at least one
      // should land.
      let event: ReturnType<typeof getThreatEvent> = undefined;
      for (let seed = 1; seed <= 32; seed++) {
        const next = baselinePlayer.decide(arranged, data, createRng(seed));
        event = getThreatEvent(next);
        if (event) break;
      }
      expect(event).toBeDefined();
      if (!event) return;
      expect(event.partyId).toBe(PATHFINDERS);
      expect(event.reason).toBe('threat-prediction');
      expect(event.enemyPartyId).toBe('web-guard' as PartyId);
      expect(event.lossProbability).toBeGreaterThan(0.5);
    });
  });
});

// Test helper hoisted outside the describe so it doesn't reset between
// `it` calls; pulls the threat-prediction `flee-queued` event out of
// the round-16 sidecar buffer for assertion.
const getThreatEvent = (
  state: GameState,
):
  | undefined
  | {
      readonly kind: 'flee-queued';
      readonly partyId: PartyId;
      readonly reason: 'low-hp' | 'threat-prediction';
      readonly enemyPartyId?: PartyId;
      readonly lossProbability?: number;
    } => {
  const events = state.pendingPolicyEvents ?? [];
  for (const e of events) {
    if (e.kind === 'flee-queued' && e.reason === 'threat-prediction') return e;
  }
  return undefined;
};
