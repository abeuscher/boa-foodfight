/**
 * L8-shared `recruit-count` race primitives.
 *
 * The L8 Attic doctrine needs the same primitive on both sides: the
 * recruiter/racer (`ai/baseline-l8.ts`) chases the lone neutral
 * cockroach party to convert it; the racer/denier (`ai/spider-l8.ts`)
 * chases the same party to body-block / contest it. The shared
 * `closestLivingPartyOfFaction` in `ai/closest-party.ts` is
 * faction-keyed (ant / spider), not neutral-template-keyed, and is a
 * LOCKED shared surface (L6 + the tutorial fortress depend on its
 * exact behaviour) — it must not be widened. This is the minimal
 * additive home for the cockroach-party lookup the two L8 policies
 * share, so neither file duplicates the scan (jscpd 0% gate) and no
 * locked path is touched (the same additive-shared-helper precedent as
 * `ai/closest-party.ts` for L6).
 *
 * Determinism: iterates `state.parties` in insertion order and returns
 * the first match — fully replayable.
 */

import type { GameState, Party } from '../engine/types.ts';

/** The lone neutral cockroach party (the L8 recruit prize). The engine
 * spawns exactly one (`engine/neutrals.ts` `KIND_RECIPE.cockroaches`);
 * it is stationary at its seeded spawn tile. Null once it has been
 * recruited — the recruit handler flips its faction to `ant`, so it
 * stops matching `faction:'neutral'` and the recruit-count win
 * resolves that end-of-turn — or, defensively, if it never spawned /
 * was annihilated. */
export const cockroachParty = (state: GameState): Party | null => {
  for (const party of state.parties.values()) {
    if (party.faction !== 'neutral') continue;
    if (party.units.some((u) => u.templateId === 'cockroach' && u.currentHp > 0)) return party;
  }
  return null;
};
