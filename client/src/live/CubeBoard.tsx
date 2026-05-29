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
  /** Active-face overlays (recent-battle pulses, briefing START/GOAL).
   * Peripheral faces never receive marks. */
  readonly marks?: readonly {
    readonly coord: TileCoord;
    readonly kind: 'start' | 'goal' | 'battle';
  }[];
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

const EMPTY_MARKS: readonly never[] = [];

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
}: Props): JSX.Element {
  const layout = FACE_LAYOUT[plane];

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
        marks={EMPTY_MARKS}
        compact
      />
    </div>
  );

  return (
    <div className="cube">
      <div className="cube-slot cube-top">{peripheral(layout.top)}</div>
      <div className="cube-slot cube-left">{peripheral(layout.left)}</div>
      <div className="cube-slot cube-active">
        <div className="cube-face cube-face-active">
          <span className="cube-label active">{plane}</span>
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
            marks={marks ?? EMPTY_MARKS}
          />
        </div>
      </div>
      <div className="cube-slot cube-right">{peripheral(layout.right)}</div>
      <div className="cube-slot cube-bottom">{peripheral(layout.bottom)}</div>
    </div>
  );
}
