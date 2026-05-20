/**
 * L10 — ant policy for Level 10 ("The Garage", `data/level-10`,
 * level-progression-plan §2 "L10 — Garage", §4i; the binding spec is
 * `docs/debate/l10-gameplay-pa-arbitration.md` — the Tier-1 finale).
 *
 * L10 is a `capture-post` scenario on a static 10×10, **all 6 planes**
 * (the max-richness finale, bookending L1). The floor carries three
 * SEPARATED obstacle clusters + the Car (the §4h anti-bistability
 * geometry — never one bisecting mass): the **Car** 3×3 dead-centre
 * (cols 4–6 × rows 4–6) splitting the floor into a North passage
 * (rows 0–3, depth 4) and a South passage (rows 7–9, depth 3); the
 * **Workbench** block (cols 1–2 × rows 4–6, the NW defensive-cluster
 * anchor); the **Shelving** block (col 8 × rows 4–6, the E-side mirror
 * counterpressure — deliberately NOT touching y≥7, the single most
 * important anti-L9 invariant: no S-passage re-pinch). Open lanes flank
 * at x=3 (West), x=7 (Mid) and x=9 (East), all y. 7 POSTs: `side-door`
 * (ant home, floor (0,9), SW), `tool-rack` (neutral high-heal staging,
 * floor (0,7) — the chain FORK point / muster POST), `workbench`
 * (neutral def, floor (3,3), N-route waypoint), `car-hood` (neutral
 * plane-transition, floor (5,3), `pairedWith: shelving`), `shelving`
 * (neutral transition endpoint, ceiling (5,2), `pairedWith: car-hood`),
 * `garage-door` (neutral S gate, floor (7,9), x≥7 east of the Car),
 * `engine-block` (objective, spider-held, floor (9,9), +6 def / +2 heal
 * — the strict tier-defensive maximum).
 *
 * ============================================================
 * THE BINDING §3 MULTI-ROUTE DOCTRINE (ruled invariants)
 * ============================================================
 *
 * The §4h finding: a single-objective single-route contested-fortress
 * `capture-post` is structurally bistable (L9 grandfathered ~37). The
 * locked `buildChainMarchPolicy` musters the WHOLE field force as one
 * mass on the last neutral link then commits down ONE greedy basin —
 * one mass + one basin = one binary trial → bimodal. The §4h
 * countermeasure is multi-cluster geometry (ruled, in the map); the
 * continuity lever is the BINDING, seed-robust multi-route doctrine —
 * each ant vanguard column bound to a DISTINCT named route so the
 * assault arrives as three time-staggered waves on three geometries,
 * not one mass. Per the L4-§9 anti-route-around precedent (a ruled
 * mechanic the frozen AI routes around is inert), this is implemented
 * here, AI-config only:
 *
 *  1. `vanguard-alpha` → N-passage route (greedy along the north floor
 *     passage around the Car's north end, via the `workbench`
 *     defensive waypoint).
 *  2. `vanguard-bravo` → over-the-car plane route, bound via the
 *     EXISTING L4 `switchContest` machinery on the shared
 *     `buildChainMarchPolicy` (`captureParties:['vanguard-bravo']`,
 *     `post: car-hood`, `detachGate:'muster'`, `detachmentIsSpent:
 *     false`). Greedy Manhattan never volunteers a plane switch —
 *     binding it through `switchContest` is the L4-§9 corrective that
 *     makes the over-the-car route GENUINELY walked (the mage carries
 *     `ant-plane-switch`; `car-hood` `pairedWith` `shelving` opens the
 *     ceiling axis). `detachmentIsSpent:false` so the column rejoins
 *     the engine-block assault (the L9 lesson — `spent` makes the
 *     spider contest inert, the §7 failure).
 *  3. `vanguard-charlie` → S-passage route (heavy potato-bug column,
 *     via the `garage-door` S gate around the Car's south end).
 *  4. `pathfinders` → Shelving-cluster pressure (2nd mage column / 2nd
 *     plane-capable threat so the spider cannot collapse all defence
 *     onto one transition).
 *  5. `queen-guard` holds `side-door` (immobile spine, excluded from
 *     every gate — the locked L5/L9 pattern; byte-identical math,
 *     seed-robust).
 *
 * The per-column route binding (invariants (i)/(iv)) is implemented as
 * an L10-OPT-IN WRAPPER in THIS FILE ONLY (the `ai/spider-l9.ts`
 * opt-in-wrapper precedent — run the shared builder, then OVERRIDE the
 * named columns' route waypoints). NO shared-builder default is touched
 * (`ai/capture-chain.ts` is unmodified — L3/L4/L5/L6/L8/L9 + the
 * tutorial regress on those and stay byte-identical, asserted by their
 * own suites + the coevo gate-29). The shared chain itself is
 * `[tool-rack, engine-block]`: the body musters on `tool-rack` — THE
 * FORK POINT (the orchestrator-held binding knob: `musterPost` MUST be
 * `tool-rack`, NOT past the fork; mustering past it re-collapses to one
 * basin = the L9 trap) — then the wrapper forks each column onto its
 * named waypoint so the split survives to contact.
 *
 * ORCHESTRATOR-HELD BINDING KNOB (§4): `musterPost === 'tool-rack'`
 * (the fork point — BINDING, not a tuning knob). `MUSTER_RING` is the
 * within-loop tuning latitude (with the three per-route spider leash
 * radii in `ai/spider-l10.ts`); the INVARIANT (the split survives the
 * fork to contact in a seed-robust majority) is BINDING and MEASURED.
 * A tight ring keeps the columns from re-gathering into one mass AFTER
 * the fork (a wide ring re-synchronises the split — the explicit
 * re-convergence failure the Level-PA §7 named).
 *
 * TUNING TRAJECTORY + MEASURED DISPOSITION (the §5 measure-or-fork
 * directive — the within-loop latitude is `MUSTER_RING` + the three
 * `ai/spider-l10.ts` per-route leash radii; NO ruled value / geometry /
 * roster / forbidden lever touched): see the `MUSTER_RING` comment and
 * the report. The seeds-1..100 sweep is BISTABLE exactly as both PAs
 * predicted (lower regime fortress-holds, upper regime overrun, a wide
 * dead-zone, no in-band seed-robust config); the shipped config is the
 * most-defensible lower-regime grandfather point with the [≈48,52] band
 * withdrawn, the 3-route doctrine + per-cluster spider defence fully
 * seed-robust, decisive, interest ≥75 — the §4h amended-gate shape
 * (above the L9 ~37 trough so the finale still reads as a climb-out).
 *
 * Strategy (one sentence, per the §3.4.3 learnability rule):
 *
 *   Every field column marches to the Tool-Rack fork and musters
 *   there; once mustered each column forks onto its OWN named route —
 *   alpha up the North passage via the Workbench, bravo over the Car
 *   via the Car-Hood→Shelving plane pair, charlie down the South
 *   passage via the Garage-Door, pathfinders pressuring the Shelving
 *   cluster — converging on the spider-held Engine-Block from four
 *   different bearings; the queen-guard holds the Side-Door; any field
 *   party below the low-HP threshold runs.
 *
 * Determinism: pure (state, scenario, rng) → state; the wrapper scans
 * `state.parties` in insertion order; no RNG is consulted — fully
 * replayable. Touches NEITHER `ai/capture-chain.ts` /
 * `ai/picket-defense.ts` / `ai/closest-party.ts` /
 * `ai/policy-helpers.ts` DEFAULT behaviour — L10 is an opt-in
 * `switchContest` config + an L10-only route-fork wrapper.
 */

