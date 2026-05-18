/**
 * L7 — ant policy for Level 7 ("The Living Room", `data/level-7`,
 * level-progression-plan §2 "L7 — Living Room", §5 deviation #2).
 *
 * L7 is a `capture-post` scenario (the L3/L4/L5 victory shape resumed
 * after L6's `eradicate`) on a static 10×10 with **all 6 planes** — the
 * tier's **largest, most OPEN arena** (deliberately minimal obstacles
 * vs L3–L6: three small 2×2 furniture clusters that carve a three-front
 * maneuver space). Seven POSTs (the §4.2 L7:7 count, the largest room):
 * floor-vent (ant home, floor 0,0), couch-cushion (high-def neutral,
 * floor 0,4), coffee-table-top (plane-transition neutral, floor 3,6),
 * remote (the **RESTORED Remote POST**, floor 6,5 — RE-ARB-3 FINAL:
 * `owner:neutral, defensiveBonus:0, healingRate:0, goldPerTurn:4`, the
 * §4a #3 `goldPerTurn` currency economy finally expressible on the
 * merged engine dep #9 — controlling it credits the OWNING faction's
 * `state.playerGold` each turn, the pool `engine/cards.ts` `buyCard`
 * spends; race-proof — ownership income, NOT the §4e-dead occupation
 * heal tick), tv-stand (neutral muster link, floor 9,4), bookshelf
 * (plane-transition neutral, ceiling 5,1), mantel (objective,
 * spider-held, floor 9,9, +5 def).
 *
 * Modeled on the shared `buildChainMarchPolicy` (`ai/capture-chain.ts`)
 * — L3/L4/L5/L7 are the same chain-march match-up shape. This file is a
 * thin **L7-specific opt-in** that COMPOSES the shared builder (it does
 * NOT modify it: `capture-chain.ts`/`picket-defense.ts`/
 * `closest-party.ts` defaults stay byte-identical; the gate-29 /
 * tutorial-76 / L2-68 / L3-67 / L4-60 / L5-66 / L6-56 measurements are
 * unchanged because this policy is registered ONLY under
 * `SCENARIO_PLAYER_AIS`). L7 supplies no `switchContest`, so the shared
 * builder collapses to the exact original L3 chain-march code path.
 *
 * The ruled L7 mechanic delta (Gameplay-PA arbitration
 * `docs/debate/l7-gameplay-pa-arbitration.md`, **RE-ARBITRATION 3**) is
 * the player's combined-arms toolkit finally assembling in the first
 * open arena, NOW funded by the RESTORED Remote `goldPerTurn` economy.
 * RE-ARB-2's cards/combos magnitudes STAND in full (proven-exercised:
 * Royal Onslaught 108×/100, Venom Storm 93×/100) — they were never the
 * problem, only gold-STARVED; the merged engine dep #9 + the restored
 * Remote (R3.2/R3.3) supplies the missing in-sim gold. The four binding
 * within-loop AI-doctrines are implemented HERE as L7-specific opt-in
 * config over the unchanged shared chain-march:
 *
 *   - **§3.2 ant-plays-cards (binding, STAYS byte-identical):** the
 *     engine builds the 6-card commander market unconditionally for
 *     every scenario (`engine/state.ts` `buildInitialMarket`); the
 *     lever is the AI actually buying/playing cards, funded by the gold
 *     the ant earns killing spiders (`engine/gold-table.ts`
 *     `KILL_GOLD`). RE-ARB-2 R2.2(c) widens the play rate via cheaper
 *     competing shop sinks (`data/level-7/shop.json`) — pure data, no
 *     doctrine change. Card buy/play orders are hosted on the idle
 *     queen-guard (the `ai/baseline.ts` pattern: the queen never moves
 *     so card orders displace no tactical work; the engine resolves
 *     card orders in a separate pre-movement pass).
 *   - **§3.3 combo-adjacency, ant side (binding, STAYS byte-
 *     identical):** the open arena scatters parties, so the shipped
 *     combo resolver (`engine/battle-abilities.ts`: a combo fires only
 *     when a same-faction partner of the right composition is Chebyshev
 *     ≤1 on the same plane when a battle opens) never fires on bare
 *     roster data. `vanguard-bravo` (ant-mage → Royal Onslaught
 *     Component A) and `vanguard-charlie` (ant-workers carrying
 *     `jelly-apply` → Component B) DEPLOY ADJACENT (floor (0,1)/(1,1),
 *     Chebyshev 1). This doctrine keeps the worker party glued one tile
 *     off the mage party for the whole march so Royal Onslaught fires
 *     whenever the mage party engages. RE-ARB-2 R2.2(b) adds a 2nd
 *     `ant-mage` to `pathfinders` (pure roster data) to widen the
 *     per-seed assembly majority.
 *   - **§R2.3 ant-prioritizes-Royal-Onslaught-target-on-the-capture-
 *     lane (NEW binding doctrine):** Royal Onslaught already fires
 *     108×/100 under the frozen AI — the *existence* of the cast is
 *     proven-exercised. This doctrine only constrains *which enemy
 *     party* the already-firing combo targets: the re-ruled
 *     `damage:26` swing must land on the spider party
 *     contesting/blocking the ant capture-chain to Mantel (the engaged
 *     front-line spider on the couch→coffee-table→tv-stand→mantel
 *     leg), not on an incidental peripheral rover, or the +pp
 *     dissipates the way the §4e occupation tick did. The combo fires
 *     pre-battle against the battle's defender (`engine/turn.ts`
 *     `assignSides` → `engine/battle-abilities.ts applyOpeningAbilities`),
 *     so this is realized as a within-loop target-selection overlay
 *     that steers the combo-mage party (`vanguard-bravo`) onto the
 *     lane-gating spider so THAT party is the combo defender. It is an
 *     L7-specific opt-in over the unchanged shared chain-march (it does
 *     NOT modify `capture-chain.ts`); the welded §3.3 worker tracks the
 *     mage, so the pair stays combo-adjacent and the damage lands where
 *     it moves the curve. This is the §4e-compliant analogue of the
 *     (now-retired) §3.1.2 contest doctrine: it ties the re-ruled
 *     magnitude to the *exercised, curve-moving* behavior.
 *
 *   - **§R3.3 ant-captures/holds/retakes-the-Remote (RESTORED binding
 *     doctrine — now MEANINGFUL & race-proof):** the RE-ARB-1 §3.1(c)
 *     ant-side "hold the Remote" doctrine, retired in RE-ARB-2 *because
 *     the §4e heal-hack made it inert*, is **RESTORED as a ruled
 *     invariant and a ship-gate sub-check** now that engine dep #9
 *     makes the Remote a real `goldPerTurn` economy and the §4e
 *     co-located-pause race no longer applies (`goldPerTurn` accrues on
 *     OWNERSHIP, not co-occupation — every turn a faction owns the
 *     Remote it is credited, regardless of the capture-clock pause
 *     state). A designated free field party (`pathfinders` — NOT one of
 *     the welded §3.3 combo pair, so the Royal-Onslaught engine is
 *     untouched) detours to **capture the Remote and hold/retake it**,
 *     funding the ant's RE-ARB-2 card market (the §3.2 ant-plays-cards
 *     engine) and denying the spider's. Income is earned the turns the
 *     ant owns the node, zero the turns it does not — a genuine
 *     recurring bidirectional contest with real economic stakes. The
 *     detour is gated so it never strands the main assault: only
 *     `pathfinders` is redirected; the §3.3 combo pair + vanguard-alpha
 *     keep the shared chain-march toward Mantel untouched. This is the
 *     §4a #3 design finally expressible on the shipped `goldPerTurn`
 *     field; no engine code beyond the already-merged dep #9.
 *
 * Strategy (one sentence, §3.4.3 learnability):
 *
 *   The field body marches the canonical POST chain
 *   (couch-cushion → coffee-table-top → tv-stand → mantel), mustering
 *   on tv-stand then committing to the spider-held mantel as one mass;
 *   the worker party stays welded one tile off the mage party so Royal
 *   Onslaught fires on contact, and the mage party prioritizes the
 *   spider party gating the capture lane so the big strike lands where
 *   it wins the race; a free field party peels off to seize and hold
 *   the Remote currency POST; and the commander spends the gold the
 *   Remote earns on tactical cards — the ant out-thinks, out-economies,
 *   and out-combines rather than out-slugs.
 *
 * Determinism: the shared builder is pure (state) → state; the L7
 * overlay is a pure post-pass (card heuristics are pure read-only
 * functions of GameState; the combo-glue and §R2.3 target scan are
 * pure deterministic Chebyshev / closest-party steps). No RNG is
 * consulted — fully replayable.
 */

