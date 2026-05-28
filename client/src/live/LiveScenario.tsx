import { useEffect, useState } from 'react';

import { SPEEDS } from '../clock/clock.ts';
import { eventLabel } from '../scenario/eventLabel.ts';

import { CombatPanel } from './CombatPanel.tsx';
import { CubeBoard } from './CubeBoard.tsx';
import type { LiveOutcome } from './liveScenario.ts';
import { PartyDetail } from './PartyDetail.tsx';
import { useLiveScenario } from './useLiveScenario.ts';

import type {
  BattleResult,
  Party,
  Plane,
  PartyId,
  TileCoord,
  UnitId,
} from '../../../engine/types.ts';
import type { WorldRoster } from '../../../engine/world-state.ts';

interface Props {
  /** The Hill roster to field; injected over the scenario scaffold. */
  readonly roster?: WorldRoster;
  /** Abandon mid-scenario back to the Hill (no outcome applied). */
  readonly onExit: () => void;
  /** Scenario resolved and the player pressed Continue → run the world loop. */
  readonly onEnd: (outcome: LiveOutcome) => void;
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
export function LiveScenario({ roster, onExit, onEnd }: Props): JSX.Element {
  const live = useLiveScenario(roster);
  const { state } = live;

  const antParties = [...state.parties.values()]
    .filter((p) => p.faction === 'ant')
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const [selectedId, setSelectedId] = useState<PartyId | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [unitId, setUnitId] = useState<UnitId | null>(null);
  const [plane, setPlane] = useState<Plane>('floor');
  const [battleQueue, setBattleQueue] = useState<{
    readonly battles: readonly BattleResult[];
    readonly index: number;
  } | null>(null);

  // Open the combat panel when a resolved turn produced battles. The turn
  // already auto-paused on `battle-resolved`, so playback is halted while
  // the panel is up; dismissing returns to the (still paused) board.
  useEffect(() => {
    if (live.battles.length > 0) setBattleQueue({ battles: live.battles, index: 0 });
  }, [live.turnsPlayed]);

  const selected = selectedId !== null ? (state.parties.get(selectedId) ?? null) : null;
  const canMove = selected !== null && selected.id !== QUEEN_GUARD && partyAlive(selected);
  // The inspected party fell out of state (shouldn't happen on L1) — close.
  const inspectingOpen = inspecting && selected !== null;

  const selectParty = (id: PartyId): void => {
    setSelectedId(id);
    setOrdering(false);
    setUnitId(null); // switching party clears unit drill-down
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
    setUnitId(null);
    setOrdering(false);
    if (!hit) setInspecting(false); // clicking empty space closes the panel
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
          <CubeBoard
            state={state}
            plane={plane}
            selectedPartyId={selectedId}
            ordering={ordering}
            destinations={live.orders}
            onClickTile={handleTile}
            fogEnabled={live.fogEnabled}
            visible={live.visible}
            seen={live.seen}
            onSelectFace={setPlane}
          />
          {live.atEnd && live.terminal && (
            <div className="scn-end">
              <span>
                {live.terminal.winner === 'ant'
                  ? 'Victory — the ants take the web.'
                  : 'Defeat — the spiders hold.'}
              </span>
              <button
                className="scn-end-go"
                onClick={() => {
                  onEnd({
                    finalState: state,
                    terminal: live.terminal!,
                    turnsPlayed: live.turnsPlayed,
                  });
                }}
              >
                Continue →
              </button>
            </div>
          )}
        </div>

        {inspectingOpen ? (
          <PartyDetail
            state={state}
            party={selected}
            selectedUnitId={unitId}
            onSelectUnit={setUnitId}
            onClose={() => {
              setInspecting(false);
              setUnitId(null);
            }}
          />
        ) : (
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
                <button onClick={() => setInspecting(true)}>Inspect</button>
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
        )}
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

      {battleQueue && (
        <div className="combat-overlay">
          <CombatPanel
            key={`${String(battleQueue.battles[battleQueue.index]!.attackerPartyId)}-${String(
              battleQueue.battles[battleQueue.index]!.defenderPartyId,
            )}-${String(battleQueue.index)}`}
            result={battleQueue.battles[battleQueue.index]!}
            templates={state.unitTemplates}
            index={battleQueue.index + 1}
            total={battleQueue.battles.length}
            onContinue={() => {
              setBattleQueue((q) => {
                if (!q) return null;
                const next = q.index + 1;
                return next >= q.battles.length ? null : { ...q, index: next };
              });
            }}
            onSkipAll={() => {
              setBattleQueue(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