import { planarManhattan } from '../engine/coord.ts';
import type { GameState, Order, PartyId, PostId, TileCoord } from '../engine/types.ts';

import { buildChainMarchPolicy, type ChainMarchConfig } from './capture-chain.ts';
import { moveToOrHold, partyAlive, postLocation } from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

/**
 * The orchestrator-held binding knob (§4). `musterPost` MUST be
 * `tool-rack` (the chain FORK point) — NOT past the fork. Mustering
 * past Tool-Rack re-collapses the geometrically-split mass into one
 * basin before contact = the L9 single-basin trap. This is BINDING
 * (a ruled invariant, asserted by `engine/level10.test.ts`), not a
 * tuning knob.
 */
const MUSTER_POST = 'tool-rack' as PostId;

/**
 * §4 within-loop tuning latitude — the muster ring (with the three
 * per-route spider leash radii in `ai/spider-l10.ts`). The BINDING
 * invariant is that the 3-route split survives the Tool-Rack fork to
 * contact in a seed-robust majority (a wide ring re-synchronises the
 * split into one mass AFTER the fork — the explicit Level-PA §7
 * re-convergence failure). Swept seeds 1..100 vs `spider-l10` (NO
 * ruled value / geometry / roster touched): the lever space is
 * BISTABLE exactly as both PAs predicted — the multi-route help shifts
 * the lower regime modestly up from L9's ~37 but no value lands the
 * [≈48,52] band with the doctrine seed-robust; `MUSTER_RING` is a flat
 * plateau then an integer cliff (the L9-class staircase, three
 * correlated cliffs not a smooth CDF). Carried at the L3/L5/L9
 * plateau-centre value (2): the split is forked by the WRAPPER (each
 * column to its named waypoint) the instant the body musters, so the
 * ring only needs to be tight enough to gather the body AT the fork
 * (not a knife-edge value) — the band is a reported clean
 * falsification, not a knife-edge-ring artefact.
 */