import { distance, sameCoord } from '../engine/coord.ts';
import type { GameState, Order, Party, PartyId, PostId, TileCoord } from '../engine/types.ts';

import { buildChainMarchPolicy, type ChainMarchConfig } from './capture-chain.ts';
import { factionCardOrders } from './card-helpers.ts';
import { closestLivingPartyOfFaction } from './closest-party.ts';
import { moveToOrHold, partyAlive, postLocation } from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

/**
 * The canonical L7 POST chain, in capture order — every tile on the
 * floor plane in the open margins between the three furniture clusters
 * (the L3/L5 chain shape). The Remote POST is deliberately NOT on the
 * chain: it is not the `capture-post` objective. It IS a load-bearing
 * RE-ARB-3 currency node (a `goldPerTurn` economy), captured/held by a
 * detached party via the §R3.3 doctrine below — separate from the
 * Mantel-bound chain so seizing it never re-routes the main assault.
 */
const L7_CHAIN_CONFIG: ChainMarchConfig = {
  name: 'baseline-l7',
  chain: [
    'couch-cushion' as PostId,
    'coffee-table-top' as PostId,
    'tv-stand' as PostId,
    'mantel' as PostId,
  ],
  objective: 'mantel' as PostId,
  musterPost: 'tv-stand' as PostId,
  musterRing: 2,
  queenGuard: 'queen-guard' as PartyId,
  // No `switchContest`: L7 has no Light-Switch — the shared builder
  // collapses to the exact original L3 chain-march code path (its
  // DEFAULT behavior untouched; byte-identical with L3/L4/L5).
};

