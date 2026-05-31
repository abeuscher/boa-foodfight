import { useEffect, useState } from 'react';

import { SPEEDS } from '../clock/clock.ts';
import { eventLabel } from '../scenario/eventLabel.ts';

import { CombatPanel } from './CombatPanel.tsx';
import { CubeBoard } from './CubeBoard.tsx';
import { expandEventsForFeed } from './feedLines.ts';
import type { LiveOutcome } from './liveScenario.ts';
import { PartyDetail } from './PartyDetail.tsx';
import { useLiveScenario } from './useLiveScenario.ts';

import { partyHasAbility } from '../../../engine/abilities.ts';
import type {
  AbilityId,
  BattleResult,
  Party,
  Plane,
  PartyId,
  TileCoord,
  UnitId,
} from '../../../engine/types.ts';
import type { WorldRoster } from '../../../engine/world-state.ts';

const RECRUIT_ABILITY: AbilityId = 'recruit' as AbilityId;

const sameTile = (a: TileCoord, b: TileCoord): boolean =>
  a.plane === b.plane && a.x === b.x && a.y === b.y;

interface Props {
  /** 0-based campaign position — routes the live engine to
   * `data/level-{scenarioIndex + 1}` via `scenarioDataFor`. Chunk B2
   * added this so a Hill-state `scenarioIndex` past 0 actually loads
   * a different map. */
  readonly scenarioIndex: number;
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
 * Live engine-in-browser scenario view.
 *
 * Layout follows the L1 UI-compression design (CR UI-03, dev-reply
 * Chunk 7c §UI-03). Three columns, no bottom band:
 *
 *   - **Left rail = control** (everything touched): squad roster, the
 *     selected squad's action verbs (Move / Hold / Clear / Inspect, or
 *     the ordering shortcuts), and playback controls (Play / Pause /
 *     Step / speeds). Actions stay co-located with the squad they
 *     belong to; clicking Inspect does NOT swap this rail away.
 *   - **Center = the world**: the splayed cube board (taller now that
 *     the bottom log band is reclaimed). UI-02 layers a camera zoom
 *     on top of the active face during battles.
 *   - **Right rail = information** (everything read): pause-reason /
 *     turn-status header pinned at top; below it, one of {combat
 *     play-by-play while paused on a battle (UI-02), PartyDetail
 *     read-out when inspecting, running play-by-play feed}.
 *
 * UI-02 (battle camera): when the engine auto-pauses on `battle-
 * resolved`, this component derives a camera target (the defender's
 * tile) from the battle queue, auto-rotates the cube to that face if
 * needed (cut-then-zoom for v1; smoother rotation needs a 3D cube
 * upgrade), zooms the active face onto the contested 3×3 region, and
 * renders the play-by-play in the right rail's slot (replaces the
 * feed). Cross-plane simultaneous battles → rotate-between with
 * playback staying paused across the set, per the design sign-off.
 * Skipping / Continuing advances the queue. Queue empty → cameraTarget
 * clears, feed restores.
 */
