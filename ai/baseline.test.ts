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

  it('round-10 detour: pathfinders steps one tile toward a Cheb-3 cockroach instead of toward the dive launch', () => {
    const initial = loadScenario(DATA_DIR, 1);
    let state = advancePastOpening(initial.state);
    const pfParty = state.parties.get(PATHFINDERS)!;
    // Place a cockroach within Chebyshev-3 on the same plane, but NOT
    // co-located, and not on the path the dive line would naturally
    // walk. (4,4) → cockroach at (5,7) is 3 tiles SE; the dive launch
    // tile is (web.x, web.y) = (9,9), so a one-tile step toward
    // (5,7) goes (5,5) which differs from the (5,5) baseline NE step.
    const cockroachId = partyIdForKind('cockroaches');
    const cockroachLoc: TileCoord = {
      plane: pfParty.location.plane,
      x: pfParty.location.x + 1,
      y: pfParty.location.y + 3,
    };
    state = setNeutralLocation(state, cockroachId, cockroachLoc);
    state = ensureNeutralStatus(state, cockroachId, 'cockroaches');
    const next = baselinePlayer.decide(state, initial.data, createRng(1));
    const pf = next.parties.get(PATHFINDERS);
    expect(pf?.orders).toHaveLength(1);
    const order = pf?.orders[0] as MoveOrder;
    expect(order.kind).toBe('move-to');
    // One-tile Chebyshev step toward (cockroachLoc.x, cockroachLoc.y).
    expect(order.target).toEqual({
      plane: pfParty.location.plane,
      x: pfParty.location.x + 1,
      y: pfParty.location.y + 1,
    });
  });

  it('round-10 detour does NOT fire toward a stinkbug within Chebyshev-3', () => {
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
});