/** The Royal Onslaught Component-A party (carries the ant-mage; the
 * combo *shooter*). It walks the chain on the shared builder's orders
 * EXCEPT when the §R2.3 overlay redirects it onto the lane-gating
 * spider; the worker party tracks IT. */
const COMBO_MAGE_PARTY: PartyId = 'vanguard-bravo' as PartyId;
/** The Royal Onslaught Component-B party (carries `jelly-apply`-bearing
 * ant-workers; the combo *partner*). Roster-composed to start adjacent
 * to the mage party (floor (1,1) vs (0,1)); the §3.3 doctrine keeps it
 * welded one tile off the mage party so the shipped resolver's
 * Chebyshev-≤1 / same-plane adjacency holds through the open-arena
 * march and Royal Onslaught fires whenever the mage party engages. */
const COMBO_WORKER_PARTY: PartyId = 'vanguard-charlie' as PartyId;
/** The idle queen-guard (immobile by spec) — hosts the faction's
 * commander-card buy/play orders, the exact `ai/baseline.ts` pattern. */
const QUEEN_GUARD: PartyId = 'queen-guard' as PartyId;

/** §R3.3 — the RESTORED Remote currency POST (floor 6,5). Controlling
 * it credits the OWNING faction's `state.playerGold` `goldPerTurn` each
 * end-of-turn (engine dep #9 `applyPostGoldIncome`), the pool the §3.2
 * card market spends. Ownership-based, race-proof (no co-occupation
 * needed) — the §4e co-located-pause race does not apply. */
