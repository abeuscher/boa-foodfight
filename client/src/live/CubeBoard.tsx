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
   * pulses), `battle` (recent-combat pulse), `peek` (UI-01 hold-peek;
   * only rendered locally by Board, never sent through this prop). */
  readonly marks?: readonly {
    readonly coord: TileCoord;
    readonly kind: 'start' | 'goal' | 'battle' | 'peek';
  }[];
  /** UI-02 — battle-camera focus point. When set, the active face
   * zooms onto the 3×3 region centered on this tile via a CSS
   * transform (scale + translate); when null, the face renders flat.
   * The parent (`LiveScenario`) sets the active plane to match the
   * target's face before passing the tile here, so the cube layout
   * is always consistent. */
  readonly cameraTarget?: TileCoord | null;
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
}: Props): JSX.Element {
  const layout = FACE_LAYOUT[plane];
  const allMarks = marks ?? [];

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

  // Chunk 19 — perspective splay. The peripheral renders the SAME
  // `Board` the active face renders (full pawn glyphs, stack counts,
  // POST labels, destination markers, marks). What was the rail-style
  // "compact" mode is gone; the visual compression now comes from a
  // CSS 3D transform on `.cube-peripheral-stage`, anchored to the edge
  // that meets the active face so each peripheral reads as a wall
  // folding back from the seam. Cube-view memo §A.1 binding: "active
  // face orthographic, four edge-adjacent faces splayed in perspective
  // as lower-fidelity previews" — this finally implements the splayed-
  // in-perspective half of that rule. §A.1 also locks: peripherals are
  // previews, never directly clickable, so cell clicks still route to
  // `onSelectFace`, not `onClickTile`.
  const peripheral = (face: Plane): JSX.Element => (
    <div
      className="cube-face cube-peripheral"
      title={`Rotate to ${face}`}
      onClick={() => {
        onSelectFace(face);
      }}
    >
      {/* Chunk 20 — the peripheral label moved OUT to `.cube-labels`, a
          flat overlay above the cube. Inside this `preserve-3d` subtree a
          label can't reliably sit in front of its wall (the wall's far
          edge is physically closer in Z, so it wins regardless of
          z-index); the flat overlay sidesteps 3D sorting entirely. */}
      <div className="cube-peripheral-stage">
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
        />
      </div>
    </div>
  );

  return (
    <div className="cube-frame">
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

      {/* Chunk 20 — flat label overlay, a sibling of `.cube` so it lives
          outside the perspective/3D context. `.cube` hugs the box (slots
          are sized to the wall depth), so the frame edges are the box
          edges; the labels pin to each edge, left/right rotated 90°. The
          overlay is click-through (pointer-events:none) so the walls
          underneath stay the rotate-to-active target. */}
      <div className="cube-labels" aria-hidden="true">
        <span className="cube-edge-label cube-edge-top">{layout.top}</span>
        <span className="cube-edge-label cube-edge-bottom">{layout.bottom}</span>
        <span className="cube-edge-label cube-edge-left">{layout.left}</span>
        <span className="cube-edge-label cube-edge-right">{layout.right}</span>
      </div>
    </div>
  );
}
