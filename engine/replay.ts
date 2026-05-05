/**
 * Replay log infrastructure. Events are the canonical record of what
 * happened in a scenario; tests, critics, and the Phase 5 viewer all read
 * the JSONL stream this module produces.
 */

import fs from 'node:fs';

import type { ReplayEvent } from './types.ts';

export interface ReplaySink {
  emit(event: ReplayEvent): void;
  events(): readonly ReplayEvent[];
  close(): void;
}

/** In-memory sink used by tests and one-off introspection. */
export const createMemorySink = (): ReplaySink => {
  const buffer: ReplayEvent[] = [];
  return {
    emit(event) {
      buffer.push(event);
    },
    events() {
      return buffer;
    },
    close() {
      // no-op
    },
  };
};

/** JSONL sink writing one event per line to an open file handle. */
export const createFileSink = (filePath: string): ReplaySink => {
  const fd = fs.openSync(filePath, 'w');
  const buffer: ReplayEvent[] = [];
  return {
    emit(event) {
      buffer.push(event);
      fs.writeSync(fd, JSON.stringify(event) + '\n');
    },
    events() {
      return buffer;
    },
    close() {
      fs.closeSync(fd);
    },
  };
};

/**
 * Monotonic tick counter. Each ReplayEvent carries `tick`; emit() increments
 * automatically so events have a stable total order even within the same turn.
 */
export interface TickClock {
  readonly current: () => number;
  readonly next: () => number;
}

export const createTickClock = (): TickClock => {
  let tick = 0;
  return {
    current: () => tick,
    next: () => ++tick,
  };
};
