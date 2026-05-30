/**
 * Shared policy-augmentation helper for the Chunk 7a v2 wrappers
 * (`ai/baseline-v2.ts` and `ai/spider-l1-v2.ts`). Both wrappers
 * follow the same pattern: call the locked inner policy, then walk
 * the resulting parties in id-sorted order and replace any whose
 * orders the v2 heuristics want to override.
 *
 * Extracted to keep the wrappers focused on their specific heuristics
 * (item attraction / POST opportunism / wall reaction) without each
 * one re-stating the iteration shape. Pure: no Rng, no side effects.
 */

import type { Faction, GameState, Party, PartyId } from '../engine/types.ts';

export const augmentFactionParties = (
  state: GameState,
  faction: Faction,
  augment: (party: Party, state: GameState) => Party,
): GameState => {
  const newParties = new Map<PartyId, Party>(state.parties);
  const sortedIds = [...state.parties.keys()].sort();
  let changed = false;
  for (const id of sortedIds) {
    const party = state.parties.get(id);
    if (!party) continue;
    if (party.faction !== faction) continue;
    const augmented = augment(party, state);
    if (augmented === party) continue;
    newParties.set(id, augmented);
    changed = true;
  }
  return changed ? { ...state, parties: newParties } : state;
};
