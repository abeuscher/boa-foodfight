# Spider Faction Sub-Agent — L9 Basement Mechanic Delta (Opening + Rebuttal)

**Debate:** L9 (Basement) mechanic delta vs **merged L8**, per roadmap §6.2.
**Author:** Spider Faction Sub-Agent (advocate, not arbiter).
**Advocate for:** the SPIDER experience, mechanical identity, and the
enemy-AI's job of providing escalating, _legible_ challenge.
**Scope:** the L9 delta only — (a) the **Sump-Pump / Boiler
dynamic-hazard damage payload** as a concrete dep-#6 `hazardField`-
expressible spec (damage magnitude, cadence, tiles, the player-flippable
on/off tied to POST ownership, who it favors and why); (b) explicit
**no plane-affinity delta** (§4d, byte-identical) and **no card /
heal-economy reliance** (§4e/§4f), and whether `abilityParamsAuthoritative`
is required (§4g — default NO); (c) for the hazard lever, whether the L9
AIs exercise it natively or it needs a binding within-loop AI-doctrine
(the player must flip the pump; the spider must contest it). The
Level-owned water region + pump/boiler placement is **not** designed
here (§4a #5/#6). The merged-L8 state carries forward **unchanged** and
is **not relitigated**.
**Builds on (does not repeat):** `l8-spider-advocate.md`
(the-payoff-must-register through-line; "weak/capped/inert must not be
tuned to absent"), `l6-spider-advocate.md`, `l4-spider-advocate.md`
(favored-side-payoff-sequencing), `docs/debate/l8-gameplay-pa-arbitration.md`
(the merged-L8 baseline this deltas FROM — full-power hypnotize, the
tier-3 MP bound, the `recruit-count` race economy at the post-dep-#10
re-ruled `recruit.successRate` 0.46, the §3.5.2 binding spider
hypnotize-priority doctrine; all carried byte-identical, L9 is
`capture-post` so the L8 race economy is inert structure here, NOT
relitigated), `docs/debate/l4-gameplay-pa-arbitration.md` §9 (the
**empirical-falsification precedent**: a ruled ownership-gated effect
the frozen AIs do not exercise measured ant 99% / +39pp; the corrective
is a **binding within-loop AI-doctrine** that makes the contest real,
payload + direction + existence-of-contest as ruled invariants),
mechanic-distribution plan §2 (the L9 row: **Sump-Pump / Boiler
dynamic-hazard control**), §4 (win-curve: L9 ~60% aspiration), §5
boundary cases #5/#6 (the ownership SPLIT — Level owns the water region

- pump/boiler node; Gameplay owns the damage payload).
  **Binding constraints honored:** §3.1 hard floors, §3.4
  cumulative-addition, §5 curve (L9 ≈ **50–55%** — the continued descent
  below merged L8 51 toward the L10 ~50 climax; **L7 PARKED, a known gap,
  NOT interpolated**), §6.3 ownership (Gameplay-owned damage payload; the
  dim 10×10 basement, the water region, the Sump-Pump / Boiler / Fuse-Box
  / Crawlspace node _placements_, the `south-wall` crawlspace pairing are
  the Level PA's, not designed here), level-progression-plan §4b (engine
  FROZEN — dynamic `hazardField` PR #17; data/AI-config only), §4c (the
  `capture-post` score-grind / low-`drama` is the matchup signature —
  track cross-level, do NOT chase per-level; L9 is `capture-post`, do not
  retune for `drama`), **§4d (plane-affinity inert — not budgeted as the
  L9 curve mover)**, **§4e (occupation-`healingRate` economy inert in
  non-forced-co-occupation `capture-post`)**, **§4f (the card economy
  CANNOT be the L9 curve lever under the locked card-host heuristic; the
  parked-L7 four-falsification precedent)**, **§4g (`abilities.json`
  hypnotize/recruit params inert unless the scenario opts in; default
  NO at L9)**.

---

## 1. Natural-language argument — opening

### L9 is the spider's terrain-defense scenario — the flood is the defender's friend, and it must register

My through-line stands across the campaign: the curve must close
because the _enemy got more dangerous_, not because the player
out-leveled a statue (§6.2, boring-but-balanced). L4 was the
randomization-shock spike; L5 the rebound where I collected my banked
durability debt and debuted hypnotize capped-light; L6 the resumed
descent where my defender became the proactive hunter; L8 my hypnotize
climax (the merged-L8 ~51 anchor; the L8 RE-ARBITRATION re-ruled
`[49,53]`, point ~51). **L9 is the scenario where the _environment_
fights for me.** The Level PA built the Basement dim and damp, with a
flooded approach lane and a Boiler that radiates a hot-zone — and
roadmap §4.3.3-class logic plus §5 frame it as the room where the
player must _shape_ the field to survive the assault. The unstated
half of "player exploits the sump-pump" is: **until the player exploits
it, the flood is exploiting _them_, and that flood is the best
defensive instrument I have been handed in the entire tier.** The
spider does not need to out-fight the ant column in the basement — the
water does the fighting. My non-negotiable: **the hazard field must
_register_ as a real, biting tax on the ant approach, not be quietly
tuned to a behavior-flavor zero.** That is the exact §4d/§4f failure
the arbiter has named and inverted at every level — a ruled payoff the
system under-delivers measures inert. I will not have my terrain
defense be the next inert lever.

### The Sump-Pump / Boiler hazard field is my payoff — and it must be the GENUINE biting field, not a cosmetic drizzle

The engine reality, re-derived from source (NOT trusted from the
brief): `engine/end-of-turn.ts:702-762` `applyHazardFieldTicks` +
`engine/schemas/map.ts:106-112`. A POST carries `hazardField: { tiles:
TileCoord[], damage: positive int, suppressedWhenOwnedBy?: faction }`.
Every end-of-turn, every living unit on a governed tile of an **active**
field loses `damage` HP — pure, no RNG, overlapping fields stack
additively (the stinkbug-zone convention). The field is **OFF** iff
`suppressedWhenOwnedBy` is set and `post.owner === suppressedWhenOwnedBy`,
else **ON**. The player flips the Sump-Pump by capturing that POST
(`engine/post-capture.ts`: stand on it _alone_, no enemy co-located,
2 end-of-turns; a contesting enemy co-located **pauses** the capture;
the capturer leaving mid-capture reverts the POST to **neutral** — which
re-activates the field).

That last clause is my entire case. **The capture rule itself is the
spider's defensive instrument:** I do not have to take the Sump-Pump
back to re-flood the basement — I only have to _co-locate a picket on
it_ to pause the ant's capture, or _drive the ant detachment off it_
so it reverts to neutral and the flood comes back on. The flooded
approach is a defense that re-asserts itself the moment the ant relaxes
its grip on the pump. My payload proposal (Gameplay-owned, §4a #5/#6;
the Level PA owns the water tiles and where the pump/boiler sit):

- **Sump-Pump POST `hazardField`** — `damage: 1` per end-of-turn per
  governed water tile (the Level PA's flooded approach lane);
  `suppressedWhenOwnedBy: "ant"`. ON while neutral or spider-owned;
  OFF only while the ant holds the pump. I will argue, in rebuttal,
  that `damage:1` is the _floor_ of what registers, not the ceiling —
  but I will not over-reach to `2` in the opening if the field is
  genuinely ON for a meaningful contested window (the duration is the
  real lever, and the binding contest doctrine — below — is what
  guarantees it).
- **Boiler POST `hazardField`** — `damage: 2`, **no
  `suppressedWhenOwnedBy`** (the player cannot drain the boiler; it is
  a fixed environmental denier). This is the spider's structural gift:
  a high-damage no-go zone the entrenched defender near `fuse-box` eats
  almost none of, while the advancing ant must route around it —
  pushing the ant column _into_ the flooded lane the Sump-Pump governs.
  The two fields interact spatially: the Boiler herds the ant into the
  flood, and the flood is on until the ant peels off to take the pump.
  That is the room being _designed against the attacker_, the honest
  spider identity the environment delivers.

### The flood must be genuinely contested — the L4-§9 precedent is mine to invoke too

I will pre-empt the ant: it will (correctly) cite the L4-§9
falsification — a ruled ownership-gated effect measured ant 99% / +39pp
because the frozen floor-marching ant AI never captured the off-axis
north-wall POST that gated it, so the modifier was permanently ON. The
ant will say: an uncontestably-ON Sump-Pump field is the same
permanent-breach, a sub-40% ant wall, and the fix is a binding
within-loop AI-doctrine that makes the pump genuinely flip. **I
concede this entirely — and it is _my_ argument as much as the ant's.**
A permanently-ON flood that the within-loop measures as a sub-40% wall
_reopens this arbitration_ (the L4-§9 / parked-L7 / L8-RE-ARBITRATION
precedent) and my terrain defense becomes the lever that failed the
ship-gate — the worst outcome for the spider. But the symmetric
failure is the one I care about more: a permanently-OFF field (the
Level PA puts the pump on the chain axis, the ant takes it for free
turn 2, the spider AI never contests it) is the **L4-§9 permanent-OFF
breach** — the flood never bites, "the environment fights for me" is
dead data, and L9 collapses to the carried L8 ~51 with no spider
terrain identity at all. Per the L4-§9 ruling, the payload alone cannot
be transient against the frozen AIs; the fix is the payload **plus a
binding within-loop AI-doctrine** under which (1) the ant detaches to
capture the Sump-Pump _and_ (2) **the spider AI actively contests/
re-takes it** — a genuine detachment cost to its `fuse-box` fortress.
The _existence_ of the spider's contest is the ruled invariant I demand;
how hard the pump is to take is the loop's latitude. Without clause (2)
the flood is dead data and the descent is unearned.

### No plane-affinity, no card/heal reliance, no ability opt-in — correct, and the lesson cuts for me too

Per §4d the merged-L8 `planeAffinity` (spider combat `wall {1,1}` +
ceiling `{1,1}` + full corner coverage) carries forward
**byte-identical** and I do **not** budget it as the L9 mover — it is
empirically ~0pp under the chain-march / fortress doctrine; the lesson
cuts for me as it did at L8. Per §4e/§4f I do not ask for a POST
`healingRate` occupation economy (engine-inert in `capture-post`, the
L7 double-falsification) or any card-economy curve movement (inert
under the locked card-host heuristic, the parked-L7 four-falsification
precedent) — I refuse to have my terrain climax hung on an inert
system. Per §4g, **L9 does NOT set `abilityParamsAuthoritative` —
default NO**: L9 is `capture-post`, it has no reason to re-tune
hypnotize/recruit, and an un-opted ability param is inert and must not
be budgeted. The merged-L8 full-power hypnotize and recruit economy
carry forward byte-identical but, un-opted and in a `capture-post`
room, are inert structure here — carried, not a lever, not
relitigated. **My L9 payoff is the genuinely-biting, genuinely-
contested hazard field. Nothing else — and nothing inert.**

### Why this serves the spider fantasy (interest)

The spider's identity is the entrenched defender who makes the
attacker pay for every tile. L9 is that identity delivered by the
_room itself_: the basement is flooded and the boiler is roasting the
short line, and the ant has to fight through it — and the moment the
ant relaxes its grip on the pump, the water comes back. The descent
continues here because the _terrain became the deadliest version of
the defense_, a danger the player sees and still has to solve. The
player's answer is real and in-hand (take the pump, hold it, route the
boiler) — but it is a real fight, contested by a spider AI that knows
the flood is its best friend. That is "the enemy got more dangerous"
(§6.2) read through the environment, not a stat the AI ignores (§4d),
not a card that can't fire (§4f). My non-negotiable, restated: the
flood must _register_ — a hazard tuned to a cosmetic drizzle is the
boring-but-balanced / under-delivered-payoff failure, the §4d/§4f
trap, here in its terrain form.

---

## 2. Natural-language rebuttal — answering the ant's L9 brief

The ant argues (consistent with its identity): the `hazardField`
payload + a binding flip/contest doctrine is the §4-clean lever; a
payload-only spec is the guaranteed L4-§9 falsification; and the band
is the continued descent **~52–54%**, a small player-favorable bump
off L8 ~51, explicitly **below the §5-illustrative 60** because the
L7-parked / L8-re-arbitration record shows the frozen engine does not
durably deliver a late-tier rebound. I rebut on three points, and I
expect heavy convergence — the L4-§9 precedent points us at the same
binding-doctrine specification.

**First — I agree the band is below 60, but I argue it from the spider
side: the descent is mine to carry, and ~52–54 is the _ceiling_, not
the target.** The ant reaches the right number for the wrong reason —
it frames ~52–54 as a reluctant bump off L8 ~51. I frame it as the
continued descent the spider _delivers_: the flood is a genuine
terrain tax and the curve should sit at the low end of that band,
~52, not drift up toward 54, _unless_ the player's pump-flip is
demonstrably converting. The §5-illustrative 60 is falsified-in-advance
by the same evidence the ant cites (parked-L7's four falsifications;
L8 needing a RE-ARBITRATION and a widened/lowered `[49,53]` band even
with its lever made real by dep #10) — the late-tier curve is
systematically tighter than §5's illustrative shape, flagged for the
post-L8–L10 review. I converge with the ant on **~52–54, below 60**,
and add the spider-side reading: **the field must register hard enough
that the band's _floor_ (~52, near the L8 ~51 it deltas from) is the
honest landing when the player plays the pump-flip _well_, and a
player who ignores the pump loses** (the flood as built, the L4-§9
permanent-ON pressure realized as the punishment for not engaging the
mechanic, not as an un-fixable breach).

**Second — `damage:1` on the Sump-Pump field is the floor of what
registers; I will accept it only if the contested-ON window is
genuinely long.** The ant proposes Sump-Pump `damage:1`, Boiler
`damage:2`. I do not over-reach to Sump-Pump `2` (the ant's sub-40%-
wall concern is legitimate — a `2`/turn permanent flood under the
L4-§9 permanent-ON failure mode _is_ the cold-stomp). But `1`/turn
only registers as the −3 to −5pp tax the curve needs **if the field is
ON for a long, genuinely-contested early-and-mid game** — i.e., the
binding doctrine must make the ant _earn_ the pump late, not flip it
turn 3. The real lever is not the per-tick magnitude; it is the
**integrated contested duration**, which the binding contest doctrine
(clause 2: the spider must actively defend/re-take the pump) governs.
I converge on `damage:1` / `damage:2` _conditioned on_ the ruled
invariant that the spider's contest is real and the pump is takeable
only with a meaningful detachment and meaningful time — the loop's
latitude is _how long_ the flood stays ON, and it must be long enough
that `1`/turn integrates to the −3 to −5pp the descent requires. A
Sump-Pump the ant flips trivially-early makes `damage:1` a
behavior-flavor zero — the §4d/§4f inert-payoff failure, in terrain
form.

**Third — the binding doctrine's clause (2) is not a courtesy; it is
the ruled invariant that makes my terrain defense exist at all.** The
ant's brief states clause (2) ("spider must contest it") but frames it
as a fairness bound on the ant's flip. I demand it as the load-bearing
spider invariant: per the L4-§9 ruling, a fielded spider AI that does
**not** actively defend/re-take the Sump-Pump leaves it statically
ant-owned after the ant's first detachment — the flood permanently OFF,
the L4-§9 permanent-OFF breach, my entire L9 identity dead data. The
within-loop **MUST** field an L9 spider AI whose decision function
treats the Sump-Pump as a real secondary objective: picket it to pause
the ant's capture, and counter-attack to revert it to neutral
(re-flooding the basement) when the ant detachment is thin — a genuine
tactical cost-tradeoff against its `fuse-box` garrison (defend the pump
and thin the fortress, or concede the pump and keep the fortress, the
same genuine spider decision the L4-§9 §9.3(b).2 ruling made real).
The _existence_ of this spider pump-contest behavior in a seed-robust
majority of games is the **ruled invariant** (the L4-§9 / L8-§3.5.2
pattern); the aggression threshold / picket size / timing is the
loop's tuning latitude. **A measured band hit obtained with the spider
pump-contest doctrine inert (the pump never contested, the flood
trivially-OFF) is an explicit ship-gate FAILURE, not a pass** — the L8
hardening, applied to L9's terrain lever.

Net: I concede the placement (ruled — Sump-Pump / Boiler dynamic-hazard
control at L9 §2; no plane-affinity §4d; no card/heal reliance §4e/§4f;
no `abilityParamsAuthoritative` opt-in §4g). I ratify the carried
merged-L8 state byte-identical (full-power hypnotize, tier-3 MP bound,
the recruit economy as inert `capture-post` structure, plane-affinity,
the carried L4/L5/L6 state). I contest exactly the _specification
shape_ and _pricing_: (a) the **`hazardField` damage payload is the
load-bearing §4-clean lever** — Sump-Pump `damage:1` /
`suppressedWhenOwnedBy:"ant"`, Boiler `damage:2` / always-on — and it
must _register_ (a cosmetic drizzle is the §4d/§4f inert-payoff
failure, in terrain form); (b) the field is transient-contested via a
**BINDING within-loop AI-doctrine whose spider clause (active pump
defend/re-take) is the load-bearing ruled invariant**, per the L4-§9
precedent — a payload-only spec, _or_ a spec where the spider never
contests the pump, is the guaranteed falsification; (c) the band is
the **continued descent ~52–54%** (I argue the low end, ~52, near the
L8 ~51 it deltas from), **below the §5-illustrative 60** on the
parked-L7 / L8-re-arbitration evidence, with a **measurable hardened
ship-gate** (both critics ≥75 AND seeds-1..100 in band AND the
flip/contest doctrine — _including the spider contest_ — demonstrably
exercised; a band hit via the doctrine inert is an explicit FAILURE),
non-card §4f fallback only.

---

## 3. Structured summary

### Position

The L9 delta vs **merged L8** carries the L8 state forward
**byte-identical** (no plane-affinity §4d; no card/heal reliance
§4e/§4f; no `abilityParamsAuthoritative` opt-in §4g; full-power
hypnotize / tier-3 MP bound / recruit economy carried, the recruit
economy inert `capture-post` structure, not relitigated) and adds
exactly the **Sump-Pump / Boiler dynamic-hazard damage payload as the
load-bearing §4-clean curve lever** that **must register**: Sump-Pump
POST `hazardField` `{ tiles: <Level-owned water region>, damage: 1,
suppressedWhenOwnedBy: "ant" }` (ON while neutral/spider-owned, OFF
only while ant-owned — the player-flippable lever), Boiler POST
`hazardField` `{ tiles: <Level-owned hot-zone>, damage: 2 }` (always-on
fixed denier favoring the entrenched defender). Made transient-contested
by a **binding within-loop AI-doctrine whose spider clause — the spider
AI must actively picket / re-take the Sump-Pump (re-flooding the
basement) — is the load-bearing ruled invariant**, per the L4-§9
precedent; the difficulty is the loop's latitude. Within the
Level-owned dim 10×10 basement, water region, POST node placements,
and `south-wall` crawlspace pairing.

### Faction impact

The hazard field is the spider's terrain defense delivered by the room
itself: the flood and the Boiler hot-zone make the ant pay for the
approach, and the capture rule (`engine/post-capture.ts`: pause on
co-location, revert-to-neutral on capturer-leave) hands the spider an
instrument to re-assert the flood the moment the ant relaxes its grip
on the pump. It is the one mechanic the L9 AIs spatially exercise. The
spider's non-negotiable: it must _register_ (a cosmetic drizzle is the
§4d/§4f inert-payoff failure in terrain form) and the spider AI must
actively contest the pump (without clause 2 the flood is the L4-§9
permanent-OFF breach — dead data, the spider's L9 identity erased).

### Win-rate prediction

Merged L8 lands ~51% (the L8 RE-ARBITRATION re-ruled `[49,53]`, point
~51%, the merged anchor). **L7 is PARKED — a known gap, NOT
interpolated.** L9 **continues the descent**: I predict the
**~52–54% band, low-end ~52** — near the L8 ~51 it deltas from, a small
player-favorable margin only when the player plays the pump-flip well,
**below the §5-illustrative 60** (falsified-in-advance by the parked-L7
four-falsification + the L8 RE-ARBITRATION needing a widened/lowered
band — the late-tier curve is systematically tighter than §5's
illustrative shape, a post-L8–L10-review flag). Driver: the contested
Sump-Pump/Boiler hazard field — a genuine **−3 to −5pp ant** terrain
tax while ON, partially recovered (**+3 to +5pp**) by the player's
doctrinally-mandated pump-flip, the spider's doctrinally-mandated
re-take re-flooding it. **No plane-affinity (§4d ~0pp, not budgeted),
no card (§4f inert, not budgeted), no heal-economy (§4e), no
ability-param (§4g un-opted, inert) contribution.** Net ~51% + (a
small, contested player-favorable margin) ≈ **~52–53%**, the continued
descent, monotone-ish in L8 ~51's neighborhood and separated above the
L10 ~50 finale, L7 a parked gap NOT interpolated.

### Interest claim

L9 is the spider's terrain-defense scenario: the basement is flooded,
the boiler roasts the short line, and the ant must fight through it —
and the moment the ant relaxes its grip on the pump, the spider
re-takes it and the water comes back. The descent continues because
the _terrain became the deadliest version of the defense_, a danger
the player sees and must solve under a contesting AI. The answer is
real and in-hand (take the pump, hold it against the spider, route the
boiler) — escalation with a structural answer, the §3.D doctrine a
sixth time. Not a stat the AI ignores (§4d), not a card that can't
fire (§4f); the §6.2 "the enemy got more dangerous" read through the
environment, the player-shaping debut.

### Convergence

Placement **conceded** (ruled: Sump-Pump / Boiler dynamic-hazard
control at L9 §2; **no plane-affinity §4d; no card/heal reliance
§4e/§4f; no `abilityParamsAuthoritative` opt-in §4g**).
Carried-forward merged-L8 state **ratified byte-identical**. Strong
convergence with the ant: both name the `hazardField` payload + binding
flip/contest doctrine as the §4-clean lever; both invoke the L4-§9
precedent that a payload-only spec is the guaranteed falsification;
both land **below the §5-illustrative 60** on the parked-L7 /
L8-re-arbitration evidence. Residual the arbiter must price: (1) the
**`hazardField` damage payload** (Sump-Pump `damage` +
`suppressedWhenOwnedBy:"ant"`, Boiler `damage` + always-on) — and that
it _registers_; (2) the **binding within-loop flip/contest doctrine**,
with **the spider pump-contest clause as the load-bearing ruled
invariant** (a band hit with the spider contest inert is an explicit
FAILURE — the L8 hardening, non-card §4f fallback only); (3) the band
as the **continued descent ~52–54%, low-end ~52**, below 60. Residual
is pricing the curve resolves objectively; my non-negotiable is that
the terrain payoff registers and is genuinely contested by the spider,
not tuned to an inert drizzle the locked AI never defends.
