import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { POST_CAPTURE_TURNS } from './post-capture.ts';
import { createTickClock } from './replay.ts';
import { createRng } from './rng.ts';
import { scoreScenario, winnerFromScore } from './score.ts';
import { loadScenario } from './state.ts';
import { runScenario } from './turn.ts';
import type { GameState, PartyId, Post, PostId, Unit } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

/** Build a GameState shell with no parties / no posts / no templates.
 * Used for the "empty parties" baseline test where we want to score a
 * synthetic scenario with no contributors. */
const emptyState = (): GameState => ({
  turn: 0,
  seed: 0,
  tiles: new Map(),
  posts: new Map(),
  parties: new Map(),
  unitTemplates: new Map(),
  fog: new Map(),
  queenUltimateCharge: 0,
  queenUltimatesUsed: 0,
  webbedTiles: new Map(),
  buttons: 0,
  phase: 'day',
  phaseTurnsRemaining: 4,
  pheroTrails: new Map(),
  neutralStatus: new Map(),
  damageZones: [],
  playerGold: { ant: 0, spider: 0 },
  itemSpawns: [],
  winner: null,
});

/** Replace one unit (matched by id) inside one party. */
const replaceUnitInParty = (state: GameState, partyId: PartyId, replacement: Unit): GameState => {
  const parties = new Map(state.parties);
  const party = parties.get(partyId);
  if (!party) throw new Error(`no party ${String(partyId)}`);
  const units = party.units.map((u) => (u.id === replacement.id ? replacement : u));
  parties.set(partyId, { ...party, units });
  return { ...state, parties };
};

const setPost = (state: GameState, postId: PostId, patch: Partial<Post>): GameState => {
  const posts = new Map(state.posts);
  const post = posts.get(postId);
  if (!post) throw new Error(`no post ${String(postId)}`);
  posts.set(postId, { ...post, ...patch });
  return { ...state, posts };
};

/** Find any living unit on the given faction (test helper). */
const firstFactionUnitId = (
  state: GameState,
  faction: 'ant' | 'spider',
): { partyId: PartyId; unit: Unit } => {
  for (const party of state.parties.values()) {
    if (party.faction !== faction) continue;
    for (const u of party.units) {
      const tmpl = state.unitTemplates.get(u.templateId);
      if (tmpl?.faction !== faction) continue;
      return { partyId: party.id, unit: u };
    }
  }
  throw new Error(`no ${faction} unit found`);
};

const findQueenUnit = (
  state: GameState,
  faction: 'ant' | 'spider',
): { partyId: PartyId; unit: Unit } => {
  for (const party of state.parties.values()) {
    for (const u of party.units) {
      const tmpl = state.unitTemplates.get(u.templateId);
      if (tmpl?.faction !== faction) continue;
      if (!tmpl.tags.includes('queen')) continue;
      return { partyId: party.id, unit: u };
    }
  }
  throw new Error(`no ${faction} queen found`);
};

