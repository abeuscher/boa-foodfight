import { useCallback, useEffect, useRef, useState } from 'react';

import scenarioData from '../fixtures/scenario-l1-data.json';

import { DEFAULT_AUTO_PAUSE_KINDS, type Speed } from '../clock/clock.ts';
import { pauseReasonLabel } from '../scenario/eventLabel.ts';

import { buildHumanPolicy } from './humanPolicy.ts';
import { MAX_TURNS, advanceOneTurn, createInitialState } from './liveScenario.ts';
import { computeVisibleTiles, visibleNonAntPartyIds } from './visibility.ts';

import { createRng } from '../../../engine/rng.ts';
import type { ScenarioData } from '../../../engine/state.ts';
import type {
  BattleResult,
  Faction,
  GameState,
  PartyId,
  ReplayEvent,
  TileCoord,
} from '../../../engine/types.ts';

const battlesFrom = (events: readonly ReplayEvent[]): readonly BattleResult[] => {
  const out: BattleResult[] = [];
  for (const e of events) if (e.kind === 'battle-resolved') out.push(e.result);
  return out;
};

const SEED = 1;

/** Wall-clock duration of one resolved turn at 1× speed. */
export const MS_PER_TURN = 700;

const DATA = scenarioData as unknown as ScenarioData;

const union = (a: ReadonlySet<string>, b: ReadonlySet<string>): Set<string> => {
  const out = new Set(a);
  for (const k of b) out.add(k);
  return out;
};

interface Snapshot {
  readonly state: GameState;
  readonly turnsPlayed: number;
  /** Events from the most recent turn (for the rolling log). */
  readonly recentEvents: readonly ReplayEvent[];
  /** Ready-to-show auto-pause cause, else null. */
  readonly pauseReason: string | null;
  /** Tiles the ant player can see right now (union of party vision disks). */
  readonly visible: ReadonlySet<string>;
  /** Tiles ever seen — explored terrain stays dimly rendered. */
  readonly seen: ReadonlySet<string>;
  /** Battles resolved on the most recent turn (for the combat panel). */
  readonly battles: readonly BattleResult[];
}

const initialSnapshot = (): Snapshot => {
  const state = createInitialState(DATA, SEED);
  const visible = computeVisibleTiles(state);
  return {
    state,
    turnsPlayed: 0,
    recentEvents: [],
    pauseReason: null,
    visible,
    seen: visible,
    battles: [],
  };
};

export interface LiveScenarioClock {
  readonly state: GameState;
  readonly turnsPlayed: number;
  readonly winner: Faction | null;
  readonly recentEvents: readonly ReplayEvent[];
  readonly pauseReason: string | null;
  readonly playing: boolean;
  readonly speed: Speed;
  readonly atEnd: boolean;
  readonly fogEnabled: boolean;
  readonly visible: ReadonlySet<string>;
  readonly seen: ReadonlySet<string>;
  readonly battles: readonly BattleResult[];
  /** Player move intents (destination tile, `null` = hold, absent = no opinion). */
  readonly orders: ReadonlyMap<PartyId, TileCoord | null>;
  readonly play: () => void;
  readonly pause: () => void;
  readonly toggle: () => void;
  readonly setSpeed: (s: Speed) => void;
  readonly step: () => void;
  readonly toggleFog: () => void;
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
 * event-keyed trigger (`post-captured` / `battle-resolved` / …) or — when
 * fog is on — surfaces a `newly-visible-enemy` (auto-pause draft §3d).
 */
export function useLiveScenario(): LiveScenarioClock {
  const [snap, setSnap] = useState<Snapshot>(initialSnapshot);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState<Speed>(1);
  const [fogEnabled, setFogEnabled] = useState(true);
  const [orders, setOrders] = useState<ReadonlyMap<PartyId, TileCoord | null>>(() => new Map());

  const rngRef = useRef(createRng(SEED));
  const tickRef = useRef(0);
  // Mirrors so the interval closure always reads current values without
  // re-subscribing on every state change.
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const fogRef = useRef(fogEnabled);
  fogRef.current = fogEnabled;

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

    const visible = computeVisibleTiles(result.state);
    const seen = union(cur.seen, visible);

    const trigger = result.events.find((e) => DEFAULT_AUTO_PAUSE_KINDS.has(e.kind)) ?? null;
    // `newly-visible-enemy` (state-derived; on only when fog is on).
    let sighted = false;
    if (fogRef.current) {
      const before = visibleNonAntPartyIds(cur.state, cur.visible);
      const after = visibleNonAntPartyIds(result.state, visible);
      for (const id of after) {
        if (!before.has(id)) {
          sighted = true;
          break;
        }
      }
    }
    const pauseReason = trigger ? pauseReasonLabel(trigger) : sighted ? 'Enemy sighted' : null;
    const ended = result.state.winner !== null || cur.turnsPlayed + 1 >= MAX_TURNS;

    const next: Snapshot = {
      state: result.state,
      turnsPlayed: cur.turnsPlayed + 1,
      recentEvents: result.events,
      pauseReason,
      visible,
      seen,
      battles: battlesFrom(result.events),
    };
    snapRef.current = next;
    setSnap(next);
    if (pauseReason !== null || ended) setPlaying(false);
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
    setSnap((s) => ({ ...s, pauseReason: null }));
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
  const toggleFog = useCallback(() => {
    setFogEnabled((f) => !f);
  }, []);
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
    pauseReason: snap.pauseReason,
    playing,
    speed,
    atEnd,
    fogEnabled,
    visible: snap.visible,
    seen: snap.seen,
    battles: snap.battles,
    orders,
    play,
    pause,
    toggle,
    setSpeed,
    step,
    toggleFog,
    setOrder,
  };
}
