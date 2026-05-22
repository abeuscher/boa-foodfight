import { useCallback, useEffect, useRef, useState } from 'react';

import type { ReplayEvent } from '../../../engine/types.ts';

import {
  createClock,
  pause,
  play,
  setSpeed,
  step,
  tick,
  type ClockState,
  type Speed,
} from './clock.ts';

export interface Clock {
  readonly state: ClockState;
  readonly play: () => void;
  readonly pause: () => void;
  readonly toggle: () => void;
  readonly setSpeed: (s: Speed) => void;
  readonly step: () => void;
}

/**
 * React driver for the pure clock core. A requestAnimationFrame loop
 * advances the clock by elapsed wall time while playing; the core
 * decides auto-pause / end-of-stream (the loop just feeds it `dtMs`).
 * All playback logic lives in `clock.ts` (unit-tested); this hook is
 * the thin, untestable-in-sandbox timer shell.
 */
export function useClock(events: readonly ReplayEvent[]): Clock {
  const [state, setState] = useState<ClockState>(() => createClock(events));
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state.playing) {
      lastRef.current = null;
      return;
    }
    let raf = 0;
    const loop = (t: number): void => {
      const last = lastRef.current;
      lastRef.current = t;
      if (last !== null) setState((s) => tick(s, t - last));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lastRef.current = null;
    };
  }, [state.playing]);

  return {
    state,
    play: useCallback(() => setState(play), []),
    pause: useCallback(() => setState(pause), []),
    toggle: useCallback(() => setState((s) => (s.playing ? pause(s) : play(s))), []),
    setSpeed: useCallback((s: Speed) => setState((prev) => setSpeed(prev, s)), []),
    step: useCallback(() => setState(step), []),
  };
}
