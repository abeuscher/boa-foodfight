import { useEffect, useRef, useState } from 'react';

import { extractWorldRoster } from '../../engine/world-extract.ts';
import { applyRosterLevelUps } from '../../engine/world-levelup.ts';
import { barracksUnits } from '../../engine/world-organize.ts';
import type { WorldState } from '../../engine/world-state.ts';

import { Briefing } from './briefing/Briefing.tsx';
import { INITIAL_STATE } from './fixture.ts';
import { Hill } from './hill/Hill.tsx';
import { EndScreen } from './live/EndScreen.tsx';
import { computeEndStats } from './live/endStats.ts';
import { LiveScenario } from './live/LiveScenario.tsx';
import type { LiveOutcome } from './live/liveScenario.ts';
import { scenarioReward } from './live/reward.ts';
import { OrganizeArmy } from './organize/OrganizeArmy.tsx';
import { Recruit } from './recruit/Recruit.tsx';
import { clearStorage, hasSavedState, loadFromStorage, saveToStorage } from './save.ts';
import { Scenario } from './scenario/Scenario.tsx';
import { Shop } from './shop/Shop.tsx';
import { StartScreen } from './start/StartScreen.tsx';
import { System } from './system/System.tsx';
import { antCount, noticeOf, type Apply, type Notice, type SubView } from './shared.ts';

type View = 'start' | 'hill' | SubView | 'briefing' | 'scenario' | 'live' | 'end';

export function App(): JSX.Element {
  // Chunk B5 — boot from localStorage if a save exists, else dev seed.
  // Both states have campaignId 'l1-dev' today; future multi-campaign
  // support would key load on the player's chosen campaign id.
  const [state, setState] = useState<WorldState>(
    () => loadFromStorage(INITIAL_STATE.campaignId) ?? INITIAL_STATE,
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [view, setView] = useState<View>('start');
  const [outcome, setOutcome] = useState<LiveOutcome | null>(null);
  // Snapshot at boot — was a save already present in storage? Drives
  // whether StartScreen's "Continue" item activates. Captured once,
  // not reactive: a save written this session shouldn't retroactively
  // enable Continue mid-flight (the player would just be in the Hill).
  const bootHadSave = useRef(hasSavedState(INITIAL_STATE.campaignId));

  // Persist on every state change after mount. Skipping mount avoids
  // writing the dev seed on first-ever boot — only real progress (a
  // post-victory advance, an organize/recruit/shop change) triggers a
  // save, so `hasSavedState` reflects actual played-through state, not
  // "the app loaded once."
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    saveToStorage(state);
  }, [state]);

  const apply: Apply = (next, result, okText) => {
    setState(next);
    setNotice(noticeOf(result, okText));
  };

  const goHill = (): void => {
    setView('hill');
    setNotice(null);
  };

  // Continue from the end-of-scenario screen runs the world loop: a win
  // extracts the surviving/leveled roster, awards buttons, and advances
  // the scenario index back at the Hill; a loss resets to a new game
  // (no client-side save yet to honor — clean seam for when it lands).
  const onContinue = (): void => {
    if (!outcome) return;
    if (outcome.terminal.winner === 'ant') {
      const reward = scenarioReward(outcome.finalState, outcome.turnsPlayed);
      const extracted = extractWorldRoster({
        finalState: outcome.finalState,
        winner: 'ant',
        carryForward: barracksUnits(state.roster),
      });
      const leveled = applyRosterLevelUps(extracted, outcome.finalState.unitTemplates).roster;
      setState({
        ...state,
        roster: leveled,
        gold: state.gold + reward.total,
        scenarioIndex: state.scenarioIndex + 1,
        savedAt: new Date().toISOString(),
      });
      setNotice({ kind: 'ok', text: `Victory — +${String(reward.total)} buttons` });
      setOutcome(null);
      setView('hill');
    } else {
      // Defeat reset — clear the save so the next boot's Continue
      // doesn't resurrect the just-lost campaign.
      clearStorage(state.campaignId);
      bootHadSave.current = false;
      setState(INITIAL_STATE);
      setOutcome(null);
      setView('start');
    }
  };

  if (view === 'start') {
    return (
      <StartScreen
        onNewGame={() => {
          // Route A (Exchange #13 §7.17): fresh campaign → Briefing →
          // scenario, skipping the Hill. Chunk B5 — clear any prior
          // save so the next boot doesn't resurrect the abandoned run.
          clearStorage(INITIAL_STATE.campaignId);
          bootHadSave.current = false;
          setState(INITIAL_STATE);
          setOutcome(null);
          setView('briefing');
        }}
        onContinue={
          bootHadSave.current
            ? () => {
                // State is already the loaded save (useState initializer);
                // just route into the Hill.
                setView('hill');
              }
            : undefined
        }
      />
    );
  }
  // In-scenario / takeover modes use their own chrome (not the
  // between-scenario shell) — they render standalone.
  if (view === 'scenario') {
    return <Scenario onExit={goHill} />;
  }
  if (view === 'briefing') {
    return <Briefing state={state} onBegin={() => setView('live')} onCancel={goHill} />;
  }
  if (view === 'live') {
    return (
      <LiveScenario
        scenarioIndex={state.scenarioIndex}
        roster={state.roster}
        onExit={goHill}
        onEnd={(o) => {
          setOutcome(o);
          setView('end');
        }}
      />
    );
  }
  if (view === 'end' && outcome) {
    const win = outcome.terminal.winner === 'ant';
    return (
      <EndScreen
        stats={computeEndStats(outcome.finalState, outcome.terminal, outcome.turnsPlayed)}
        reward={win ? scenarioReward(outcome.finalState, outcome.turnsPlayed) : null}
        continueLabel={win ? 'Continue' : 'Back to start'}
        onContinue={onContinue}
      />
    );
  }

  return (
    <div className="oa hill-shell">
      <header className="topband">
        {view !== 'hill' && (
          <button className="back" onClick={goHill}>
            ← Back to Hill
          </button>
        )}
        <span className="resource-strip">
          <span className="res">{state.gold} buttons</span>
          <span className="res">{antCount(state.roster)} ants</span>
        </span>
      </header>

      {notice && (
        <div className={`notice ${notice.kind}`} role="status">
          {notice.text}
        </div>
      )}

      {view === 'hill' && (
        <Hill
          state={state}
          onOpen={setView}
          onDeploy={() => setView('briefing')}
          onWatchReplay={() => setView('scenario')}
        />
      )}
      {view === 'organize' && <OrganizeArmy state={state} apply={apply} />}
      {view === 'recruit' && <Recruit state={state} apply={apply} />}
      {view === 'shop' && <Shop state={state} apply={apply} />}
      {view === 'system' && <System />}
    </div>
  );
}
