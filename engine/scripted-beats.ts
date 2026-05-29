/**
 * L1-iteration #5 — scripted-beat trigger evaluator.
 *
 * Inspects the scenario's `beats` data + this turn's events. Fires any
 * beat whose trigger matches and hasn't already fired. Pure: returns
 * the new state (with updated `firedBeats`) plus the emitted events.
 * Gated-inert: if the scenario has no beats, both inputs are empty and
 * the function is a byte-identical no-op (no state change, no events).
 */

import type { Beat, BeatsFile } from './schemas/beats.ts';
import type { GameState, ReplayEvent } from './types.ts';

const matches = (beat: Beat, state: GameState, turnEvents: readonly ReplayEvent[]): boolean => {
  const t = beat.trigger;
  if ('turn' in t) return state.turn === t.turn;
  if ('postCaptured' in t) {
    for (const e of turnEvents) {
      if (e.kind === 'post-captured' && String(e.postId) === t.postCaptured) return true;
    }
  }
  return false;
};

export interface ScriptedBeatsOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

export const resolveScriptedBeats = (
  state: GameState,
  beats: BeatsFile | undefined,
  turnEvents: readonly ReplayEvent[],
  tick: () => number,
): ScriptedBeatsOutcome => {
  if (!beats || beats.beats.length === 0) return { state, events: [] };
  const fired = new Set(state.firedBeats ?? []);
  const events: ReplayEvent[] = [];
  for (const beat of beats.beats) {
    if (fired.has(beat.id)) continue;
    if (!matches(beat, state, turnEvents)) continue;
    fired.add(beat.id);
    events.push({
      kind: 'scripted-beat',
      turn: state.turn,
      tick: tick(),
      beatId: beat.id,
      title: beat.title,
      message: beat.message,
    });
  }
  if (events.length === 0) return { state, events: [] };
  return { state: { ...state, firedBeats: fired }, events };
};
