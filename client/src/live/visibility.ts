/**
 * Ant-perspective fog-of-war projection (pure, client-side).
 *
 * The engine is headless and has no per-faction visibility for the ant
 * player: `state.fog` initializes all-invisible and is only ever written
 * by one reveal card, and the sole per-faction visibility code is
 * spider-side (`getSpiderVisibleAntTrail`). The auto-pause contract draft
 * (`docs/drafts/auto-pause-events.md` §3d) explicitly sanctions the
 * ant-side projection as "a small new client-side addition (not engine
 * work, since the engine is headless)" — this is that addition.
 *
 * RATIFICATION NOTE: the vision *radius* is the one gameplay parameter
 * the engine never defined. `ANT_VISION_RADIUS` is a placeholder pending
 * design/engine ratification, in the same "structural now, ratify later"
 * spirit as the board itself (cube memo §D). The projection shape (union
 * of per-party disks, per-plane) is the reviewable part; the constant is
 * a knob.
 */
import { coordKey, distance } from '../../../engine/coord.ts';
import type { GameState, Party, PartyId, TileCoord } from '../../../engine/types.ts';

/** Chebyshev tiles a living ant party reveals around itself, on its own
 * plane. Ratified at 2 (5×5 disk) per the PR #44 QA pass — tighter than
 * the initial 3 for real fog tension on a 10×10 plane; revisit per plane
 * size. The projection shape is the reviewable part; this is the knob. */
export const ANT_VISION_RADIUS = 2;

const alive = (party: Party): boolean => party.units.some((u) => u.currentHp > 0);

/**
 * Tiles currently visible to the ant player: the union of vision disks
 * around every living ant party. Pure derived view — no sim effect, so
 * it cannot perturb gate-29.
 */
export const computeVisibleTiles = (
  state: GameState,
  radius: number = ANT_VISION_RADIUS,
): Set<string> => {
  const visible = new Set<string>();
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    if (!alive(party)) continue;
    const c = party.location;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const t: TileCoord = { plane: c.plane, x: c.x + dx, y: c.y + dy };
        const key = coordKey(t);
        if (distance(c, t) <= radius && state.tiles.has(key)) visible.add(key);
      }
    }
  }
  return visible;
};

/**
 * Ids of living enemy/neutral parties standing on a currently-visible
 * tile. The basis for the `newly-visible-enemy` auto-pause trigger.
 */
export const visibleNonAntPartyIds = (
  state: GameState,
  visible: ReadonlySet<string>,
): Set<PartyId> => {
  const out = new Set<PartyId>();
  for (const party of state.parties.values()) {
    if (party.faction === 'ant') continue;
    if (!alive(party)) continue;
    if (visible.has(coordKey(party.location))) out.add(party.id);
  }
  return out;
};
