/**
 * Client-side BFS path preview for the L1 UI-compression bundle CR
 * UI-01 (press-and-hold path peek). Mirrors `engine/movement.ts`'s
 * `pickBfsStep` but exposes the **full sequence of tiles** rather
 * than just the next step, and runs without an Rng — the preview is
 * provisional / display-only, so deterministic-id tiebreaks are
 * unnecessary.
 *
 * Reuses the engine's `bfsDistancesFromTarget` + `isPassableTile` +
 * `tileAt` so the preview can never disagree with what the engine
 * will actually pick (the only divergence is the per-step Rng
 * tiebreak among equally-cheap equally-progress neighbors, which the
 * preview resolves by `NEIGHBOR_OFFSETS` order instead).
 *
 * Provisional by spec (cube memo §A.3 "commit to destination, not
 * route"): the engine doesn't store a route object and can re-pick
 * a different path turn-to-turn as webs / obstacles / parties shift
 * the distance map. The peek is a snapshot, not a promise — the
 * caller renders it dashed to signal that.
 *
 * Cross-plane: returns an empty preview when from/target straddle
 * planes. The cube memo's paired-POST / edge-adjacency transitions
 * would require fabricating a route across face folds, which the
 * design explicitly opted out of ("no fabricated cross-face line").
 *
 * Pure: no Rng, no side effects, no mutation of inputs.
 */

import { coordKey, inPlaneNeighbors, sameCoord } from '../../../engine/coord.ts';
import { bfsDistancesFromTarget, isPassableTile, tileAt } from '../../../engine/movement.ts';
import type { Tile, TileCoord } from '../../../engine/types.ts';

/** Cap on returned path length. Generous default; callers wanting a
 * single-turn preview should pass `partyMovementAllowance`. */
const DEFAULT_MAX_STEPS = 12;

/**
 * Compute a provisional in-plane path preview from `from` to `target`.
 * Returns the sequence of tiles the party would walk on a greedy-BFS
 * descent (mirroring the engine's per-step pathfinder). The first tile
 * is `from`'s next step, the last is `target` if reachable within
 * `maxSteps`. Returns an empty array when:
 *
 *   - from and target are on different planes (engine cross-plane
 *     mechanics aren't preview-able as a straight line)
 *   - from === target (nothing to draw)
 *   - target is unreachable from `from` in the current tile map
 *
 * The preview is **display-only**: deterministic given the same input
 * snapshot, but does not consume Rng (tiebreaks prefer the lowest-
 * movementCost neighbor; further ties resolve by NEIGHBOR_OFFSETS order).
 * Real movement may pick a different equally-short route on a re-roll,
 * which is fine — the peek is a guess.
 */
export const previewPath = (
  from: TileCoord,
  target: TileCoord,
  tiles: ReadonlyMap<string, Tile>,
  maxSteps: number = DEFAULT_MAX_STEPS,
): readonly TileCoord[] => {
  if (from.plane !== target.plane) return [];
  if (sameCoord(from, target)) return [];
  const distances = bfsDistancesFromTarget(target, tiles);
  const fromDist = distances.get(coordKey(from));
  if (fromDist === undefined) return [];
  const out: TileCoord[] = [];
  let cursor: TileCoord = from;
  let cursorDist = fromDist;
  while (!sameCoord(cursor, target) && out.length < maxSteps) {
    // Pick the neighbor strictly closer to target with the lowest
    // movement cost (mirrors `pickBfsStep`'s candidate-selection sort).
    let best: { coord: TileCoord; cost: number } | null = null;
    for (const neighbor of inPlaneNeighbors(cursor)) {
      const d = distances.get(coordKey(neighbor));
      if (d === undefined || d >= cursorDist) continue;
      const tile = tileAt(neighbor, tiles);
      if (!isPassableTile(tile)) continue;
      const cost = tile.terrain.movementCost;
      if (best === null || cost < best.cost) best = { coord: neighbor, cost };
    }
    if (best === null) break;
    out.push(best.coord);
    cursor = best.coord;
    cursorDist -= 1;
  }
  return out;
};