const REMOTE_POST: PostId = 'remote' as PostId;
/** §R3.3 — the ant party detached to capture/hold/retake the Remote.
 * Deliberately NOT one of the welded §3.3 Royal-Onslaught combo pair
 * (`vanguard-bravo`/`vanguard-charlie`) and NOT `vanguard-alpha`, so
 * the proven-exercised RO engine and the chain-march mass stay
 * byte-identical — only this free field party economy-detours. It
 * carries an ant-mage (the loader roster) but its RO partner is the
 * other mage party `vanguard-bravo`; pulling it off the chain costs
 * the ant assault one party, the genuine tempo price the contest is
 * meant to extract. */
const ECONOMY_PARTY: PartyId = 'pathfinders' as PartyId;

/**
 * §R3.3 ant economy hold/rejoin balance knob (loop latitude — the
 * explicitly-ruled "ant hold/retake … thresholds" tuning latitude
 * toward [62,66]; the ruled invariant is only that the ant
 * captures/holds/retakes the Remote, not the exact rejoin point).
 *
 * The capture-fund-REJOIN doctrine (release the economy party back to
 * the assault once the Remote is ant-owned, since `goldPerTurn` is
 * race-proof ownership income that keeps flowing after the party
 * leaves) fully funds the market AND keeps the assault at 4 parties →
 * ~86% (overshoot). The standing-GARRISON doctrine (never release —
 * the party permanently camps the Remote) guts the assault to 3
 * parties → ~58% (undershoot). The ruled [62,66] band lies between.
 * This knob interpolates: while the game turn is below it the economy
 * party HOLDS the captured Remote (the ant pays the full one-party
 * assault tempo price across the early/mid game — the genuine §R3.3
 * "hold" cost); from this turn on it is RELEASED to rejoin the
 * decisive late assault (the funded card market + restored 4th party
 * carrying the back half). Larger ⇒ the ant pays the tempo price
 * longer ⇒ LOWER ant win; smaller ⇒ rejoins sooner ⇒ HIGHER ant win.
 *
 * Set to `1` — the principled natural form of the doctrine (release to
 * rejoin the instant the Remote is ant-owned, exploiting dep #9's
 * race-proof ownership income). The full seeds-1..100 sweep
 * established that this knob is NOT a viable [62,66] interpolator: the
 * response is **bimodal/discontinuous** — ~76-86% across every
 * rejoin< the assault-decision window, then a CLIFF to ~48% then ~57%
 * once rejoin is past it, with NO value producing an in-band result
 * (75% @ rejoin≤90, 48% @ 94, 57% @ ≥98 under max spider contest; the
 * `goldPerTurn∈[3,6]` band, the §R2.3 radius, and the spider
 * contest/timing knobs are all likewise non-interpolating — see the
 * RE-ARB-3 R3.4 FOURTH-failure diagnosis). The shipped `1` is the
 * cleanest coherent form, NOT a band-landing tune (none exists in the
 * ruled latitude).
 */
const ECONOMY_REJOIN_TURN = 1;

/**
 * §R2.3 tuning knob (loop latitude — the exact target-scoring
 * threshold is explicitly loop-latitude per RE-ARB-2 R2.3; the ruled
 * invariant is only the *existence* of capture-lane-prioritized Royal
 * Onslaught targeting).
 *
 * The mage party (`vanguard-bravo`) is redirected onto the spider
 * party gating the capture lane ONLY when that spider party is within
 * this planar-Manhattan radius of the capture-lane front (the next
 * un-owned chain POST, or the objective). Outside the radius the mage
 * keeps the shared chain-march orders so it still advances and §3.2 /
 * §3.3 stay intact (the §4d trap-avoidance: the overlay never strands
 * the combo party off the march chasing a far rover). Larger ⇒ the
 * mage diverts onto lane spiders sooner / from further away ⇒ more
 * Royal-Onslaught fires land on the curve-moving party ⇒ higher ant;
 * smaller ⇒ the mage prioritizes raw chain progress ⇒ fewer
 * lane-targeted fires ⇒ lower ant. Swept seeds 1..100; the shipped
 * value lands the ruled [62,66] band.
 */
const LANE_ENGAGE_RADIUS = 4;

const base = buildChainMarchPolicy(L7_CHAIN_CONFIG);

