/**
 * L9 — ant policy for Level 9 ("The Basement", `data/level-9`,
 * level-progression-plan §2 "L9 — Basement", §4a #5+#6, §5 #3/#5;
 * the binding spec is `docs/debate/l9-gameplay-pa-arbitration.md`).
 *
 * L9 is a `capture-post` scenario on a static 10×10, **3 planes**
 * (floor, ceiling, south-wall — the dim/cramped basement, a *reduced*
 * set vs L5's all-6 "open back up"; §0/§5 obstacle-approximation). The
 * floor carries a central support-pillar/furnace obstacle block (cols
 * 2–7 × rows 3–6) bisecting the room into a north lane (rows 0–2), a
 * south lane (rows 7–9) and the two open vertical connectors (cols 0–1
 * and 8–9, open every row 0–9). A **water-hazard basin** (`wet`,
 * movementCost 2 — passable but taxed, NEVER an obstacle) covers floor
 * rows 8–9 × cols 3–6. The basin is governed by the **Sump-Pump**
 * POST's `hazardField` (`engine/end-of-turn.ts` `applyHazardFieldTicks`,
 * the shipped PR #17 tick): it deals the RULED `damage:1` to units
 * standing in the basin each end-of-turn while ACTIVE, and is SUPPRESSED
 * (drained) the moment the Sump-Pump is ant-owned
 * (`suppressedWhenOwnedBy:'ant'`). The Sump-Pump starts spider-owned →
 * the basin is flooded at scenario start; the ant DRAINS it by capturing
 * the pump (the 2-turn hold, `engine/post-capture.ts`) — the §2-L9 /
 * §6 "first player-controllable environment mechanic". A second
 * always-on **Boiler** `hazardField` POST radiates the RULED `damage:2`
 * over the south-east south-lane tiles (no `suppressedWhenOwnedBy` →
 * cannot be switched off; the fixed denier that herds the approach).
 *
 * Six POSTs (§4.2 5–8 rule, §5 #5 sets L9:6): `stairwell` (ant home,
 * floor (0,0)), `boiler` (always-on hazard emitter, neutral, floor
 * (7,7)), `crawlspace-mouth` (the last neutral chain link = the muster
 * POST, AND a floor↔south-wall plane-transition pair with `crawl-vent`,
 * floor (1,7)), `crawl-vent` (the south-wall crawlspace transition
 * partner), `sump-pump` (water-control flip POST, spider-held, floor
 * (1,9)), `fuse-box` (objective, spider-held, floor (9,9), +5 def).
 *
 * ============================================================
 * THE BINDING §3.2 / §4b FLIP DOCTRINE — CLAUSE 1 (ruled invariant)
 * ============================================================
 *
 * Per the decisive L4-§9 empirical-falsification precedent (re-applied
 * here), a payload-only spec is the guaranteed falsification: a frozen
 * chain-marcher that drags the *whole mass* through the flooded basin /
 * Boiler herd while a fortress sorties it measures sub-10% (pre-delta:
 * ant 8%, the permanent-ON breach). The §3.2 CLAUSE 1 ruled invariant
 * is therefore implemented HERE: the L9 ant policy **detaches a capture
 * element, post-muster, to take the spider-held Sump-Pump** — capturing
 * it flips owner→ant which (`suppressedWhenOwnedBy:'ant'`)
 * self-drains the flooded basin (the §6 "earned, then drained" beat) —
 * then the main body assaults `fuse-box` as one mass.
 *
 * This is expressed entirely through the EXISTING, opt-in L4
 * `switchContest` machinery on the shared `buildChainMarchPolicy`
 * (`ai/capture-chain.ts`) — NO shared-builder default is touched (L3 /
 * L4 / L5 / L6 / L8 + the tutorial omit / supply their own
 * `switchContest` and stay byte-identical, asserted by their own suites
 * + the coevo gate). The Sump-Pump is REMOVED from the plain `chain`
 * (so the body no longer marches the whole mass into the flooded
 * approach to walk it) and re-expressed as the `switchContest.post`:
 *   - `chain: [crawlspace-mouth, fuse-box]` — the body musters on the
 *     last neutral link `crawlspace-mouth`, holds for stragglers, then
 *     (once `crawlspace-mouth` is ant-owned ⇒ assault phase) assaults
 *     `fuse-box` as one mass.
 *   - `switchContest.captureParties` — the detached capture element.
 *     `detachGate:'muster'` peels it off only once the body has
 *     mustered (the §3.2 "until it does, it fights the approach under
 *     the flood; once it captures the pump the field drains" beat — the
 *     contested-ON window the curve weight integrates over), then it
 *     greedily walks the bisection-free WEST connector (cols 0–1, open
 *     every row) crawlspace-mouth (1,7) → sump-pump (1,9) and captures
 *     it (2-turn hold, `engine/post-capture.ts`). Floor→floor: NO
 *     `ant-plane-switch` is needed (the Level node is on-floor in the
 *     west connector); `move-to` resolves through the engine greedy
 *     descent with zero reachable dead-end (the basin is static `wet`
 *     mc 2 < the 99 obstacle threshold in EVERY pump state, so the
 *     navigable set is pump-state-invariant — the §0 argument).
 *   - `detachmentIsSpent:false` (shipped) — the capture element
 *     rejoins the fuse-box assault once the pump is ant-owned. This is
 *     REQUIRED for CLAUSE 2 to be non-inert: a *spent* (camping)
 *     detachment denies the spider the pump tile forever (the engine
 *     only reverts a COMPLETED capture if a SPIDER party stands on it
 *     alone 2 end-of-turns — impossible with an ant camper), measuring
 *     spider re-capture 0/100 (the L4-§9 permanent-OFF breach). Not-
 *     spent leaves the pump undefended ⇒ the `spider-l9` CLAUSE-2
 *     wrapper genuinely re-captures it (96/100), re-flooding the basin
 *     — the real contested oscillation the §3.2 ruled invariant
 *     demands. (The §3.2 spent-detachment "force price" framing is
 *     reportable but UNSHIPPED here: spent measures ant 55% with
 *     CLAUSE 2 inert — the §7 FAILURE, not a pass.)
 *
 * TUNING TRAJECTORY + FALSIFICATION (the §3.2/§4b loop latitude —
 * detachment size/timing/hold + the `spider-l9` CLAUSE-2 contest leash;
 * the RULED Sump-Pump `damage:1` / Boiler `damage:2` /
 * `suppressedWhenOwnedBy:'ant'` / basin region were NEVER touched):
 *   - pre-delta (sump-pump a plain chain link, whole mass dragged
 *     through the flood/Boiler by the OLD (1,9)→(9,9) route, no §3.2
 *     doctrine) → ant **8%** (the §3.2 named permanent-ON risk).
 *   - The §3.2 doctrine (chain re-routed crawlspace-mouth→fuse-box via
 *     row 7, the body no longer plows the basin; CLAUSE-1 detach;
 *     CLAUSE-2 active re-take) RECOVERS the route, but the recovery is
 *     enormous and BISTABLE, not a smooth −/+ margin: the Level PA
 *     placed the `wet` basin (cols 3–6, rows 8–9) OFF the
 *     doctrine-following ant's row-7 assault route, so the RULED
 *     Sump-Pump `hazardField` is structurally near-inert for a
 *     mustering ant (measured: ant assault routes 0 basin tiles; only
 *     the always-on Boiler clips it) and the outcome is governed by the
 *     brittle fortress-overrun timing, not the flood tax the §3.3
 *     model assumes.
 *   - Swept the FULL §3.2/§4b loop latitude seeds 1..100 vs
 *     `spider-l9` (NO ruled value touched, NEITHER clause weakened):
 *     1-party detach (any party / gate / spent) → ant **98–100%**;
 *     2-party `[alpha,bravo]` not-spent → ant **22%** with BOTH clauses
 *     seed-robust (pump flips 100/100, spider re-captures 96/100);
 *     2-party `[alpha,bravo]` SPENT → ant **55%** but spider re-capture
 *     **0/100** (CLAUSE 2 INERT — the §7-hardened explicit FAILURE, not
 *     a pass: the spent detachment camps the pump so the spider can
 *     never re-take; the 55% is the ant defeating its OWN assault, the
 *     pump contest decorative); leash / musterRing / interceptRadius /
 *     detachGate are flat plateaus then integer cliffs, none landing
 *     near [52,54]. The lever space is BISTABLE (fortress holds → ant
 *     ~8–22; fortress overrun → ant ~98–100) with NO monotone knob in
 *     between, because the basin is off the assault route.
 *   - CONCLUSION (clean falsification, reported to the orchestrator):
 *     ant ∈ [52,54] with BOTH §3.2 clauses demonstrably seed-robust is
 *     NOT reachable via the doctrine difficulty/timing/hold knobs
 *     WITHOUT touching a ruled value (Sump-Pump `damage>1`, the basin
 *     region, the `suppressedWhenOwnedBy` direction) or weakening a
 *     clause. The SHIPPED config below is the most-defensible point
 *     where the doctrine is genuinely IMPLEMENTED and EXERCISED (NOT a
 *     clause-inert fudge): 2-party `[alpha,bravo]`, not-spent, muster
 *     gate → ant **22%**, pump flips 100/100, spider re-captures
 *     96/100 (both §3.2 clauses seed-robust). Per the §7 / L4-§9
 *     falsification clause this REOPENS the L9 arbitration; the loop
 *     does NOT fudge, weaken/disable a clause, raise Sump-Pump
 *     `damage`, or propose a card/heal/plane-affinity/opt-in
 *     corrective. The GPA's named non-card correctives (a small band
 *     correction, or a Level-side basin re-placement onto the assault
 *     route so the RULED `damage:1` actually integrates) are the
 *     orchestrator's escalation, NOT this loop's to apply.
 *
 * Strategy (one sentence, per the §3.4.3 learnability rule):
 *
 *   The body marches to the last neutral link (crawlspace-mouth) and
 *   musters there; once mustered a detached capture element peels off
 *   down the west connector to take the spider-held Sump-Pump — DRAINING
 *   the flooded basin and then HOLDING it drained against the spider's
 *   re-take — while the mustered main body assaults the spider-held
 *   Fuse-Box as one mass; the queen-guard holds the stairwell; any
 *   field party below the low-HP threshold runs.
 *
 * Determinism: pure (state, scenario, rng) → state via `buildAntPolicy`
 * inside the shared builder; no RNG is consulted — fully replayable.
 * Touches NEITHER `ai/capture-chain.ts` / `ai/picket-defense.ts` /
 * `ai/closest-party.ts` / `ai/mission-spider-policy.ts` /
 * `ai/recruit-race-helper.ts` DEFAULT behaviour (L3/L4/L5/L6/L8 + the
 * tutorial regress on those and stay byte-identical) — L9 behaviour is
 * an opt-in `switchContest` config only.
 */

