import { describe, expect, it } from 'vitest';

import { createRng } from './rng.ts';

describe('rng', () => {
  it('is deterministic given the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next() returns values in [0, 1)', () => {
    const r = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(n) returns an integer in [0, n)', () => {
    const r = createRng(456);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = r.int(10);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      seen.add(v);
    }
    expect(seen.size).toBe(10);
  });

  it('pick() picks deterministically given a seed', () => {
    const items = ['a', 'b', 'c', 'd', 'e'] as const;
    const a = createRng(7);
    const b = createRng(7);
    const seqA = Array.from({ length: 20 }, () => a.pick(items));
    const seqB = Array.from({ length: 20 }, () => b.pick(items));
    expect(seqA).toEqual(seqB);
  });

  it('pick() throws on empty array', () => {
    const r = createRng(0);
    expect(() => r.pick([])).toThrow();
  });

  it('fork() with the same label produces the same sub-stream', () => {
    const parent1 = createRng(99);
    const parent2 = createRng(99);
    const a = parent1.fork('battle');
    const b = parent2.fork('battle');
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('fork() with different labels produces different sub-streams', () => {
    const parent = createRng(99);
    const a = parent.fork('battle');
    const b = parent.fork('movement');
    expect(a.next()).not.toBe(b.next());
  });

  it('fork() does not perturb the parent stream', () => {
    const a = createRng(50);
    const b = createRng(50);
    a.fork('foo');
    a.fork('bar');
    expect(a.next()).toBe(b.next());
    expect(a.next()).toBe(b.next());
  });
});