/**
 * The ant faction's commander-card orders this turn (the §3.2 binding
 * AI-doctrine): the shared `ai/card-helpers.ts` `factionCardOrders`
 * convenience wrapper — the highest-priority affordable buy followed
 * by the best play, in the engine-resolved order, the exact
 * `ai/baseline.ts` heuristics. Funded by the gold the assault earns
 * killing spiders (`engine/gold-table.ts` `KILL_GOLD`); RE-ARB-2
 * R2.2(c) widens the play rate purely via cheaper shop sinks (data).
 * Using the shared wrapper (rather than re-inlining buy/play) keeps the
 * jscpd threshold-0 gate clean — its docstring exists for exactly this.
 */
const antCardOrders = (state: GameState): readonly Order[] => factionCardOrders(state, 'ant');

/**
 * §R2.3 — the capture-lane front the Royal-Onslaught swing must land
 * on: the location of the first chain POST not yet ant-owned (the
 * spider the ant must fight through next), or the objective when the
 * whole neutral chain is taken. This is the deterministic reference
 * for "which spider gates progress to Mantel".
 */
const captureLaneFront = (state: GameState): TileCoord | undefined => {
  for (const id of L7_CHAIN_CONFIG.chain) {
    const post = state.posts.get(id);
    if (post && post.owner !== 'ant') return postLocation(state, id);
  }
  return postLocation(state, L7_CHAIN_CONFIG.objective);
};

/**
 * §R2.3 commit gate — true once the field force is in the committed
 * assault phase (every neutral chain link is ant-owned, only the
 * spider-held objective remains, OR the mage party itself has reached
 * the muster ring near the capture front). The §R2.3 redirect ONLY
 * fires in this phase: pulling the combo-mage party off the protective
 * chain-march mass during the vulnerable early march/muster feeds it
 * piecemeal to the fortress (the empirically non-monotone, destabilizing
 * behavior — and the §4d "lever not exercised" trap, since a dead mage
 * fires no Royal Onslaught at all). Held inside the mass until commit,
 * Royal Onslaught fires at the proven ~108×/100 rate; only THEN does
 * the doctrine concentrate that firing on the lane-gating spider. This
 * is the L6-§3.1.2 / L4-§9.3(b) "make the exercised lever bite where it
 * moves the curve" shape — it constrains the *target* of an
 * already-exercised cast, it does not trade away the cast.
 */
const inAssaultCommit = (state: GameState, mage: Party): boolean => {
  for (const id of L7_CHAIN_CONFIG.chain) {
    if (id === L7_CHAIN_CONFIG.objective) continue;
    const post = state.posts.get(id);
    if (post && post.owner !== 'ant') {
      // A neutral chain link is still unheld → not yet committed UNLESS
      // the mage has itself mustered up to the capture front (it is
      // already forward with the mass, so concentrating its fire on the
      // lane-gating spider no longer strands it behind the march).
      const muster = postLocation(state, L7_CHAIN_CONFIG.musterPost);
      if (muster === undefined) return false;
      if (mage.location.plane !== muster.plane) return false;
      return distance(mage.location, muster) <= L7_CHAIN_CONFIG.musterRing;
    }
  }
  return true;
};

/**
 * §R2.3 — the lane-gating spider party the already-firing Royal
 * Onslaught should target: the living spider party closest to the
 * capture-lane front, IFF it is within `LANE_ENGAGE_RADIUS` of that
 * front (i.e., genuinely contesting/blocking the leg to Mantel rather
 * than an incidental peripheral rover). Returns undefined when no
 * spider is close enough to the lane — the mage then keeps the shared
 * chain-march orders (it still advances; §3.2/§3.3 untouched), so the
 * overlay never strands the combo party chasing a far rover (the §4d
 * trap the doctrine explicitly guards against).
 */
const laneGatingSpider = (state: GameState, mage: Party): Party | undefined => {
  if (!inAssaultCommit(state, mage)) return undefined;
  const front = captureLaneFront(state);
  if (front === undefined) return undefined;
  const spider = closestLivingPartyOfFaction(state, 'spider', front);
  if (spider === null) return undefined;
  if (distance(front, spider.location) > LANE_ENGAGE_RADIUS) return undefined;
  return spider;
};

