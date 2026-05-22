import { useState } from 'react';

import type { WorldState } from '../../engine/world-state.ts';

import { INITIAL_STATE } from './fixture.ts';
import { Hill } from './hill/Hill.tsx';
import { LiveScenario } from './live/LiveScenario.tsx';
import { OrganizeArmy } from './organize/OrganizeArmy.tsx';
import { Recruit } from './recruit/Recruit.tsx';
import { Scenario } from './scenario/Scenario.tsx';
import { Shop } from './shop/Shop.tsx';
import { System } from './system/System.tsx';
import { antCount, noticeOf, type Apply, type Notice, type SubView } from './shared.ts';

type View = 'hill' | SubView | 'scenario' | 'live';

export function App(): JSX.Element {
  const [state, setState] = useState<WorldState>(INITIAL_STATE);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [view, setView] = useState<View>('hill');

  const apply: Apply = (next, result, okText) => {
    setState(next);
    setNotice(noticeOf(result, okText));
  };

  const goHill = (): void => {
    setView('hill');
    setNotice(null);
  };

  // In-scenario mode uses its own chrome (HUD pod + notification strip),
  // not the between-scenario shell — so it renders standalone.
  if (view === 'scenario') {
    return <Scenario onExit={goHill} />;
  }
  if (view === 'live') {
    return <LiveScenario onExit={goHill} />;
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
          onWatchReplay={() => setView('scenario')}
          onPlayLive={() => setView('live')}
        />
      )}
      {view === 'organize' && <OrganizeArmy state={state} apply={apply} />}
      {view === 'recruit' && <Recruit state={state} apply={apply} />}
      {view === 'shop' && <Shop state={state} apply={apply} />}
      {view === 'system' && <System />}
    </div>
  );
}
