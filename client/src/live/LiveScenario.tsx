import { useState } from 'react';

import { SPEEDS } from '../clock/clock.ts';
import { eventLabel } from '../scenario/eventLabel.ts';

import { Board } from './Board.tsx';
import { useLiveScenario } from './useLiveScenario.ts';

import type { Party, Plane, PartyId, TileCoord } from '../../../engine/types.ts';

interface Props {
  readonly onExit: () => void;
}

const PLANES: readonly Plane[] = [
  'floor',
  'north-wall',
  'south-wall',
  'east-wall',
  'west-wall',
  'ceiling',
];

const QUEEN_GUARD = 'queen-guard';

const partyAlive = (p: Party): boolean => p.units.some((u) => u.currentHp > 0);

const statusWord = (
  party: Party,
  dest: TileCoord | null | undefined,
): 'fallen' | 'moving' | 'holding' | 'idle' => {
  if (!partyAlive(party)) return 'fallen';
  // Engine orders are the source of truth once a turn has resolved; the
  // stored intent only forces "holding" before the next resolution.
  if (party.orders.some((o) => o.kind === 'move-to')) return 'moving';
  if (dest === null) return 'holding';
  return 'idle';
};

/**
 * Live engine-in-browser scenario view: the real turn engine runs in the
 * browser (player issues orders → `runTurn` → board animates), replacing
 * the canned replay. Structural chrome per the main-screen spec — left
 * roster, center board (active "face"), right action rail, bottom HUD
 * pod + notification strip. The cinematic cube render is design-gated
 * (cube memo §D); the board is the functional structural grid.
 */
export function LiveScenario({ onExit }: Props): JSX.Element {
  const live = useLiveScenario();
  const { state } = live;

  const antParties = [...state.parties.values()]
    .filter((p) => p.faction === 'ant')
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const [selectedId, setSelectedId] = useState<PartyId | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [plane, setPlane] = useState<Plane>('floor');

  const selected = selectedId !== null ? (state.parties.get(selectedId) ?? null) : null;
  const canMove = selected !== null && selected.id !== QUEEN_GUARD && partyAlive(selected);

  const selectParty = (id: PartyId): void => {
    setSelectedId(id);
    setOrdering(false);
    const p = state.parties.get(id);
    if (p) setPlane(p.location.plane);
  };

  const handleTile = (coord: TileCoord): void => {
    if (ordering && selectedId !== null && canMove) {
      live.setOrder(selectedId, coord);
      setOrdering(false);
      return;
    }
    const hit = antParties.find(
      (p) =>
        partyAlive(p) &&
        p.location.plane === coord.plane &&
        p.location.x === coord.x &&
        p.location.y === coord.y,
    );
    setSelectedId(hit ? hit.id : null);
    setOrdering(false);
  };

  return (
    <div className="scenario live">
      <header className="scn-top">
        <button className="back" onClick={onExit}>
          ← End scenario
        </button>
        <span className="scn-title">L1 — live (engine in browser): issue orders, then Play</span>
        <span className="planes">
          {PLANES.map((pl) => (
            <button
              key={pl}
              className={plane === pl ? 'active' : ''}
              onClick={() => {
                setPlane(pl);
              }}
            >
              {pl}
            </button>
          ))}
          <button className={live.fogEnabled ? 'active' : ''} onClick={live.toggleFog}>
            Fog {live.fogEnabled ? 'on' : 'off'}
          </button>
        </span>
      </header>

      <div className="live-mid">
        <aside className="roster">
          {antParties.map((p) => {
            const dest = live.orders.get(p.id);
            return (
              <button
                key={p.id}
                className={`pcard ${p.id === selectedId ? 'sel' : ''}`}
                onClick={() => {
                  selectParty(p.id);
                }}
              >
                <span className="pname">{p.id}</span>
                <span className="pmeta">
                  {p.location.plane} · {statusWord(p, dest)}
                </span>
              </button>
            );
          })}
        </aside>

        <div className="scn-world">
          <Board
            state={state}
            plane={plane}
            selectedPartyId={selectedId}
            ordering={ordering}
            destinations={live.orders}
            onClickTile={handleTile}
            fogEnabled={live.fogEnabled}
            visible={live.visible}
            seen={live.seen}
          />
          {live.atEnd && (
            <p className="scn-end">
              {live.winner === 'ant'
                ? 'Victory — the ants take the web.'
                : live.winner === 'spider'
                  ? 'Defeat — the spiders hold.'
                  : 'Scenario over.'}
            </p>
          )}
        </div>

        <aside className="rail">
          {selected === null && (
            <p className="hint">Select a party (roster or board), then Move.</p>
          )}
          {selected !== null && !ordering && (
            <>
              <div className="rail-head">{selected.id}</div>
              {selected.id === QUEEN_GUARD ? (
                <p className="hint">The Queen holds the hill — immobile.</p>
              ) : (
                <>
                  <button disabled={!canMove} onClick={() => setOrdering(true)}>
                    Move
                  </button>
                  <button
                    disabled={!canMove}
                    onClick={() => {
                      live.setOrder(selected.id, null);
                    }}
                  >
                    Hold position
                  </button>
                  <button
                    onClick={() => {
                      live.setOrder(selected.id, undefined);
                    }}
                  >
                    Clear order
                  </button>
                </>
              )}
            </>
          )}
          {ordering && (
            <>
              <div className="rail-head">Pick destination</div>
              <p className="hint">Click a tile on the board.</p>
              <button onClick={() => setOrdering(false)}>Cancel</button>
            </>
          )}
        </aside>
      </div>

      <div className="scn-world log-band">
        <p className="scn-now">
          {live.recentEvents.length > 0
            ? eventLabel(live.recentEvents[live.recentEvents.length - 1]!)
            : 'Ready — issue orders, then press Play.'}
        </p>
        <ul className="scn-log">
          {live.recentEvents.slice(-6).map((e, i) => (
            <li key={i}>{eventLabel(e)}</li>
          ))}
        </ul>
      </div>

      <footer className="scn-hud">
        <div className="hud-pod">
          <button onClick={live.toggle} disabled={live.atEnd}>
            {live.playing ? '⏸ Pause' : '⏵ Play'}
          </button>
          <button onClick={live.step} disabled={live.playing || live.atEnd}>
            Step
          </button>
          <span className="speeds">
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                className={live.speed === sp ? 'active' : ''}
                onClick={() => {
                  live.setSpeed(sp);
                }}
              >
                {sp}×
              </button>
            ))}
          </span>
          <span className="hud-readout">Turn {live.turnsPlayed}</span>
        </div>
        <div className={`scn-notif ${live.pauseReason ? 'paused' : ''}`} role="status">
          {live.pauseReason
            ? `⏸ Paused — ${live.pauseReason}`
            : live.playing
              ? 'Playing…'
              : 'Paused'}
        </div>
      </footer>
    </div>
  );
}
