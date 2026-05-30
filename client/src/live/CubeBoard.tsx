import type { CSSProperties } from 'react';

import { Board } from './Board.tsx';

import type { GameState, PartyId, Plane, TileCoord } from '../../../engine/types.ts';

interface Props {
  readonly state: GameState;
  readonly plane: Plane;
  readonly selectedPartyId: PartyId | null;
  readonly ordering: boolean;
  readonly destinations: ReadonlyMap<PartyId, TileCoord | null>;
  readonly onClickTile: (coord: TileCoord) => void;
  readonly fogEnabled: boolean;
  readonly visible: ReadonlySet<string>;
  readonly seen: ReadonlySet<string>;
  readonly onSelectFace: (plane: Plane) => void;
  /** Active-face overlays. Peripheral faces receive the same marks
   * list — `Board` filters by plane so each peripheral only renders
   * marks on its own face. Kinds: `start` / `goal` (briefing nav
   * pulses), `battle` (recent-combat pulse), `trail` (UI-01
   * breadcrumbs), `peek` (UI-01 hold-peek; only rendered locally by
   * Board, never sent through this prop). */
  readonly marks?: readonly {
    readonly coord: TileCoord;
    readonly kind: 'start' | 'goal' | 'battle' | 'trail' | 'peek';
  }[];
  /** UI-02 — battle-camera focus point. When set, the active face
   * zooms onto the 3×3 region centered on this tile via a CSS
   * transform (scale + translate); when null, the face renders flat.
   * The parent (`LiveScenario`) sets the active plane to match the
   * target's face before passing the tile here, so the cube layout
   * is always consistent. */
  readonly cameraTarget?: TileCoord | null;
  /** UI-01 — per-party breadcrumb trails sourced from useLiveScenario.
   * The cube flattens them into `trail` marks (any party's
   * recent path shows). Tiles older than the cap drop naturally as
   * the parent's sliding window slides. */
  readonly partyTrails?: ReadonlyMap<PartyId, readonly TileCoord[]>;
}

/**
 * Cube adjacency for the splayed "fold-out" layout: for each active face,
 * which face borders its top / bottom / left / right edge (the four
 * peripherals the main-screen spec splays; the sixth, opposite, face is
 * hidden). Read as "standing in the room facing the active wall" — floor
 * and ceiling are viewed top-down with north up. The arrangement IS the
 * room's fold-out, so adjacency is read from position, not memorized.
 *
 * Opposite pairs: floor/ceiling, north/south, east/west. Each face's four
 * entries are its non-opposite neighbors. Static table — tweak here if a
 * seat reads wrong; nothing else depends on the specific assignment.
 */
const FACE_LAYOUT: Record<Plane, { top: Plane; bottom: Plane; left: Plane; right: Plane }> = {
  floor: { top: 'north-wall', bottom: 'south-wall', left: 'west-wall', right: 'east-wall' },
  ceiling: { top: 'north-wall', bottom: 'south-wall', left: 'west-wall', right: 'east-wall' },
  'north-wall': { top: 'ceiling', bottom: 'floor', left: 'west-wall', right: 'east-wall' },
  'south-wall': { top: 'ceiling', bottom: 'floor', left: 'east-wall', right: 'west-wall' },
  'east-wall': { top: 'ceiling', bottom: 'floor', left: 'north-wall', right: 'south-wall' },
  'west-wall': { top: 'ceiling', bottom: 'floor', left: 'south-wall', right: 'north-wall' },
};

/**
 * Grid dimension assumed by the board (10×10). Used by the UI-02
 * camera to compute the translate% that centers the target tile. If
 * the board grid ever varies per scenario, lift this off `state`.
 */
const BOARD_GRID = 10;

/**
 * Camera zoom factor when a battle is being surfaced. 2.5× scales a
 * 10×10 grid up to feel like a 3×3 close-up (the design's "~3×3 zoom"
 * note). Tuned with the visual-review agent's screenshots in mind.
 */
const CAMERA_ZOOM = 2.5;

