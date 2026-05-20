/**
 * L10 — spider policy for Level 10 ("The Garage", `data/level-10`; the
 * binding spec is `docs/debate/l10-gameplay-pa-arbitration.md` — the
 * Tier-1 finale).
 *
 * Companion to `ai/baseline-l10.ts`. L10 is a `capture-post` scenario:
 * the spider must keep the ants from capturing `engine-block` (floor
 * (9,9), +6 def / +2 heal — the strict tier-defensive maximum), which
 * it starts holding. The ant baseline musters the body on the
 * `tool-rack` FORK, then forks four columns onto distinct routes
 * (N-passage / over-the-car plane / S-passage / Shelving-cluster) that
 * converge on Engine-Block from different bearings.
 *
 * Same fortress-attrition doctrine as `ai/spider-l5.ts` / `ai/spider-l9.ts`
 * (the last MERGED capture-post precedents), retargeted to the Garage's
 * engine-block, via the shared `buildFortressDefensePolicy`
 * (`ai/capture-chain.ts`). engine-block is spider-owned, so a spider
 * party standing on it gets the +6 def AND +2 heal every turn;
 * concentrating force there turns every assault into a losing trade.
 *
 * ============================================================
 * THE BINDING §3.2 PER-ROUTE DEFENCE (ruled invariant — the
 * L4-§9 anti-route-around structure, applied a seventh time)
 * ============================================================
 *
 * The §3.2 ruled invariant (iv): a REAL defender must engage on the ant
 * routes in a seed-robust majority (without it the multi-route geometry
 * is the L4-§9 route-around breach → straight to the overrun regime).
 * Implemented here, AI-config only, via the EXISTING
 * `FortressDefenseConfig` picket/rover surface + a single bounded
 * L10-only opt-in wrapper (the `ai/spider-l9.ts` precedent):
 *
 *  1. `end-guard` pins `engine-block` (+6 def / +2 heal). Immovable
 *     spine — never moves (the locked guard rule; seed-robust by
 *     construction, the shared builder's `cfg.guard`).
 *  2. `north-picket` / `south-picket` garrison the fortified objective
 *     on the `INTERCEPT_RADIUS` leash and sortie onto the closest
 *     approaching ant (the shared `sortieOrders` — measured
 *     `south-picket` engages 100/100, the rover 99–100/100; the
 *     §3.2 (iv) per-route-defender invariant is satisfied SEED-ROBUSTLY
 *     by the shared builder, NOT by a forward per-cluster divert). The
 *     decisive L9-documented finding, RE-MEASURED here and made binding:
 *     pulling EITHER picket FORWARD off the +6/+2 objective (a
 *     per-cluster choke-hold or forward sortie wrapper) CRATERS the
 *     fortress to ant ~99–100% (the overrun regime — measured: every
 *     forward-divert variant, every leash 1..99, ant 94–100%). The
 *     per-cluster defence is therefore realised THROUGH the shared
 *     builder's objective-anchored sortie (which engages seed-robustly)
 *     — keeping both pickets on the fortress is what holds the
 *     defensible regime; the "bind a picket forward per cluster" shape
 *     is the L9 `spider-l9.ts`-documented fortress-collapse failure
 *     mode, not shipped.
 *  3. `corridor-rovers` is the forward assault-breaker (the L5/L9
 *     fortress-spine role, the shared `roverGate`) PLUS an L10-only
 *     opt-in `car-hood` plane-route contest (the `ai/spider-l9.ts`
 *     wrapper pattern): it marches to contest `car-hood` whenever an
 *     ant detachment closes within `ROVER_CONTEST_LEASH`, so the
 *     over-the-car route (route 2) meets a real defender. This is the
 *     ONLY forward element (one party — the genuine §3.2 garrison-split
 *     at minimum exposure, the L4-§9 §9.3(b).2 / L9 precedent); the
 *     rover engaging is measured seed-robust (99–100/100) and does NOT
 *     crater the fortress (it is the rover's existing forward role,
 *     re-pointed at car-hood, not a picket pulled off +6/+2).
 *
 * BINDING invariant (the L4-§9 / §7 clause): the EXISTENCE of a real
 * defender engaging on the routes in a seed-robust majority is RULED.
 * MEASURED seeds 1..100 (the shipped config): `south-picket` engages
 * 100/100, `corridor-rovers` 99–100/100, decisive 100/100 — the (iv)
 * invariant HOLDS. The `north-picket` does not engage (0/100) ONLY
 * because no ant column genuinely walks the North passage (see the §5
 * falsification below — that is the ANT-side `baseline-l10.ts` /
 * Level-PA §7 residual, NOT a spider-defence failure; the spider
 * defends every route an ant actually takes).
 *
 * ============================================================
 * THE §5 MEASURE-OR-FORK DIRECTIVE — MEASURED DISPOSITION
 * ============================================================
 *
 * Swept the full binding within-loop latitude seeds 1..100 (the
 * `baseline-l10` `MUSTER_RING` + this file's `INTERCEPT_RADIUS` /
 * `ROVER_GATE` / `ROVER_CONTEST_LEASH`; NO ruled value / geometry /
 * roster / forbidden lever touched, the §3 invariants held, the §4
 * `musterPost === 'tool-rack'` knob held):
 *
 *  - The lever space is BISTABLE exactly as BOTH PAs predicted (§5).
 *    `MUSTER_RING`, the fortress leashes and the rover contest leash
 *    are FLAT PLATEAUS then INTEGER CLIFFS (correlated cliffs = a
 *    staircase, NOT a smooth CDF — the Gameplay-PA §4 prediction; the
 *    one genuinely-continuous global lever, day/night, is engine-fixed
 *    and inert, §4i). `interceptRadius` 1 (pickets hug the +6/+2
 *    objective), `ROVER_CONTEST_LEASH` 2: `roverGate` 1→ant 21, 2→21,
 *    3→44, 4→44, 6→73; `ROVER_CONTEST_LEASH` ≥4 → a flat ant ~79
 *    plateau (the rover over-commits to Car-Hood and frees the
 *    S-route); `interceptRadius` ≥2 → a flat ant ~74 plateau; any
 *    forward picket divert → ant ~99–100. No monotone interpolator
 *    anywhere; an upper plateau and a lower lobe with a wide dead-zone
 *    between.
 *  - The near-band points (ant 48–51) ALL have the over-the-car plane
 *    route NOT seed-robust: `vanguard-bravo` crosses to the ceiling in
 *    only ~48–49/100 seeds (the deterministic blitz/grind bimodality —
 *    in the ~half "blitz" seeds the body overruns engine-block at
 *    turn ~6, BEFORE the binding `detachGate:'muster'` switchContest
 *    can fire; in the "grind" seeds the plane route fully develops).
 *    Per §5/§7 a band hit with the doctrine inert/not-seed-robust is an
 *    EXPLICIT FAILURE, NOT a pass (the L8 §7 / L9 hardening) — so the
 *    in-band points are NOT shippable.
 *  - The Level-PA §7 residual is REALISED and is the controlling fact:
 *    the locked `buildChainMarchPolicy` muster gate is a temporal
 *    re-synchroniser. Massing (the binding muster gate) → the blitz
 *    re-convergence (one basin, doctrine inert). Forking the columns
 *    PRE-muster to keep the split → the fragmented assault is
 *    annihilated piecemeal by the fortress (measured ant 0/100). There
 *    is NO within-loop config that keeps the 4-way split alive AND
 *    keeps the assault viable — the within-loop cannot spatially force
 *    the locked AI to keep the mass split (the §4-named, §7-detailed
 *    orchestrator-escalation residual, on its unresolvable side). The
 *    North-passage column (`vanguard-alpha`) is never walked (0/100)
 *    and the plane column only ~49/100 — the §3 invariants (i)/(ii)
 *    cannot be made fully seed-robust within the binding latitude
 *    WITHOUT relaxing a binding invariant (forbidden) or a
 *    card/heal/plane-affinity/un-opted-ability/day-night corrective
 *    (§4f/§4e/§4d/§4g/§4i — all forbidden or inert). This is reported
 *    to the orchestrator as a binding-invariant TENSION that the
 *    within-loop could NOT resolve — itself the valid §5/§7 finding
 *    (the third structurally-bistable late-tier scenario, the §4h
 *    systemic finding's predicted L10 outcome).
 *
 * SHIPPED (the §4h amended-gate, most-defensible lower-regime
 * grandfather; the [≈48,52] band WITHDRAWN per §5): the fortress core
 * at `interceptRadius:1` / `roverGate:4` + the bounded rover car-hood
 * contest at `ROVER_CONTEST_LEASH:2` → ant **~44%**, spider ~56/100,
 * DECISIVE 100/100, the (iv) per-route defender invariant seed-robust
 * (`south-picket` 100/100, `corridor-rovers` 100/100), the seed-robust
 * ant clauses (`vanguard-charlie` S-route 100/100, `pathfinders`
 * Shelving-cluster 100/100, the `switchContest` car-hood detach firing
 * ~49/100), interest ≥75. ~44 sits ABOVE the L9 ~37 grandfathered
 * trough (so the §4h "L9 is the basement trough BELOW the L10 climax"
 * curve-shape intent is preserved — the finale still reads as a
 * climb-out at the achievable band), matching the PAs' predicted
 * most-defensible grandfather (~42–45, deliberately above L9). NO card
 * / heal / plane-affinity / un-opted-ability / day-night-payload
 * corrective (§4f/§4e/§4d/§4g/§4i — all forbidden or inert).
 *
 * Strategy (one sentence, §3.4.3 learnability):
 *
 *   The queen block holds Engine-Block as the immovable spine and the
 *   two pickets garrison that +6/+2 fortified tile on a tight leash
 *   (pulling either forward craters the defence); the corridor-rover is
 *   the forward assault-breaker that also marches to contest the
 *   Car-Hood plane mount whenever an ant detachment closes on it — so
 *   every ant route an ant actually walks meets a real defender, while
 *   the fortress itself is never thinned.
 *
 * Determinism: pure (state)→state; the wrapper scans `state.parties` in
 * insertion order; no RNG is consulted — fully replayable. Touches
 * NEITHER `ai/capture-chain.ts` / `ai/picket-defense.ts` /
 * `ai/closest-party.ts` DEFAULT behaviour (L3/L4/L5/L6/L8/L9 + the
 * tutorial regress on those and stay byte-identical).
 */

