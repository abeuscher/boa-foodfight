import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createFileSink, createMemorySink, createTickClock } from './replay.ts';
import type { ReplayEvent } from './types.ts';

const tempFiles: string[] = [];
afterEach(() => {
  while (tempFiles.length > 0) {
    const p = tempFiles.pop();
    if (p && fs.existsSync(p)) fs.unlinkSync(p);
  }
});

describe('memory sink', () => {
  it('accumulates events in emit order', () => {
    const sink = createMemorySink();
    const ev: ReplayEvent = { kind: 'turn-start', turn: 1, tick: 1 };
    sink.emit(ev);
    sink.emit({ kind: 'turn-start', turn: 2, tick: 2 });
    expect(sink.events()).toHaveLength(2);
    expect(sink.events()[0]).toEqual(ev);
  });
});

describe('file sink', () => {
  it('writes one JSON object per line', () => {
    const file = path.join(
      os.tmpdir(),
      `replay-test-${String(Date.now())}-${String(Math.random())}.jsonl`,
    );
    tempFiles.push(file);
    const sink = createFileSink(file);
    sink.emit({ kind: 'turn-start', turn: 1, tick: 1 });
    sink.emit({ kind: 'turn-start', turn: 2, tick: 2 });
    sink.close();
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0] ?? '')).toEqual({ kind: 'turn-start', turn: 1, tick: 1 });
  });
});

describe('tick clock', () => {
  it('starts at 0 and increments monotonically', () => {
    const c = createTickClock();
    expect(c.current()).toBe(0);
    expect(c.next()).toBe(1);
    expect(c.next()).toBe(2);
    expect(c.current()).toBe(2);
  });
});
