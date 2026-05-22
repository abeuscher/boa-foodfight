import type { WorldState } from '../../../engine/world-state.ts';

import { type SubView } from '../shared.ts';

interface Props {
  readonly state: WorldState;
  readonly onOpen: (view: SubView) => void;
  readonly onWatchReplay: () => void;
}

/**
 * The Hill hub landing (ui-hill-hub-spec): verb rail (left) + Hill
 * scene (right) + scenario-context band (bottom). Scene art is deferred
 * (cube memo §D) — this is the structural frame. Deploy leads to the
 * Briefing, which isn't built yet, so it's disabled here.
 */
export function Hill({ state, onOpen, onWatchReplay }: Props): JSX.Element {
  return (
    <div className="hill">
      <div className="hill-mid">
        <nav className="verb-rail">
          <button className="verb deploy" disabled title="Briefing + scenario not built yet">
            Deploy
          </button>
          <button className="verb" onClick={() => onOpen('organize')}>
            Organize Army
          </button>
          <button className="verb" onClick={() => onOpen('recruit')}>
            Recruit
          </button>
          <button className="verb" onClick={() => onOpen('shop')}>
            Shop
          </button>
          <button className="verb" onClick={() => onOpen('system')}>
            System
          </button>
        </nav>
        <div className="hill-scene">
          <p className="scene-note">The Hill — home base.</p>
          <p className="scene-sub">
            Scene art deferred (cube memo §D); structural frame only. The anthill (Recruit), the
            Grasshopper (Shop), the staging ground (Organize Army), and Antonio would render here.
          </p>
          <button className="watch-replay" onClick={onWatchReplay}>
            ▶ Watch L1 replay (dev) — in-scenario playback
          </button>
        </div>
      </div>
      <footer className="scenario-context">
        <div className="ctx-title">Scenario {state.scenarioIndex + 1}</div>
        <div className="ctx-framing">
          The all-mechanics-on reference build. (Framing copy is placeholder — authored per
          scenario.)
        </div>
      </footer>
    </div>
  );
}
