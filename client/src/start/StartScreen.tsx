import { useEffect, useState } from 'react';

interface Props {
  /** Fresh campaign → Briefing → scenario (route A, Exchange #13 §7.17). */
  readonly onNewGame: () => void;
  /** Chunk B5 — present iff a save is available at boot. Picking
   * Continue routes into the Hill against the loaded state. Omit (or
   * pass undefined) to keep the menu item disabled with the stub
   * "no save yet" hint. */
  readonly onContinue?: () => void;
}

interface MenuItem {
  readonly label: string;
  readonly enabled: boolean;
  /** Forward-wiring note shown on disabled stubs. */
  readonly soon?: string;
  readonly activate?: () => void;
}

const VERSION = 'v0.0.0 · dev';

/**
 * Start screen / main menu (ui-start-screen-spec, Exchange #13 / §7.17).
 * A full-screen title with a stable four-item menu — Continue · New Game ·
 * Load Game · Options. Only **New Game** is wired this pass (route A); the
 * other three render and accept focus but no-op until their save / settings
 * surfaces exist (Continue/Load need a client save layer; Options a
 * settings surface). No Quit — it's a browser client. Visual treatment is
 * §D-deferred; this is the structural menu + selection model.
 */
export function StartScreen({ onNewGame, onContinue }: Props): JSX.Element {
  const items: readonly MenuItem[] = [
    onContinue !== undefined
      ? { label: 'Continue', enabled: true, activate: onContinue }
      : { label: 'Continue', enabled: false, soon: 'no save yet' },
    { label: 'New Game', enabled: true, activate: onNewGame },
    { label: 'Load Game', enabled: false, soon: 'save system forthcoming' },
    { label: 'Options', enabled: false, soon: 'settings forthcoming' },
  ];
  const firstEnabled = items.findIndex((i) => i.enabled);
  const [selected, setSelected] = useState(firstEnabled < 0 ? 0 : firstEnabled);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => (s + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => (s - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        const item = items[selected];
        if (item?.enabled) item.activate?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
    // `items`/`selected` are stable per render; re-subscribe each render to
    // read the current selection without a ref dance.
  });

  return (
    <div className="startscreen">
      <div className="start-logo">
        <h1 className="start-title">Food Fight</h1>
        <p className="start-sub">Battle of the Ants</p>
      </div>
      <ul className="start-menu" role="menu">
        {items.map((item, i) => (
          <li key={item.label}>
            <button
              role="menuitem"
              className={`start-item ${i === selected ? 'sel' : ''}`}
              disabled={!item.enabled}
              title={item.soon}
              onMouseEnter={() => {
                setSelected(i);
              }}
              onClick={() => {
                if (item.enabled) item.activate?.();
              }}
            >
              <span className="si-cursor">{i === selected ? '▸' : ''}</span>
              <span className="si-label">{item.label}</span>
              {!item.enabled && item.soon ? <span className="si-soon">{item.soon}</span> : null}
            </button>
          </li>
        ))}
      </ul>
      <span className="start-version">{VERSION}</span>
    </div>
  );
}