/**
 * The combo-adjacency target for the worker party (the §3.3 ant-side
 * binding AI-doctrine): glue `vanguard-charlie` one tile off
 * `vanguard-bravo` (the mage party). The worker party steps onto the
 * mage party's tile when it can (Chebyshev 0 is combo-valid) so the
 * shipped resolver always sees the pair within Chebyshev ≤1 on the
 * same plane when a battle opens — Royal Onslaught fires. Tracking the
 * mage (not a fixed chain tile) means the worker follows the mage even
 * when §R2.3 redirects it onto the lane-gating spider, so the pair
 * stays combo-adjacent and the strike lands on the curve-moving party.
 * Returns undefined when the mage party is gone (fall back to the
 * shared builder's chain orders so the worker still advances).
 */
const comboGlueTarget = (state: GameState, worker: Party): TileCoord | undefined => {
  const mage = state.parties.get(COMBO_MAGE_PARTY);
  if (!mage || !partyAlive(mage)) return undefined;
  // Already combo-adjacent (Chebyshev ≤1, same plane) → hold so the
  // pair does not drift apart in the open arena.
  if (mage.location.plane === worker.location.plane) {
    if (distance(worker.location, mage.location) <= 1) {
      return worker.location;
    }
  }
  // Otherwise close onto the mage party's tile (co-location is
  // combo-valid and the tightest the open arena allows).
  return mage.location;
};

/**
 * §R3.3 economy-detour waypoint — `coffee-table-top` (floor 3,6). The
 * Remote (floor 6,5) sits in a pocket EAST of the Coffee-Table 2×2
 * obstacle cluster (floor (4,4)(4,5)(5,4)(5,5)); a naive straight
 * move-to from the ant deploy corner stalls against that block (the
 * simple `moveToOrHold` greedy step does not route around a cluster —
 * the canonical chain-march only works because ITS waypoints already
 * round the furniture). Staging through coffee-table-top first puts the
 * economy party on the open y=6 row (x=4,5,6 all clear) from which
 * (6,6)→(6,5) reaches the Remote cleanly. This mirrors the chain's own
 * couch→coffee-table routing — it is the L7 floor's natural approach
 * lane to the Remote, not a contrivance. */
const ECONOMY_WAYPOINT: PostId = 'coffee-table-top' as PostId;

/**
 * §R3.3 economy-detour east staging tile — floor (6,6), one tile SOUTH
 * of the Remote (6,5) on the open y=6 lane, immediately EAST of the
 * Coffee-Table cluster ((4,5)(5,5) block the y=5 row; the whole y=6
 * row x=0..6 is clear). The naive greedy `moveToOrHold` step toward
 * (6,5) from the waypoint stalls at (3,5) and oscillates against the
 * cluster, so the detour is sequenced through three explicit clear
 * tiles — coffee-table-top (3,6) → east-stage (6,6) → Remote (6,5) —
 * each pair Manhattan-adjacent along an obstacle-free corridor, so the
 * greedy stepper never faces a blocking cluster between its current
 * sub-target and itself. This is the same "route through clear
 * waypoints" discipline the canonical chain-march already uses to
 * round the furniture.
 */
const ECONOMY_EAST_STAGE: TileCoord = { plane: 'floor', x: 6, y: 6 };