describe('scoreScenario', () => {
  it('returns 0 for empty state with no parties or posts', () => {
    const score = scoreScenario(emptyState());
    expect(score.ant.posts).toBe(0);
    expect(score.ant.queen).toBe(0);
    expect(score.ant.webProgress).toBe(0);
    expect(score.ant.hp).toBe(0);
    expect(score.ant.charisma).toBe(0);
    expect(score.ant.total).toBe(0);
    expect(score.spider.total).toBe(0);
  });

  it('returns +50 queen for each living queen at full Level-1 state', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const score = scoreScenario(state);
    expect(score.ant.queen).toBe(50);
    expect(score.spider.queen).toBe(50);
  });

  it('credits +10 to ant when ant owns the soap-dish at end-of-game', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // Find the soap-dish post (it exists because the level-1 baseline
    // map always seeds it; per-seed randomization re-locates but does
    // not drop it).
    const before = scoreScenario(state);
    if (!state.posts.has('soap-dish' as PostId)) return;
    const after = scoreScenario(setPost(state, 'soap-dish' as PostId, { owner: 'ant' }));
    expect(after.ant.posts - before.ant.posts).toBe(10);
  });

  it('credits +15 to ant for a half-progressed spider-web capture (1 of 2 turns remaining)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // Round 17 — `captureTurnsRemaining` decrements from
    // POST_CAPTURE_TURNS toward 0. The literal memo formula is
    // `(turnsRemaining / total) × 30`, so 1/2 × 30 = 15.
    const s = setPost(state, 'spider-web' as PostId, {
      capturingFaction: 'ant',
      captureTurnsRemaining: 1,
    });
    const score = scoreScenario(s);
    expect(score.ant.webProgress).toBe((1 / POST_CAPTURE_TURNS) * 30);
    expect(score.ant.webProgress).toBe(15);
    expect(score.spider.webProgress).toBe(0);
  });

  it('counts living-unit HP as a coarse force-strength tiebreaker', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const score = scoreScenario(state);
    // With baseline rosters both factions have living units > 0.
    expect(score.ant.hp).toBeGreaterThan(0);
    expect(score.spider.hp).toBeGreaterThan(0);
    // Knock out one ant unit; ant HP score drops by that unit's HP.
    const { partyId, unit } = firstFactionUnitId(state, 'ant');
    const before = score.ant.hp;
    const dead: Unit = { ...unit, currentHp: 0 };
    const s = replaceUnitInParty(state, partyId, dead);
    const after = scoreScenario(s);
    expect(after.ant.hp).toBe(before - unit.currentHp);
  });

  it('drops spider score by 50 when the spider queen dies', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const { partyId, unit } = findQueenUnit(state, 'spider');
    const before = scoreScenario(state);
    const dead: Unit = { ...unit, currentHp: 0 };
    const s = replaceUnitInParty(state, partyId, dead);
    const after = scoreScenario(s);
    expect(before.spider.queen).toBe(50);
    expect(after.spider.queen).toBe(0);
    // No other component should shift by exactly the queen's stack
    // beyond the corresponding hp drop. Verify the queen-component
    // contribution lined up.
    expect(before.spider.total - after.spider.total).toBe(50 + unit.currentHp);
  });

  it('drops ant score by 50 when the ant queen dies', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const { partyId, unit } = findQueenUnit(state, 'ant');
    const before = scoreScenario(state);
    const dead: Unit = { ...unit, currentHp: 0 };
    const s = replaceUnitInParty(state, partyId, dead);
    const after = scoreScenario(s);
    expect(before.ant.queen).toBe(50);
    expect(after.ant.queen).toBe(0);
    expect(before.ant.total - after.ant.total).toBe(50 + unit.currentHp);
  });

  it('charisma column is 0 for both factions today (round-24 placeholder)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const score = scoreScenario(state);
    expect(score.ant.charisma).toBe(0);
    expect(score.spider.charisma).toBe(0);
  });

  it('two scenarios with the same seed produce identical scores at timeout (determinism)', () => {
    const a = loadScenario(DATA_DIR, 1);
    const b = loadScenario(DATA_DIR, 1);
    const ca = createTickClock();
    const cb = createTickClock();
    // Tiny maxTurns so we hit the timeout branch quickly. With no
    // policies the loop just decrements the phase and ages
    // pheromones; both sides are static.
    const oa = runScenario(a.state, a.data, createRng(99), ca.next, { maxTurns: 3 });
    const ob = runScenario(b.state, b.data, createRng(99), cb.next, { maxTurns: 3 });
    const sa = scoreScenario(oa.finalState);
    const sb = scoreScenario(ob.finalState);
    expect(JSON.stringify(sa)).toBe(JSON.stringify(sb));
  });
});

describe('winnerFromScore (tie + defender bias)', () => {
  it('awards the win to ant when ant total > spider total', () => {
    const winner = winnerFromScore({
      ant: { posts: 10, queen: 50, webProgress: 0, hp: 100, charisma: 0, total: 160 },
      spider: { posts: 0, queen: 50, webProgress: 0, hp: 100, charisma: 0, total: 150 },
    });
    expect(winner).toBe('ant');
  });

  it('awards ties to spider (defender bias — "ants failed to break the web")', () => {
    const winner = winnerFromScore({
      ant: { posts: 10, queen: 50, webProgress: 0, hp: 100, charisma: 0, total: 160 },
      spider: { posts: 10, queen: 50, webProgress: 0, hp: 100, charisma: 0, total: 160 },
    });
    expect(winner).toBe('spider');
  });

  it('awards the win to spider when spider has higher HP on otherwise tied state', () => {
    const winner = winnerFromScore({
      ant: { posts: 10, queen: 50, webProgress: 0, hp: 80, charisma: 0, total: 140 },
      spider: { posts: 10, queen: 50, webProgress: 0, hp: 90, charisma: 0, total: 150 },
    });
    expect(winner).toBe('spider');
  });
});

describe('runScenario timeout resolution (round 19 — score-based victory)', () => {
  it('emits scenario-end with scoreBreakdown when maxTurns hits without a decisive winner', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const clock = createTickClock();
    // With no policies and a small maxTurns the engine reaches the
    // timeout branch deterministically — both factions are static
    // and neither can capture spider-web or kill the queen.
    const outcome = runScenario(state, data, createRng(11), clock.next, { maxTurns: 3 });
    expect(outcome.finalState.winner).not.toBeNull();
    const end = outcome.events.find((e) => e.kind === 'scenario-end');
    expect(end).toBeDefined();
    if (end?.kind === 'scenario-end') {
      expect(end.scoreBreakdown).toBeDefined();
      expect(end.scoreBreakdown?.ant.total).toBeGreaterThan(0);
      expect(end.scoreBreakdown?.spider.total).toBeGreaterThan(0);
    }
  });

  it('does not attach scoreBreakdown for capture wins (decisive path)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const clock = createTickClock();
    // Force an immediate ant win by handing them spider-web before
    // turn 1; the engine declares victory at end-of-turn 1 without
    // entering the timeout branch.
    const won = setPost(state, 'spider-web' as PostId, { owner: 'ant' });
    const outcome = runScenario(won, data, createRng(7), clock.next, { maxTurns: 30 });
    expect(outcome.finalState.winner).toBe('ant');
    const end = outcome.events.find((e) => e.kind === 'scenario-end');
    expect(end).toBeDefined();
    if (end?.kind === 'scenario-end') {
      expect(end.scoreBreakdown).toBeUndefined();
    }
  });
});
