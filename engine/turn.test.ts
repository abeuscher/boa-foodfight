import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { baselinePlayer } from '../ai/baseline.ts';
import { spiderL1 } from '../ai/spider-l1.ts';

import { createTickClock } from './replay.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import { runScenario, runTurn } from './turn.ts';
import type { PostId, ReplayEvent } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const eventKinds = (events: readonly ReplayEvent[]): readonly string[] => events.map((e) => e.kind);

describe('runTurn', () => {
  it('advances the turn counter exactly once per call', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const clock = createTickClock();
    const out = runTurn(state, data, createRng(1), clock.next);
    expect(out.state.turn).toBe(state.turn + 1);
  });

  it('emits at least a turn-start event for the next turn', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const clock = createTickClock();
    const out = runTurn(state, data, createRng(1), clock.next);
    expect(eventKinds(out.events)).toContain('turn-start');
  });

  it('is deterministic given the same seed', () => {
    const { state: s1, data: d1 } = loadScenario(DATA_DIR, 1);
    const { state: s2, data: d2 } = loadScenario(DATA_DIR, 1);
    const c1 = createTickClock();
    const c2 = createTickClock();
    const o1 = runTurn(s1, d1, createRng(42), c1.next);
    const o2 = runTurn(s2, d2, createRng(42), c2.next);
    expect(JSON.stringify(o1.events)).toBe(JSON.stringify(o2.events));
  });
});

describe('runScenario', () => {
  it('emits scenario-start as the first event', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const clock = createTickClock();
    const outcome = runScenario(state, data, createRng(1), clock.next, { maxTurns: 5 });
    expect(outcome.events[0]?.kind).toBe('scenario-start');
  });

  it('runs up to maxTurns when no winner is reached', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const clock = createTickClock();
    const outcome = runScenario(state, data, createRng(7), clock.next, { maxTurns: 8 });
    expect(outcome.turnsPlayed).toBeLessThanOrEqual(8);
    if (outcome.finalState.winner === null) {
      expect(outcome.turnsPlayed).toBe(8);
    }
  });

  it('stops emitting turn loops once a winner is set', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const clock = createTickClock();
    const outcome = runScenario(state, data, createRng(1), clock.next, { maxTurns: 200 });
    if (outcome.finalState.winner !== null) {
      expect(eventKinds(outcome.events)).toContain('scenario-end');
    }
  });

  it('produces a deterministic event stream for a fixed seed', () => {
    const a = loadScenario(DATA_DIR, 1);
    const b = loadScenario(DATA_DIR, 1);
    const ca = createTickClock();
    const cb = createTickClock();
    const oa = runScenario(a.state, a.data, createRng(99), ca.next, { maxTurns: 25 });
    const ob = runScenario(b.state, b.data, createRng(99), cb.next, { maxTurns: 25 });
    expect(JSON.stringify(oa.events)).toBe(JSON.stringify(ob.events));
    expect(oa.turnsPlayed).toBe(ob.turnsPlayed);
  });

  it('with no orders issued, RNG is not consumed (so seeds do not affect the stream)', () => {
    // Useful determinism invariant: until parties have orders, no RNG draws
    // happen (movement only uses RNG for tie-breaks; end-of-turn has none),
    // so different seeds produce byte-identical event streams. This check
    // documents the property; once AI is wired in, it will no longer hold.
    const a = loadScenario(DATA_DIR, 1);
    const b = loadScenario(DATA_DIR, 1);
    const ca = createTickClock();
    const cb = createTickClock();
    const oa = runScenario(a.state, a.data, createRng(1), ca.next, { maxTurns: 5 });
    const ob = runScenario(b.state, b.data, createRng(2), cb.next, { maxTurns: 5 });
    expect(JSON.stringify(oa.events)).toBe(JSON.stringify(ob.events));
  });

  it('every emitted event has a strictly increasing tick', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const clock = createTickClock();
    const outcome = runScenario(state, data, createRng(3), clock.next, { maxTurns: 10 });
    let lastTick = -1;
    for (const e of outcome.events) {
      expect(e.tick).toBeGreaterThan(lastTick);
      lastTick = e.tick;
    }
  });
});

describe('runScenario with AI policies (Phase 3 integration)', () => {
  it('with both AIs wired, parties actually move', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const clock = createTickClock();
    const outcome = runScenario(state, data, createRng(1), clock.next, {
      maxTurns: 5,
      policies: [baselinePlayer, spiderL1],
    });
    const moveEvents = outcome.events.filter((e) => e.kind === 'party-moved');
    expect(moveEvents.length).toBeGreaterThan(0);
  });

  it('baseline AI captures soap-dish within a reasonable number of turns', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const clock = createTickClock();
    const outcome = runScenario(state, data, createRng(1), clock.next, {
      maxTurns: 30,
      policies: [baselinePlayer, spiderL1],
    });
    const soapDish = outcome.finalState.posts.get('soap-dish' as PostId);
    expect(soapDish?.owner).toBe('ant');
  });

  it('emits post-captured events as POSTs change hands', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const clock = createTickClock();
    const outcome = runScenario(state, data, createRng(1), clock.next, {
      maxTurns: 30,
      policies: [baselinePlayer, spiderL1],
    });
    const captureEvents = outcome.events.filter((e) => e.kind === 'post-captured');
    expect(captureEvents.length).toBeGreaterThan(0);
  });

  it('different seeds produce different event streams once AIs drive movement', () => {
    const a = loadScenario(DATA_DIR, 1);
    const b = loadScenario(DATA_DIR, 1);
    const ca = createTickClock();
    const cb = createTickClock();
    const oa = runScenario(a.state, a.data, createRng(1), ca.next, {
      maxTurns: 20,
      policies: [baselinePlayer, spiderL1],
    });
    const ob = runScenario(b.state, b.data, createRng(2), cb.next, {
      maxTurns: 20,
      policies: [baselinePlayer, spiderL1],
    });
    expect(JSON.stringify(oa.events)).not.toBe(JSON.stringify(ob.events));
  });

  it('same seed reproduces the run byte-for-byte (the determinism guarantee)', () => {
    const a = loadScenario(DATA_DIR, 1);
    const b = loadScenario(DATA_DIR, 1);
    const ca = createTickClock();
    const cb = createTickClock();
    const oa = runScenario(a.state, a.data, createRng(99), ca.next, {
      maxTurns: 20,
      policies: [baselinePlayer, spiderL1],
    });
    const ob = runScenario(b.state, b.data, createRng(99), cb.next, {
      maxTurns: 20,
      policies: [baselinePlayer, spiderL1],
    });
    expect(JSON.stringify(oa.events)).toBe(JSON.stringify(ob.events));
  });
});
