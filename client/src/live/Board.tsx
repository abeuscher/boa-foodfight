import { useRef, useState } from 'react';

import { coordKey } from '../../../engine/coord.ts';
import type { GameState, Party, PartyId, Plane, Post, TileCoord } from '../../../engine/types.ts';

import { previewPath } from './pathPreview.ts';

interface Props {
  readonly state: GameState;
  readonly plane: Plane;
  readonly selectedPartyId: PartyId | null;
  readonly ordering: boolean;
  readonly destinations: ReadonlyMap<PartyId, TileCoord | null>;
  readonly onClickTile: (coord: TileCoord) => void;
  readonly fogEnabled: boolean;
  /** Currently-visible tile keys (coordKey). */
  readonly visible: ReadonlySet<string>;
  /** Ever-seen tile keys (coordKey) — explored terrain stays dim. */
  readonly seen: ReadonlySet<string>;
  /** Tile-anchored visual marks rendered on top of the cell grid.
   *   - `start` / `goal` — briefing pulses (top-down navigation hints)
   *   - `battle` — recent-combat tile highlight (lingers ~8s)
   *   - `peek` — UI-01 hold-peek provisional route tile (dashed)
   * Board filters by plane, so the same list can be passed to all faces. */
  readonly marks?: readonly {
    readonly coord: TileCoord;
    readonly kind: 'start' | 'goal' | 'battle' | 'peek';
  }[];
}

/** UI-01 — hold-duration threshold (ms) for the path peek gesture.
 * Quick taps (< this) commit / select via the existing click path;
 * presses past this draw the provisional route to the held tile and
 * suppress the click on release. */
const HOLD_PEEK_THRESHOLD_MS = 150;

const factionGlyph: Record<string, string> = { ant: 'A', spider: 'S', neutral: 'N' };

/**
 * Chunk 36 (audit M-2 fix) — POSTs render as `◆` only; the name lives
 * in a `title` tooltip. A player scanning the cube cannot tell the
 * win-condition (`spider-web`) from any other ◆ without hovering each
 * one. This maps each POST id to a 3-5 char on-board label that sits
 * next to the glyph on the active face (hidden on peripherals where
 * the cells are too small to read).
 *
 * The two named anchors (storm-drain, spider-web) keep their unique
 * labels; mid-POSTs share a label per type since their `-N` suffix is
 * already implicit in count, not identity.
 */
const postLabel = (id: string): string => {
  if (id === 'spider-web') return 'WEB';
  if (id === 'storm-drain') return 'DRAIN';
  if (id.startsWith('soap-dish')) return 'SOAP';
  if (id.startsWith('towel-rack')) return 'RACK';
  if (id.startsWith('wall-crack')) return 'CRACK';
  if (id.startsWith('sanctum')) return 'SANC';
  if (id.startsWith('gold-mine')) return 'GOLD';
  return '';
};

const cellKey = (x: number, y: number): string => `${String(x)},${String(y)}`;

/** Top-down dimensions of the active plane, read off the built tiles. */
const planeDims = (state: GameState, plane: Plane): { w: number; h: number } => {
  let w = 0;
  let h = 0;
  for (const tile of state.tiles.values()) {
    if (tile.coord.plane !== plane) continue;
    if (tile.coord.x + 1 > w) w = tile.coord.x + 1;
    if (tile.coord.y + 1 > h) h = tile.coord.y + 1;
  }
  return { w, h };
};

/**
 * Structural top-down board for the active plane — the dev stand-in for
 * the cube view's active face. The cinematic room render is design-gated
 * (cube memo §D / main-screen spec "look-and-feel"); this is the
 * functional grid the player clicks to issue move orders: tiles
 * (obstacles shaded), POSTs (owner-tinted, with a capture pip during the
 * 2-turn hold), and parties (faction-lettered, name on the selected
 * party). Destination markers show queued player orders.
 */