import { distance } from '../engine/coord.ts';
import type { GameState, Order, PartyId, PostId, TileCoord } from '../engine/types.ts';

import { buildFortressDefensePolicy, type FortressDefenseConfig } from './capture-chain.ts';
import { moveToOrHold, partyAlive, postLocation } from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

// L10 POST / party ids: `engine-block` is the +6/+2 objective; the
// rover is the bounded §3.2 car-hood plane-route contest party.
const OBJECTIVE = 'engine-block' as PostId;
const ROVER = 'corridor-rovers' as PartyId;
const CAR_HOOD = 'car-hood' as PostId;

/**
 * §4 within-loop tuning latitude — the fortress pickets' Chebyshev
 * leash from engine-block. SHIPPED at 1 (pickets hug the +6/+2
 * objective): the lower-regime value where the fortress holds the
 * staggered waves piecemeal (the §4h amended-gate most-defensible
 * grandfather). Swept seeds 1..100: a flat plateau then an integer
 * cliff (the L9-class staircase) — `interceptRadius` ≥2 → a flat ant
 * ~74 upper plateau; 1 → the lower lobe; no monotone interpolator (the
 * §5 bistable falsification, three correlated cliffs not a smooth CDF).
 */
const INTERCEPT_RADIUS = 1;
/**
 * §4 within-loop tuning latitude — the forward-rover assault-break
 * gate (Chebyshev from engine-block). SHIPPED at 4: with
 * `interceptRadius:1` and `ROVER_CONTEST_LEASH:2` this lands the
 * most-defensible lower-regime grandfather (ant ~44%, ABOVE the L9 ~37
 * trough so the finale reads as a climb-out at the achievable band;
 * the [≈48,52] band withdrawn per §5). Swept seeds 1..100 with
 * `interceptRadius:1`, `ROVER_CONTEST_LEASH:2`: rG 1→ant 21, 2→21,
 * 3→44, 4→44, 6→73 — flat plateaus then integer cliffs, no in-band
 * point with the over-the-car plane route seed-robust (the reported
 * §5 clean falsification — the predicted bistable space).
 */
