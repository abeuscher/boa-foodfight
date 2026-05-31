import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_AUTO_PAUSE_KINDS, type Speed } from '../clock/clock.ts';
import { scenarioDataFor, scenarioPreserveFor } from '../fixture.ts';
import { pauseReasonLabel } from '../scenario/eventLabel.ts';

import { buildHumanPolicy, type PartyIntent } from './humanPolicy.ts';
import {
  MAX_TURNS,
  advanceOneTurn,
  createInitialState,
  resolveTerminal,
  type Terminal,
} from './liveScenario.ts';
import { computeVisibleTiles, visibleNonAntPartyIds } from './visibility.ts';

import { createRng } from '../../../engine/rng.ts';
import type {
  BattleResult,
  Faction,
  GameState,
  PartyId,
  ReplayEvent,
  TileCoord,
} from '../../../engine/types.ts';
import type { WorldRoster } from '../../../engine/world-state.ts';

const battlesFrom = (events: readonly ReplayEvent[]): readonly BattleResult[] => {
  const out: BattleResult[] = [];
  for (const e of events) if (e.kind === 'battle-resolved') out.push(e.result);
  return out;
};

const SEED = 1;

/** Wall-clock duration of one resolved turn at 1× speed. */
export const MS_PER_TURN = 700;

/** Build the scenario initial state for `scenarioIndex` (optionally
 * injecting a carried roster). Shared by the live hook and the
 * Briefing preview so both render the identical deterministic board
 * (same seed + roster + scenario data → same inject). Chunk B2 added
 * the scenarioIndex routing; before that the L1 data was a compile-
 * time import. */
export const buildScenarioState = (scenarioIndex: number, roster?: WorldRoster): GameState =>
  createInitialState(
    scenarioDataFor(scenarioIndex),
    SEED,
    roster,
    scenarioPreserveFor(scenarioIndex),
  );

const union = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>): Set<T> => {
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
  /** Non-ant party ids ever sighted — the basis for first-sighting-only
   * `newly-visible-enemy` pauses (ratified over per-turn re-fire in the
   * PR #44 QA pass: an enemy hovering at the vision edge shouldn't pause
   * every re-entry). */
  readonly seenEnemies: ReadonlySet<PartyId>;
  /** Battles resolved on the most recent turn (for the combat panel). */
  readonly battles: readonly BattleResult[];
}

const initialSnapshot = (scenarioIndex: number, roster?: WorldRoster): Snapshot => {
  const state = createInitialState(
    scenarioDataFor(scenarioIndex),
    SEED,
    roster,
    scenarioPreserveFor(scenarioIndex),
  );
  const visible = computeVisibleTiles(state);
  return {
    state,
    turnsPlayed: 0,
    recentEvents: [],
    pauseReason: null,
    visible,
    seen: visible,
    // Enemies already on screen at scenario start count as "already
    // sighted" — they don't trigger a sighting pause on turn 1.
    seenEnemies: visibleNonAntPartyIds(state, visible),
    battles: [],
  };
};

