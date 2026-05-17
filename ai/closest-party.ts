/**
 * L6-shared "closest living party of a faction to a tile" scan.
 *
 * The L6 `eradicate` doctrine needs the same primitive on both sides:
 * the hunter (`ai/baseline-l6.ts`) picks the closest living SPIDER
 * party to chase; the survivalist (`ai/spider-l6.ts`) picks the closest
 * living ANT party to evade / contest. The shared `closestAntParty`
 * in `ai/picket-defense.ts` is ant-only and keyed off a `Party` (its
 * leash semantics) and is a LOCKED shared surface (the tutorial / L3
 * fortress depend on its exact behaviour) — it must not be widened or
 * modified. This is the minimal additive home for the faction-generic,
 * tile-keyed variant the two L6 policies share, so neither file
 * duplicates the scan (jscpd 0% gate) and no locked path is touched.
 *
 * Determinism: iterates `state.parties` in insertion order; ties on
 * Manhattan distance break to the lower party id — fully replayable.
 */

import { distance } from '../engine/coord.ts';
import type { Faction, GameState, Party, TileCoord } from '../engine/types.ts';

/**
 * The closest living party of `faction` to `from` (Manhattan
 * within-plane, +∞ across planes — the metric the shared sortie scans
 * use). Lowest party id breaks distance ties. Returns null when no
 * living party of that faction exists.
 */
export const closestLivingPartyOfFaction = (
  state: GameState,
  faction: Faction,
  from: TileCoord,
): Party | null => {
  let best: { party: Party; d: number } | null = null;
  for (const [id, party] of state.parties) {
    if (party.faction !== faction) continue;
    if (!party.units.some((u) => u.currentHp > 0)) continue;
    const d = distance(from, party.location);
    if (
      best === null ||
      d < best.d ||
      (d === best.d && (id as string) < (best.party.id as string))
    ) {
      best = { party, d };
    }
  }
  return best === null ? null : best.party;
};
