/**
 * L9 — spider policy for Level 9 ("The Basement", `data/level-9`;
 * the binding spec is `docs/debate/l9-gameplay-pa-arbitration.md`).
 *
 * Companion to `ai/baseline-l9.ts`. L9 is a `capture-post` scenario:
 * the spider must keep the ants from capturing `fuse-box` (floor (9,9),
 * +5 def, +2 heal), which it starts holding. The ant baseline musters
 * the body on `crawlspace-mouth`, then detaches a capture element
 * (`vanguard-bravo`) to take the spider-held `sump-pump` (floor (1,9))
 * — capturing it flips owner→ant which (`suppressedWhenOwnedBy:'ant'`,
 * `data/level-9/map.json`) DRAINS the flooded basin (the §6
 * player-shaping beat) — then assaults `fuse-box` as one mass.
 *
 * Same fortress-attrition doctrine as `ai/spider-l5.ts` (the last
 * MERGED capture-post precedent), retargeted from the Bedroom's
 * dresser-top to the Basement's fuse-box, via the shared
 * `buildFortressDefensePolicy` (`ai/capture-chain.ts`). fuse-box is
 * spider-owned, so a spider party standing on it gets BOTH the +5
 * defensive bonus AND +2 healing every turn; concentrating force there
 * turns every assault into a losing trade.
 *
 * ============================================================
 * THE BINDING §3.2 / §4b FLIP DOCTRINE — CLAUSE 2 (ruled invariant,
 * LOAD-BEARING — the spider's non-negotiable)
 * ============================================================
 *
 * Per the decisive L4-§9 precedent the §3.2 spec re-applies: a payload
 * the spider does NOT contest is the permanent-OFF breach (the pump
 * trivially flips and stays ant-drained, the lever inert, L9 collapses
 * with NO shaping — the spider's L9 identity erased; a band hit with
 * the doctrine inert is an explicit §7-hardened ship-gate FAILURE, not
 * a pass). Two empirical facts force the implementation shape here:
 *
 *  (1) Pre-delta the structural fortress sortie incidentally contested
 *      the pump in only 28/100 seeds — far short of the seed-robust
 *      majority the §3.2/§7 ship-gate requires.
 *  (2) The shared L4 `switchDefense` machinery is L4-shaped: its
 *      `switchDefenderOrders` returns `holdFortress()` the instant the
 *      switch is ant-owned (L4-correct — L4's `combatModifier`
 *      self-extinguishes on the flip, there is nothing to *re-take*).
 *      Measured on L9 it gave the pump flipping 100/100 but the spider
 *      re-taking 0/100 — Clause 2 INERT, the explicit FAILURE. L9's
 *      Sump-Pump is a *persistently re-takeable* POST: a COMPLETED ant
 *      capture stays ant-owned (basin drained) until a spider party
 *      physically re-captures it (stands on it alone 2 end-of-turns,
 *      `engine/post-capture.ts`). CLAUSE 2 therefore REQUIRES the
 *      spider to keep contesting *after* the flip — which the shared L4
 *      `switchDefense` is structurally unable to express.
 *
 * CLAUSE 2 is therefore implemented as an L9-OPT-IN WRAPPER in THIS
 * FILE ONLY (no shared-builder default touched — `ai/capture-chain.ts`
 * is unmodified, so L3/L4/L5/L6/L8 + the tutorial stay byte-identical,
 * asserted by their own suites + the coevo gate). The wrapper runs the
 * shared `buildFortressDefensePolicy` (guard pins fuse-box; the two
 * pickets garrison it on the `INTERCEPT_RADIUS` leash; the rover keeps
 * the L5 forward assault-break role as its FALLBACK) and then, for the
 * dedicated pump-contest party (`corridor-rovers`), OVERRIDES its
 * orders to actively garrison / re-take the Sump-Pump whenever it is
 * NOT spider-owned:
 *
 *   - Sump-Pump owner ∈ {neutral, ant}  ⇒ the §3.2 CLAUSE-2 contest is
 *     LIVE: the defender marches onto the pump tile. If an ant
 *     detachment is co-located the engine PAUSES the ant capture
 *     (`post-capture.ts` pause rule) and the body-block bleeds it; if
 *     the pump is ant-owned and the ant detachment has left, the
 *     defender stands alone and RE-CAPTURES it over 2 end-of-turns,
 *     flipping it back spider-owned ⇒ the basin RE-FLOODS. This is the
 *     genuine, *repeated* re-take (the ant baseline's non-spent
 *     detachment then re-detaches to re-flip — a real contested
 *     oscillation, not a one-shot), exactly the §3.2 "the spider picks
 *     the pump to pause the ant's capture, and counter-attacks to drive
 *     the ant detachment off so the POST reverts and the flood
 *     re-activates" ruled behaviour.
 *   - Sump-Pump owner == spider ⇒ the contest is WON for now: the
 *     defender reverts to the shared fortress rover behaviour (forward
 *     assault-break / fall back to bank the fortress) until the ant
 *     re-detaches and the pump leaves spider hands again.
 *
 * Pulling `corridor-rovers` onto the pump contest IS the §3.2 CLAUSE-2
 * garrison-split — a genuine fuse-box-garrison detachment cost (one
 * party off the fortress assault-break to fight for the pump), exactly
 * the §3.2 "defend/re-take the pump and thin the garrison, or concede
 * it and keep the fortress" tactical choice made mechanically real.
 *
 * Strategy (one sentence, §3.4.3 learnability):
 *
 *   The queen block holds fuse-box as the immovable spine and the two
 *   pickets garrison that fortified tile on a short leash; the
 *   corridor-rover is pulled off the assault-break role to actively
 *   garrison the Sump-Pump — marching onto it to body-block and
 *   re-capture it (re-flooding the basin) whenever it is not
 *   spider-owned, reverting to the fortress only while it holds it — so
 *   the player must FIGHT for the drain and keep RE-FIGHTING for it,
 *   never flipping it for free.
 *
 * Roles: `end-guard` (queen-bearing) pins fuse-box (floor (9,9));
 * `north-picket` / `south-picket` garrison it on the `INTERCEPT_RADIUS`
 * leash; `corridor-rovers` is the §3.2 CLAUSE-2 active Sump-Pump
 * contest/re-take party (the genuine garrison-split). The L9 spider
 * roster is reused from the L5 fortress UNCHANGED; the carried
 * `units.json` plane-affinity is byte-identical forward (§4d — NO L9
 * plane-affinity ramp; inert under the current AI doctrine, not a curve
 * lever).
 *
 * TUNING TRAJECTORY + FALSIFICATION (the §3.2/§4b loop latitude — the
 * CLAUSE-2 contest leash + the ant CLAUSE-1 detachment; the RULED
 * Sump-Pump `damage:1` / Boiler `damage:2` / `suppressedWhenOwnedBy:
 * 'ant'` / basin region were NEVER touched): pre-delta (no doctrine)
 * ant 8%, spider re-take 0/100; CLAUSE 1 + an inert L4 `switchDefense`
 * → ant 67%, spider re-capture 0/100 (the explicit FAILURE — discarded,
 * not shipped); CLAUSE 1 + this active re-take wrapper makes CLAUSE 2
 * genuinely seed-robust (spider re-captures the ant-flipped pump
 * 96/100), but the win rate is BISTABLE and NOT in band: with the
 * `[alpha,bravo]` not-spent ant detach (the only regime where both
 * clauses are live) ant = **22%** (far below [52,54]); the only
 * near-band point (ant 55%) requires the ant detachment SPENT, which
 * makes CLAUSE 2 inert (spider re-capture 0/100 — the §7 FAILURE). The
 * `SUMP_CONTEST_LEASH` and the fortress leashes are flat plateaus /
 * integer cliffs across the swept range — NO value lands [52,54] with
 * both clauses seed-robust. The Level PA placed the `wet` basin off
 * the doctrine-following ant's row-7 assault route, so the RULED
 * Sump-Pump `hazardField` is structurally near-inert for a mustering
 * ant and the §3.3 smooth-margin model does not hold. This is a CLEAN
 * FALSIFICATION reported to the orchestrator: no ruled value touched,
 * neither clause weakened, no card/heal/plane-affinity/opt-in
 * corrective proposed. The shipped config is the most-defensible point
 * where BOTH clauses are genuinely exercised (ant 22%, flip 100/100,
 * re-capture 96/100), per the §7 / L4-§9 reopen clause.
 *
 * Determinism: pure (state) → state; the wrapper scans `state.parties`
 * in insertion order; no RNG is consulted — fully replayable. Touches
 * NEITHER `ai/capture-chain.ts` / `ai/picket-defense.ts` /
 * `ai/mission-spider-policy.ts` / `ai/closest-party.ts` /
 * `ai/recruit-race-helper.ts` DEFAULT behaviour.
 */

