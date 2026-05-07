/**
 * Shared helpers for variant `placement` hooks (round 7 feature 2).
 *
 * The variant-specific placement functions all do the same thing: take
 * a partial mapping of partyId -> proposed-tile, return a new GameState
 * with those parties relocated. The engine validates and reverts
 * invalid placements, so the per-variant placement bodies stay short
 * and intent-focused.
 *
 * Both ant and spider hooks share the same plumbing — apply the diff
 * to a `parties` map. The engine enforces faction-specific rules
 * (radius, no-POST/obstacle, queen-guard immobility, ⌊N/2⌋ spider
 * cap) on top of whatever this returns.
 */

import type { GameState, Party, PartyId, TileCoord } from '../engine/types.ts';

/**
 * Apply a partial party-id → target-tile mapping to a state. Parties
 * not in the mapping retain their roster position. Wholly missing
 * party ids in the mapping are silently ignored.
 */
const applyPartyMoves = (
  state: GameState,
  moves: Readonly<Record<string, TileCoord>>,
): GameState => {
  const parties = new Map<PartyId, Party>(state.parties);
  for (const [id, target] of Object.entries(moves)) {
    const party = parties.get(id as PartyId);
    if (!party) continue;
    parties.set(id as PartyId, { ...party, location: target });
  }
  return { ...state, parties };
};

/**
 * Ant-side placement hook builder. Pass an object whose keys are
 * party ids and whose values are the target tile. The engine
 * validates each move (floor plane, Chebyshev radius 5 of storm-
 * drain, no POSTs/obstacles, queen-guard always rejected); invalid
 * moves silently revert.
 */
export const antPlacement = (
  state: GameState,
  moves: Readonly<Record<string, TileCoord>>,
): GameState => applyPartyMoves(state, moves);

/**
 * Spider-side placement hook builder. Same shape as the ant helper,
 * but the engine cap is ⌊N/2⌋ moved parties (any plane, no POSTs/
 * obstacles). Parties beyond the cap silently revert in lex order.
 */
export const spiderPlacement = (
  state: GameState,
  moves: Readonly<Record<string, TileCoord>>,
): GameState => applyPartyMoves(state, moves);
