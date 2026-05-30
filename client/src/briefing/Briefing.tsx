import { useEffect, useState } from 'react';

import type { WorldState } from '../../../engine/world-state.ts';
import { Board } from '../live/Board.tsx';
import { buildScenarioState } from '../live/useLiveScenario.ts';
import { antCount } from '../shared.ts';

import type { GameState, TileCoord } from '../../../engine/types.ts';

interface Props {
  readonly state: WorldState;
  /** OK → orientation moment → into the live scenario. */
  readonly onBegin: () => void;
  /** Cancel out without deploying (shell-spec back-to-Hill). */
  readonly onCancel: () => void;
}

const EMPTY_SET: ReadonlySet<string> = new Set();
const NO_DEST = new Map();
const ORIENT_MS = 2200;

/** Per-scenario briefing copy. Chunk B2 — the title was hardcoded
 * "L1 — The Bathroom" and Antonio's body text was bathroom-flavored;
 * now keyed by `scenarioIndex` with a generic fallback so adding L3+
 * is one entry per scenario. Body remains placeholder per the
 * existing `ui-briefing-spec` note (per-scenario voice library is a
 * forward dep). */
interface BriefingCopy {
  readonly title: string;
  readonly body: readonly string[];
}

const BRIEFINGS: Record<number, BriefingCopy> = {
  0: {
    title: 'L1 — The Bathroom',
    body: [
      'Recruits! The porcelain expanse before us is no place for the timid.',
      'Eight-legged occupiers have dug in across the tiles and claimed the high ground. We march, we hold, we take what is ours — for the colony, for the Queen.',
      'Form up. Antonio does not deploy cowards.',
    ],
  },
  1: {
    title: 'L2 — The Pipe',
    body: [
      "Listen up. The wall pipe is our highway to the kitchen — and Aunt Ant rides with us. She doesn't fight; she's the colony's next queen-in-waiting.",
      'Escort her end-to-end. Spiders will hold the pinch points; flank through the skylight or push straight through, but get her to the pipe exit.',
      'Lose her and the campaign ends here. No pressure.',
    ],
  },
};

const briefingFor = (scenarioIndex: number): BriefingCopy =>
  BRIEFINGS[scenarioIndex] ?? {
    title: `Scenario ${String(scenarioIndex + 1)}`,
    body: ['(Briefing copy not yet authored for this scenario.)'],
  };

interface Spot {
  readonly loc: TileCoord;
  readonly name: string;
}

const startSpot = (preview: GameState): Spot | null => {
  const ant =
    [...preview.parties.values()].find(
      (p) => p.faction === 'ant' && p.id === ('queen-guard' as never),
    ) ?? [...preview.parties.values()].find((p) => p.faction === 'ant');
  return ant ? { loc: ant.location, name: 'the colony' } : null;
};

interface Goal {
  readonly loc: TileCoord;
  readonly name: string;
  /** The action verb the briefing uses: "Capture" vs "Escort to" vs … */
  readonly verb: string;
}

const goalSpot = (preview: GameState): Goal | null => {
  const vc = preview.victoryCondition;
  if (!vc) return null;
  if (vc.kind === 'capture-post') {
    const post = preview.posts.get(vc.postId);
    if (post) return { loc: post.location, name: post.name, verb: 'Capture' };
  }
  if (vc.kind === 'escort') {
    // L2 — escort the escortee unit to `exitPostId`. The post location
    // doubles as the briefing's GOAL pulse so the player sees where
    // they're heading, same as a capture-post objective.
    const post = preview.posts.get(vc.exitPostId);
    if (post) return { loc: post.location, name: post.name, verb: 'Escort to' };
  }
  return null;
};

/**
 * Briefing view (ui-briefing-spec): Sergeant Antonio's panel over a faded
 * cube view of the starting room, then an orientation moment (START / GOAL
 * pulse) on OK before the scenario opens paused. Structural pass — Antonio
 * copy is placeholder (per-scenario voice library is a forward dep), the
 * portrait + cinematic treatment are §D-deferred, and the orientation
 * moment is the simplified direction-only beat (no path preview, §A.3).
 */
export function Briefing({ state, onBegin, onCancel }: Props): JSX.Element {
  const [preview] = useState<GameState>(() =>
    buildScenarioState(state.scenarioIndex, state.roster),
  );
  const [phase, setPhase] = useState<'reading' | 'orienting'>('reading');

  const copy = briefingFor(state.scenarioIndex);
  const start = startSpot(preview);
  const goal = goalSpot(preview);
  const plane = start?.loc.plane ?? 'floor';
  const marks: { coord: TileCoord; kind: 'start' | 'goal' }[] = [];
  if (start) marks.push({ coord: start.loc, kind: 'start' });
  if (goal) marks.push({ coord: goal.loc, kind: 'goal' });

  useEffect(() => {
    if (phase !== 'orienting') return undefined;
    const id = setTimeout(onBegin, ORIENT_MS);
    return () => {
      clearTimeout(id);
    };
  }, [phase, onBegin]);

  const goalLine = goal
    ? `${goal.verb} ${goal.name}${goal.loc.plane !== plane ? ` (${goal.loc.plane})` : ''}.`
    : 'Hold the line.';

  return (
    <div className="briefing">
      <header className="briefing-strip">
        <button className="back" onClick={onCancel}>
          ← Hill
        </button>
        <span className="resource-strip">
          <span className="res">{state.gold} buttons</span>
          <span className="res">{antCount(state.roster)} ants</span>
        </span>
      </header>

      <div className={`briefing-stage ${phase === 'reading' ? 'faded' : 'live'}`}>
        <Board
          state={preview}
          plane={plane}
          selectedPartyId={null}
          ordering={false}
          destinations={NO_DEST}
          onClickTile={() => {}}
          fogEnabled={false}
          visible={EMPTY_SET}
          seen={EMPTY_SET}
          marks={phase === 'orienting' ? marks : []}
        />
        {phase === 'orienting' && (
          <p className="orient-caption">
            START → GOAL{goal && goal.loc.plane !== plane ? ` · ${goal.loc.plane}` : ''}
          </p>
        )}
      </div>

      {phase === 'reading' && (
        <div className="briefing-panel">
          <div className="bp-portrait" aria-hidden>
            <span className="bp-emblem">🐜</span>
            <span className="bp-name">Sgt. Antonio</span>
          </div>
          <div className="bp-body-col">
            <h2 className="bp-title">{copy.title}</h2>
            <div className="bp-body">
              {copy.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <p className="bp-placeholder">
                (Briefing copy is placeholder — authored per scenario.)
              </p>
            </div>
            <div className="bp-goal">Objective: {goalLine}</div>
            <button className="bp-ok" onClick={() => setPhase('orienting')}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
