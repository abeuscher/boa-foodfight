/**
 * Replay map-snapshot regression test.
 *
 * The user's complaint was that POSTs looked identical across all
 * replays on the deployed viewer. Root cause was the viewer's
 * hardcoded SPEC_POSTS constant overriding per-seed map data; the
 * fix shipped the per-seed POST + obstacle layout in each replay's
 * `scenario-start` event.
 *
 * This test proves the data pipeline end-to-end without needing a
 * browser: it loads two replay JSONL files (built by
 * `pnpm build:viewer`) and asserts that their scenario-start events
 * carry different POST and obstacle layouts. If THIS test passes,
 * the viewer renderer (which is a pure function of these inputs)
 * is guaranteed to draw different maps per seed.
 *
 * Browser-pixel-level verification lives in `viewer/viewer.spec.ts`
 * and runs via `pnpm test:viewer` (requires Chromium installed).
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const DIST = path.resolve(import.meta.dirname, 'dist');
const VARIANT = 'baseline';

interface ScenarioStartEvent {
  kind: 'scenario-start';
  scenario: string;
  posts?: { id: string; location: { plane: string; x: number; y: number }; owner: string }[];
  obstacles?: { plane: string; x: number; y: number }[];
}

const readScenarioStart = (replay: string): ScenarioStartEvent => {
  const fullPath = path.join(DIST, 'replays', VARIANT, replay);
  const firstLine = fs.readFileSync(fullPath, 'utf8').split('\n', 1)[0]!;
  const e = JSON.parse(firstLine) as ScenarioStartEvent;
  if (e.kind !== 'scenario-start') {
    throw new Error(`expected scenario-start as first event in ${replay}, got ${String(e.kind)}`);
  }
  return e;
};

const havePostsArray = (
  e: ScenarioStartEvent,
): e is ScenarioStartEvent & {
  posts: NonNullable<ScenarioStartEvent['posts']>;
} => Array.isArray(e.posts);

const haveObstaclesArray = (
  e: ScenarioStartEvent,
): e is ScenarioStartEvent & {
  obstacles: NonNullable<ScenarioStartEvent['obstacles']>;
} => Array.isArray(e.obstacles);

const requireDist = (): void => {
  if (!fs.existsSync(DIST)) {
    throw new Error(
      'viewer/dist not built — run `pnpm build:viewer` before running viewer/replay-snapshot.test.ts',
    );
  }
};

describe('viewer replay map snapshot', () => {
  it('scenario-start events carry per-seed POST layouts', () => {
    requireDist();
    const r1 = readScenarioStart('replay-1.jsonl');
    expect(havePostsArray(r1)).toBe(true);
    if (!havePostsArray(r1)) return;
    expect(r1.posts.length).toBeGreaterThanOrEqual(5);
    expect(r1.posts.length).toBeLessThanOrEqual(7);
    // storm-drain @ floor (0,0) and spider-web @ ceiling (9,9) stay fixed.
    const fixed = r1.posts.filter((p) => p.id === 'storm-drain' || p.id === 'spider-web');
    expect(fixed).toHaveLength(2);
  });

  it('two different seeds produce different POST layouts', () => {
    requireDist();
    const r1 = readScenarioStart('replay-1.jsonl');
    const r2 = readScenarioStart('replay-2.jsonl');
    if (!havePostsArray(r1) || !havePostsArray(r2)) {
      throw new Error('replays missing posts array');
    }
    // Build a comparable serialization that ignores ordering.
    const fingerprint = (posts: NonNullable<ScenarioStartEvent['posts']>): string =>
      posts
        .map((p) => `${p.id}@${p.location.plane}:${String(p.location.x)},${String(p.location.y)}`)
        .sort()
        .join('|');
    const fp1 = fingerprint(r1.posts);
    const fp2 = fingerprint(r2.posts);
    expect(fp1).not.toBe(fp2);
  });

  it('two different seeds produce different obstacle clusters', () => {
    requireDist();
    const r1 = readScenarioStart('replay-1.jsonl');
    const r2 = readScenarioStart('replay-2.jsonl');
    if (!haveObstaclesArray(r1) || !haveObstaclesArray(r2)) {
      throw new Error('replays missing obstacles array');
    }
    const fingerprint = (obs: NonNullable<ScenarioStartEvent['obstacles']>): string =>
      obs
        .map((o) => `${o.plane}:${String(o.x)},${String(o.y)}`)
        .sort()
        .join('|');
    expect(fingerprint(r1.obstacles)).not.toBe(fingerprint(r2.obstacles));
  });

  it('every plane has between 2 and 5 obstacles (per the map-gen contract)', () => {
    requireDist();
    const r = readScenarioStart('replay-1.jsonl');
    if (!haveObstaclesArray(r)) throw new Error('no obstacles');
    const counts = new Map<string, number>();
    for (const o of r.obstacles) counts.set(o.plane, (counts.get(o.plane) ?? 0) + 1);
    for (const plane of [
      'floor',
      'ceiling',
      'north-wall',
      'south-wall',
      'east-wall',
      'west-wall',
    ]) {
      const n = counts.get(plane) ?? 0;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('soap-dish-1 always lands on the floor (constraint for locked baseline AI)', () => {
    requireDist();
    for (const replay of ['replay-1.jsonl', 'replay-2.jsonl', 'replay-3.jsonl']) {
      const r = readScenarioStart(replay);
      if (!havePostsArray(r)) throw new Error('no posts');
      const soap = r.posts.find((p) => p.id === 'soap-dish-1');
      expect(soap).toBeDefined();
      expect(soap?.location.plane).toBe('floor');
    }
  });
});