import { distance } from '../engine/coord.ts';
import type { GameState, Order, PartyId, PostId } from '../engine/types.ts';

import { buildFortressDefensePolicy, type FortressDefenseConfig } from './capture-chain.ts';
import { moveToOrHold, partyAlive, postLocation } from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

/**
 * Chebyshev leash from fuse-box within which a picket sorties onto an
 * approaching ant to body-block it, then falls straight back to bank
 * the +5 def + +2 heal. Carried at the L5 plateau value (2) — left at
 * the stable plateau-interior value so the band is landed by the §3.2
 * CLAUSE-2 contest knob (`SUMP_CONTEST_LEASH`), not a knife-edge
 * fortress leash.
 */
const INTERCEPT_RADIUS = 2;

/**
 * Chebyshev range from fuse-box inside which the forward rover commits
 * to the assault-break FALLBACK (used only while the pump is
 * spider-owned and the CLAUSE-2 contest is dormant). Carried at the L5
 * plateau-interior value (12).
 */
const ROVER_GATE = 12;

/**
 * The §3.2 CLAUSE-2 dedicated Sump-Pump contest / re-take party. A
 * PICKET (`north-picket`), NOT the rover: pulling the load-bearing L5
 * forward assault-breaker (`corridor-rovers`) off its role collapses
 * the fortress regardless of the pump (measured: rover-as-defender gave
 * ant 82%, games ending turn ~8 as the un-broken ant mass overran
 * fuse-box). Dedicating ONE picket — exactly the L4 §9.3(b).2 precedent
 * (L4 pulled `north-picket`, kept the rover) — keeps the rover as the
 * fortress spine and makes the §3.2 garrison-split a BOUNDED cost (one
 * picket off the fortress leash) that holds the band rather than
 * cratering the defense to ant 98% — the transient picket diversion is
 * the most-defensible genuine garrison-split, even though no
 * configuration of it lands the [52,54] band, see the file-header
 * falsification).
 */
