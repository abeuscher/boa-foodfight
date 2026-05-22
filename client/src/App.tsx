import { useState } from 'react';

import type { WorldState } from '../../engine/world-state.ts';

import { INITIAL_STATE } from './fixture.ts';
import { OrganizeArmy } from './organize/OrganizeArmy.tsx';
import { Recruit } from './recruit/Recruit.tsx';
import { noticeOf, type Apply, type Notice } from './shared.ts';

type View = 'organize' | 'recruit';

export function App(): JSX.Element {
  const [state, setState] = useState<WorldState>(INITIAL_STATE);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [view, setView] = useState<View>('organize');

  const apply: Apply = (next, result, okText) => {
    setState(next);
    setNotice(noticeOf(result, okText));
  };

  return (
    <div className="oa">
      <header>
        <h1>Back on the Hill</h1>
        <p className="sub">
          Between-scenario world-loop harness · binds to <code>engine/world-organize</code> +{' '}
          <code>engine/world-recruit</code> (troop-reference §10). Formation-rank editing is a
          dev-exposed operator here; its player-facing debut is L2.
        </p>
        <nav className="views">
          <button
            className={view === 'organize' ? 'active' : ''}
            onClick={() => setView('organize')}
          >
            Organize Army
          </button>
          <button className={view === 'recruit' ? 'active' : ''} onClick={() => setView('recruit')}>
            Recruit (Anthill)
          </button>
          <span className="gold">{state.gold} gold</span>
        </nav>
      </header>

      {notice && (
        <div className={`notice ${notice.kind}`} role="status">
          {notice.text}
        </div>
      )}

      {view === 'organize' ? (
        <OrganizeArmy state={state} apply={apply} />
      ) : (
        <Recruit state={state} apply={apply} />
      )}
    </div>
  );
}
