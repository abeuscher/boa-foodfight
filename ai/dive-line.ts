/**
 * Shared dive-line helper for variants that send ceiling-capable
 * parties through the launch-tile plane-switch route to land on the
 * spider-web tile. The mechanic: walk floor (web.x, web.y), then a
 * follow-up `move-to` with target=web fires `tryPlaneTransition` →
 * `ant-plane-switch` (uses=1) which teleports onto the web tile.
 *
 * Pulled out of the variant files in round 23 to avoid duplication
 * between rush, jelly-rush, dive, and baseline. policy-helpers.ts is
 * locked from designer envelopes, so this lives in its own file.
 */

import { sameCoord } from '../engine/coord.ts';
import type { Party, TileCoord } from '../engine/types.ts';

/**
 * Returns the next move target for a ceiling-capable party that wants
 * to land ON the spider-web tile via plane-switch. While on the floor
 * not at the launch tile, returns the launch tile (floor under the
 * web). At the launch tile or already on the ceiling, returns the
 * web tile itself — the engine's plane-switch handler converts the
 * cross-plane move into a teleport. Undefined iff `webLoc` is unknown.
 */
export const launchTileDiveTarget = (
  party: Party,
  webLoc: TileCoord | undefined,
): TileCoord | undefined => {
  if (webLoc === undefined) return undefined;
  if (party.location.plane === 'floor') {
    const launch: TileCoord = { plane: 'floor', x: webLoc.x, y: webLoc.y };
    if (!sameCoord(party.location, launch)) return launch;
    return webLoc;
  }
  return webLoc;
};