const MUSTER_RING = 2;

/**
 * The §3 binding multi-route doctrine: each ant vanguard column bound
 * to a DISTINCT named route waypoint (invariants (i)/(iv)). The wrapper
 * forks each column onto its waypoint once the body has mustered on the
 * Tool-Rack fork; before muster every column walks the shared chain to
 * the fork (so the split happens AT the fork, never past it).
 *
 *  - `vanguard-alpha`  → `workbench`   (N-passage defensive waypoint)
 *  - `vanguard-charlie`→ `garage-door` (S-passage gate)
 *  - `pathfinders`     → `shelving`    (Shelving-cluster / ceiling
 *                                       pressure, the 2nd plane threat)
 *
 * `vanguard-bravo` is NOT here: it is bound to the over-the-car plane
 * route through the EXISTING L4 `switchContest` machinery (post:
 * `car-hood`, `detachGate:'muster'`) so the greedy AI genuinely walks
 * the plane route it would otherwise never volunteer. `queen-guard` is
 * NOT here: it is the immobile spine driven by the shared builder.
 */
const ROUTE_WAYPOINT: Readonly<Record<string, PostId>> = {
  'vanguard-alpha': 'workbench' as PostId,
  'vanguard-charlie': 'garage-door' as PostId,
  pathfinders: 'shelving' as PostId,
};
const OBJECTIVE = 'engine-block' as PostId;
const QUEEN_GUARD = 'queen-guard' as PartyId;
const PLANE_COLUMN = 'vanguard-bravo' as PartyId;
const CAR_HOOD = 'car-hood' as PostId;

/**
 * §3 invariant (ii) — make the over-the-car route a GENUINE ceiling
 * route, not a floor detour. The shared `switchContest` machinery only
 * marches `vanguard-bravo` onto the `car-hood` tile (floor (5,3)) and
 * captures it; greedy Manhattan then walks it back along the FLOOR to
 * the objective — the plane axis is never crossed (measured: car-hood
 * flips but bravo stays on the floor, the route inert exactly the
 * L4-§9 way). Once bravo holds Car-Hood this wrapper re-targets it at
 * the CEILING projection of the objective: bravo carries `ant-mage`
 * (`ant-plane-switch`), so the engine's `tryPlaneTransition` lifts it
 * onto the open ceiling (or the `car-hood`↔`shelving` paired-POST
 * shortcut does), and it crosses the fully-open ceiling to descend on
 * Engine-Block FROM ABOVE — the maximally-independent bearing the
 * pinned floor guard + floor-leashed pickets cannot cover until the
 * final descent (§1.3 Route 3 / §3.2). This is the L4-§9 corrective
 * that makes the bound plane route genuinely WALKED, not dead geometry
 * (an L10-only wrapper override; NO shared default touched).
 */
const CEILING_OBJECTIVE = { plane: 'ceiling' as const, x: 9, y: 9 };

/**
 * The shared chain is `[tool-rack, engine-block]` — the body musters
 * on the Tool-Rack FORK then assaults the spider-held Engine-Block. The
 * §3 per-column route binding is layered on as the L10-only wrapper
 * below; `vanguard-bravo`'s over-the-car plane route is bound via the
 * existing opt-in `switchContest` field (NO shared default touched).
 */
const L10_CHAIN_CONFIG: ChainMarchConfig = {
  name: 'baseline-l10',
  chain: [MUSTER_POST, OBJECTIVE],
  objective: OBJECTIVE,
  musterPost: MUSTER_POST,
  musterRing: MUSTER_RING,
  queenGuard: QUEEN_GUARD,
  /**
   * §3 invariant (ii)/(iii): `vanguard-bravo` detaches post-muster via
   * the existing L4 `switchContest` machinery and genuinely walks the
   * over-the-car plane route (it takes `car-hood`, whose `pairedWith:
   * shelving` + the mage's `ant-plane-switch` lift it onto the open
   * ceiling, descending on Engine-Block from above — the maximally
   * independent bearing). `detachmentIsSpent:false` so the column
   * rejoins the assault (the L9 lesson — `spent` makes the spider
   * car-hood contest inert, the §7 failure). `detachGate:'muster'` —
   * peel off only once the body has mustered on the Tool-Rack fork.
   */
  switchContest: {
    post: 'car-hood' as PostId,
    captureParties: ['vanguard-bravo' as PartyId],
    detachmentIsSpent: false,
    detachGate: 'muster',
  },
};

const chainBase: AIPolicy = buildChainMarchPolicy(L10_CHAIN_CONFIG);

