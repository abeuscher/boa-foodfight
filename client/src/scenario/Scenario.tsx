import { REPLAY } from '../fixture.ts';
import { SPEEDS, atEnd, currentEvent } from '../clock/clock.ts';
import { useClock } from '../clock/useClock.ts';

import { eventLabel, pauseReasonLabel } from './eventLabel.ts';

interface Props {
  readonly onExit: () => void;
}

/**
 * In-scenario playback view (replay-playback path). Drives the clock
 * core over a real L1 replay and renders the in-scenario chrome the
 * main-screen spec calls for: a HUD pod (play / pause / speed / step)
 * and a notification strip (auto-pause copy). The cube-view world
 * render is deferred (cube memo §D) — the world band is a structural
 * placeholder showing the event being played + a short rolling log.
 */
export function Scenario({ onExit }: Props): JSX.Element {
  const clock = useClock(REPLAY);
  const { state } = clock;
  const cur = currentEvent(state);
  const total = state.events.length;
  const recent = state.events.slice(Math.max(0, state.index - 8), state.index);

  return (
    <div className="scenario">
      <header className="scn-top">
        <button className="back" onClick={onExit}>
          ← End playback
        </button>
        <span className="scn-title">
          L1 — replay playback (dev stand-in for Deploy → Briefing → scenario)
        </span>
      </header>

      <div className="scn-world">
        <p className="scene-note">Cube view deferred (look-and-feel, cube memo §D).</p>
        <p className="scn-now">{cur ? eventLabel(cur) : 'Ready — press Play.'}</p>
        <ul className="scn-log">
          {recent.map((e, i) => (
            <li key={state.index - recent.length + i}>{eventLabel(e)}</li>
          ))}
        </ul>
        {atEnd(state) && <p className="scn-end">Playback complete.</p>}
      </div>

      <footer className="scn-hud">
        <div className="hud-pod">
          <button onClick={clock.toggle} disabled={atEnd(state)}>
            {state.playing ? '⏸ Pause' : '⏵ Play'}
          </button>
          <button onClick={clock.step} disabled={state.playing || atEnd(state)}>
            Step
          </button>
          <span className="speeds">
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                className={state.speed === sp ? 'active' : ''}
                onClick={() => clock.setSpeed(sp)}
              >
                {sp}×
              </button>
            ))}
          </span>
          <span className="hud-readout">
            Turn {cur?.turn ?? 0} · {state.index}/{total}
          </span>
        </div>
        <div className={`scn-notif ${state.pausedAt ? 'paused' : ''}`} role="status">
          {state.pausedAt
            ? `⏸ Paused — ${pauseReasonLabel(state.pausedAt)}`
            : cur
              ? eventLabel(cur)
              : 'Paused at start'}
        </div>
      </footer>
    </div>
  );
}
