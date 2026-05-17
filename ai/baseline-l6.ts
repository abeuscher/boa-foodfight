/**
 * L6 — ant policy for Level 6 ("The Stairs", `data/level-6`,
 * level-progression-plan §2 "L6 — Stairs", §5 deviation #4).
 *
 * L6 is the campaign's first and only `eradicate` scenario: the ants
 * win ONLY by destroying every spider party (`engine/end-of-turn.ts`
 * `allSpiderPartiesEliminated`); reaching the turn cap is an
 * unconditional ant LOSS with no score path (`engine/turn.ts` ~480 —
 * eradicate is decisive-or-timeout-loss, structurally unlike the
 * capture-post L3/L4/L5). It is therefore NOT a capture-post
 * chain-marcher and deliberately does NOT use `ai/capture-chain.ts`
 * (the shared L3/L4/L5 chain-march builder): there is no POST chain to
 * walk, no objective POST to capture, no muster-then-assault — the only
 * winning behaviour is "find every spider party and kill it before the
 * cap". This is its own doctrine, a standalone hunter, exactly as the
 * Level PA brief directs (L6 needs its OWN AIs).
 *
 * Geometry (§2-L6 + §5 #4 — "5 floor planes" realized as a single
 * terraced floor + an open ceiling flyer lane; planes are not stacked
 * floors, terraces preserve the vertical-traversal gauntlet + the
 * flyer-favored payoff). `data/level-6/map.json`: a static 10×10 with
 * TWO planes (floor + ceiling — the minimal set that expresses the
 * intent; no wall plane is needed). The floor is a five-tread terraced
 * staircase: obstacle "riser" walls span cols 2–7 on rows 1, 3, 5, 7,
 * leaving five fully-open tread bands (rows {8,9},{6},{4},{2},{0}) that
 * a ground unit must climb through, connected ONLY by the two
 * full-height open connector columns (cols 0–1 west, cols 8–9 east,
 * open every row 0–9). The ceiling plane is fully open — the flyer
 * lane: mage-bearing ant parties (`ant-plane-switch`,
 * `engine/movement.ts:tryPlaneTransition`) ascend it, traverse the
 * unobstructed ceiling, and drop onto an upper-terrace spider, skipping
 * the entire riser gauntlet (the §5 #4 flyer-favored payoff — "climb or
 * get out-flown; spiders can't just turtle").
 *
 * Five POSTs (§4.2 5–8 rule, L6:5 — positional/economy, NOT an
 * objective POST since `eradicate` has none): `stairwell-base` (ant
 * home/staging, floor (1,9), bottom tread), `lower-/mid-/upper-landing`
 * (the POST-occupation anti-turtle-bonus POSTs the Gameplay PA's L6
 * delta attaches to — neutral, on connector columns at rising terraces
 * (8,6)/(1,4)/(8,2) so holding them forces the spider OFF a single
 * turtle tile and DOWN into the terraced gauntlet to contest all three
 * elevations), `top-rail` (spider staging, ceiling (5,1), the flyer
 * lane). The hunter does not chain or capture any of them — eradicate
 * has no capture objective; the anti-turtle bonus is the Gameplay PA's
 * mechanic delta, applied by the orchestrator LATER, NOT designed here.
 *
 * Strategy (one sentence, per the §3.4.3 learnability rule):
 *
 *   Every field party hunts the nearest living spider party to wipe it;
 *   the two mage-bearing parties (the "flyers") route up the open
 *   ceiling lane and drop onto their quarry while the ground parties
 *   climb the terraced connectors, the queen-guard holds the
 *   stairwell-base, and any field party below the low-HP threshold
 *   runs — until no spider party has a living unit (the eradicate win).
 *
 * Greedy navigability (the §0 strict-closer-neighbour argument), proven
 * for BOTH routes:
 *   - Ground climb (floor): every spider party starts on a CONNECTOR
 *     column (x∈{0,1,8,9} — verified in `data/level-6/roster-spiders`),
 *     and the connectors are open on every row 0–9. From any open floor
 *     tile to any connector-column tile, a strictly-closer (Manhattan)
 *     open neighbour always exists (an exhaustive all-open-tile ×
 *     all-connector-target sweep finds ZERO stuck pairs — the risers at
 *     cols 2–7 never lie between a connector source and a connector
 *     target, so the engine's strict greedy descent
 *     `engine/movement.ts:pickGreedyStep` never sticks). The riser
 *     gauntlet still forces the long zig-zag climb (a ground party must
 *     ride a connector up past each riser) — the vertical-traversal
 *     constraint — but it is always navigable.
 *   - Flyer lane (ceiling): the ceiling plane is fully open (no
 *     obstacle tiles at all), so Manhattan descent to any ceiling tile
 *     is trivially monotone — every step toward the target strictly
 *     decreases distance. A flyer party `ant-plane-switch`es to the
 *     ceiling tile directly above its quarry (target plane differs →
 *     the engine teleports it up), crosses the open ceiling, then
 *     targets the spider's floor tile (target plane differs again → it
 *     teleports back down onto the quarry). Each leg is greedy-safe.
 *
 * Determinism: pure (state, scenario, rng) → state via the locked
 * read-only `buildAntPolicy` helper (the same import surface
 * `ai/capture-chain.ts` uses — `ai/policy-helpers.ts` is NOT modified);
 * no RNG is consulted — fully replayable. Additive; registered ONLY
 * under `SCENARIO_PLAYER_AIS` (never `PLAYER_AIS`) so the gate-29
 * diversity sweep stays byte-identical, and it touches NEITHER
 * `ai/capture-chain.ts` NOR `ai/picket-defense.ts` (L3/L4/L5 and the
 * tutorial share those and stay byte-identical).
 *
 * The §5 L6 target is ~55% (a resumed descent below the L5 66 rebound —
 * the "hardest-but-fair" point). The orchestrator + Gameplay PA tune
 * toward ~55% after applying the ruled L6 anti-turtle delta; this
 * hunter is the stable pre-delta baseline doctrine.
 */