export interface LiveScenarioClock {
  readonly state: GameState;
  readonly turnsPlayed: number;
  readonly winner: Faction | null;
  /** Resolved terminal (score-aware) once the scenario has ended, else null. */
  readonly terminal: Terminal | null;
  readonly recentEvents: readonly ReplayEvent[];
  readonly pauseReason: string | null;
  readonly playing: boolean;
  readonly speed: Speed;
  readonly atEnd: boolean;
  readonly fogEnabled: boolean;
  readonly visible: ReadonlySet<string>;
  readonly seen: ReadonlySet<string>;
  readonly battles: readonly BattleResult[];
  /** Move destinations only — the Board uses this to paint destination
   * markers. Derived from the richer `intents` map; non-move intents
   * (hold, recruit) don't get a tile marker. */
  readonly orders: ReadonlyMap<PartyId, TileCoord>;
  /** Full per-party intent map for the action panel (so the rail can
   * surface "Recruiting <neutral>" or "Holding" state in addition to
   * march destinations). Chunk 24. */
  readonly intents: ReadonlyMap<PartyId, PartyIntent>;
  readonly play: () => void;
  readonly pause: () => void;
  readonly toggle: () => void;
  readonly setSpeed: (s: Speed) => void;
  readonly step: () => void;
  readonly toggleFog: () => void;
  /** Set a party's intent (move/hold/recruit) or pass `null` to clear
   * (revert to "no opinion"). */
  readonly setOrder: (id: PartyId, intent: PartyIntent | null) => void;
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
export function useLiveScenario(scenarioIndex: number, roster?: WorldRoster): LiveScenarioClock {
  const data = scenarioDataFor(scenarioIndex);
  const [snap, setSnap] = useState<Snapshot>(() => initialSnapshot(scenarioIndex, roster));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState<Speed>(1);
  const [fogEnabled, setFogEnabled] = useState(true);
  const [intents, setIntents] = useState<ReadonlyMap<PartyId, PartyIntent>>(() => new Map());

  const rngRef = useRef(createRng(SEED));
  const tickRef = useRef(0);
  // Mirrors so the interval closure always reads current values without
  // re-subscribing on every state change.
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const intentsRef = useRef(intents);
  intentsRef.current = intents;
  const fogRef = useRef(fogEnabled);
  fogRef.current = fogEnabled;

  const winner = snap.state.winner;
  const atEnd = winner !== null || snap.turnsPlayed >= MAX_TURNS;
  const terminal = atEnd ? resolveTerminal(snap.state) : null;

  const advance = useCallback(() => {
    const cur = snapRef.current;
    if (cur.state.winner !== null || cur.turnsPlayed >= MAX_TURNS) {
      setPlaying(false);
      return;
    }
    const player = buildHumanPolicy(intentsRef.current);
    const result = advanceOneTurn(
      cur.state,
      data,
      player,
      cur.turnsPlayed,
      rngRef.current,
      () => (tickRef.current += 1),
    );

    const visible = computeVisibleTiles(result.state);
    const seen = union(cur.seen, visible);

    const trigger = result.events.find((e) => DEFAULT_AUTO_PAUSE_KINDS.has(e.kind)) ?? null;
    // `newly-visible-enemy` (state-derived; on only when fog is on).
    // First-sighting-only: pause when an enemy is sighted that has never
    // been seen before, not on every re-entry into vision.
    const visibleEnemies = visibleNonAntPartyIds(result.state, visible);
    let sighted = false;
    if (fogRef.current) {
      for (const id of visibleEnemies) {
        if (!cur.seenEnemies.has(id)) {
          sighted = true;
          break;
        }
      }
    }
    const seenEnemies = union(cur.seenEnemies, visibleEnemies);
    const pauseReason = trigger ? pauseReasonLabel(trigger) : sighted ? 'Enemy sighted' : null;
    const ended = result.state.winner !== null || cur.turnsPlayed + 1 >= MAX_TURNS;

    const next: Snapshot = {
      state: result.state,
      turnsPlayed: cur.turnsPlayed + 1,
      recentEvents: result.events,
      pauseReason,
      visible,
      seen,
      seenEnemies,
      battles: battlesFrom(result.events),
    };
    snapRef.current = next;
    setSnap(next);

    // Post-turn intent housekeeping. Two cleanups, combined to avoid
    // two state updates:
    //
    // Chunk 23 — drop intents for parties that no longer have any
    // living units. Engine keeps dead parties in `state.parties` so
    // post-mortem UI can still look them up, but a stale entry in
    // intents would keep painting a destination marker on the board
    // for a squad that's already gone.
    //
    // Chunk 24 — recruit intents are one-shot. The engine fired the
    // ability this turn (success or fail); leaving the intent would
    // re-fire it next turn, polluting the event stream.
    setIntents((prev) => {
      let pruned = prev;
      for (const [id, intent] of prev) {
        const party = result.state.parties.get(id);
        const alive = party !== undefined && party.units.some((u) => u.currentHp > 0);
        if (alive && intent.kind !== 'recruit') continue;
        if (pruned === prev) pruned = new Map(prev);
        pruned.delete(id);
      }
      return pruned;
    });

    if (pauseReason !== null || ended) setPlaying(false);
  }, [data]);

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
  const setOrder = useCallback((id: PartyId, intent: PartyIntent | null) => {
    setIntents((prev) => {
      const next = new Map(prev);
      if (intent === null) next.delete(id);
      else next.set(id, intent);
      return next;
    });
  }, []);

  // Move-destination view derived from `intents` — Board paints
  // destination markers only for parties whose intent is `move`.
  const orders = new Map<PartyId, TileCoord>();
  for (const [id, intent] of intents) {
    if (intent.kind === 'move') orders.set(id, intent.dest);
  }

  return {
    state: snap.state,
    turnsPlayed: snap.turnsPlayed,
    winner,
    terminal,
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
    intents,
    play,
    pause,
    toggle,
    setSpeed,
    step,
    toggleFog,
    setOrder,
  };
}