const ROVER_GATE = 4;
/**
 * §3.2 within-loop tuning latitude — the rover Car-Hood plane-route
 * contest leash. The rover marches to contest `car-hood` when an ant
 * detachment closes within this Chebyshev leash (or it is ant-owned),
 * so route 2 meets a real defender (the §3.2 (iv) invariant — the
 * rover engaging is measured seed-robust ~100/100). SHIPPED at 2: this
 * is the dominant lever within the binding latitude — rcl 2 keeps the
 * rover close enough to also break the South-passage assault (the
 * lower-regime grandfather, ant ~44%); rcl ≥4 over-commits the rover
 * to Car-Hood, abandoning the assault-break and freeing the S-route →
 * the ant ~79% upper plateau (the §5 bistable staircase). The contest
 * itself stays live (the (iv) invariant is satisfied at every rcl).
 */
const ROVER_CONTEST_LEASH = 2;

const L10_DEFENSE_CONFIG: FortressDefenseConfig = {
  name: 'spider-l10',
  objective: OBJECTIVE,
  guard: 'end-guard' as PartyId,
  // BOTH pickets stay in the shared fortress config — the §3.2 (iv)
  // per-route-defender invariant is satisfied SEED-ROBUSTLY by the
  // shared builder's objective-anchored sortie (south-picket 100/100,
  // rover ~100/100). The L9 `spider-l9.ts`-documented finding,
  // re-measured and made binding here: pulling EITHER picket forward
  // off the +6/+2 objective (the "bind per-cluster forward" shape)
  // craters the fortress to ant ~99–100% (the overrun regime). The
  // fortress is NEVER thinned; the only forward element is the rover's
  // bounded car-hood contest (the wrapper below).
  pickets: ['north-picket' as PartyId, 'south-picket' as PartyId],
  rover: ROVER,
  interceptRadius: INTERCEPT_RADIUS,
  roverGate: ROVER_GATE,
  // No `switchDefense`: its L4 holdFortress-on-flip semantics do not
  // fit L10 (the L9 finding). The car-hood contest is the L10-opt-in
  // wrapper below; the shared builder collapses to the EXACT original
  // L3/L5 fortress code path (byte-identical, asserted by the
  // L3-67 / L5-66 measures + the coevo gate-29).
};

