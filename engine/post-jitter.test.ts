/**
 * L4 (Hallway) POST-randomization debut — `applyPostJitter` (§3.3).
 *
 * The loader re-resolves the row of any `static`-map post that
 * declares a `jitter` band: column + plane fixed, row chosen uniformly
 * in `[minRow, maxRow]` via a dedicated seeded RNG fork, clamped to
 * the post's plane height. Posts without `jitter` are untouched, and a
 * map with no jitter at all is returned by reference (no RNG consumed)
 * — that referential identity is what keeps the jitter-free static
 * maps (L2 / tutorial) byte-identical.
 */

import { describe, expect, it } from 'vitest';

import { mapFileSchema } from './schemas/map.ts';
import { applyPostJitter } from './state.ts';

const TERRAIN = { kind: 'open', movementCost: 1, defenseModifier: 0 } as const;

const plane = (name: string, width: number, height: number) => ({
  plane: name,
  width,
  height,
  tiles: Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ ...TERRAIN })),
  ),
});

const post = (id: string, x: number, y: number, jitter?: { minRow: number; maxRow: number }) => ({
  id,
  name: id,
  location: { plane: 'floor', x, y },
  owner: 'neutral',
  defensiveBonus: 0,
  healingRate: 0,
  tags: [],
  ...(jitter ? { jitter } : {}),
});

const makeMap = (posts: ReturnType<typeof post>[], height = 10) =>
  mapFileSchema.parse({
    version: 1,
    name: 'jitter-fixture',
    static: true,
    planes: [plane('floor', 10, height)],
    posts,
  });

describe('applyPostJitter', () => {
  it('a map with no jittered post is returned by reference (no RNG)', () => {
    const m = makeMap([post('home', 0, 0), post('end-door', 9, 9)]);
    expect(applyPostJitter(m, 1)).toBe(m);
    expect(applyPostJitter(m, 999)).toBe(m);
  });

  it('is deterministic: same seed → same resolved row', () => {
    const m = makeMap([post('doorway', 5, 0, { minRow: 3, maxRow: 6 })]);
    const a = applyPostJitter(m, 42);
    const b = applyPostJitter(m, 42);
    expect(a.posts[0]?.location.y).toBe(b.posts[0]?.location.y);
  });

  it('keeps column + plane fixed and the row inside the band', () => {
    const m = makeMap([post('doorway', 5, 0, { minRow: 3, maxRow: 6 })]);
    for (let seed = 1; seed <= 50; seed++) {
      const r = applyPostJitter(m, seed).posts[0];
      expect(r?.location.x).toBe(5);
      expect(r?.location.plane).toBe('floor');
      expect(r?.location.y).toBeGreaterThanOrEqual(3);
      expect(r?.location.y).toBeLessThanOrEqual(6);
    }
  });

  it('actually varies the row across seeds (not a constant)', () => {
    const m = makeMap([post('doorway', 5, 0, { minRow: 0, maxRow: 9 })]);
    const rows = new Set(
      Array.from({ length: 40 }, (_, i) => applyPostJitter(m, i + 1).posts[0]?.location.y),
    );
    expect(rows.size).toBeGreaterThan(1);
  });

  it('a single-row band (minRow === maxRow) is fixed across seeds', () => {
    const m = makeMap([post('doorway', 5, 0, { minRow: 4, maxRow: 4 })]);
    for (let seed = 1; seed <= 10; seed++) {
      expect(applyPostJitter(m, seed).posts[0]?.location.y).toBe(4);
    }
  });

  it('clamps a band that overruns the plane height', () => {
    // 6-tall plane (rows 0–5) but a band of 4–20 → resolved row must
    // never exceed height-1 (5).
    const m = makeMap([post('doorway', 2, 0, { minRow: 4, maxRow: 20 })], 6);
    for (let seed = 1; seed <= 30; seed++) {
      const y = applyPostJitter(m, seed).posts[0]?.location.y ?? -1;
      expect(y).toBeGreaterThanOrEqual(4);
      expect(y).toBeLessThanOrEqual(5);
    }
  });

  it('leaves non-jittered posts untouched while resolving jittered ones', () => {
    const m = makeMap([
      post('home', 0, 0),
      post('doorway', 5, 1, { minRow: 3, maxRow: 6 }),
      post('end-door', 9, 9),
    ]);
    const out = applyPostJitter(m, 7);
    expect(out.posts[0]).toEqual(m.posts[0]);
    expect(out.posts[2]).toEqual(m.posts[2]);
    expect(out.posts[1]?.location.x).toBe(5);
    expect(out.posts[1]?.location.y).not.toBe(1);
  });
});