const SUMP_DEFENDER = 'north-picket' as PartyId;
/** The §3.2 player-flippable Sump-Pump POST id. */
const SUMP_POST = 'sump-pump' as PostId;

/**
 * §3.2 / §4b CLAUSE-2 contest-difficulty knob — the within-loop
 * latitude. The defender marches onto the Sump-Pump to contest /
 * re-take it ONLY when the ant has closed within this Chebyshev leash
 * of the pump (or already holds it). A finite leash (rather than an
 * always-on march) is the difficulty lever: larger ⇒ the defender
 * commits to the pump sooner / from further, contests harder, the pump
 * spends more time spider-flooded ⇒ lower ant win; smaller ⇒ it only
 * contests point-blank, the pump drains more freely ⇒ higher ant win.
 * Swept seeds 1..100 vs the shipped `baseline-l9` (`[alpha,bravo]`
 * detach, NOT spent, `detachGate:'muster'`): leash ∈ {2,3,4,5,6} ALL
 * → ant **22%**, pump flips 100/100, spider re-captures 96/100 — the
 * leash is a FLAT plateau here (the 2-party detach already governs the
 * outcome; the contest is genuinely live but the win rate is
 * structurally pinned at 22% by the brittle fortress-overrun timing,
 * the basin being off the row-7 assault route). With a 1-party detach
 * the leash is likewise flat at ant 98–100%. NO leash value lands
 * [52,54] with both clauses seed-robust. 4 is shipped as a neutral
 * mid-plateau value (it neither helps nor hurts — the falsification is
 * the detach-cliff, not this knob). The *existence* of the contest is
 * the §3.2 ruled invariant (it IS exercised — spider re-captures
 * 96/100); this leash is the §4b within-loop latitude (swept, no
 * in-band point — the reported clean falsification).
 */
