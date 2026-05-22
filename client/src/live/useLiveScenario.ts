import { useCallback, useEffect, useRef, useState } from 'react';

import scenarioData from '../fixtures/scenario-l1-data.json';

import { DEFAULT_AUTO_PAUSE_KINDS, type Speed } from '../clock/clock.ts';

import { buildHumanPolicy } from './humanPolicy.ts';
import { MAX_TURNS, advanceOneTurn, createInitialState } from './liveScenario.ts';

import { createRng } from '../../../engine/rng.ts';
import type { ScenarioData } from '../../../engine/state.ts';
import type { Faction, GameState, PartyId, ReplayEvent, TileCoord } from '../../../engine/types.ts';

const SEED = 1;

/** Wall-clock duration of one resolved turn at 1× speed. */
export const MS_PER_TURN = 700;

const DATA = scenarioData as unknown as ScenarioData;

interface Snapshot {
  readonly state: GameState;
  readonly turnsPlayed: number;
  /** Events from the most recent turn (for the rolling log). */
  readonly recentEvents: readonly ReplayEvent[];
  /** The auto-pause trigger this turn stopped on, else null. */
  readonly pausedAt: ReplayEvent | null;
}

export interface LiveScenarioClock {
  readonly state: GameState;
  readonly turnsPlayed: number;
  readonly winner: Faction | null;
  readonly recentEvents: readonly ReplayEvent[];
  readonly pausedAt: ReplayEvent | null;
  readonly playing: boolean;
  readonly speed: Speed;
  readonly atEnd: boolean;
  /** Player move intents (destination tile, `null` = hold, absent = no opinion). */
  readonly orders: ReadonlyMap<PartyId, TileCoord | null>;
  readonly play: () => void;
  readonly pause: () => void;
  readonly toggle: () => void;
  readonly setSpeed: (s: Speed) => void;
  readonly step: () => void;
  /** Set (coord), hold (null), or clear (undefined) a party's order. */
  readonly setOrder: (id: PartyId, dest: TileCoord | null | undefined) => void;
}

/**
 * React driver for the live engine-in-browser run. Owns the stateful
 * engine bits (the base `rng`, the monotonic `tick`) in refs and mirrors
 * the resolved `GameState` into render state. Playback advances one
 * whole turn per beat (real-time-with-pause, pacing memo §A.1): a
 * `setInterval` resolves a turn every `MS_PER_TURN / speed` while
 * playing, auto-pausing the beat after any turn that emits an
 * event-keyed trigger (`post-captured` / `battle-resolved` / …).
 */
export function useLiveScenario(): LiveScenarioClock {
  const [snap, setSnap] = useState<Snapshot>(() => ({
    state: createInitialState(DATA, SEED),
    turnsPlayed: 0,
    recentEvents: [],
    pausedAt: null,
  }));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState<Speed>(1);
  const [orders, setOrders] = useState<ReadonlyMap<PartyId, TileCoord | null>>(() => new Map());

  const rngRef = useRef(createRng(SEED));
  const tickRef = useRef(0);
  // Mirrors so the interval closure always reads current values without
  // re-subscribing on every state change.
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const winner = snap.state.winner;
  const atEnd = winner !== null || snap.turnsPlayed >= MAX_TURNS;

  const advance = useCallback(() => {
    const cur = snapRef.current;
    if (cur.state.winner !== null || cur.turnsPlayed >= MAX_TURNS) {
      setPlaying(false);
      return;
    }
    const player = buildHumanPolicy(ordersRef.current);
    const result = advanceOneTurn(
      cur.state,
      DATA,
      player,
      cur.turnsPlayed,
      rngRef.current,
      () => (tickRef.current += 1),
    );
    const trigger = result.events.find((e) => DEFAULT_AUTO_PAUSE_KINDS.has(e.kind)) ?? null;
    const ended = result.state.winner !== null || cur.turnsPlayed + 1 >= MAX_TURNS;
    const next: Snapshot = {
      state: result.state,
      turnsPlayed: cur.turnsPlayed + 1,
      recentEvents: result.events,
      pausedAt: trigger,
    };
    snapRef.current = next;
    setSnap(next);
    if (trigger !== null || ended) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(advance, MS_PER_TURN / speed);
    return () => {
      clearInterval(id);
    };
  }, [playing, speed, advance]);

  const play = useCallback(() => {
    const cur = snapRef.current;
    if (cur.state.winner !== null || cur.turnsPlayed >= MAX_TURNS) return;
    setSnap((s) => ({ ...s, pausedAt: null }));
    setPlaying(true);
  }, []);
  const pause = useCallback(() => {
    setPlaying(false);
  }, []);
  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (p) return false;
      const cur = snapRef.current;
      return !(cur.state.winner !== null || cur.turnsPlayed >= MAX_TURNS);
    });
  }, []);
  const setSpeed = useCallback((s: Speed) => {
    setSpeedState(s);
  }, []);
  const step = useCallback(() => {
    setPlaying(false);
    advance();
  }, [advance]);
  const setOrder = useCallback((id: PartyId, dest: TileCoord | null | undefined) => {
    setOrders((prev) => {
      const next = new Map(prev);
      if (dest === undefined) next.delete(id);
      else next.set(id, dest);
      return next;
    });
  }, []);

  return {
    state: snap.state,
    turnsPlayed: snap.turnsPlayed,
    winner,
    recentEvents: snap.recentEvents,
    pausedAt: snap.pausedAt,
    playing,
    speed,
    atEnd,
    orders,
    play,
    pause,
    toggle,
    setSpeed,
    step,
    setOrder,
  };
}