import type { GameState, Party, TileCoord } from '../engine/types.ts';

import { closestLivingPartyOfFaction } from './closest-party.ts';
import { partyShouldFlee } from './picket-defense.ts';
import {
  buildAntPolicy,
  CEILING_CAPABLE,
  moveToOrHold,
  type PartyDecision,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

/** Round-15-style low-HP retreat threshold (mirrors the shared
 * chain-march / tutorial value; eradicate keeps the same flee
 * discipline so a broken party doesn't feed itself piecemeal). */
const FLEE_HP_THRESHOLD = 0.3;
const FLEE_ORDER = { kind: 'flee' as const };

const CEILING = 'ceiling';
const FLOOR = 'floor';

/**
 * The closest living spider party to `from` (the shared L6 scan —
 * Manhattan within-plane, +∞ across planes, lowest-party-id tiebreak).
 * Returns null when every spider party is dead (the eradicate win —
 * the engine resolves it that turn; the hunter has no target left).
 */
const closestSpiderParty = (state: GameState, from: TileCoord): Party | null =>
  closestLivingPartyOfFaction(state, 'spider', from);

/**
 * Pick the hunt target tile for a field party.
 *
 *   - Ground parties: the spider's tile directly (a single `move-to`;
 *     the engine's greedy descent climbs the terraced connectors —
 *     verified globally stuck-free for connector-column spiders).
 *   - Flyer parties (mage-bearing → `ant-plane-switch`): exploit the
 *     open ceiling lane. While still on the floor and NOT yet directly
 *     under/over the quarry, ascend to the ceiling tile above the
 *     spider (cross-plane target → the engine teleports up). Once on
 *     the ceiling, target the spider's floor tile (cross-plane again →
 *     teleport straight down onto the quarry). This routes the flyer
 *     OVER the entire riser gauntlet — the §5 #4 flyer-favored payoff.
 */
const huntTarget = (party: Party, spider: Party): TileCoord => {
  const target = spider.location;
  const isFlyer = CEILING_CAPABLE.has(party.id);
  if (!isFlyer) return target;
  // Flyer on the ceiling already → drop straight onto the quarry's
  // floor tile (cross-plane → teleport down).
  if (party.location.plane === CEILING) {
    return target.plane === FLOOR ? target : { plane: FLOOR, x: target.x, y: target.y };
  }
  // Flyer still on the floor → climb into the flyer lane: the ceiling
  // tile directly above the quarry (cross-plane → teleport up). From
  // there the open ceiling carries it across with no risers.
  return { plane: CEILING, x: target.x, y: target.y };
};

export const baselineL6Player: AIPolicy = buildAntPolicy('baseline-l6', (state: GameState) => {
  return (party: Party): PartyDecision | null => {
    const fleeing = partyShouldFlee(party, state.unitTemplates, FLEE_HP_THRESHOLD);
    const spider = closestSpiderParty(state, party.location);
    if (spider === null) {
      // No living spider party (eradicate already satisfied this turn,
      // or none visible) — hold position; flee if broken.
      return fleeing ? { orders: [FLEE_ORDER], posture: 'run' } : { orders: [], posture: 'fight' };
    }
    const target = huntTarget(party, spider);
    const moveOrders = moveToOrHold(party, target);
    return fleeing
      ? { orders: [FLEE_ORDER, ...moveOrders], posture: 'run' }
      : { orders: moveOrders, posture: 'fight' };
  };
});
