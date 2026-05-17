/**
 * Phase D-0 — ant policy for the stripped tutorial Level 1
 * (`data/level-1-tutorial`, roadmap §3.2).
 *
 * The campaign's L1 is a deliberately small, pedagogical scenario: two
 * ant unit types (queen + footman), two spider types (queen + soldier),
 * three abilities (queen-ultimate, brace, scout-ping), five FIXED POSTs,
 * a static map. This policy is the matching minimal ant brain — it
 * teaches the one idea L1 exists to teach: *walk the POST chain to the
 * defended web and mass on it.*
 *
 * It is intentionally NOT `ai/baseline.ts`. The fully-loaded baseline
 * reasons about jelly supply lines, ant-plane-switch kill-dives,
 * neutral recruit commit-or-abandon, and commander cards — none of
 * which exist in the stripped kit. Re-using it would drag that dead
 * cognition into the tutorial and couple the gate-29 reference AI to a
 * second scenario. This file is additive; `ai/baseline.ts` is untouched.
 *
 * Strategy (one sentence, per the §3.4.3 learnability rule):
 *
 *   Both footman field parties march the canonical POST chain
 *   (soap-dish → towel-rack → wall-crack → spider-web); the
 *   queen-guard holds the storm drain; any field party below the
 *   round-15 low-HP threshold runs.
 *
 * Why the chain reaches a *ceiling* web with ground-only footmen (no
 * ant-plane-switch in the stripped kit): `towel-rack` (floor 8,2) is
 * `pairedWith` `wall-crack` (north-wall 8,5). Capturing the towel-rack
 * lets the party step through the paired POST onto the north-wall;
 * `nextStageTarget` then routes it to capture wall-crack itself, so the
 * party is standing on the wall. From a wall plane the engine's
 * edge-adjacency (`engine/edges.ts`: north-wall top row y=0 ↔ ceiling)
 * resolves a plain `move-to spider-web` onto the ceiling — exactly the
 * pre-plane-switch route the original baseline used. No new mechanic.
 *
 * Retreat: the round-15 low-HP flee trigger (`livingHpFraction < 0.30`
 * → prepend a `flee` order) is the "retreat folded in early, both
 * sides" mechanic the roadmap §3.2 / Gameplay-PA ruling A wants at L1
 * as the *run posture*. The richer threat-assessment / ambush
 * behavioral layer is L2 (ruling A) and is deliberately NOT here.
 *
 * Determinism: pure (state, scenario, rng) → state via `buildAntPolicy`;
 * the only RNG use is `livingHpFraction` (none) — fully replayable.
 *
 * Imports: engine/types, engine/parties, ai/policy-helpers, ai/types
 * (a strict subset of the fully-loaded baseline's surface).
 */

import { livingHpFraction } from '../engine/parties.ts';
import type {
  FleeOrder,
  GameState,
  Party,
  PartyId,
  Plane,
  PostId,
  TileCoord,
  UnitTemplate,
  UnitTemplateId,
} from '../engine/types.ts';