const fortressBase: AIPolicy = buildFortressDefensePolicy(L10_DEFENSE_CONFIG);

/**
 * §3.2 binding plane-route defence, L10-opt-in, THIS FILE ONLY. Runs
 * the shared fortress policy, then OVERRIDES the rover to march onto
 * the Car-Hood mount whenever an ant detachment has closed within
 * `ROVER_CONTEST_LEASH` of it (or it is ant-owned), so the
 * over-the-car route (route 2) meets a real defender. While no ant is
 * near Car-Hood the shared forward assault-break orders stand. The
 * pickets are left entirely to the shared fortress (pulling them
 * forward craters the defence — the L9 finding). Pure (state)→state,
 * deterministic, no RNG.
 */
export const spiderL10: AIPolicy = {
  name: 'spider-l10',
  faction: 'spider',
  decide(state: GameState, scenario, rng): GameState {
    const based = fortressBase.decide(state, scenario, rng);
    const rover = based.parties.get(ROVER);
    const carHoodLoc: TileCoord | undefined = postLocation(based, CAR_HOOD);
    if (rover === undefined || !partyAlive(rover) || carHoodLoc === undefined) return based;

    let nearest = Number.POSITIVE_INFINITY;
    for (const p of based.parties.values()) {
      if (p.faction !== 'ant' || !partyAlive(p)) continue;
      const d = distance(carHoodLoc, p.location);
      if (d < nearest) nearest = d;
    }
    const carHoodPost = based.posts.get(CAR_HOOD);
    const contestLive =
      nearest !== Number.POSITIVE_INFINITY &&
      (carHoodPost?.owner === 'ant' || nearest <= ROVER_CONTEST_LEASH);
    if (!contestLive) return based;

    const orders: readonly Order[] = moveToOrHold(rover, carHoodLoc);
    if (orders === rover.orders) return based;
    const nextParties = new Map(based.parties);
    nextParties.set(ROVER, { ...rover, orders, posture: 'fight' });
    return { ...based, parties: nextParties };
  },
};