export function LiveScenario({ scenarioIndex, roster, onExit, onEnd }: Props): JSX.Element {
  const live = useLiveScenario(scenarioIndex, roster);
  const { state } = live;

  const antParties = [...state.parties.values()]
    .filter((p) => p.faction === 'ant')
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  // Chunk B4 — which planes actually exist in this scenario. L1 has
  // all six, L2 only floor + ceiling. Derived from `state.tiles` so
  // it stays correct for whatever scenario index is active without
  // a per-scenario constant.
  const existingPlanes: ReadonlySet<Plane> = (() => {
    const out = new Set<Plane>();
    for (const tile of state.tiles.values()) out.add(tile.coord.plane);
    return out;
  })();
  const visiblePlanes = PLANES.filter((p) => existingPlanes.has(p));

  const [selectedId, setSelectedId] = useState<PartyId | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [unitId, setUnitId] = useState<UnitId | null>(null);
  const [plane, setPlane] = useState<Plane>('floor');
  const [battleQueue, setBattleQueue] = useState<{
    readonly battles: readonly BattleResult[];
    readonly index: number;
  } | null>(null);
  // L1-iteration UX: recent-battle tile marks linger for a few seconds
  // after the combat panel dismisses so the player can see where the
  // engagement happened. Each entry expires at `until` (Date.now ms).
  const [recentBattles, setRecentBattles] = useState<
    readonly { readonly key: string; readonly coord: TileCoord; readonly until: number }[]
  >([]);

  // Open the combat panel when a resolved turn produced battles. The turn
  // already auto-paused on `battle-resolved`, so playback is halted while
  // the panel is up; dismissing returns to the (still paused) board.
  useEffect(() => {
    if (live.battles.length === 0) return;
    setBattleQueue({ battles: live.battles, index: 0 });
    // Capture battle locations at resolution time — the defender tile is
    // the collision tile (both parties were co-located when battle fired).
    const now = Date.now();
    const additions = live.battles
      .map((b, i) => {
        const defender = state.parties.get(b.defenderPartyId);
        const attacker = state.parties.get(b.attackerPartyId);
        const coord = defender?.location ?? attacker?.location;
        if (!coord) return null;
        return {
          key: `${String(b.attackerPartyId)}-${String(b.defenderPartyId)}-${String(now)}-${String(i)}`,
          coord,
          until: now + 8000,
        };
      })
      .filter((x): x is { key: string; coord: TileCoord; until: number } => x !== null);
    if (additions.length > 0) setRecentBattles((prev) => [...prev, ...additions]);
  }, [live.turnsPlayed]);

  // Reap expired battle marks. Cheap once-a-second sweep.
  useEffect(() => {
    if (recentBattles.length === 0) return undefined;
    const id = setInterval(() => {
      const now = Date.now();
      setRecentBattles((prev) => prev.filter((m) => m.until > now));
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [recentBattles.length]);

  const selected = selectedId !== null ? (state.parties.get(selectedId) ?? null) : null;
  const canMove = selected !== null && selected.id !== QUEEN_GUARD && partyAlive(selected);
  // Chunk 24 — surface a "Try to recruit" action when the selected
  // ant party carries the `recruit` ability AND shares a tile with a
  // neutral party. Engine handles the 25%-per-attempt roll
  // (`recruitNeutral` in `engine/abilities.ts`); the UI just exposes
  // the trigger.
  const recruitTarget: Party | null =
    selected !== null &&
    partyAlive(selected) &&
    partyHasAbility(selected, RECRUIT_ABILITY, state.unitTemplates)
      ? ([...state.parties.values()].find(
          (p) =>
            p.faction === 'neutral' && partyAlive(p) && sameTile(p.location, selected.location),
        ) ?? null)
      : null;
  // The inspected party fell out of state (shouldn't happen on L1) — close.
  const inspectingOpen = inspecting && selected !== null;

  // UI-02 — camera target. Derived from the current battleQueue entry:
  // the defender's tile is the collision tile both parties co-located on
  // when the engine resolved the battle. While the queue is active, the
  // cube auto-rotates to the target's face and zooms onto the tile; the
  // right rail shows the play-by-play instead of the feed.
  const currentBattle = battleQueue?.battles[battleQueue.index] ?? null;
  const cameraTarget: TileCoord | null = (() => {
    if (!currentBattle) return null;
    const defender = state.parties.get(currentBattle.defenderPartyId);
    const attacker = state.parties.get(currentBattle.attackerPartyId);
    return defender?.location ?? attacker?.location ?? null;
  })();

  // Auto-rotate to the target's face. For v1 this is a face cut (the
  // cube has no 3D rotation animation yet); the visual review will
  // tell us if it needs a transition. The dev-reply timing recommendation
  // (rotate ~300ms then zoom ~500ms) sequences against CSS transitions
  // on the active-face wrapper — the rotate phase is currently a swap
  // and the CSS handles the zoom phase smoothly.
  useEffect(() => {
    if (cameraTarget && cameraTarget.plane !== plane) {
      setPlane(cameraTarget.plane);
    }
  }, [cameraTarget?.plane]);

  // Chunk B4 — snap `plane` to a valid one if the current value
  // points at a face the active scenario doesn't have. The default
  // `useState<Plane>('floor')` works for L1 and L2 (both ship a
  // floor), but if a future scenario doesn't, this guard catches it.
  useEffect(() => {
    if (!existingPlanes.has(plane) && visiblePlanes[0]) {
      setPlane(visiblePlanes[0]);
    }
  }, [existingPlanes, plane, visiblePlanes]);

  const selectParty = (id: PartyId): void => {
    setSelectedId(id);
    setUnitId(null); // switching party clears unit drill-down
    const p = state.parties.get(id);
    if (p) setPlane(p.location.plane);
    // L1-iteration PR-58 follow-up: auto-enter Move mode whenever the
    // selected party is movable, so the player can click a destination
    // tile immediately without first hitting the Move button. Queen-
    // guard (immobile) and fallen parties stay out of ordering mode.
    const movable = p !== undefined && p.id !== QUEEN_GUARD && partyAlive(p);
    setOrdering(movable);
  };

  const handleTile = (coord: TileCoord): void => {
    const hit = antParties.find(
      (p) =>
        partyAlive(p) &&
        p.location.plane === coord.plane &&
        p.location.x === coord.x &&
        p.location.y === coord.y,
    );
    // While ordering, a click on another friendly party switches
    // selection (and auto-enters ordering for the new party) rather
    // than committing the order — flicking between squads shouldn't
    // misfire orders. Re-clicking the selected party's own tile, or
    // clicking any tile with no friendly party, commits the order.
    if (ordering && selectedId !== null && canMove) {
      if (!hit || hit.id === selectedId) {
        live.setOrder(selectedId, { kind: 'move', dest: coord });
        setOrdering(false);
        return;
      }
      selectParty(hit.id);
      return;
    }
    if (hit) {
      selectParty(hit.id);
      return;
    }
    setSelectedId(null);
    setUnitId(null);
    setOrdering(false);
    setInspecting(false);
  };

  return (
    <div className="scenario live">
      <header className="scn-top">
        <button className="back" onClick={onExit}>
          ← End scenario
        </button>
        <span className="scn-title">L1 — live (engine in browser): issue orders, then Play</span>
        <span className="planes">
          {visiblePlanes.map((pl) => (
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
        {/* LEFT RAIL — control. Roster + selected-squad actions +
            playback controls. Inspect does NOT swap this away; the
            inspect read-out lives in the right rail instead. */}
        <aside className="control-rail">
          <div className="control-roster">
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
          </div>

          <div className="control-actions">
            {selected === null && <p className="hint">Select a party — Move is pre-armed.</p>}
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
                        live.setOrder(selected.id, { kind: 'hold' });
                      }}
                    >
                      Hold position
                    </button>
                    <button
                      onClick={() => {
                        live.setOrder(selected.id, null);
                      }}
                    >
                      Clear order
                    </button>
                    {recruitTarget && (
                      <button
                        onClick={() => {
                          live.setOrder(selected.id, {
                            kind: 'recruit',
                            target: recruitTarget.id,
                          });
                        }}
                      >
                        Try to recruit {recruitTarget.id}
                      </button>
                    )}
                  </>
                )}
                <button
                  className={inspecting ? 'active' : ''}
                  onClick={() => setInspecting((v) => !v)}
                >
                  {inspecting ? '✓ Inspecting' : 'Inspect'}
                </button>
              </>
            )}
            {ordering && (
              <>
                <div className="rail-head">{selected?.id ?? 'Move'} — pick destination</div>
                <p className="hint">Click a tile on the board (or another squad to switch).</p>
                <button onClick={() => setOrdering(false)}>Cancel</button>
                {selected !== null && (
                  <>
                    <button
                      disabled={!canMove}
                      onClick={() => {
                        live.setOrder(selected.id, { kind: 'hold' });
                        setOrdering(false);
                      }}
                    >
                      Hold position
                    </button>
                    <button
                      className={inspecting ? 'active' : ''}
                      onClick={() => setInspecting((v) => !v)}
                    >
                      {inspecting ? '✓ Inspecting' : 'Inspect'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <div className="control-playback">
            <div className="hud-pod">
              <button onClick={live.toggle} disabled={live.atEnd}>
                {live.playing ? '⏸ Pause' : '⏵ Play'}
              </button>
              <button onClick={live.step} disabled={live.playing || live.atEnd}>
                Step
              </button>
            </div>
            <div className="hud-pod">
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
            </div>
          </div>
        </aside>

        {/* CENTER — the world. Cube board. Bottom band reclaimed for
            extra height. */}
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
            marks={recentBattles.map((b) => ({ coord: b.coord, kind: 'battle' as const }))}
            cameraTarget={cameraTarget}
            existingPlanes={existingPlanes}
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

        {/* RIGHT RAIL — information. Status pinned at top. The body
            stacks three slots, all always-rendered when present:
              1. Combat play-by-play panel (UI-02) — when battleQueue
                 is active. The animated spectacle view of the current
                 fight.
              2. PartyDetail — when inspecting. The squad read-out.
              3. Activity feed — ALWAYS visible at the bottom, expanded
                 with battle play-by-play text via `expandEventsForFeed`
                 (Chunk 12). The feed is the persistent text log: it
                 stays visible during battle so the player can read the
                 narration even while the CombatPanel animates above,
                 and scrolls back through past combats / captures /
                 beats without dismissing anything.
            The rail's `overflow-y: auto` lets long stacks scroll
            cleanly. The feed gets `flex: 1 1 0` so it consumes any
            slack height; the CombatPanel / PartyDetail above it
            size to their content. */}
        <aside className="info-rail">
          <div className={`info-status ${live.pauseReason ? 'paused' : ''}`}>
            {live.pauseReason
              ? `⏸ Paused — ${live.pauseReason}`
              : live.playing
                ? `Turn ${String(live.turnsPlayed)} · Playing…`
                : `Turn ${String(live.turnsPlayed)} · Paused`}
          </div>
          {battleQueue && currentBattle && (
            <CombatPanel
              key={`${String(currentBattle.attackerPartyId)}-${String(
                currentBattle.defenderPartyId,
              )}-${String(battleQueue.index)}`}
              result={currentBattle}
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
          )}
          {inspectingOpen && (
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
          )}
          <div className="info-body">
            <p className="info-now">
              {live.recentEvents.length > 0
                ? eventLabel(live.recentEvents[live.recentEvents.length - 1]!)
                : 'Ready — issue orders, then press Play.'}
            </p>
            <ul className="info-feed">
              {expandEventsForFeed(live.recentEvents)
                .slice(-40)
                .map((line) => (
                  <li key={line.key} className={`feed-${line.kind}`}>
                    {line.text}
                  </li>
                ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
