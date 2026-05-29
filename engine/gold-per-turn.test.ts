/**
 * Engine dependency #9 — opt-in per-POST in-sim gold income
 * (roadmap §4a #3; closes the docs §4e "shop is not in-sim" economy
 * gap).
 *
 * The frozen engine had NO in-sim source for `state.playerGold` (the
 * per-faction pool the shipped card market — `engine/cards.ts`
 * `buyCard` — requires/deducts): it only grew via KILL_GOLD during a
 * battle, while the between-scenario shop never applied in-sim. The
 * L7 "remote-currency POST → gold/turn" economy (§4a #3) therefore
 * could never work; docs §4e recorded three falsifications proving
 * every workaround structurally inert. This adds the missing field.
 *
 * Coverage:
 *   1. Absent field ⇒ zero gold credited (no behavior change). This
 *      is exactly the shipped-map case (`data/level-1..7` declare no
 *      `goldPerTurn`), proving the change is default-inert.
 *   2. An `ant`-owned POST with `goldPerTurn: N` credits ant +N/turn
 *      (ownership-based — the party need NOT stand on the POST).
 *   3. A `neutral`-owned income POST credits 0 (real factions only).
 *   4. An ownership flip moves the income to the new owner next turn.
 *   5. Determinism: same seed / same state ⇒ identical replay + gold,
 *      across a multi-turn `runScenario` fixture (2 seeds × 2 runs).
 *   6. A card becomes affordable in-sim PURELY from `goldPerTurn`
 *      income — proving the structural economy gap is closed and the
 *      card market naturally spends the new source.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buyCard } from './cards.ts';
import { endOfTurn } from './end-of-turn.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import { runScenario } from './turn.ts';
import type { Faction, GameState, PostId, ReplayEvent, TileCoord } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const OFF_POST_TILE: TileCoord = { plane: 'north-wall', x: 0, y: 0 };

/** Add a synthetic income POST. Default location is a corner tile no
 * party stands on, so the credit is unambiguously OWNERSHIP-based
 * (not co-location-based — the §4a #3 intent, sidestepping the §4e
 * co-located-pause race). */
const addIncomePost = (
  state: GameState,
  id: string,
  owner: Faction,
  goldPerTurn: number,
  location: TileCoord = OFF_POST_TILE,
): GameState => {
  const posts = new Map(state.posts);
  posts.set(id as PostId, {
    id: id as PostId,
    name: id,
    location,
    owner,
    defensiveBonus: 0,
    healingRate: 0,
    goldPerTurn,
    tags: [],
    capturingFaction: null,
    captureTurnsRemaining: null,
  });
  return { ...state, posts };
};

const setPostOwner = (state: GameState, id: string, owner: Faction): GameState => {
  const posts = new Map(state.posts);
  const existing = posts.get(id as PostId);
  if (!existing) throw new Error(`no post ${id}`);
  posts.set(id as PostId, { ...existing, owner });
  return { ...state, posts };
};

const run = (state: GameState) => {
  const { data } = loadScenario(DATA_DIR, 1);
  return endOfTurn(state, { queen: data.queen, jelly: data.jelly }, makeTickClock());
};

const goldEvents = (events: readonly ReplayEvent[]): readonly ReplayEvent[] =>
  events.filter((e) => e.kind === 'gold-earned');

