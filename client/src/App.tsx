import { useState } from 'react';

import type { WorldState } from '../../engine/world-state.ts';

import { INITIAL_STATE } from './fixture.ts';
import { Hill } from './hill/Hill.tsx';
import { OrganizeArmy } from './organize/OrganizeArmy.tsx';
import { Recruit } from './recruit/Recruit.tsx';
import { Shop } from './shop/Shop.tsx';
import { System } from './system/System.tsx';
import { antCount, noticeOf, type Apply, type Notice, type SubView } from './shared.ts';

type View = 'hill' | SubView;

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

      {view === 'hill' && <Hill state={state} onOpen={setView} />}
      {view === 'organize' && <OrganizeArmy state={state} apply={apply} />}
      {view === 'recruit' && <Recruit state={state} apply={apply} />}
      {view === 'shop' && <Shop state={state} apply={apply} />}
      {view === 'system' && <System />}
    </div>
  );
}