/**
 * The splayed cube view (ui-main-screen-spec "active face + four splayed
 * peripheral faces"): the active face head-on and large in the center,
 * its four edge-neighbors docked as smaller preview boards in the
 * directions they actually connect. Clicking a peripheral rotates it to
 * active (the locked §A deliberate-rotation model). Fog, destination
 * markers, and the selected-party highlight render on every face, so the
 * whole battlefield — where your forces are, where the goal sits, which
 * way to march across faces — is readable at a glance without paging.
 *
 * Structural / legibility pass: SVG-free, no §D art. The cinematic
 * perspective splay is the design-gated skin on top of this geometry.
 */
export function CubeBoard({
  state,
  plane,
  selectedPartyId,
  ordering,
  destinations,
  onClickTile,
  fogEnabled,
  visible,
  seen,
  onSelectFace,
  marks,
  cameraTarget,
  partyTrails,
}: Props): JSX.Element {
  const layout = FACE_LAYOUT[plane];
  // UI-01 — flatten per-party trails into the shared marks list. Trail
  // entries layer underneath start/goal/battle (the latter render later
  // in Board's per-cell map merge), so trails show through unless a
  // higher-priority annotation occupies the tile.
  const trailMarks: { readonly coord: TileCoord; readonly kind: 'trail' }[] = [];
  if (partyTrails) {
    for (const trail of partyTrails.values()) {
      for (const coord of trail) trailMarks.push({ coord, kind: 'trail' });
    }
  }
  const allMarks = [...trailMarks, ...(marks ?? [])];

  // UI-02 — compute the camera transform for the active face. The
  // active-face wrapper has overflow:hidden via CSS; scale + translate
  // centers the target tile inside the visible window. Translate is in
  // percent of the (pre-scale) face size so the math is grid-size
  // agnostic. Only applies when cameraTarget is on the active plane —
  // off-face targets are handled by LiveScenario rotating the active
  // plane first.
  const cameraStyle: CSSProperties =
    cameraTarget && cameraTarget.plane === plane
      ? {
          transform: `scale(${String(CAMERA_ZOOM)}) translate(${String(
            ((BOARD_GRID / 2 - 0.5 - cameraTarget.x) / BOARD_GRID) * 100,
          )}%, ${String(((BOARD_GRID / 2 - 0.5 - cameraTarget.y) / BOARD_GRID) * 100)}%)`,
          transformOrigin: 'center center',
          transition: 'transform 500ms ease-out',
        }
      : { transform: 'scale(1) translate(0, 0)', transition: 'transform 400ms ease-in' };

  const peripheral = (face: Plane): JSX.Element => (
    // Plain div wrapper (not a button) so the Board's own cell <button>s
    // aren't nested inside another button. Any click — label, gap, or a
    // cell — rotates the face active; cell clicks route via onClickTile.
    <div
      className="cube-face cube-peripheral"
      title={`Rotate to ${face}`}
      onClick={() => {
        onSelectFace(face);
      }}
    >
      <span className="cube-label">{face}</span>
      <Board
        state={state}
        plane={face}
        selectedPartyId={selectedPartyId}
        ordering={false}
        destinations={destinations}
        onClickTile={() => {
          onSelectFace(face);
        }}
        fogEnabled={fogEnabled}
        visible={visible}
        seen={seen}
        marks={allMarks}
        compact
      />
    </div>
  );

  return (
    <div className={`cube ${cameraTarget ? 'cube-camera-active' : ''}`}>
      <div className="cube-slot cube-top">{peripheral(layout.top)}</div>
      <div className="cube-slot cube-left">{peripheral(layout.left)}</div>
      <div className="cube-slot cube-active">
        <div className="cube-face cube-face-active">
          <span className="cube-label active">{plane}</span>
          <div className="cube-camera-frame">
            <div className="cube-camera-stage" style={cameraStyle}>
              <Board
                state={state}
                plane={plane}
                selectedPartyId={selectedPartyId}
                ordering={ordering}
                destinations={destinations}
                onClickTile={onClickTile}
                fogEnabled={fogEnabled}
                visible={visible}
                seen={seen}
                marks={allMarks}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="cube-slot cube-right">{peripheral(layout.right)}</div>
      <div className="cube-slot cube-bottom">{peripheral(layout.bottom)}</div>
    </div>
  );
}