describe('engine dep #9 — per-POST goldPerTurn in-sim economy', () => {
  it('absent field ⇒ zero gold credited (shipped-map default-inert)', () => {
    // L1-iteration #4 (POST typing) introduced `gold-mine` POSTs that
    // intentionally carry `goldPerTurn: 1`. Every other POST in L1 still
    // omits the field. All POSTs (including gold-mine) start `neutral`-
    // owned, so the end-of-turn gold sweep — which only credits real
    // factions — still emits no gold-earned events at turn 0.
    const { state } = loadScenario(DATA_DIR, 1);
    for (const p of state.posts.values()) {
      const isGoldMine = p.tags.includes('post-type:gold-mine');
      if (isGoldMine) expect(p.goldPerTurn).toBe(1);
      else expect(p.goldPerTurn).toBeUndefined();
      expect(p.owner === 'neutral' || p.owner === 'ant' || p.owner === 'spider').toBe(true);
    }
    const before = state.playerGold;
    const out = run(state);
    expect(out.state.playerGold).toEqual(before);
    expect(goldEvents(out.events)).toHaveLength(0);
  });

  it('an ant-owned POST with goldPerTurn:N credits ant +N/turn (ownership, not co-location)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const s = addIncomePost(state, 'remote-currency', 'ant', 7);
    const before = s.playerGold;
    const t1 = run(s);
    expect(t1.state.playerGold.ant).toBe(before.ant + 7);
    expect(t1.state.playerGold.spider).toBe(before.spider);
    const ge = goldEvents(t1.events);
    expect(ge).toHaveLength(1);
    const ev = ge[0];
    if (ev?.kind === 'gold-earned') {
      expect(ev.faction).toBe('ant');
      expect(ev.source).toBe('post');
      expect(ev.sourceId).toBe('remote-currency');
      expect(ev.amount).toBe(7);
      expect(ev.newTotal).toBe(before.ant + 7);
    }
    // A second end-of-turn keeps accruing (income, not one-shot).
    const t2 = run(t1.state);
    expect(t2.state.playerGold.ant).toBe(before.ant + 14);
  });

  it('a neutral-owned income POST credits nobody (real factions only)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const s = addIncomePost(state, 'neutral-node', 'neutral', 50);
    const before = s.playerGold;
    const out = run(s);
    expect(out.state.playerGold).toEqual(before);
    expect(goldEvents(out.events)).toHaveLength(0);
  });

  it('goldPerTurn:0 (and the absent case) is a literal no-op', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const s = addIncomePost(state, 'zero-node', 'ant', 0);
    const before = s.playerGold;
    const out = run(s);
    expect(out.state.playerGold).toEqual(before);
    expect(goldEvents(out.events)).toHaveLength(0);
  });

  it('an ownership flip moves the income to the new owner next turn', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    let s = addIncomePost(state, 'contested-node', 'ant', 9);
    const start = s.playerGold;
    // Turn 1: ant owns it.
    const t1 = run(s);
    expect(t1.state.playerGold.ant).toBe(start.ant + 9);
    expect(t1.state.playerGold.spider).toBe(start.spider);
    // Spider captures the node.
    s = setPostOwner(t1.state, 'contested-node', 'spider');
    // Turn 2: income now flows to spider; ant total frozen.
    const t2 = run(s);
    expect(t2.state.playerGold.ant).toBe(start.ant + 9);
    expect(t2.state.playerGold.spider).toBe(start.spider + 9);
    const ev = goldEvents(t2.events)[0];
    if (ev?.kind === 'gold-earned') expect(ev.faction).toBe('spider');
  });

  it('multiple income POSTs for one faction sum into a single coherent running total', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    let s = addIncomePost(state, 'node-a', 'ant', 5, { plane: 'north-wall', x: 0, y: 0 });
    s = addIncomePost(s, 'node-b', 'ant', 3, { plane: 'north-wall', x: 1, y: 0 });
    const before = s.playerGold;
    const out = run(s);
    expect(out.state.playerGold.ant).toBe(before.ant + 8);
    const ge = goldEvents(out.events);
    expect(ge).toHaveLength(2);
    // Running totals are monotone and end at the post-sweep total.
    const totals = ge.map((e) => (e.kind === 'gold-earned' ? e.newTotal : -1));
    expect(totals[totals.length - 1]).toBe(before.ant + 8);
    expect(totals.every((v, i) => i === 0 || v > totals[i - 1]!)).toBe(true);
  });

  it('determinism: same state ⇒ identical gold + event stream', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const s = addIncomePost(state, 'det-node', 'ant', 11);
    const a = run(s);
    const b = run(s);
    expect(a.state.playerGold).toEqual(b.state.playerGold);
    expect(goldEvents(a.events)).toEqual(goldEvents(b.events));
  });

  it('determinism: a goldPerTurn fixture replays byte-identically (2 seeds × 2 runs)', () => {
    const replayFor = (seed: number) => {
      const { state, data } = loadScenario(DATA_DIR, seed);
      // Inject an ant-owned income POST so the new code path is
      // exercised inside the full runScenario loop.
      const seeded = addIncomePost(state, 'fixture-income', 'ant', 4);
      const out = runScenario(
        seeded,
        data,
        createRng(seed),
        makeTickClock(),
        { maxTurns: 30 },
        'level-1',
      );
      return {
        winner: out.finalState.winner,
        gold: out.finalState.playerGold,
        events: out.events.length,
        goldEarned: out.events.filter((e) => e.kind === 'gold-earned').length,
      };
    };
    for (const seed of [1, 2]) {
      const r1 = replayFor(seed);
      const r2 = replayFor(seed);
      expect(r1).toEqual(r2);
      // The fixture POST actually contributed in-sim income.
      expect(r1.gold.ant).toBeGreaterThan(0);
    }
  });

  it('closes the gap: a card becomes affordable in-sim PURELY from goldPerTurn income', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // Force a known card into market slot 0 and zero out ant gold so
    // the ONLY possible income is the per-turn POST sweep.
    const market = [...(state.cardMarket ?? [])];
    const COST = 25;
    const cardId = market[0]!.cardId;
    market[0] = { cardId, cost: COST };
    let s: GameState = {
      ...state,
      cardMarket: market,
      playerGold: { ant: 0, spider: 0 },
    };
    s = addIncomePost(s, 'income-node', 'ant', 10);

    // Pre-condition: ant cannot afford the card at turn 0.
    expect(buyCard(s, 'ant', cardId, 0, makeTickClock()).bought).toBe(false);

    // Accrue income purely from the goldPerTurn sweep.
    let turns = 0;
    while (s.playerGold.ant < COST && turns < 10) {
      s = run(s).state;
      turns += 1;
    }
    expect(s.playerGold.ant).toBeGreaterThanOrEqual(COST);

    // The shipped card market now buys with in-sim-earned gold —
    // exactly the §4a #3 economy the frozen engine could not run.
    const bought = buyCard(s, 'ant', cardId, turns, makeTickClock());
    expect(bought.bought).toBe(true);
    expect(bought.state.playerGold.ant).toBe(s.playerGold.ant - COST);
    expect(bought.state.cardHand?.ant).toContain(cardId);
  });
});
