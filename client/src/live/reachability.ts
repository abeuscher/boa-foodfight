/**
 * Cross-plane reachability — does a party have any one-step route to a
 * target plane?
 *
 * Chunk 35 (audit H-1 fix) — the engine's `tryPlaneTransition` accepts
 * a cross-plane move order under three conditions: (1) the party carries
 * `ant-plane-switch` (same-(x,y) teleport), (2) the current plane shares
 * a fold-edge with the target plane (edge adjacency), or (3) the party
 * stands on a POST whose `pairedWith` partner sits on the target plane
 * (paired-POST traversal). If none of those holds — e.g. a non-mage
 * party on the floor targeting the ceiling — the engine breaks the
 * movement loop with `Order stalls; will retry next turn`, but the UI
 * accepts the click silently. The S1/S2 audit (`docs/test-feedback/
 * ui-audit-s{1,2}`) found this was the keystone blocker — it made L1's
 * win condition + all combat unreachable to human players.
 *
 * This helper mirrors the engine's first-step check so the UI can fail
 * fast on the click instead of pantomiming an order it can't fulfill.
 *
 * Multi-turn routes (floor → wall → ceiling via edge adjacency) aren't
 * resolved here. They're tractable but the engine's greedy per-turn BFS
 * only commits to the next step, so the player would still have to
 * re-order at each waypoint — the natural answer is to refuse the
 * direct click and let the player issue an explicit intermediate move.
 * Per the playthrough notes §4, multi-turn pathfinding in the UI is
 * deferred to Path-PA work.
 */
import { partyHasPlaneSwitch } from '../../../engine/movement.ts';
import { edgeNeighbor } from '../../../engine/edges.ts';
import type { GameState, Party, Plane } from '../../../engine/types.ts';

/**
 * True iff the engine has any one-step route from `party.location.plane`
 * to `targetPlane` — same plane, plane-switch ability, edge adjacency,
 * or a paired-POST chain from the party's current plane to the target.
 */
export const canReachPlaneInOneStep = (
  party: Party,
  targetPlane: Plane,
  state: GameState,
): boolean => {
  // Same plane is trivially reachable.
  if (party.location.plane === targetPlane) return true;

  // Ant-mage carries `ant-plane-switch` — teleport same-(x,y) to the
  // target plane. Engine matches this in `tryPlaneTransition` step 1.
  if (partyHasPlaneSwitch(party, state.unitTemplates)) return true;

  // Edge adjacency — the current plane shares a fold-edge with the
  // target plane. `edgeNeighbor` returns the adjacent tile on the
  // target plane, or undefined if no shared edge exists (e.g. opposite
  // faces: floor↔ceiling, north↔south, east↔west).
  if (edgeNeighbor(party.location, targetPlane) !== undefined) return true;

  // Paired-POST traversal — a POST on the current plane whose
  // `pairedWith` partner sits on the target plane gives a one-step
  // transit (engine matches this in `tryPlaneTransition` step 3). We
  // don't check whether the party stands on the source POST here; the
  // player can walk to it on the current plane and then traverse.
  for (const post of state.posts.values()) {
    if (post.location.plane !== party.location.plane) continue;
    if (!post.pairedWith) continue;
    const partner = state.posts.get(post.pairedWith);
    if (partner && partner.location.plane === targetPlane) return true;
  }

  return false;
};