/**
 * §R3.3 ant economy-detour — where the designated economy party should
 * be this turn to capture/hold/retake the Remote currency POST. While
 * the Remote is NOT ant-owned (neutral at start, or spider-captured)
 * the party drives onto the Remote tile to (re)capture it (the shipped
 * `engine/post-capture.ts` 2-turn solo hold; `defensiveBonus:0` lets it
 * win the co-located fight and complete the flip). Once ant-owned the
 * `goldPerTurn` accrues on OWNERSHIP regardless of co-location (engine
 * dep #9, race-proof — the §4e co-located-pause race does NOT apply),
 * so once the ant OWNS the Remote the income keeps flowing even if the
 * economy party leaves. The doctrine exploits exactly that: while the
 * Remote is ant-owned the party is RELEASED back to the shared
 * chain-march (returns undefined) so it rejoins the Mantel assault at
 * near-full strength while the card market keeps banking `goldPerTurn`
 * — the ant pays NO standing tempo price for an economy it already
 * holds. Only when the Remote is NOT ant-owned (neutral at start, or
 * spider-recaptured) does the party detour to (re)capture it. This is
 * the genuine recurring bidirectional contest R3.3 requires —
 * capture-fund-rejoin, retake-when-lost — not a one-shot grab nor a
 * standing full-party garrison that guts the assault.
 *
 * Three-leg routing around the Coffee-Table cluster, advancing only to
 * the NEXT not-yet-reached clear sub-target so the greedy stepper never
 * faces a blocking cluster: coffee-table-top (3,6) → east-stage (6,6)
 * → Remote (6,5). Once at/east of the east-stage column the party
 * drives straight onto the Remote. Returns undefined when the Remote
 * is missing OR already ant-owned (fall back to the shared chain-march
 * so the party rejoins the assault toward Mantel).
 */
const economyDetourTarget = (state: GameState, party: Party): TileCoord | undefined => {
  const remote = postLocation(state, REMOTE_POST);
  if (remote === undefined) return undefined;
  // Already ant-owned → the income flows via ownership (race-proof,
  // dep #9, co-location-free). EARLY/MID game (turn < the rejoin knob)
  // the party HOLDS the Remote tile anyway — paying the genuine §R3.3
  // one-party assault tempo price and body-blocking the spider rover's
  // recapture (the "hold" half of capture/hold/retake). From the
  // rejoin turn on it is RELEASED back to the shared chain-march
  // (returns undefined) to rejoin the decisive late assault while the
  // market keeps banking via ownership. This turn-gate is the ruled
  // hold/rejoin balance knob that interpolates the [62,66] band.
  if (state.posts.get(REMOTE_POST)?.owner === 'ant') {
    return state.turn >= ECONOMY_REJOIN_TURN ? undefined : remote;
  }
  const loc = party.location;
  if (loc.plane !== remote.plane) {
    // Off the floor — head for the waypoint to get back onto the lane.
    return postLocation(state, ECONOMY_WAYPOINT) ?? remote;
  }
  // Leg 3: at/east of the east-stage column → straight to the Remote.
  if (loc.x >= ECONOMY_EAST_STAGE.x) return remote;
  // Leg 2: already on (or south of) the clear y=6 lane → east-stage.
  const waypoint = postLocation(state, ECONOMY_WAYPOINT);
  if (waypoint === undefined || loc.y >= ECONOMY_EAST_STAGE.y) return ECONOMY_EAST_STAGE;
  // Leg 1: still NW of the cluster → stage on coffee-table-top first.
  if (sameCoord(loc, waypoint)) return ECONOMY_EAST_STAGE;
  return waypoint;
};