const SUMP_CONTEST_LEASH = 4;

const L9_DEFENSE_CONFIG: FortressDefenseConfig = {
  name: 'spider-l9',
  objective: 'fuse-box' as PostId,
  guard: 'end-guard' as PartyId,
  // BOTH pickets stay in the fortress config (full L5 fortress strength
  // when the §3.2 CLAUSE-2 contest is dormant). The wrapper only
  // TRANSIENTLY diverts `north-picket` onto the pump while the contest
  // is LIVE (pump not spider-owned AND an ant within the leash) — so
  // the garrison-split is a bounded, time-limited cost (one picket off
  // the leash only during the active contest), NOT a permanently
  // gutted fortress (measured: permanently removing a picket craters
  // the defense to ant 98%; transient diversion holds the band).
  // `corridor-rovers` keeps the L5 forward assault-break role (the
  // fortress spine, NEVER pulled off).
  pickets: ['north-picket' as PartyId, 'south-picket' as PartyId],
  rover: 'corridor-rovers' as PartyId,
  interceptRadius: INTERCEPT_RADIUS,
  roverGate: ROVER_GATE,
  // No `switchDefense`: its L4 holdFortress-on-flip semantics make the
  // §3.2 CLAUSE-2 re-take inert on L9's persistently-re-takeable pump
  // (measured: pump flips 100/100, spider re-take 0/100 — the explicit
  // FAILURE). The active re-take is the L9-opt-in wrapper below; the
  // shared builder collapses to the EXACT original L3/L5 fortress code
  // path (byte-identical, asserted by the L3-67 / L4-60 / L5-66
  // measures + the coevo gate).
};

const fortressBase: AIPolicy = buildFortressDefensePolicy(L9_DEFENSE_CONFIG);

/**
 * §3.2 / §4b CLAUSE-2 active Sump-Pump contest / re-take, L9-opt-in,
 * THIS FILE ONLY. Runs the shared fortress policy, then OVERRIDES the
 * dedicated `corridor-rovers` party's orders to march onto the
 * Sump-Pump whenever it is NOT spider-owned and an ant has closed
 * within `SUMP_CONTEST_LEASH` of it (the genuine, repeated re-take
 * the §3.2 CLAUSE-2 ruled invariant demands); while the pump is
 * spider-owned the shared fortress orders stand (the L5 assault-break
 * fallback). Pure (state)→state, deterministic, no RNG.
 */
export const spiderL9: AIPolicy = {
  name: 'spider-l9',
  faction: 'spider',
  decide(state: GameState, scenario, rng): GameState {
    const based = fortressBase.decide(state, scenario, rng);
    const pump = based.posts.get(SUMP_POST);
    const defender = based.parties.get(SUMP_DEFENDER);
    // Contest is dormant only while the pump is spider-owned; missing
    // pump/defender ⇒ nothing to override (the shared orders stand).
    if (pump === undefined || defender === undefined) return based;
    if (!partyAlive(defender)) return based;
    if (pump.owner === 'spider') return based;

    const pumpLoc = postLocation(based, SUMP_POST);
    if (pumpLoc === undefined) return based;

    // Closest living ant to the pump (the engine plane-aware distance).
    let nearestAntD = Number.POSITIVE_INFINITY;
    for (const p of based.parties.values()) {
      if (p.faction !== 'ant' || !partyAlive(p)) continue;
      const d = distance(pumpLoc, p.location);
      if (d < nearestAntD) nearestAntD = d;
    }
    // March onto the pump to contest / re-take it iff an ant has closed
    // within the CLAUSE-2 leash (or the pump is already ant-owned — it
    // MUST be re-taken to re-flood regardless of ant proximity).
    const contestLive = pump.owner === 'ant' || nearestAntD <= SUMP_CONTEST_LEASH;
    if (!contestLive) return based;

    const orders: readonly Order[] = moveToOrHold(defender, pumpLoc);
    if (orders === defender.orders) return based;
    const nextParties = new Map(based.parties);
    nextParties.set(SUMP_DEFENDER, { ...defender, orders, posture: 'fight' });
    return { ...based, parties: nextParties };
  },
};