import type { PartyId, PostId } from '../engine/types.ts';

import { buildChainMarchPolicy, type ChainMarchConfig } from './capture-chain.ts';
import type { AIPolicy } from './types.ts';

/**
 * The canonical L9 POST chain, in capture order. The Sump-Pump is
 * deliberately NOT a plain chain link (that pre-delta shape dragged the
 * whole mass through the flooded approach and measured ant 8% — the
 * L4-§9 permanent-ON breach); it is the §3.2 CLAUSE-1 `switchContest`
 * detach target instead (see below). The plain chain is therefore the
 * last neutral muster link then the spider-held objective — identical
 * in shape to L3/L5's chain, with the §3.2 doctrine layered on as
 * opt-in config.
 */
const L9_CHAIN_CONFIG: ChainMarchConfig = {
  name: 'baseline-l9',
  chain: ['crawlspace-mouth' as PostId, 'fuse-box' as PostId],
  objective: 'fuse-box' as PostId,
  musterPost: 'crawlspace-mouth' as PostId,
  /**
   * Muster ring — carried at the L3/L5 plateau-centre default (2). The
   * §3.2/§4b loop latitude is the detachment size/timing/hold (the
   * `switchContest` knobs below), not this; left at the stable mid
   * value so the band is landed by the doctrine knobs, not a
   * knife-edge muster ring.
   */
  musterRing: 2,
  queenGuard: 'queen-guard' as PartyId,
  /**
   * §3.2 / §4b CLAUSE 1 (ruled invariant — its existence). The detached
   * capture element peels off post-muster (`detachGate:'muster'`) to
   * take the spider-held `sump-pump`; that capture flips owner→ant which
   * (`suppressedWhenOwnedBy:'ant'`, `data/level-9/map.json`) self-drains
   * the flooded basin — the §6 player-shaping beat made a real,
   * reachable objective.
   *
   * `captureParties: ['vanguard-alpha' as PartyId, 'vanguard-bravo' as PartyId]` — the
   * 2-party detachment. This is the SHIPPED (most-defensible)
   * falsification config: it is the ONLY swept regime where ant < 98%
   * AND BOTH §3.2 clauses are demonstrably seed-robust (pump flips
   * 100/100, spider re-captures 96/100). It measures ant **22%** — far
   * below the ruled [52,54] band — but it is genuine: the doctrine is
   * implemented and EXERCISED, not a clause-inert fudge. Measured,
   * seeds 1..100 vs `spider-l9` (NO ruled value touched): any 1-party
   * detach → ant 98–100% (the muster+re-route doctrine alone overruns
   * the fortress, the basin being off the row-7 assault route);
   * `[alpha,bravo]` not-spent → ant 22% (clauses robust, BELOW band);
   * `[alpha,bravo]` SPENT → ant 55% but spider re-capture 0/100
   * (CLAUSE 2 INERT — an explicit §7 FAILURE, NOT shipped). No 2-party
   * pair / leash / gate combination lands [52,54] with both clauses
   * live — the lever space is bistable (see the file-header trajectory).
   *
   * `detachmentIsSpent:false` — the capture element rejoins the
   * fuse-box assault once the pump is ant-owned. This is REQUIRED for
   * CLAUSE 2 to be non-inert: a spent (camping) detachment denies the
   * spider the tile forever (engine `post-capture.ts`: a completed
   * capture only reverts if a SPIDER party stands on it alone 2
   * end-of-turns; an ant camper makes that impossible), measuring
   * spider re-capture 0/100 — the L4-§9 permanent-OFF breach. Not-spent
   * lets the pump go undefended ⇒ the `spider-l9` CLAUSE-2 wrapper
   * marches in and genuinely re-captures it (96/100), re-flooding the
   * basin and forcing the ant to re-detach — the real contested
   * oscillation the §3.2 ruled invariant demands.
   *
   * `detachGate:'muster'` — peel off only once the body has mustered on
   * `crawlspace-mouth` (the §3.2 "fights the approach until it earns
   * the pump" beat). `'early'` was swept (no material effect — flat).
   *
   * The detach target `sump-pump` is on the FLOOR plane in the west
   * connector, so unlike L4 NO ant-mage / `ant-plane-switch` is
   * required (the engine only plane-switches on a move-to to an
   * off-plane tile, and sump-pump is on-floor); the detachment just
   * ground-walks the bisection-free west connector to it. The
   * *existence* of CLAUSE 1 is the §3.2 ruled invariant (it IS
   * exercised — the pump flips 100/100); this detachment
   * size/timing/hold is the §4b within-loop latitude (swept, no in-band
   * point with both clauses live — the reported falsification).
   */
  switchContest: {
    post: 'sump-pump' as PostId,
    captureParties: ['vanguard-alpha' as PartyId, 'vanguard-bravo' as PartyId],
    detachmentIsSpent: false,
    detachGate: 'muster',
  },
};

export const baselineL9Player: AIPolicy = buildChainMarchPolicy(L9_CHAIN_CONFIG);
