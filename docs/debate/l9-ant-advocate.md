# Ant Faction Sub-Agent — L9 Basement Mechanic Delta (Opening + Rebuttal)

**Debate:** L9 (Basement) mechanic delta vs **merged L8**, per roadmap §6.2.
**Author:** Ant Faction Sub-Agent (advocate, not arbiter).
**Arbiter:** Gameplay Progression Agent.
**Scope:** the L9 delta only — (a) the **Sump-Pump / Boiler dynamic-hazard
damage payload** as a concrete dep-#6 `hazardField`-expressible spec
(damage magnitude, cadence, which tiles, the player-flippable on/off tied
to POST ownership, who it favors and why); (b) explicit **no
plane-affinity delta** (carried from L8 byte-identical, §4d) and **no
card / heal-economy curve reliance** (§4e/§4f), and whether any
`abilityParamsAuthoritative` opt-in is required (§4g — default NO); (c)
for the hazard lever, whether the L9 AIs exercise it natively or it needs
a binding within-loop AI-doctrine constraint (the player must actually
flip the pump; the spider must contest it). The Level-owned water region

- pump/boiler node placement is **not** designed here (§4a #5/#6).
  **Builds on (does not repeat):** `l8-ant-advocate.md`,
  `docs/debate/l8-gameplay-pa-arbitration.md` (the **merged-L8 baseline
  this deltas FROM** — full-power hypnotize `minControlTurns:5,
maxControlTurns:10`, the tier-3 single-slot MP bound, the `recruit-count`
  race economy at the post-dep-#10 re-ruled `recruit.successRate` start
  `0.46`, the §3.5.2 binding spider hypnotize-priority doctrine; all carry
  forward **byte-identical** except where this delta explicitly changes
  them — L9 is `capture-post`, NOT `recruit-count`, so the L8 race economy
  is inert structure here, carried, not relitigated),
  `docs/debate/l4-gameplay-pa-arbitration.md` §9 (the
  **empirical-falsification precedent**: a ruled value the frozen AIs do
  not exercise measured ant 99% / +39pp; the corrective is a **binding
  within-loop AI-doctrine** that makes the contest genuinely happen, with
  the payload + direction + existence-of-contest as ruled invariants),
  `docs/mechanic-distribution-plan.md` §2 (the L9 row: **Sump-Pump /
  Boiler dynamic-hazard control** — player-shaping debut), §4 (win-curve:
  L9 ~60% aspiration, "player shapes the field"), §5 boundary cases #5/#6
  (the ownership SPLIT — Level owns the water region + pump/boiler node;
  Gameplay owns the damage payload).
  **Binding constraints honored:** §3.1 hard floors, §3.4
  cumulative-addition, §5 curve (L9 ≈ **50–55%** — the continued descent
  below merged L8 51 toward the L10 ~50 climax; **L7 is PARKED, a known
  gap, NOT interpolated**), §6.3 ownership (Gameplay owns the damage
  payload; the dim 10×10 basement geometry, the water-`hazard`-tile region,
  the Sump-Pump / Boiler / Fuse-Box / Crawlspace POST node _placements_,
  the `south-wall` crawlspace pairing are the Level PA's, running in
  parallel, **not** designed here), level-progression-plan §4b (engine
  FROZEN — dynamic `hazardField` implemented PR #17; **data/AI-config
  only, no new engine code**), §4c (the `capture-post` score-grind /
  low-`drama` signature is the matchup signature — track cross-level, do
  NOT chase per-level; L9 is `capture-post`, so it applies — do not retune
  L9 for `drama`), **§4d (plane-affinity inert under the chain-march /
  fortress AI doctrine — NO L9 plane-affinity delta, carry byte-identical,
  NOT a curve lever)**, **§4e (occupation-`healingRate` economy
  engine-inert in non-forced-co-occupation `capture-post` — not a curve
  lever here)**, **§4f (the commander-card economy CANNOT be the L9 curve
  lever under the locked card-host heuristic; a player-favorable shaping
  MUST NOT be built on cards — the parked-L7 four-falsification
  precedent)**, **§4g (`abilities.json` hypnotize/recruit params inert
  unless the scenario sets `abilityParamsAuthoritative:true`; L9 must
  explicitly opt in if it intends to tune them and must NOT budget an
  un-opted ability-param delta as a lever — default NO)**.

---

## 1. Natural-language argument — opening

### The ant doctrine at L9, and why the hazard field is the only §4-clean curve lever

My through-line is unchanged: the ant experience is a
logistics-and-tempo puzzle, and the descent toward ~50% by L10 is that
fantasy maturing into its hardest, most committed form. L8 was the
hypnotize climax — the continued decisive descent to ~51% in the
recruit-or-die room (the merged-L8 anchor; the L8 RE-ARBITRATION R.3
re-ruled band `[49,53]`, point ~51%). **L9 is the player-shaping debut,
and it is the first room in the whole tier where the descent is carried
by something the player physically does to the board.** Roadmap §5 and
mechanic-distribution plan §4 price L9 at ~60% aspiration — "player
exploits the sump-pump." But I am not going to argue ~60. I am going to
argue the truth the L7/L8 record forces on me: the curve descends. L8
landed ~51 (re-ruled). L10 is the ~50 climax. **A jump back up to 60 at
L9 is not a descent, it is a rebound that the L7-parked record shows the
frozen engine cannot durably deliver** — and §4f is the binding lesson
that the obvious-looking "player gets a favorable tool, win-rate jumps"
narrative is exactly the one that measures inert or non-durable. I will
argue L9 as the continued, gentle descent: **~52–54%**, a small
player-favorable bump off the L8 ~51 floor (the player _does_ get a
real shaping tool), held below the §5-illustrative 60 because the only
lever that is §4-clean here — the hazard field — is a knife that cuts
both ways and a contest the spider gets to fight.

### The Sump-Pump / Boiler hazard field IS the curve lever — and the L4-§9 precedent tells me exactly how it will be specified

The single most important thing I can say at L9: **the load-bearing
curve lever is the dynamic `hazardField` damage payload, and it is
§4-clean only because it is the one mechanic the AIs spatially exercise
every turn.** The engine reality, re-derived from source (NOT trusted
from the brief), `engine/end-of-turn.ts:702-762` `applyHazardFieldTicks`

- `engine/schemas/map.ts:106-112`:

* A POST may carry `hazardField: { tiles: TileCoord[], damage:
positive int, suppressedWhenOwnedBy?: faction }`.
* Every end-of-turn, for every POST whose field is **active**, each
  living unit standing on a governed tile loses `damage` HP. Pure, no
  RNG. Overlapping fields stack additively (the stinkbug-zone
  convention).
* The field is **OFF (drained)** iff `suppressedWhenOwnedBy` is set
  **and** `post.owner === suppressedWhenOwnedBy`. Otherwise it is **ON**.

This is the L4-Light-Switch shape exactly — an ownership-gated global
effect — and the L4-§9 falsification is the precedent I will hold the
arbiter to. There, a ruled `combatModifier` measured **ant 99% /
+39pp** because the frozen floor-marching ant AI _never captured the
north-wall POST that gated it_, so the modifier was permanently ON.
The Sump-Pump is the same trap, squared:

- If the Sump-Pump's field is `suppressedWhenOwnedBy: "ant"`, it is
  **OFF only while the ant owns the Sump-Pump POST**. The ant flips it
  by capturing that POST (`engine/post-capture.ts`: stand on it alone,
  no enemy co-located, 2 end-of-turns).
- The shipped ant AI is a chain-marcher on the **floor**. If the
  Sump-Pump is off the chain axis (and the Level PA's basement is dim
  with a `south-wall` crawlspace — exactly the kind of off-axis node
  that bit L4), the ant **never detours to capture it**. The field is
  then **permanently ON the whole game**, chewing the ant's own
  chain-march line as it advances toward `fuse-box` — an
  **unlicensed downward breach** (the L4-§9 failure, sign-flipped: a
  player-favorable tool that the frozen AI never picks up becomes a
  permanent ant tax).
- Conversely, if the spider AI never contests the Sump-Pump, the ant
  (once it _is_ doctrinally sent there) takes it for free and holds it
  uncontested — the field is **permanently OFF** and the "player
  shapes the field" beat is dead data, an **unlicensed upward
  breach** (the L4-§9 permanently-OFF failure: the lever never fires,
  L9 collapses back toward the carried L8 ~51 with no shaping at all,
  or worse, overshoots if I am wrong about direction).

**Neither static outcome is the ruled band.** Per the L4-§9 ruling,
the payload _alone cannot_ be made transient against the frozen AIs:
the fix is the payload **plus a binding within-loop AI-doctrine
constraint** that makes the Sump-Pump genuinely contestable so its
ownership actually flips mid-scenario. That is the load-bearing
correction and I am stating it in the opening so the arbiter cannot
ship a payload-only spec that the L4-§9 / parked-L7 precedent
guarantees will falsify.

### The concrete damage payload (Gameplay-owned, §4a #5/#6)

The Level PA owns the water region and where the Sump-Pump / Boiler
nodes sit; **I own the damage**. My ruled-START proposal:

- **Sump-Pump POST `hazardField`** (the player-flippable one): governs
  the water-region tiles the Level PA places (the "flooded approach
  lane"). `damage: 1` per end-of-turn per governed tile;
  `suppressedWhenOwnedBy: "ant"`. **Ant-owned ⇒ OFF (drained); neutral
  or spider-owned ⇒ ON (flooded).** `damage:1` because the field's
  curve weight is the _path tax integrated over the march_, not a
  single big hit: a chain-march that crosses ~4–6 flooded tiles over
  ~8–12 turns under a permanent `1`/turn is a real, legible attrition
  drain on a glass cannon — and the player's answer is to detour and
  capture the pump to shut it off. A `2` here is a sub-40% wall on the
  glass cannon (the same over-tune the L8 cold-stomp guarded against);
  `1` is the legible, plannable tax.
- **Boiler POST `hazardField`** (the always-on emitter): governs the
  tiles immediately around the Boiler node (the Level PA's "boiler
  hot-zone"). `damage: 2`, **no `suppressedWhenOwnedBy`** — the Boiler
  is a fixed environmental denier the ant routes _around_, not a
  flippable lever (the player cannot drain the boiler; it just is). A
  small, high-damage no-go zone that shapes the approach geometry
  (forces the ant off the shortest line, into the flooded lane the
  Sump-Pump governs — the two fields interact spatially, which is
  exactly the §4-clean "AIs exercise it spatially" property the brief
  asks the L9 load-bearing lever to have).

The favoring is deliberately **player-favorable but bounded**: the
Sump-Pump is a tool the player can shut off (a real shaping decision);
the Boiler is a fixed tax both sides route around but the spider, as
the entrenched defender near `fuse-box`, eats far less of than the
advancing ant. Net the field is a _mild ant tax with a player-owned
off-switch_ — a small player-favorable bump off the L8 ~51 floor when
the player flips the pump, NOT a 9-point rebound to 60.

### No plane-affinity, no card/heal reliance, no ability opt-in — and that is correct

Per §4d I ask for **no** plane-affinity change at L9; the merged-L8
`planeAffinity` (carried from L6: spider combat `wall {1,1}` + ceiling
`{1,1}` + full corner coverage, all ant/queen/support/neutral rows)
carries forward **byte-identical**. It is empirically ~0pp under the
chain-march / fortress doctrine (§4d) and I will not let the arbiter
budget it. Per §4e/§4f I do **not** ask for, and will actively oppose,
any L9 curve movement built on a POST `healingRate`/`defensiveBonus`
occupation economy (engine-inert in `capture-post`, the L7
double-falsification) or on the commander-card economy (inert under the
locked card-host heuristic, the parked-L7 four-falsification
precedent). Per §4g, **L9 does NOT set `abilityParamsAuthoritative` —
default NO**: L9 is `capture-post`, not the recruit-or-die room; it has
no reason to tune hypnotize/recruit params, and an un-opted
ability-param delta is inert and must not be budgeted. The merged-L8
full-power hypnotize and the recruit-race economy carry forward
byte-identical but, being un-opted at L9 and L9 being `capture-post`,
the recruit economy is inert _structure_ here — carried, not a lever,
not relitigated. **L9's descent is carried entirely by the
`hazardField` payload + the binding flip/contest doctrine. Nothing
else.**

### Why this serves the ant fantasy (interest)

L9 is the first room where the player is not just maneuvering the
board — they are _editing_ it. The ant doctrine has always been
out-tempo, out-commit, out-logistics. The Basement makes that literal:
the flooded approach is killing your column one HP a turn, and the
answer is not to slug through it — it is to peel a detachment off the
chain-march, fight to the Sump-Pump, and _shut the water off_, while
the Boiler's hot-zone forces the whole thing off the straight line and
the spider contests the pump because it knows the flood is its best
defense. That is the ant fantasy at its most expressive: the player
_reshapes the battlefield_ to make the assault survivable. The descent
to ~52–54 is the curve continuing — the room is harder than a generic
capture because the field taxes you until you earn the off-switch —
but the difficulty is _visible_ (the water is hurting you, you can see
the pump) and the answer is _structural and in-hand_ (take the pump,
route around the boiler). Not a card economy that can't fire (§4f).
Not a stat the AI ignores (§4d). The lever the locked AIs can be made
to spatially exercise, and only that.

---

## 2. Natural-language rebuttal — answering the spider's L9 brief

The spider will argue (consistent with its identity) that the flooded
approach is _its_ best defensive tool and should price L9 hard toward
spider (it will reach for the §5 ~60 as a ceiling it wants to breach
downward); that the Sump-Pump should be expensive/dangerous to take so
the field stays ON most of the game; and that the Boiler should favor
the entrenched defender. I rebut on three points, and I expect
convergence — the L4-§9 precedent points both of us at the same
binding-doctrine specification.

**First — the flooded field is the spider's tool _only if the
Sump-Pump is genuinely takeable_; an uncontestably-ON field is the
L4-§9 permanent-breach, not a ~52–54 climax.** The spider and I agree
the hazard is the §4-clean lever. Where I correct: the spider's
instinct will be to make the pump so well-defended that the ant AI
"shouldn't bother," i.e., to argue the field stays ON all game as the
honest spider defense. That is _precisely_ the L4-§9 falsification: a
permanently-ON field measured against a floor-marching ant that never
detours is not a ~52–54 contest — it is the +/-39pp-class breach, here
a sub-40% ant wall (`damage:1` permanent over a long march, plus the
Boiler hot-zone, with no off-switch ever taken). The L4-§9 ruling is
binding: the payload alone cannot be transient against the frozen AIs;
the fix is the payload **plus a binding within-loop AI-doctrine** that
makes the pump genuinely flip. The spider gets its tool — the flood is
real and ON until the ant earns the pump — _bounded_ by the ruled
invariant that the ant AI **must** be fielded with a path that detaches
to capture the Sump-Pump, and the spider AI **must** actively contest
it (a genuine detachment cost to its `fuse-box` fortress). The
existence of the contest is the ruled invariant; how hard the pump is
to take is the loop's latitude toward the band. That is "escalation
with a structural answer," the §3.D doctrine, a sixth time.

**Second — the Boiler is a fixed tax already priced into the descent;
do not double-count it as a reason to over-tune the flood.** The spider
will note, correctly, that the Boiler hot-zone favors the entrenched
defender (the spider near `fuse-box` eats less of it than the advancing
ant). Granted — that asymmetry is real and is the honest reason L9 is
harder than a generic capture, the spider's L9 identity delivered by
the environment itself. But that tax is _already priced into the
~52–54_. The spider cannot invoke the Boiler asymmetry _and_ demand a
`damage:2` flood or an uncontestable pump on top — that is the L4-§3.D
"unanswered escalation" and the L8-§3.3 "double-counting the structural
tax as a stackable subsidy," both rejected. The escalation (the Boiler
no-go zone + the flooded approach) lands the dip; the ant's
answer-in-the-same-room is the Sump-Pump it can fight to and flip.
Escalation with an answer, both in L9.

**Third — the binding flip/contest doctrine does not nerf the spider's
flood; it is the only thing that makes a real flood _shippable_.** The
spider will say a doctrinally-mandated ant pump-capture guts the field
to "off by turn 6, irrelevant." It does the opposite. Without the
binding doctrine, the field is _statically_ ON (the L4-§9 permanent
breach, a sub-40% wall that reopens this arbitration under the §7
clause) or _statically_ OFF (if the Level PA puts the pump on the chain
axis and the spider ignores it — the lever never fires, L9 collapses to
the carried L8 ~51 with no shaping). The spider does not want its tool
to be the lever that fails the ship-gate. The binding doctrine —
**ant must contest the pump, spider must defend it** — is precisely
what lets the arbiter ship a _genuinely strong flood_: it is ON and
hurting for the contested early game (the loud spider defense the
spider is owed) AND it flips when the player earns it (so the ant
race remains winnable and the "player shapes the field" beat is real).
That is the L4-§9 "transient contested, not permanent" structure
applied to L9: the flood is _maximized in bite while ON_ and _genuinely
flippable_ — the only structure under which a `capture-post` basement
can carry both a punishing hazard and a winnable, player-shaped ant
objective.

Net: I concede the placement (ruled — Sump-Pump / Boiler dynamic-hazard
control at L9 §2; no plane-affinity §4d; no card/heal reliance §4e/§4f;
no `abilityParamsAuthoritative` opt-in §4g). I ratify the carried
merged-L8 state byte-identical (full-power hypnotize, tier-3 MP bound,
the recruit-race economy as inert `capture-post` structure,
plane-affinity, the carried L4/L5/L6 state). I contest exactly the
_specification shape_ and _pricing_: (a) the **`hazardField` damage
payload is the load-bearing §4-clean lever** and the delta budget must
be spent there — Sump-Pump `damage:1` / `suppressedWhenOwnedBy:"ant"`,
Boiler `damage:2` / always-on — not on cards (§4f), not plane-affinity
(§4d), not heal-economy (§4e), not an un-opted ability param (§4g);
(b) the field is **transient-contested via a BINDING within-loop
AI-doctrine** (ant must detach to capture the Sump-Pump; spider must
contest it) per the L4-§9 precedent — a payload-only spec is the
guaranteed falsification; (c) the band is the **continued descent,
~52–54%**, a small player-favorable bump off the L8 ~51 floor when the
player flips the pump, **below the §5-illustrative 60** because the
L7-parked / L8-re-arbitration record shows the frozen engine does not
durably deliver a late-tier rebound, and a band hit obtained with the
flip/contest doctrine _inert_ is an explicit FAILURE (the L8 hardening),
non-card fallback only.

---

## 3. Structured summary

### Position

The L9 delta vs **merged L8** carries the L8 state forward
**byte-identical** (no plane-affinity change §4d; no card/heal reliance
§4e/§4f; no `abilityParamsAuthoritative` opt-in §4g; the full-power
hypnotize / tier-3 MP bound / recruit-race economy all carried, the
recruit economy inert `capture-post` structure not relitigated) and
adds exactly the **Sump-Pump / Boiler dynamic-hazard damage payload as
the load-bearing §4-clean curve lever**: Sump-Pump POST `hazardField`
`{ tiles: <Level-owned water region>, damage: 1, suppressedWhenOwnedBy:
"ant" }` (ant-owned ⇒ drained/OFF; neutral/spider ⇒ flooded/ON — the
player-flippable lever), Boiler POST `hazardField` `{ tiles:
<Level-owned hot-zone>, damage: 2 }` (always-on fixed denier, no
suppress). Made transient-contested by a **binding within-loop
AI-doctrine** (ant must detach to capture the Sump-Pump; spider must
contest it) per the L4-§9 precedent — the existence of the contest a
ruled invariant, the difficulty the loop's latitude. Within the
Level-owned dim 10×10 basement, water region, POST node placements, and
`south-wall` crawlspace pairing.

### Faction impact

The `hazardField` payload + binding flip/contest doctrine is what makes
L9 a _game_ rather than either a permanent ant tax (the L4-§9
permanent-ON breach, a sub-40% wall) or dead data (the permanent-OFF
breach, the lever never fires). It is the one mechanic the L9 AIs
spatially exercise — the field damages whoever stands on the tiles
every turn, and POST ownership (which both AIs' optimizers read) gates
it. Specified this way the dip is carried by an AI-exercised lever;
specified as a card rebound, a plane-affinity stat, a heal economy, or
an un-opted ability param it is the §4d/§4e/§4f/§4g dead letter that
measures inert and reopens (the L4-§9 / parked-L7 precedent).

### Win-rate prediction

Merged L8 lands ~51% (the L8 RE-ARBITRATION R.3 re-ruled band `[49,53]`,
point ~51%, the merged anchor). **L7 is PARKED — a known curve gap, NOT
interpolated.** L9 **continues the descent with a small player-favorable
bump**: I predict the **~52–54% band, settling ~53%** — slightly above
L8 ~51 (the player _does_ get a real shaping tool: capturing the pump
shuts off the flood), held **below the §5-illustrative 60** because the
L7-parked / L8-re-arbitration record is direct evidence the frozen
engine + locked AI doctrine does **not** durably deliver a late-tier
rebound. Driver: the contested Sump-Pump/Boiler hazard field. With the
flood ON for the contested early game and the Boiler hot-zone fixed,
the field is a **−3 to −5pp ant** tax vs an un-hazarded approach; the
player flipping the pump (the binding doctrine) recovers **+4 to +6pp**
of that, netting a small bump above the L8 ~51 floor. **No
plane-affinity contribution (§4d: ~0pp, not budgeted). No card
contribution (§4f: inert, not budgeted). No heal-economy (§4e). No
ability-param contribution (§4g: un-opted, inert, not budgeted).** Net
~51% + (a small player-favorable shaping bump, bounded by the contested
flood) ≈ **~53%**, the continued descent, monotone-ish below L8 51's
neighborhood and clearly separated above the L10 ~50 finale, L7 a
parked gap NOT interpolated.

### Interest claim

L9 teaches _board-editing under contest_: the flood is killing your
column and the answer is not to slug through it but to fight to the
Sump-Pump and shut it off, while the Boiler forces you off the straight
line and the spider contests the pump because the water is its best
defense. The descent to ~53% is the curve continuing — the room is
harder than a generic capture — but the difficulty is _visible_ (the
water hurts, you can see the pump) and the answer is _structural and
in-hand_ (take the pump, route the boiler). The first room where the
player reshapes the battlefield to make the assault survivable. Not a
card economy that can't fire (§4f), not a stat the AI ignores (§4d).

### Convergence

Placement **conceded** (ruled: Sump-Pump / Boiler dynamic-hazard
control at L9 §2; **no plane-affinity delta §4d; no card/heal-economy
reliance §4e/§4f; no `abilityParamsAuthoritative` opt-in §4g**).
Carried-forward merged-L8 state **ratified byte-identical**. Residuals
the arbiter must fix in data + AI-config: (1) the **`hazardField`
damage payload** (Sump-Pump `damage` + `suppressedWhenOwnedBy:"ant"`,
Boiler `damage` + always-on) as the load-bearing §4-clean lever; (2)
the **binding within-loop flip/contest AI-doctrine** (ant must detach
to capture the Sump-Pump; spider must contest it) per the L4-§9
precedent — the existence of the contest a ruled invariant, NOT a free
knob; (3) the band as the **continued descent ~52–54%**, a small
player-favorable bump off L8 ~51, below the §5-illustrative 60, with a
**measurable hardened ship-gate** (both critics ≥75 AND seeds-1..100 in
band AND the flip/contest doctrine demonstrably exercised — a band hit
via the doctrine inert is an explicit FAILURE, the L8 hardening,
non-card §4f fallback only). Residual is pricing the curve resolves
objectively, anchored on the L4-§9 / parked-L7 reality that a late-tier
rebound to 60 is not durably deliverable.