export function Board({
  state,
  plane,
  selectedPartyId,
  ordering,
  destinations,
  onClickTile,
  fogEnabled,
  visible,
  seen,
  marks,
}: Props): JSX.Element {
  const { w, h } = planeDims(state, plane);

  // UI-01 — hold-peek gesture. Stateful pieces:
  //   - holdTimer / pressedTile: timer + tile pressed (synchronous refs
  //     because the click handler needs to read them without re-render
  //     lag).
  //   - peekTile (React state): the tile that triggered an active peek;
  //     also drives the rendered preview path. Null when no peek.
  //   - swallowClick: when the gesture activated peek mode, set true so
  //     the subsequent click event (browsers fire click after a long
  //     pointerdown+up cycle) doesn't re-fire `onClickTile`.
  const holdTimer = useRef<number | null>(null);
  const swallowClick = useRef(false);
  const [peekTile, setPeekTile] = useState<TileCoord | null>(null);

  const selectedParty = selectedPartyId !== null ? state.parties.get(selectedPartyId) : undefined;
  // Peek is only meaningful while ordering with a selected party.
  const peekActive = ordering && selectedParty !== undefined && peekTile !== null;
  const peekPath: readonly TileCoord[] =
    peekActive && peekTile && selectedParty
      ? previewPath(selectedParty.location, peekTile, state.tiles)
      : [];

  const beginHold = (coord: TileCoord): void => {
    if (!ordering || !selectedParty) return;
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      setPeekTile(coord);
      swallowClick.current = true;
      holdTimer.current = null;
    }, HOLD_PEEK_THRESHOLD_MS);
  };

  const endHold = (): void => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setPeekTile(null);
  };

  const postByCell = new Map<string, Post>();
  for (const post of state.posts.values()) {
    if (post.location.plane === plane)
      postByCell.set(cellKey(post.location.x, post.location.y), post);
  }
  const partyByCell = new Map<string, Party[]>();
  for (const party of state.parties.values()) {
    if (party.location.plane !== plane) continue;
    if (party.units.every((u) => u.currentHp <= 0)) continue;
    const k = cellKey(party.location.x, party.location.y);
    const list = partyByCell.get(k) ?? [];
    list.push(party);
    partyByCell.set(k, list);
  }
  // Destination markers for orders landing on this plane.
  const destByCell = new Map<string, boolean>(); // value = belongs to selected party
  for (const [pid, dest] of destinations) {
    if (dest === null || dest.plane !== plane) continue;
    const k = cellKey(dest.x, dest.y);
    destByCell.set(k, destByCell.get(k) === true || pid === selectedPartyId);
  }
  const markByCell = new Map<string, 'start' | 'goal' | 'battle' | 'peek'>();
  // External marks (battle / start / goal) come from the parent.
  // Peek tiles are computed locally and overlay last so they win on
  // any tile that also has a battle pulse — the peek is the player's
  // active intent, transient and high-priority.
  for (const m of marks ?? []) {
    if (m.coord.plane === plane) markByCell.set(cellKey(m.coord.x, m.coord.y), m.kind);
  }
  if (peekActive) {
    for (const c of peekPath) {
      if (c.plane === plane) markByCell.set(cellKey(c.x, c.y), 'peek');
    }
  }

  const markGlyph = (kind: 'start' | 'goal' | 'battle' | 'peek'): string => {
    if (kind === 'start') return 'S';
    if (kind === 'goal') return 'G';
    if (kind === 'battle') return '⚔';
    return '·'; // peek
  };

  const rows: JSX.Element[] = [];
  for (let y = 0; y < h; y++) {
    const cells: JSX.Element[] = [];
    for (let x = 0; x < w; x++) {
      const k = cellKey(x, y);
      const fullKey = coordKey({ plane, x, y });
      const cellVisible = !fogEnabled || visible.has(fullKey);
      const cellSeen = !fogEnabled || seen.has(fullKey);
      const tile = state.tiles.get(fullKey);
      const terrain = tile?.terrain.kind ?? 'open';
      const isObstacle = terrain === 'obstacle';
      // Explored terrain/POSTs persist (dim); live actors only when visible.
      const post = cellSeen ? postByCell.get(k) : undefined;
      const parties = cellVisible ? (partyByCell.get(k) ?? []) : [];
      // L1-iteration UI CR-02 sub-fix B0 — collision legibility.
      // The cell was rendering only the stack lead's faction + a faction-
      // blind `+N`, so a mixed-faction stack was invisible *as* mixed and
      // selection only highlighted the lead. Surface every distinct
      // faction present, mark ant-vs-spider tiles as `contested`, and
      // match selection against ANY party on the tile.
      const factionsHere: Party['faction'][] = [];
      for (const p of parties) {
        if (!factionsHere.includes(p.faction)) factionsHere.push(p.faction);
      }
      factionsHere.sort();
      const isContested = factionsHere.includes('ant') && factionsHere.includes('spider');
      const selectedHere =
        selectedPartyId !== null && parties.some((p) => p.id === selectedPartyId);
      const destHere = destByCell.has(k);
      const classes = ['cell', `t-${terrain}`];
      if (!cellSeen) classes.push('fog-unseen');
      else if (!cellVisible) classes.push('fog-seen');
      if (ordering && !isObstacle) classes.push('targetable');
      if (selectedHere) classes.push('sel');
      if (isContested) classes.push('contested');
      const stackTitle =
        cellVisible && post
          ? `${post.name} (${post.owner})`
          : parties.length > 0
            ? parties.map((p) => String(p.id)).join(' · ')
            : '';
      cells.push(
        <button
          key={k}
          type="button"
          className={classes.join(' ')}
          disabled={ordering && isObstacle}
          title={stackTitle}
          onPointerDown={() => {
            beginHold({ plane, x, y });
          }}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onClick={() => {
            if (swallowClick.current) {
              swallowClick.current = false;
              return;
            }
            onClickTile({ plane, x, y });
          }}
        >
          {post && (
            <span
              className={`post own-${post.owner} ${post.id === 'spider-web' ? 'objective' : ''}`}
            >
              ◆<span className="post-label">{postLabel(post.id)}</span>
              {post.capturingFaction ? (
                <em className="pip">{`${String(2 - (post.captureTurnsRemaining ?? 0))}/2`}</em>
              ) : null}
            </span>
          )}
          {parties.length > 0 && (
            <span className="pawn">
              {factionsHere.map((f) => (
                <span key={f} className={`pawn-glyph f-${f}`}>
                  {factionGlyph[f] ?? '?'}
                </span>
              ))}
              {parties.length > factionsHere.length ? (
                <em className="stack">{`+${String(parties.length - factionsHere.length)}`}</em>
              ) : null}
            </span>
          )}
          {destHere && <span className={`dest ${destByCell.get(k) ? 'mine' : ''}`}>×</span>}
          {markByCell.has(k) && (
            <span className={`mark mark-${String(markByCell.get(k))}`}>
              {markGlyph(markByCell.get(k)!)}
            </span>
          )}
        </button>,
      );
    }
    rows.push(
      <div className="board-row" key={y}>
        {cells}
      </div>,
    );
  }

  return <div className="board">{rows}</div>;
}