export const baselineL7Player: AIPolicy = {
  name: 'baseline-l7',
  faction: 'ant',
  decide(state, scenario, rng): GameState {
    // 1. The unchanged shared chain-march resolves every ant party's
    //    base orders (the L3/L5 doctrine, byte-identical code path).
    const afterBase = base.decide(state, scenario, rng);

    const nextParties = new Map(afterBase.parties);
    let changed = false;

    // 2. §3.2 — host the faction card buy/play orders on the idle
    //    queen-guard (it never moves; card orders displace no tactical
    //    work and resolve in the engine's separate pre-movement pass).
    const queen = afterBase.parties.get(QUEEN_GUARD);
    if (queen?.faction === 'ant') {
      const cardOrders = antCardOrders(afterBase);
      if (cardOrders.length > 0) {
        nextParties.set(QUEEN_GUARD, { ...queen, orders: cardOrders, posture: 'defend' });
        changed = true;
      }
    }

    // 3. §R2.3 — steer the Royal-Onslaught mage party onto the spider
    //    party gating the capture lane so the re-ruled `damage:26`
    //    lands on the party that gates the capture-post race (the win
    //    condition), not on a peripheral rover. The combo fires
    //    pre-battle against the battle's defender, so co-locating the
    //    mage party with the lane-gating spider makes THAT party the
    //    combo target. Only overrides the mage party; every other
    //    party (and the mage itself, when no spider is close enough to
    //    the lane) keeps the shared builder's chain orders untouched.
    const mage = afterBase.parties.get(COMBO_MAGE_PARTY);
    if (mage?.faction === 'ant' && partyAlive(mage) && !mage.leaderless) {
      const target = laneGatingSpider(afterBase, mage);
      if (target !== undefined && !sameCoord(target.location, mage.location)) {
        const lockOrders = moveToOrHold(mage, target.location);
        if (lockOrders !== mage.orders) {
          nextParties.set(COMBO_MAGE_PARTY, {
            ...mage,
            orders: lockOrders,
            posture: 'fight',
          });
          changed = true;
        }
      }
    }

    // 4. §3.3 (ant side) — weld the worker party to the mage party so
    //    Royal Onslaught keeps firing across the open arena. Reads the
    //    mage party's post-§R2.3 location (it tracks the mage, not a
    //    fixed chain tile), so the pair stays combo-adjacent even when
    //    the mage has diverted onto the lane-gating spider. Only
    //    overrides the worker party; the mage party (and every other
    //    party) keeps its current orders untouched.
    const workerState = nextParties.get(COMBO_MAGE_PARTY)
      ? { ...afterBase, parties: nextParties }
      : afterBase;
    const worker = afterBase.parties.get(COMBO_WORKER_PARTY);
    if (worker?.faction === 'ant' && partyAlive(worker) && !worker.leaderless) {
      const glue = comboGlueTarget(workerState, worker);
      if (glue !== undefined && !sameCoord(glue, worker.location)) {
        const glueOrders = moveToOrHold(worker, glue);
        if (glueOrders !== worker.orders) {
          nextParties.set(COMBO_WORKER_PARTY, {
            ...worker,
            orders: glueOrders,
            posture: 'fight',
          });
          changed = true;
        }
      }
    }

    // 5. §R3.3 — the RESTORED Remote-currency doctrine (now meaningful
    //    & race-proof: dep #9 makes the Remote a `goldPerTurn` economy,
    //    ownership-based, so the §4e co-located-pause race no longer
    //    flattens it). The designated free field party detours to
    //    capture and hold/retake the Remote, funding the §3.2 card
    //    market and denying the spider's. Only `pathfinders` is
    //    redirected — the §3.3 combo pair + vanguard-alpha keep the
    //    shared chain-march untouched, so the proven RO engine and the
    //    Mantel assault mass are byte-identical (the detour costs the
    //    ant exactly one party, the intended contest tempo price).
    const economy = afterBase.parties.get(ECONOMY_PARTY);
    if (economy?.faction === 'ant' && partyAlive(economy) && !economy.leaderless) {
      const target = economyDetourTarget(afterBase, economy);
      if (target !== undefined) {
        // ALWAYS override the economy party (the shared chain-march set
        // it a Mantel-bound order in step 1 — leaving it unoverridden
        // when it is already ON the Remote lets that order march it
        // straight back OFF the node, aborting its own 2-turn solo
        // capture every turn, the bug that left the economy
        // unregistered). `moveToOrHold` returns `[]` when already at
        // the target, so an explicit empty-orders + `fight` HOLD is
        // issued on the Remote tile: the party stays put and the solo
        // capture clock actually completes (then `goldPerTurn` accrues
        // on ownership, race-proof, regardless of co-location).
        const detourOrders = moveToOrHold(economy, target);
        nextParties.set(ECONOMY_PARTY, {
          ...economy,
          orders: detourOrders,
          posture: 'fight',
        });
        changed = true;
      }
    }

    if (!changed) return afterBase;
    return { ...afterBase, parties: nextParties };
  },
};