/**
 * §3 binding multi-route doctrine, L10-opt-in, THIS FILE ONLY. Runs the
 * shared chain-march, then — once the body has mustered on the
 * Tool-Rack fork — OVERRIDES each named column's orders to walk its OWN
 * route waypoint (then on to the objective once the waypoint is
 * reached/owned), so the geometrically-split assault arrives as three
 * time-staggered waves from distinct bearings rather than one mass
 * re-converging through one basin. Before muster every column walks the
 * shared chain to the fork (the split happens AT the fork). The plane
 * column (`vanguard-bravo`) and the queen-guard are driven entirely by
 * the shared builder (the `switchContest` machinery / the immobile
 * spine). Pure (state)→state, deterministic, no RNG.
 */
export const baselineL10Player: AIPolicy = {
  name: 'baseline-l10',
  faction: 'ant',
  decide(state: GameState, scenario, rng): GameState {
    const based = chainBase.decide(state, scenario, rng);

    // The split forks only once the body has mustered on the Tool-Rack
    // fork (mirrors the shared builder's muster gate so the columns
    // gather AT the fork first, then fork — the split survives because
    // the muster is AT the fork, not past it). Until then the shared
    // chain-walk to the fork stands (byte-identical to the shared
    // builder for the pre-fork phase).
    const musterLoc = postLocation(based, MUSTER_POST);
    const musterPost = based.posts.get(MUSTER_POST);
    if (musterLoc === undefined || musterPost === undefined) return based;
    if (musterPost.owner !== 'ant') return based;

    let mustered = true;
    for (const [id, p] of based.parties) {
      if (p.faction !== 'ant') continue;
      if (id === QUEEN_GUARD) continue;
      if (id === ('vanguard-bravo' as PartyId)) continue;
      if (!partyAlive(p)) continue;
      if (planarManhattan(p.location, musterLoc) > MUSTER_RING) {
        mustered = false;
        break;
      }
    }
    if (!mustered) return based;

    const objLoc = postLocation(based, OBJECTIVE);
    if (objLoc === undefined) return based;

    const nextParties = new Map(based.parties);
    let changed = false;

    // §3 invariant (ii): the over-the-car plane column. The shared
    // `switchContest` has marched bravo onto Car-Hood and captured it;
    // now drive it ACROSS THE CEILING (it carries `ant-mage` →
    // `ant-plane-switch`; the engine `tryPlaneTransition` lifts it the
    // instant it is ordered toward an off-plane tile, and the
    // `car-hood`↔`shelving` paired-POST shortcut is also available).
    // It descends on Engine-Block from above — the route the greedy AI
    // would never volunteer, now genuinely walked.
    const bravo = based.parties.get(PLANE_COLUMN);
    if (bravo !== undefined && partyAlive(bravo)) {
      const carHood = based.posts.get(CAR_HOOD);
      const carHoodLoc = postLocation(based, CAR_HOOD);
      const onCarHood =
        carHoodLoc?.plane === bravo.location.plane &&
        carHoodLoc !== undefined &&
        planarManhattan(bravo.location, carHoodLoc) <= 1;
      const carHoodOwned = carHood?.owner === 'ant';
      // Once bravo holds / reached Car-Hood, OR is already off the floor
      // (mid plane-transition), commit it to the ceiling objective
      // projection so the engine plane-switches it up and it crosses
      // the open ceiling to descend on Engine-Block from above.
      if (carHoodOwned || onCarHood || bravo.location.plane === 'ceiling') {
        const orders: readonly Order[] = moveToOrHold(bravo, CEILING_OBJECTIVE);
        if (orders !== bravo.orders) {
          nextParties.set(PLANE_COLUMN, { ...bravo, orders, posture: 'fight' });
          changed = true;
        }
      }
    }

    for (const [id, party] of based.parties) {
      if (party.faction !== 'ant' || !partyAlive(party)) continue;
      const wpId = ROUTE_WAYPOINT[String(id)];
      if (wpId === undefined) continue;
      // Walk the column's named waypoint until it is reached/owned, then
      // converge on the objective from that bearing. Each column thus
      // traverses a DISTINCT greedy basin (N-passage / S-passage /
      // Shelving-cluster), so the locked single-radius fortress cannot
      // cover all bearings at once (§3.2).
      const wp = based.posts.get(wpId);
      const wpLoc = postLocation(based, wpId);
      const reachedWp = wpLoc !== undefined && planarManhattan(party.location, wpLoc) <= 1;
      const wpOwned = wp?.owner === 'ant';
      const target: TileCoord | undefined =
        wpLoc !== undefined && !reachedWp && !wpOwned ? wpLoc : objLoc;
      if (target === undefined) continue;
      const orders: readonly Order[] = moveToOrHold(party, target);
      if (orders === party.orders) continue;
      nextParties.set(id, { ...party, orders, posture: 'fight' });
      changed = true;
    }
    return changed ? { ...based, parties: nextParties } : based;
  },
};