import {
  buildAntPolicy,
  moveToOrHold,
  nextStageTarget,
  partyAlive,
  type PartyDecision,
  postLocation,
  SPIDER_WEB,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

/** The non-queen ant field parties. The queen-guard is driven by the
 * `buildAntPolicy` framework (immobile, always `defend`) and is excluded
 * here so it never counts toward / blocks the muster gate. */
const isFieldParty = (id: PartyId): boolean => id !== ('queen-guard' as PartyId);

/**
 * Planes that count as "off the floor chain, on the final approach".
 * `wall-crack` (the last chain POST) is on the north-wall; the web is
 * on the ceiling. A party only ever transitions floor → north-wall →
 * ceiling on this map and never steps back to the floor, so
 * "every living field party has left the floor" is a MONOTONIC latch:
 * once true it stays true. That is the property the muster gate needs
 * — a distance-to-rally check oscillates (a party must leave the rally
 * tile to assault, which would re-open the gate and stall it on the
 * wall forever). Plane-progress does not.
 */
const APPROACH_PLANES: ReadonlySet<Plane> = new Set<Plane>(['north-wall', 'ceiling']);
const onApproach = (p: Party): boolean => APPROACH_PLANES.has(p.location.plane);

/** The wall foothold the field force holds on while waiting for the
 * muster. `wall-crack` is the last chain POST (north-wall, one
 * edge-step below the ceiling web) — the natural muster tile. */
const WALL_CRACK: PostId = 'wall-crack' as PostId;

/** Round-15 low-HP retreat threshold (mirrors the fully-loaded
 * baseline's `FLEE_HP_THRESHOLD`; this is the "run posture" L1 teaches
 * per Gameplay-PA ruling A). */
const FLEE_HP_THRESHOLD = 0.3;
const FLEE_ORDER: FleeOrder = { kind: 'flee' };

/** True iff the party has taken enough damage to break off (but is not
 * already wiped — a 0-fraction party is dead, not fleeing). */
const partyShouldFlee = (
  party: Parameters<typeof livingHpFraction>[0],
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  const frac = livingHpFraction(party, templates);
  return frac > 0 && frac < FLEE_HP_THRESHOLD;
};

export const baselineTutorialPlayer: AIPolicy = buildAntPolicy(
  'baseline-tutorial',
  (state: GameState) => {
    // Phase 1 — the chain: walk soap-dish → towel-rack → wall-crack
    // (the paired-POST step puts the party on the north-wall).
    // `nextStageTarget` returns undefined once every chain POST is
    // ant-owned; that flips the policy into the muster/commit phase.
    // The chain naturally funnels all field parties through wall-crack
    // (the last chain POST, on the wall), so they converge there.
    const stage = nextStageTarget(state);
    const stageLoc = stage?.location;
    const webLoc = postLocation(state, SPIDER_WEB);

    // Muster gate (monotonic): commit to the web only once EVERY living
    // field party has left the floor onto the final-approach planes
    // (north-wall / ceiling). Until then, parties already on the wall
    // hold at wall-crack so the slow party catches up — they assault as
    // one mass, not single-file. This is the one idea L1 teaches: mass,
    // then commit (ruling F: a correctly massed ant assault wins
    // decisively). The latch never re-opens (no party returns to the
    // floor), so there is no rally/assault oscillation.
    const chainDone = stage === undefined;
    let mustered = false;
    if (chainDone) {
      mustered = true;
      for (const [id, p] of state.parties) {
        if (p.faction !== 'ant') continue;
        if (!isFieldParty(id)) continue;
        if (!partyAlive(p)) continue;
        if (!onApproach(p)) {
          mustered = false;
          break;
        }
      }
    }
    // The hold tile while waiting for the muster: wall-crack's tile
    // (the wall foothold). Parties already there simply hold; the move
    // order resolves to a no-op via `moveToOrHold`.
    const rallyLoc: TileCoord | undefined = postLocation(state, WALL_CRACK);

    return (party): PartyDecision | null => {
      // Retreat (round-15 / run posture). Prepend a flee so a battle
      // this turn resolves as a break-off; the move order behind it
      // re-forms the advance next turn once HP recovers at a POST.
      const fleeing = partyShouldFlee(party, state.unitTemplates);

      // Target selection:
      //   - chain incomplete  → next chain POST.
      //   - chain done, not yet mustered → hold at wall-crack.
      //   - mustered (or rally tile missing) → commit to the web.
      let target: TileCoord | undefined;
      if (!chainDone) {
        target = stageLoc;
      } else if (!mustered && rallyLoc !== undefined) {
        target = rallyLoc;
      } else {
        target = webLoc;
      }
      if (target === undefined) {
        return fleeing
          ? { orders: [FLEE_ORDER], posture: 'run' }
          : { orders: [], posture: 'fight' };
      }
      const moveOrders = moveToOrHold(party, target);
      if (fleeing) {
        return { orders: [FLEE_ORDER, ...moveOrders], posture: 'run' };
      }
      return { orders: moveOrders, posture: 'fight' };
    };
  },
);
