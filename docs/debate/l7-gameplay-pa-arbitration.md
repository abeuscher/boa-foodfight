# Gameplay Progression Agent — L7 Living Room Mechanic Delta: ARBITRATION

**Owner:** Gameplay Progression Agent (arbiter, roadmap §6.2).
**Status:** Phase-D L7 deliverable. Document only — no code, no scenario
data. This is the concrete L7 mechanic delta spec the orchestrator
wires into `data/level-7/` (over the Level PA's placeholder) and the
within-scenario loop tunes.
**Inputs:** `docs/debate/l7-ant-advocate.md`,
`docs/debate/l7-spider-advocate.md` (opening + rebuttal each);
`docs/debate/l6-gameplay-pa-arbitration.md` (the **L6 baseline this
deltas FROM** — plane-affinity at the banked spider-combat `wall {1,1}`

- ceiling `{1,1}` + full corner coverage, hypnotize light
  `maxControlTurns:3 / minControlTurns:2`, recruit-as-order, the carried
  Light-Switch `{litOwner:"ant", faction:"ant", attack:2}` + its §9
  AI-doctrine, venom-blast weak data-cap, combo _components_ live but the
  _assembled_ combos roster-gated OUT, plane-switch full corner coverage,
  the L6 Step-Landing `healingRate:3 / defensiveBonus:3` occupation
  economy + the binding spider-sortie doctrine; all carry forward into L7
  **byte-identical**, **not** relitigated; and the **L6 binding precedent:
  a load-bearing lever ships as a data payload PLUS a binding within-loop
  AI-doctrine constraint, with the AI-behavior _existence_ a ruled
  invariant and a measurable ship-gate**);
  `docs/debate/l4-gameplay-pa-arbitration.md` §9 (the **empirical-
  falsification precedent**: a ruled value the frozen AIs do not exercise
  measured ant 99% / +39pp — §7's reopening clause makes a built level
  that misses its band reopen; the ship-gate here MUST be measurable; the
  **uncontested-permanent-buff trap** is the named acceptance risk);
  `docs/debate/l5-gameplay-pa-arbitration.md` (the engine/ceiling
  structure: a licensed curve move has a dominant _engine_ + a budgeted
  _ceiling_, the residual being pricing the curve resolves);
  `docs/mechanic-distribution-plan.md` §2 (the L7 row: **commander
  cards**; Venom Storm online; spider blitz 5% debut; Remote currency
  POST), §3.J (combos → components L4, **assembled combos online L7**),
  §4 (win-curve: L7 predicted **~64%**, "cards rebound; Venom Storm +
  blitz debut as spider counter-pressure"), §5 (boundary case #3:
  **L7 Remote currency POST → bonus gold/turn — split: Level owns the
  node, Gameplay owns the economy payload feeding the Mechanics §1.3
  cards**);
  `docs/level-progression-plan.md` §2 L7 (Living Room geometry: `static`,
  10×10, all 6 planes, the open arena approximated with three small 2×2
  furniture clusters + the L-wedge; 7 POSTs incl. Couch-Cushion +4 def,
  the **Remote currency POST** — bonus gold/turn, Mantel objective; the
  geometry/POST _placements_ are Level-owned, running in parallel —
  **not** designed here), §4a #3 (the Remote split — Gameplay owns the
  economy payload), §4b (engine FROZEN — data/AI-config only, **no new
  engine code, no new schema field**; the §3-dep-5 non-10×10 map-gen
  refactor is DEFERRED, so the "feels big" payoff is a viewer concern,
  not budgeted as a gameplay lever here), §4c (`capture-post` +
  competent-defense → score-path / low-`drama`: expected systemic
  signature; **track cross-level, do NOT chase per-level**), **§4d
  (BINDING — plane-affinity `wall` deltas empirically inert under the
  chain-march/fortress AI doctrine; pick levers the AIs ACTUALLY
  EXERCISE; plane-affinity is a latent identity layer carried from L6
  unchanged, NOT a curve lever, NOT budgeted; for any ruled lever state
  whether the capture-post AIs exercise it and, if it needs a binding
  within-loop AI-doctrine constraint to bite, name it + a measurable
  ship-gate + falsification fallback)**.
  **Bounded by:** §3.1 hard floors, §3.4 cumulative-addition, §5 curve
  (L7 ≈ 64%, a **deliberate REBOUND UP** from L6 ~55% — the curve is
  **non-monotone here by design**; this must read as the player gaining
  favorable tools in an open arena, **not** a monotone step; separated
  above L6 ~55 and above the L8 ~50 continuation), §6.3 ownership
  (Gameplay owns this; the open-arena geometry, the three furniture
  clusters, the 7 POST _placements_ incl. the Remote node _location/owner_
  are the Level PA's, running in parallel — **not** designed here).
  Engine surface frozen (§4b) — this delta is **data-only**: the shipped
  `postSchema` `healingRate` / `defensiveBonus` fields
  (`engine/schemas/map.ts:66–133`; `healingRate` →
  `end-of-turn.ts:181–182` per-turn regen to the party occupying a
  friendly POST; `defensiveBonus` → `turn.ts:86–96` defender bonus), the
  shipped `capture-post` `victoryConditionSchema` member, the shipped
  combo-resolution path (`engine/battle-abilities.ts`,
  `combo-abilities.test.ts`: a combo fires when a same-faction partner
  party of the right composition is adjacent — Chebyshev ≤ 1, same plane
  — to the shooter with the MP), the shipped `abilities.json` combo /
  blitz / Venom-Storm definitions, AI-config via the within-scenario loop
  (§4b-permitted), roster gating via `data/level-7/roster-*.json`, ability
  params via `data/level-7/abilities.json`, card data via
  `data/level-7/` shop/ability data. **No new engine code. No new schema
  field.**

---

## 1. What was actually contested

Placement was **not** in contest and is not re-decided here. The
mechanic-distribution plan §2 / §3.J already ruled the entire L7
component set; the L6 arbitration fixed the state L7 inherits unchanged;
level-progression-plan §4d _directed_ the no-plane-affinity outcome and
§4a #3 / §5 case 3 _assigned_ the Remote economy payload to Gameplay.
Both faction sub-agents conceded every placement explicitly:

- **Commander cards debut at L7** — the single new high-cognitive
  mechanic (mechanic-distribution §2 L7 / §3.4.3), mechanics memo §1.3.
  Both ratified; neither relitigated placement.
- **Assembled-combo roster-gate-IN at L7** — Royal Onslaught (ant) and
  Venom Storm (spider) were roster-gated OUT to exactly L7 by the L4
  arbitration §3.J; L7 turns them ON via roster composition. Both
  ratified; neither relitigated.
- **Spider blitz 5% debut at L7** — mechanic-distribution §2 L7; "light
  ≠ absent," 3-scenario runway to the L10 peak. Both conceded.
- **Remote currency POST → economy payload, Gameplay-owned** —
  level-progression-plan §4a #3 / mechanic-distribution §5 case 3:
  Level owns the node _placement/owner_, Gameplay owns the per-turn
  economy _payload value/direction_. Both conceded the split; the
  **spider conceded the ant-favoring direction up front** (the L4-§3.1
  / L5-§3.2 curve logic — a licensed ant rebound's economy engine
  cannot be spider-favoring or it flattens the rebound).
- **No plane-affinity delta at L7** — _directed_ by level-progression-
  plan §4d (empirically inert; latent identity layer, not a curve
  lever). Both accepted without contest; the spider again conceded "the
  lesson cuts for me too."
- **The entire L6 state** (plane-affinity at the banked spider-combat
  `wall {1,1}` + ceiling `{1,1}` + full corner coverage; Step-Landing
  occupation economy + sortie doctrine; hypnotize light cap;
  recruit-as-order; Light-Switch payload + §9 AI-doctrine; venom-blast
  weak data-cap; combo components live; plane-switch full coverage)
  carries forward **byte-identical** — not relitigated.

The two faction sub-agents converged — the same §6.2-designed profile
the L3/L4/L5/L6 debates produced — onto a **single residual: the
specification shape of the load-bearing levers**, with strong agreement
on structure:

- **Both agree** the engine reality is binding: the engine is frozen
  (§4b), there is **no native `goldPerTurn` / currency field on
  `postSchema`**, gold is a `world.ts` between-scenario world-loop
  concept (`engine/schemas/world.ts:66–67`), the `score.ts` POST bonus
  is L1-bathroom-hardcoded (`SCORED_POST_IDS`) and does not score L7's
  POSTs generically, and **there is no shop after L7** (roadmap §6.5).
  Therefore the Remote "bonus gold per turn" economy payload **must be
  expressed through the only per-turn occupation economy the frozen
  engine actually honors — the shipped `postSchema.healingRate` field**
  (`end-of-turn.ts:181–182`), the exact L6-§3.2 mechanism. **This is a
  convergence the orchestrator MUST honor, not a dispute** — a new
  currency field is an engine change and is forbidden.
- **Both agree** every load-bearing lever (cards, Royal Onslaught, Venom
  Storm, the Remote economy) is the §4d / L4-§9 trap _unless the
  capture-post AIs actually exercise it_: a deck the chain-march ant AI
  never draws from, a combo the rosters never assemble, an occupation
  economy on a node the AIs never contest — each measures ~0pp
  (plane-affinity, four levels) or +39pp (the L4 Light-Switch
  uncontested-permanent-buff). Each needs a **binding within-loop
  AI-doctrine constraint + a measurable ship-gate**, the L6-§3.1.2 /
  L4-§9.3(b) pattern. **This is a convergence, not a dispute** — the
  ant arrived at it from the no-dead-flavor side, the spider from the
  no-dead-payoff side.
- **Both agree** the rebound has an **engine** (the player's toolkit +
  the ant-favoring Remote economy) and a **ceiling** (Venom Storm
  online + blitz 5%), the L5-§3.2 / L6-§3.4 structure. The only
  daylight is pricing (engine vs ceiling pp-split, and "contestable →
  bounded" vs "dominant"), which the curve resolves objectively.

This is exactly the §6.2 convergence the format is designed to produce:
the adversarial exchange collapsed a four-component room to (1) a set
of pre-ruled / §4d-directed / §4a-assigned placements both sides
ratified, and (2) a **single specification-shape question with both
sides independently converged on the answer** (every lever ships as a
data payload PLUS a binding AI-doctrine constraint, with the Remote
economy expressed through the shipped `healingRate` field because the
engine is frozen) — the residual being pricing the curve resolves.

---

## 2. The L7 baseline (what L6 ships, what L7 deltas FROM)

From `data/level-6/*` (verified against source). The L7 delta is
expressed against these:

- **`units.json` `planeAffinity`** — the L6 state, **carried into L7
  byte-identical** (verified `data/level-6/units.json`): spider combat
  (`spider-soldier/scout/spinner/elite` + promoted
  `-veteran-soldier/-knight/-weaver/-stalker`) `floor {-1,0}`,
  `ceiling {1,1}`, `wall {1,1}`; spider-queen `floor {-1,0}`,
  `ceiling {1,1}`, `wall {0,0}`; ant combat `floor {1,1}`,
  `ceiling {-1,0}`, `wall {-1,0}`; ant-queen / support / casters /
  neutrals per L6. **L7 does NOT touch `planeAffinity`** — directed by
  level-progression-plan §4d (empirically inert under the chain-march/
  fortress AI doctrine; a latent identity layer, not a curve lever).
  Stated for the orchestrator's no-touch guarantee; **not** budgeted as
  an L7 win-rate mover.
- **`postSchema`** (`engine/schemas/map.ts:66–133`, shipped) — the
  data-expressible POST fields the Remote economy uses: `healingRate`
  (int ≥0, applied each end-of-turn in `end-of-turn.ts:181–182` to
  every unit of the party occupying a _friendly_ POST), `defensiveBonus`
  (int ≥0, applied to the defender in `turn.ts:86–96` when a party
  occupies a friendly POST). **There is NO `goldPerTurn` / currency
  field; none will be added (engine frozen, §4b).** `healingRate` is
  the only per-turn occupation economy the frozen engine honors — the
  L6-§3.2 mechanism, re-used.
- **`victoryCondition`** — `{ kind: "capture-post", postId: "mantel" }`
  (shipped member; L7 is `capture-post` per level-progression-plan §1).
  The `capture-post` round-19 score path (`engine/score.ts`) is
  L1-bathroom-POST-hardcoded and does **not** score L7's POSTs
  generically — another reason the Remote economy must be an attrition
  lever (`healingRate`, which the engine honors), not a score-feed
  (which the frozen engine does not implement for L7). The
  level-progression-plan §4c low-`drama` score-grind signature is
  expected here — tracked cross-level, **not** chased (§4c).
- **`abilities.json`** — `royal-onslaught` (`componentAbilities:
[magic-arrow, jelly-apply]`, `mpCostBySource {magic-arrow:3,
jelly-apply:1}`), `venom-storm` (`componentAbilities: [venom-blast,
web-tangle]`, `mpCostBySource {venom-blast:2, web-tangle:2}`), the
  combo components, and the spider blitz/initiative ability are all
  **already present in the data L1→L6, byte-identical**. The combo
  resolver (`engine/battle-abilities.ts`) fires a combo when a
  same-faction partner party of the right composition is adjacent
  (Chebyshev ≤ 1, same plane) to the shooter with the MP. They have
  been roster-gated OUT (no L1–L6 roster composes the adjacent
  partner-pair). **The L7 delta is the rosters being composed so the
  combos assemble — data-only, no ability/engine change.**
- **L6 carried state** — Step-Landing occupation economy
  (`healingRate:3 / defensiveBonus:3` + the binding spider-sortie
  doctrine), hypnotize light cap, recruit-as-order, the Light-Switch
  payload + §9 AI-doctrine, venom-blast weak data-cap, plane-switch
  full coverage: all carry forward byte-identical, **not** relitigated.

The honest framing of the L7 delta: not "introduce cards / combos / the
currency POST" (the combo definitions are already shipped; the
`healingRate` field is already shipped and engine-honored) — it is
**"in the first open arena, the player's full combined-arms toolkit
finally assembles: a commander-card deck the ant AI spends Remote-fed
currency on, the Royal Onslaught combo the open ground lets the ant
assemble, and an ant-favoring Remote occupation economy that out-attrites
in the open — while the spider's Venom Storm assembles too and its
blitz debuts, the budgeted counter-pressure that keeps the rebound
honest."** One room of change in _function_, expressed entirely through
existing data structures and within-loop AI-config. The single new
high-cognitive mechanic is the **commander-card deck** (the assembled
combos are a roster-composition completion of already-shipped abilities
— not a new high-cognitive mechanic per §3.4.3 / the L4-§3.J ruling;
the Remote economy is the shipped `healingRate` field re-used; blitz is
a debut of an already-shipped ability).

---

## 3. RULING

This is decided on **win-curve shape** (the §3.4.4 binding arbiter),
with the §5 "interesting > fair" license consulted and found to
**reinforce**, not override, the curve answer (both factions' interest
arguments are credible and aligned with the curve — the room is the
player gaining its combined-arms toolkit against a defender that
escalates to meet it). The curve intent is explicit and binding: **L7 ≈
64%, a deliberate REBOUND UP from L6 ~55%. The curve is non-monotone
here by design** (§5: "the curve doesn't need to be monotonic; an
occasional surprising spike … is a good thing"; mechanic-distribution
§4: "L7 ~64% — cards rebound; Venom Storm + blitz debut as spider
counter-pressure"; the L6 arbitration itself fixed L7 as "separated
above ~64"). The binding monotone segment was L5 → L6 (held, L6
arbitration §5). L6 → L7 is the **licensed non-monotone recovery**, and
it **must read as the player gaining favorable tools in an open arena,
not a monotone step** — separated above L6 ~55 and above the L8 ~50
continuation.

### 3.1 The Remote currency POST economy payload — RULING: a per-turn `healingRate`-class occupation economy on the Remote POST, ANT-favoring, expressed through the shipped `healingRate` field (NO new currency field — engine frozen); paired with a BINDING within-loop AI-doctrine constraint making the spider AI contest the Remote so the economy is bounded; the engine of the rebound

**RULING: the Remote currency POST economy payload is specified as
`healingRate: 4` + `defensiveBonus: 2` on the Remote POST, with the
Remote's default `owner: "ant"` (Level-owned placement/owner — Gameplay
_recommends_ the ant default; see §3.1(c)), paired with a BINDING
within-loop AI-doctrine constraint that makes the spider AI _contest
the Remote_ (sortie to take it) so its ownership genuinely flips and
the ant economy is _earned each turn it holds it_, not a free all-game
tick. It is the dominant engine of the licensed ~64% rebound (+6 to
+8pp ant vs a neutral/uncontested-permanent counterfactual). A brand-new
`goldPerTurn` / currency POST field is REJECTED (engine frozen, §4b — a
new field is an engine change). An _uncontested-permanent_ ant Remote
is REJECTED on the exact L4-§9 falsification structure (the +39pp
uncontested-permanent-buff trap). Both factions independently converged
on the `healingRate`-class form and the ant-favoring direction; the
curve makes the pricing objective.**

This is the L6-§3.2 occupation-economy logic, re-applied with the §4a
#3 economy-payload assignment and the §4d / L4-§9 lesson binding. The
brief's own engine reality is decisive and both factions ratified it:
**there is no native currency field on `postSchema`**, gold is a
between-scenario `world.ts` concept, the score path is L1-hardcoded and
does not score L7's POSTs, and there is no shop after L7. The only
per-turn occupation economy the _frozen_ engine honors is
`postSchema.healingRate` (`end-of-turn.ts:181–182`). The "bonus gold
per turn that feeds the card economy" intent (level-progression-plan §2
L7 §6; mechanic-distribution §5 case 3) is therefore realized
**in-scenario as a per-turn attrition/tempo economy** — holding the
Remote regenerates the holder's occupying party each turn, the
data-expressible analogue of "currency paying off here": the side that
holds the Remote out-attrites and out-tempos in the open arena, which
_is_ the rebound's economy when there is no shop to spend literal gold.
This is §4d-robust by construction — regeneration is a first-order
input to any attrition optimizer (the AIs read it), unlike a `wall`
gradient the chain-march/fortress doctrine never enters.

The §4d-compliant form has three parts, all ruled:

1. **The data payload (Gameplay-owned, ruled; §4a gives concrete
   numbers):** the Remote POST carries `healingRate: 4` (per-turn
   regeneration to the occupying party each end-of-turn) + a modest
   `defensiveBonus: 2` (so the Remote is _worth contesting_ — a
   bidirectional fight, not a one-way ant tick). `healingRate: 4` is
   set _above_ the L6 Step-Landings' `3` because the Remote is a
   _single_ node (not five) and is the rebound's _engine_ — it must
   register as the dominant +pp, not a sub-perceptual trickle (the
   L5-precedent "must register" reasoning, applied to the engine
   side). It is **symmetric in data** (whoever holds the Remote gets
   it) but **ant-favoring in consequence** because the Remote's default
   `owner` is `"ant"` (§3.1(c)) and the L7 ant roster + AI is built to
   hold it through the assault while the spider must _sortie_ to
   contest it (§3.1.2).

2. **The BINDING within-loop AI-doctrine constraint (load-bearing,
   §4b-permitted — data/AI-expressible, engine frozen; the L6-§3.1.2 /
   L4-§9.3(b) pattern):** the orchestrator's within-scenario loop
   **MUST** field an L7 spider AI whose decision function _reads the
   Remote's per-turn economy_ and **sorties to contest the Remote node**
   (a detachment cost to its capture-post defense) so the Remote's
   ownership genuinely flips/contests across a seed-robust majority of
   games — exactly the L6 Step-Landing sortie doctrine, applied to the
   Remote. The spider must not concede the Remote for free (the
   L4-§9 uncontested-permanent trap) and must not abandon its mantel
   defense entirely (a real garrison-split decision — the §3.D
   tactical-choice structure). The **existence of the contest** (the
   spider provably sorties for the Remote in a seed-robust majority) is
   a **ruled invariant**; the _aggression threshold / detachment size /
   contest timing_ is the loop's tuning latitude toward the §5 band.
   This is _why_ the Remote economy is the **bounded** engine (the
   spider's contest shaves it from an unbounded uncontested-permanent
   +39pp-class subsidy down to the controlled +6 to +8pp): the ant
   _earns_ the economy each turn it successfully holds the Remote
   against the sortie, exactly as the L4-§9.3(b) correction made the
   Light-Switch buff _earned and transient_ instead of permanent.

3. **Capture-post-AI exercise statement (required by §4d/the brief):**
   _Does the capture-post AI exercise this lever?_ — **Yes, by
   construction, once 3.1.2 binds.** `healingRate` is read by both AIs'
   attrition optimizers (it is a first-order input — verified
   engine-honored at `end-of-turn.ts:181–182`, the same path the L6
   sortie doctrine relies on). Unlike the L4 Light-Switch (a north-wall
   POST the floor chain-march ant AI had _no code path_ to ever
   capture — the §9 root cause) and unlike plane-affinity (a `wall`
   gradient the floor/ceiling-fighting AIs never enter, §4d), the
   Remote is a _floor_ POST on the open arena both AIs traverse, and
   regeneration is intrinsic to the attrition arithmetic the
   capture-post AIs already optimize. **It still needs the 3.1.2
   binding constraint** so the spider _contests_ it (otherwise it is
   the uncontested-permanent L4-§9 trap, ant ~70%+); the binding makes
   it bounded. Named ship-gate + falsification fallback: §7.

**(c) Level-PA recommendation (Level-owned, not ruled — §4a #3 /
§5-case-3 split):** the Remote node _location/owner_ is Level-owned.
Gameplay **recommends** the Remote default `owner: "ant"` and a
_floor-plane, ant-approach-side_ placement so the chain-march ant AI
_naturally_ holds it (the L4-§9.3(c)-style recommendation: a lever the
shipped AI can actually reach without a bespoke detachment). If the
Level PA places it elsewhere/neutral, the §3.1.2 constraint must add an
ant-side "hold the Remote" doctrine symmetric to the spider contest;
the §3.1(1) payload is `owner`-relative and value-stable under any such
Level move (the L4-§9.3(c) stability property).

**Win-curve justification (§5):** a neutral or uncontested-permanent
Remote is _not_ the rebound's engine — neutral gives ~0pp (the lever
the AIs don't fight over), uncontested-permanent gives the +39pp-class
L4-§9 over-shoot (L7 to ~70%+, erasing the L6→L7→L8 separation). A
_contested, ant-held_ `healingRate:4` Remote is the engine: **+6 to
+8pp ant** vs the neutral counterfactual, the bulk of the L6 ~55 → L7
~64 rebound, _bounded_ by the spider sortie so it lands the controlled
~64 rather than over-shooting toward L5's 66. The ant's "the Remote is
the rebound engine" is **upheld** (it is the dominant single driver);
the spider's "ant-favoring conceded, but it must be _contestable_ and
therefore _bounded_, not the uncontested-permanent trap" is **upheld
and is the binding specification** (the L4-§9 trap is rejected). Both
framings are the _same ruling_ viewed from two sides; the curve
(§3.4.4) makes it objective. **Interesting-vs-fair:** interest
reinforces — a Remote the spider _fights you for_ is a genuine
recurring decision (hold the economy vs press the mantel), the §3.D /
L4-§3.2 structure; an uncontested free tick is the boring-but-balanced
failure §6.2 names.

### 3.2 Commander cards — RULING: a data/shop-expressible deck (the single new high-cognitive mechanic), funded in-scenario by the Remote economy proxy, paired with a BINDING within-loop AI-doctrine constraint making the ant AI PLAY cards; a dead deck is REJECTED on §4d / the L4-§9 precedent

**RULING: commander cards debut at L7 as a data-expressible deck
(`data/level-7/` shop/ability data — the existing shop/ability data
path, NO new engine field, §4b), as the single new high-cognitive
mechanic (§3.4.3). Because there is no shop after L7 (roadmap §6.5),
the deck is funded _in-scenario_ by the Remote occupation economy
(§3.1) as its data-expressible "currency-paying-off" proxy. It is
paired with a BINDING within-loop AI-doctrine constraint: the L7 ant AI
MUST play cards from the deck during the assault (the L6-§3.1.2 /
L4-§9.3(b) pattern). A deck the chain-march ant AI never draws from is
REJECTED — it is the §4d / L4-§9 trap (a ruled mechanic the frozen AIs
never exercise → ~0pp, the rebound fails to land). It is part of the
rebound's engine alongside the Remote economy and Royal Onslaught.**

This is the §4d lesson applied to the headline new mechanic. Mechanics
memo §1.3 frames cards as a gold-sink deck of one-shot tactical effects.
The schema has no card field and the engine is frozen (§4b) — so cards
are expressed through the existing `data/level-7/` shop/ability data
path (the same data path the world-loop shop already uses;
`data/level-6/shop.json` exists and is data-only). The roadmap §6.5
_no-shop-after-L7_ fact is load-bearing and both factions surfaced it:
the card economy at L7 is _not_ a rest-stop purchase — it is fed
_in-scenario_ by the Remote occupation economy (§3.1), which is _why_
the Level PA put a currency node in this specific room. The deck
contents and per-card effects are loop-tunable data; the **ruled
invariants** are: (a) cards are _data/shop-expressible_, no engine
field; (b) the ant AI _provably plays cards in a seed-robust majority
of games_ (the binding §4d-compliant constraint — without it, cards
are the L4-§9 dead lever); (c) cards are part of the rebound _engine_,
not the ceiling. The aggression/spend-threshold and per-card magnitudes
are the loop's tuning latitude toward the §5 band.

**Win-curve justification (§5):** a played card deck (the ant AI spends
the Remote-fed economy on tactical one-shots in the open arena) is part
of the rebound engine — bundled with the Remote economy and Royal
Onslaught at **+6 to +8pp ant combined incremental** over the
no-toolkit counterfactual (priced jointly with §3.1/§3.3 in §5 so the
levers are not triple-counted). A _dead_ deck is ~0pp (the §4d fate)
and L7 fails to rebound — the named falsification risk (§7).
**Interesting-vs-fair:** cards are the §5 "interesting" payoff of the
open arena (the player's first real tactical-option economy); a dead
deck is the boring-but-balanced failure §6.2 names — the same failure
shape as a buffed-but-unexercised plane-affinity.

### 3.3 Assembled-combo roster-gate-IN — RULING: a concrete L7 roster-composition change turning Royal Onslaught (ant) AND Venom Storm (spider) ON, paired with a BINDING within-loop AI-doctrine constraint making the AIs ASSEMBLE the combos in the open arena; bare roster data with no AI mandate is REJECTED (§4d — the open arena makes the dead-letter fate MORE likely)

**RULING: the L7 rosters (`data/level-7/roster-ants.json`,
`data/level-7/roster-spiders.json`) are composed so the combo
partner-pairs are *adjacent-deployable*: an ant **mage party + an ant
worker party** placed/structured to fight adjacent (Royal Onslaught,
`componentAbilities:[magic-arrow, jelly-apply]`), and a spider
**spinner party + a spider queen/spinner party** placed/structured to
fight adjacent (Venom Storm, `componentAbilities:[venom-blast,
web-tangle]`). NO ability-definition change, NO engine change (the
combo resolver is shipped, `engine/battle-abilities.ts`). This is
paired with a BINDING within-loop AI-doctrine constraint: the L7 ant AI
MUST keep its mage+worker parties adjacent to assemble Royal Onslaught,
and the L7 spider AI MUST keep its spinner+queen parties adjacent to
assemble Venom Storm, in a seed-robust majority of games (the
L6-§3.1.2 / L4-§9.3(b) pattern). Bare roster data with no AI mandate is
REJECTED — the combo resolver requires Chebyshev-≤1 same-plane
adjacency *maintained through a battle*, and the OPEN arena scatters
parties, so without the binding constraint both combos measure ~0pp
(the §4d / L4-§9 dead-letter fate, MORE likely here than in a corridor,
not less — the spider's correct point, upheld). Royal Onslaught is part
of the rebound's *engine*; Venom Storm online is part of the rebound's
*ceiling*.**

This is the L4-§3.J ruling's payoff, paid here. The combo _components_
went live at L4; the _assembled_ combos were roster-gated OUT to
exactly L7 _because L7 is the first open arena where the partner-pair
adjacency is sustainable_ (the pipe/corridor/terraces all denied it;
the open Living Room enables it — the §3.D "the room built for the
payoff" structure, the reason §3.J banked it to exactly here). The
verified engine mechanism (`combo-abilities.test.ts`): a combo fires
only when a same-faction partner party of the right composition is
within Chebyshev ≤ 1 on the same plane _with the MP_. "Turning the
combo ON" is therefore _purely roster composition + the AI maintaining
the adjacency_ — the cleanest possible §4b-compliant delta, and the
exact §4d structure: the roster gate is meaningless unless the AIs
_exercise_ it. The **ruled invariants**: (a) the rosters are composed
for partner-pair adjacency (data-only); (b) the AIs _provably assemble_
their combo in a seed-robust majority (the binding constraint); (c)
Royal Onslaught is engine, Venom Storm is ceiling. The party
compositions, spacing, and combo cadence are the loop's tuning latitude
toward the §5 band.

**Win-curve justification (§5):** Royal Onslaught assembled by the ant
in the open is part of the rebound _engine_ (jointly priced with
§3.1/§3.2 at +6 to +8pp combined, §5). Venom Storm online for the
spider is the rebound _ceiling_: it must _register_ (the L5-precedent
"must register, not tuned to ~0" — the spider's upheld ask), priced
with the blitz debut at **−3 to −5pp ant** (§3.4), the budgeted counter
that holds the rebound at the controlled ~64 instead of over-shooting
toward L5's 66. The spider's "Venom Storm must carry its own binding
AI-doctrine constraint identical in kind to the ant's, not a flavor
note" is **upheld** — symmetric to the ant's. **Interesting-vs-fair:**
the open arena assembling _both_ combined-arms answers in the same room
is the §3.D escalation-with-an-answer doctrine, applied a fifth time;
a one-sided ant combo with the spider's owed Venom Storm dead in
unexercised roster data is the boring-but-balanced failure inverted
onto the spider's L7 payoff (the spider's correct point, upheld).

### 3.4 Spider blitz 5% debut + Venom Storm online — the rebound's ceiling — RULING: light, but a real measurable 5% ("light ≠ absent"); registers as −3 to −5pp; the budgeted ceiling, not the engine

**RULING: spider blitz debuts at a real, measurable 5% initiative-burst
probability (data param in `data/level-7/abilities.json` — "light ≠
absent," the L3-weak / L4-venom-blast-weak / L5-hypnotize-light
doctrine applied symmetrically), 3-scenario runway to the L10 peak
(mechanic-distribution §2 L10 — stated, not L7-overreach). Combined
with Venom Storm online (§3.3), it is the rebound's budgeted CEILING:
−3 to −5pp ant, which MUST register (the L5-precedent — not tuned to
~0), holding the licensed rebound at the controlled ~64 rather than
over-shooting toward L5's 66. It is the ceiling, NOT the engine — the
spider's identity at L7 is the open-arena escalation that meets the
player's toolkit, not the dominant driver of the curve.**

This is the L5-§3.2 / L6-§3.4 engine/ceiling structure, applied a
fourth time, inverted to the rebound side (as at L5). The blitz `5%`
is loop-tunable inside the band but the _existence of a real
measurable 5%_ (not tuned to ~0) is a ruled invariant — the symmetric
application of the spider's own "light/weak ≠ absent" through-line the
arbiter has upheld for the spider's tools since L3. Venom Storm online
(§3.3) carries its own binding AI-doctrine constraint (the spider AI
assembles it) so it _is_ exercised — the §4d compliance the spider
correctly demanded for its own payoff.

**Win-curve justification (§5):** the ceiling (Venom Storm online +
blitz 5%) is −3 to −5pp ant; budgeted _against_ the +6 to +8pp engine
(§3.1/§3.2/§3.3) so the net is the controlled ~64, separated above L6
~55 and above L8 ~50. Had the ceiling been tuned to ~0 (the dead-payoff
fate the spider fought), L7 would land ~68%+, crowding the L7→L8
separation and erasing the spider's L7 identity. Had the engine been
uncontested-permanent (§3.1 trap rejected), L7 would land ~70%+.
**Interesting-vs-fair:** the registering ceiling is _the reason L7's
rebound is contested and earned_, not handed — the §6.2 good closure;
both factions agree.

### 3.5 No plane-affinity delta at L7 — RULING: EXPLICITLY CONFIRMED, carried from L6 byte-identical, NOT budgeted (§4d-directed)

**RULING: NO plane-affinity delta is applied at L7. The L6
`planeAffinity` table (spider combat `wall {1,1}` + ceiling `{1,1}` +
full corner coverage; all ant/queen/support/neutral rows) carries
forward into `data/level-7/units.json` BYTE-IDENTICAL. This is the
binding level-progression-plan §4d direction, not an arbiter choice:
plane-affinity `wall` deltas are empirically inert under the
chain-march/fortress AI doctrine (measured ~0pp across L3/L4/L5/L6), a
latent identity layer that paints the spiders as wall-climbers, NOT a
curve lever. It is NOT budgeted as an L7 win-rate mover. The L7 ~9pp
rebound is carried ENTIRELY by levers the AIs actually exercise: the
contested ant-favoring Remote occupation economy (§3.1, the engine
core), the AI-played commander-card deck (§3.2, engine), the
AI-assembled Royal Onslaught (§3.3, engine), the Level-owned open
geometry, with the AI-assembled Venom Storm + measurable blitz (§3.3/
§3.4, the ceiling).**

Both factions accepted this without contest (the spider explicitly:
"the lesson cuts for me too — I will not ask the arbiter to budget it
as the L7 ceiling and watch it measure ~0pp like L5's did"). The
arbiter records it as a binding no-touch guarantee for the orchestrator
and as the explicit §4d-compliance confirmation the brief requires:
**the L7 delta budget is spent on the AI-EXERCISED Remote economy /
cards / combos levers, NOT on plane-affinity.**

### 3.6 Where each faction is upheld

Symmetric with the L3/L4/L5/L6 arbitrations (every concession honored,
no over-reach granted, the convergence ratified, neither faction denied
its identity):

- **Ant upheld:** the Remote economy is ratified as the **dominant
  rebound engine** (§3.1, ant-favoring, +6 to +8pp jointly with
  cards/Royal-Onslaught — the ant's "the Remote is the rebound engine,
  ant-favoring by the curve logic" point, upheld); commander cards are
  the single new high-cognitive mechanic and are AI-played (§3.2 — the
  ant's "must be AI-exercised, not dead deck-flavor" point, the binding
  §4d reading, **upheld as the decisive specification frame**); Royal
  Onslaught assembles in the open (§3.3); the carried L6 state is
  byte-identical (no ant tool weakened); no plane-affinity budget waste
  (§4d). No over-reach granted: the Remote is _contestable/bounded_
  (not the uncontested-permanent trap), the rebound is the controlled
  ~64 (not a runaway peak).
- **Spider upheld:** Venom Storm online is ratified as a _registering_
  ceiling carrying its own binding AI-doctrine constraint identical in
  kind to the ant's (§3.3/§3.4 — the spider's "must register, not the
  §4d dead letter on my owed payoff" point, upheld symmetrically to the
  L5 plane-affinity "must register" ruling); blitz debuts as a real
  measurable 5% ("light ≠ absent," the spider's own through-line,
  upheld); the Remote is **contestable** (the spider AI sorties for it
  — the spider's "ant-favoring conceded, but it must be contestable and
  bounded, not the uncontested-permanent trap" point, **upheld and is
  the binding specification**). No over-reach granted: no
  spider-favoring Remote direction (rejected on the curve — the ant
  wins direction), no fat unconditional Venom Storm (it is the ceiling,
  not the engine), no plane-affinity inflation (§4d, none).

Neither faction is denied its identity — the player's combined-arms
toolkit assembles in the open arena (cards, Royal Onslaught, the Remote
economy), and the spider's combined-arms answer assembles in the same
room (Venom Storm, the blitz debut, the Remote contest). They are
sequenced together in one room by design (§3.J banked the assembled
combos to _exactly_ L7 _because_ the open arena is the first room where
the partner-pair adjacency is sustainable): escalation and answer, the
§3.D / L4-§3.2 / L5-§3.2 / L6-§3.6 doctrine, applied a fifth time with
the §4d lesson now binding.

---

## 4. The L7 mechanic delta — concrete, data-level spec

Implementable directly against shipped schemas and the shipped
combo-resolution path; **no engine code, no new schema field** (§4b).
The L7 data set = the L6 data set with **only the changes below**.
Every unmentioned field, template, and row is byte-identical to L6. The
orchestrator wires this into `data/level-7/`.

### 4a. The Remote currency POST economy payload — the headline deliverable (Gameplay-owned, ruled §3.1; §4a #3 / §5-case-3 split)

Wired into `data/level-7/map.json` over the Level-PA placeholder's
Remote POST. The Level PA owns the Remote POST node (location; default
`owner` — Gameplay _recommends_ `owner: "ant"`, floor-plane,
ant-approach-side, §3.1(c); the open-arena geometry — §6.3, Level-owned,
**not** designed here). Gameplay (this arbitration) owns and hereby
specifies the per-turn economy payload, as the shipped `postSchema`
fields (NO new currency field — engine frozen, §4b):

```
// the Remote POST, L7 economy payload vs the Level-PA placeholder:
"healingRate":    4,
"defensiveBonus": 2
```

**Exact engine semantics (verified, no new code):**

- `healingRate: 4` — `end-of-turn.ts:181–182`: every unit of the party
  occupying the **friendly** (own-owned) Remote regenerates 4/turn
  (capped at template max HP). This is the _per-turn occupation
  economy_ — the data-expressible "currency paying off here" (no shop
  after L7, roadmap §6.5; no native currency field, engine frozen): the
  side holding the Remote out-attrites/out-tempos in the open arena.
  `4` > the L6 Step-Landings' `3` because the Remote is a _single_
  node and is the rebound _engine_ — it must register as the dominant
  +pp (the L5-precedent "must register" reasoning, engine side);
  loop-tunable inside the §5 band.
- `defensiveBonus: 2` — `turn.ts:86–96`: a party defending the friendly
  Remote gives the attacker `+2`. Makes the Remote _worth contesting_
  bidirectionally — what forces the spider to _commit_ to a sortie
  (§3.1.2), not poke.
- **Direction: ant-favoring** — by the Remote's default `owner: "ant"`
  (§3.1(c), Level-owned-but-recommended) + the L7 ant roster/AI built
  to hold it; **bounded** by the §3.1.2 spider-contest doctrine (the
  ant _earns_ it each turn, not a free all-game tick — the L4-§9.3(b)
  earned/transient correction applied to the Remote).
- **`owner`-relative & value-stable** under any Level move of the
  Remote node (the L4-§9.3(c) stability property): the `4/2` payload is
  ruled regardless of the Level PA's final node location/owner.

**Binding within-loop AI-doctrine constraint (ruled §3.1.2,
load-bearing, §4b-permitted — data/AI-config, engine frozen):** the
orchestrator's within-scenario loop **MUST** field an L7 spider AI
whose decision function reads the Remote's per-turn economy and
**sorties to contest the Remote node** (a detachment cost to its mantel
capture-post defense) so the Remote's ownership genuinely contests
across a seed-robust majority of games. The **existence of the
contest** is a **ruled invariant**; the aggression threshold /
detachment size / contest timing is the loop's tuning latitude toward
the §5 band. If no fielded spider-AI configuration makes the Remote
genuinely contested within the band, the orchestrator escalates per
§3.1(c) (a Level-PA Remote node placement/owner recommendation) — the
L4-§9.3(c) escalation path. The §4a payload is placement-relative and
stable under any such Level move.

### 4b. Commander cards — data/shop-expressible deck, AI-played (ruled §3.2)

Data-only via `data/level-7/` shop/ability data (the existing data path
`data/level-6/shop.json` already uses; **no new engine field**, §4b).
The single new high-cognitive mechanic (§3.4.3). Funded in-scenario by
the Remote occupation economy (§3.1 — no shop after L7, roadmap §6.5).
**Binding within-loop AI-doctrine constraint (ruled §3.2):** the L7 ant
AI **MUST** play cards from the deck during the assault in a seed-robust
majority of games (the L6-§3.1.2 / L4-§9.3(b) pattern). The **existence
of card-play** is a **ruled invariant**; the deck contents, per-card
magnitudes, and the AI's spend threshold are the loop's tuning latitude
toward the §5 band. A dead deck (the ant AI never plays cards) is the
§4d / L4-§9 falsification — the named ship-gate risk (§7). Both factions
get a deck (the spider's "spider gets a deck too" — upheld as data
parity; the spider deck is part of the ceiling, the ant deck the
engine).

### 4c. Assembled-combo roster-gate-IN — roster composition + AI-assembly mandate (ruled §3.3)

Data-only via `data/level-7/roster-ants.json` /
`data/level-7/roster-spiders.json`; **no ability-definition change, no
engine change** (the combo resolver is shipped,
`engine/battle-abilities.ts`). The L7 delta is roster composition:

- **Royal Onslaught ON (ant — engine):** the L7 ant roster is composed
  so an **ant mage party** and an **ant worker party** are
  _adjacent-deployable_ (Chebyshev ≤ 1, same plane, with the MP —
  `componentAbilities:[magic-arrow, jelly-apply]`,
  `mpCostBySource {magic-arrow:3, jelly-apply:1}`). The L6 ant roster
  has `vanguard-bravo` (mage) + `pathfinders` (mage) parties but no
  dedicated _worker_ party adjacent — the L7 delta adds/recomposes an
  ant worker-bearing party deployed adjacent to a mage party so the
  combo assembles in the open arena.
- **Venom Storm ON (spider — ceiling):** the L7 spider roster is
  composed so a **spider spinner party** and a **spider queen or second
  spinner party** are _adjacent-deployable_ (`componentAbilities:
[venom-blast, web-tangle]`, `mpCostBySource {venom-blast:2,
web-tangle:2}`). The L6 spider roster has `end-guard` (queen) +
  `north-picket`/`south-picket` (spinners) — the L7 delta composes/
  deploys a spinner party adjacent to the queen party so Venom Storm
  assembles.

**Binding within-loop AI-doctrine constraint (ruled §3.3):** the L7 ant
AI **MUST** keep its mage+worker parties adjacent to assemble Royal
Onslaught, and the L7 spider AI **MUST** keep its spinner+queen parties
adjacent to assemble Venom Storm, each in a seed-robust majority of
games (the open arena scatters parties — the L6-§3.1.2 / L4-§9.3(b)
pattern is _more_ necessary here, not less). The **existence of combo
assembly** (each combo provably fires in a seed-robust majority) is a
**ruled invariant**; the party compositions/spacing/cadence are the
loop's tuning latitude. Bare roster data with no AI mandate is the §4d
dead-letter (~0pp) — the named ship-gate risk (§7).

### 4d. Spider blitz 5% debut — data-capped, must register (ruled §3.4)

Data-only via `data/level-7/abilities.json`. The spider blitz/initiative
ability debuts at a **real, measurable 5%** initiative-burst probability
(the data param; "light ≠ absent" — the L3-weak / L4-venom-blast-weak /
L5-hypnotize-light doctrine applied symmetrically; not tuned to ~0).
Roster-gated to the existing spider combat carriers (no new carrier).
**Forward consistency:** blitz ramps to peak at L10 (mechanic-
distribution §2 L10 — the 3-scenario runway; stated, not L7 work). Part
of the rebound _ceiling_ (§3.4) with Venom Storm online (§4c).

### 4e. No plane-affinity delta — carried from L6 BYTE-IDENTICAL (ruled §3.5, §4d-directed)

`data/level-7/units.json` `planeAffinity` = `data/level-6/units.json`
`planeAffinity`, **byte-identical** (spider combat `wall {1,1}` +
ceiling `{1,1}` + full corner coverage; all ant/queen/support/neutral
rows). **No plane-affinity delta is applied at L7.** This is the
binding level-progression-plan §4d direction (empirically inert under
the chain-march/fortress AI doctrine; latent identity layer, not a
curve lever; **not budgeted as an L7 win-rate mover**). The orchestrator
no-touch guarantee; the explicit §4d-compliance confirmation.

### 4f. The L6 state — carried forward UNCHANGED

`data/level-7/units.json` (the full `planeAffinity` table),
`data/level-7/abilities.json` (combo definitions byte-identical;
venom-blast weak data-cap; hypnotize light `maxControlTurns:3 /
minControlTurns:2`; recruit-as-order; plane-switch / corner-cross), the
L6 Step-Landing occupation economy + sortie doctrine (no Step-Landings
in the Living Room — L7 is `capture-post`; the ability/affinity state
nonetheless carries in the unit/ability data unchanged), the carried
Light-Switch payload + its §9 AI-doctrine, plane-switch full coverage =
`data/level-6/*`, **byte-identical**, **not** relitigated.

**One-sentence statement of the L7 delta (the §3.4.3 "name what's new"
test):** _"In the first open room your full kit finally comes together —
play your commander cards funded by holding the Remote, and pair your
mage and workers for the big combined strike — while the spiders weave
their own venom-storm and start striking first, and you have to fight
them for the Remote every turn you want its economy."_ One room of
change; the single new high-cognitive mechanic is the commander-card
deck.

---

## 5. Win-rate prediction for L7

**Predicted L7 ant win rate: ~64%** (band ~62–66%, within the §5 loose
tolerance and the mechanic-distribution plan §4 "~64% — cards rebound;
Venom Storm + blitz debut as spider counter-pressure" requirement).
**This is a deliberate REBOUND UP from L6 ~55% — a non-monotone step,
NOT a descent — separated above L6 and above the L8 ~50 continuation.**

Derivation, anchored to the L6 arbitration's ruled landing (L6 ~55%,
band 53–57, the resumed-descent low, itself anchored to the measured-L5
~66 and measured-L4 ~60):

1. **Start: L6 ~55% ant** (the L6 ruled resumed-descent landing — the
   L7 step is measured _up_ from ~55%). Non-monotone recovery is
   measured against ~55%.
2. **The rebound ENGINE (the contested ant-favoring Remote economy +
   AI-played commander cards + AI-assembled Royal Onslaught, jointly):
   +10 to +13pp ant.** The dominant L7 driver. In the first open arena
   the ant holds the `healingRate:4` Remote (out-attriting/out-tempoing
   each turn it earns it against the spider sortie), plays its
   Remote-funded card deck, and assembles Royal Onslaught (mage+worker
   adjacent — the open ground the pipe/corridor/terraces denied). These
   are jointly priced (not triple-counted): the _combined incremental_
   over the no-toolkit counterfactual is +10 to +13pp — the bulk of the
   L6 ~55 → L7 ~64 movement, the mechanism of the licensed rebound (the
   player gained its kit at the room built for it, not a stat re-tune).
   **Bounded** by the §3.1.2 spider-Remote-contest doctrine (the ant
   earns the economy, not the uncontested-permanent L4-§9 +39pp trap).
   §4d-robust: `healingRate` is a first-order attrition-optimizer input
   the AIs read (the L6-§3.2 mechanism), cards/combos carry binding
   AI-play/assembly mandates — not a `wall` gradient the AIs ignore.
3. **The rebound CEILING (Venom Storm online + spider blitz 5% debut):
   −3 to −5pp ant.** The spider's open-arena counter-pressure. Venom
   Storm assembles for the spider (spinner+queen adjacent — the same
   open ground; carries its own binding AI-assembly mandate, §3.3/§4c),
   and blitz debuts at a real measurable 5% (§3.4/§4d). Must _register_
   (the L5-precedent — not tuned to ~0; the spider's upheld ask).
   Budgeted _against_ the engine so the net is the controlled ~64, not
   an over-shoot toward L5's 66.
4. **`capture-post` + carried L6 state: ~0pp _new_** (the carried state
   is byte-identical and already priced into L6 ~55%; the `capture-post`
   low-`drama` score-grind signature is the expected §4c systemic
   pattern — tracked cross-level, **not** chased; no _new_ L7 movement).
5. **No plane-affinity contribution: 0pp (§4d).** Carried byte-
   identical; empirically inert; **not budgeted**.

**Net: ~55% + (10 to 13) − (3 to 5) ≈ ~62–66%, settling to ~64%**, with
the within-scenario loop tuning the Remote `healingRate` magnitude (the
§4a `4` is the loop-tunable engine midpoint), the spider-Remote-contest
aggression threshold (§3.1.2 latitude), the card deck contents / ant
spend threshold (§3.2/§4b), the combo party compositions/cadence
(§3.3/§4c), and the blitz `5%` / Venom-Storm cadence (§3.4) toward the
~64 target — but the **shape** (engine = contested Remote economy +
cards + Royal Onslaught; ceiling = Venom Storm + blitz), the
**direction** (Remote ant-favoring), the **AI-exercise invariants**
(spider contests the Remote; ant plays cards; both AIs assemble their
combo — each in a seed-robust majority), and the **no-plane-affinity /
no-new-currency-field / no-uncontested-permanent-Remote** rulings are
ruled invariants, not free knobs.

**Why this reads as a deliberate REBOUND UP, not a monotone step (the
binding §5 requirement):**

- **Strictly ABOVE L6.** ~55% → ~64% is an unambiguous **+9pp
  recovery** — the curve _rises_. This is the §5-licensed non-monotone
  rebound ("the curve doesn't need to be monotonic"; mechanic-
  distribution §4 "L7 ~64% — cards rebound"; the L6 arbitration's own
  "separated above ~64"). The binding monotone segment was L5 → L6
  (held, L6 §5); **L6 → L7 is the licensed non-monotone recovery and is
  _engineered_ to rise.**
- **The rebound is delivered BY THE PLAYER GAINING ITS TOOLKIT, not a
  stat re-tune.** The +9pp net is _driven by_ the player's combined-arms
  kit assembling in the first open arena (the contested Remote economy,
  the AI-played cards, the AI-assembled Royal Onslaught), _ceilinged
  by_ the spider's open-arena escalation (AI-assembled Venom Storm + the
  blitz debut). Ants get **no** plane-affinity buff (§4d, none) and the
  Remote is **earned each turn** (the spider contests it — not a free
  uncontested-permanent stat, the L4-§9 trap rejected). This is
  precisely the §5 "player adapts/grows into its kit" reading and the
  §6.2 "the player gained its answer, the enemy also escalated, and the
  net is the player ahead because they have the better tools in this
  room" closure — **not** a boring monotone step and **not** the L4-§9
  uncontested-permanent over-shoot.
- **Separated above L6 ~55 and above the L8 ~50 continuation.** L8
  (Attic) is the deliberate ~50% "hard level before the end" spike
  (mechanic-distribution §4: hypnotize full power + recruit-or-die).
  ~55 (L6) → ~64 (L7) → ~50 (L8) is the intended shape: the
  hardest-but-fair resumed-descent low, the cards/toolkit rebound, the
  designed late spike. Had the engine been an uncontested-permanent
  Remote (§3.1 trap rejected), L7 would land ~70%+ (the L4-§9
  over-shoot, erasing the L7→L8 separation). Had the ceiling been tuned
  to ~0 (the dead-payoff fate the spider fought), L7 would land ~68%+,
  crowding the same separation. The §3.1.2 contest / §3.3 AI-assembly
  / §3.4 registering-ceiling structure is the knob that holds the
  rebound at a _separated_ ~64.

---

## 6. Interest claim

**The L7 delta makes the answer to the first half's grind a
combined-arms payoff — the player's whole kit finally assembles in the
first open room — while the spider's own combined-arms answer assembles
in the same room and starts striking first, the rebound earned and
contested, not handed.**

The Level PA built the Living Room as the tier's first genuinely open
arena: three small furniture clusters in open ground, a currency node,
the largest POST count of the tier (level-progression-plan §2 L7). For
six rooms the player met its kit one piece at a time — jelly, the
plane-switch, venom/combo _components_, concealment, the flyer route —
in rooms (pipe, island, corridor, bisected bedroom, terraced gauntlet)
that each denied combined-arms maneuver. Before this delta the open
arena is just a bigger capture-post grind; the player's combo
components are inert, there is no economy to spend, the cards are dead
deck-flavor (the §4d / L4-§9 failure, a fifth time). The L7 delta is
the smallest possible change that makes the rebound _earned and
legible_: the player's full combined-arms toolkit finally assembles —
play your commander cards, funded by holding the Remote you have to
_fight the spiders for every turn_; pair your mage and workers for
Royal Onslaught the open ground finally lets you keep adjacent. That is
the ant doctrine — out-think, out-maneuver, out-combine, don't out-slug
— taught by the first room that lets the ant breathe, the rebound
_earned by playing the kit well in the open_, not handed by a stat
re-tune (which is exactly why L7 reads as a rebound, not a monotone
step — the binding §5 requirement). It is simultaneously the §6.2 good
closure: the curve breathes up because the _player gained real
answers_. And the spider is not a punching bag for it — the same open
arena that assembles Royal Onslaught assembles the spider's Venom
Storm, the blitz debuts (the spider striking first, sometimes), and the
Remote is _contested_ (the spider sorties for it, a real recurring
garrison-split decision). Escalation (the player's combined-arms kit)
_with an answer_ (the spider's combined-arms kit + the contested
Remote), debuting _together by design_ — the §3.D / L4-§3.2 / L5-§3.2 /
L6-§3.6 doctrine, the reason §3.J banked the assembled combos to
_exactly_ L7 (the first open arena where partner-pair adjacency is
sustainable), applied a fifth time with the §4d lesson now binding (the
rebound is carried by the levers the AIs _actually exercise_ — the
contested Remote economy, the played cards, the assembled combos — not
the one they ignore). Both factions' interest goals are served; neither
is denied — only sequenced into one room: the player's first
combined-arms scenario, and the spider's first open-arena escalation.

---

## 7. Termination record

**Termination basis: §6.2 condition 1 — the Gameplay PA's standing
discretionary cutoff authority ("cut off sub-agent debate when it has
heard enough"), invoked after the opening + one rebuttal per faction
(2 debate documents — `l7-ant-advocate.md`, `l7-spider-advocate.md`,
each opening + ≥1 rebuttal; equivalently 2 exchanges of the 6-exchange
cap; the automatic 6-exchange stop did NOT fire — terminated early by
discretion, consistent with the mechanic-distribution plan §1 and the
L3 §7 / L4 §7 / L5 §7 / L6 §7 precedents).**

- **§6.2 automatic stop A (both fun-critic AND interest-critic ≥75/100
  on a frozen proposal):** _Not yet fired_ — critic eval runs in the
  within-scenario loop on the implemented L7 data, downstream of this
  arbitration; there is no frozen scored proposal at debate time. Per
  §6.2 and the L3/L4/L5/L6 precedent, this does not block arbitration;
  it is a Phase-D loop gate, recorded as the L7 ship-gate below.
- **§6.2 automatic stop B (6 exchanges):** _Not fired_ — only 2
  exchanges occurred (opening + rebuttal per faction).
- **Discretionary cutoff (invoked):** The debate converged to (1) a
  set of **pre-ruled / §4d-directed / §4a-assigned placements both
  factions explicitly ratified** (commander cards at L7 §2/§3.4.3;
  assembled combos roster-gate-IN L7 §3.J; Venom Storm + blitz online
  L7 §2; Remote currency POST the Level-owned node + Gameplay-owned
  economy payload §4a #3 / §5 case 3, ant-favoring direction conceded
  by the spider; no plane-affinity delta §4d — none genuinely
  contested, ratifications), and (2) a **single specification-shape
  question on which both factions independently converged** — every
  load-bearing lever ships as a data payload PLUS a binding within-loop
  AI-doctrine constraint (the Remote economy through the _shipped
  `healingRate` field_ because the engine is frozen and there is no
  currency field / no shop after L7; cards AI-played; combos
  AI-assembled; the spider contests the Remote so it is bounded), each
  with a measurable ship-gate — the §4d / L4-§9 / L6-§3.1.2 pattern.
  Both factions' best case is fully on record on every dimension; both
  independently derived the §4d-compliant specification (the ant from
  the no-dead-flavor side, the spider from the no-dead-payoff side).
  The only residual is pricing (engine vs ceiling pp-split,
  "contestable/bounded" vs "dominant") the §3.4.4 curve arbiter
  resolves objectively. The §6.2 format's value ("adversarial NL
  surfaces considerations neither generates alone") was fully realized
  — the exchange produced the decisive frame (the engine reality
  forcing the Remote economy onto the shipped `healingRate` field; the
  contested-bounded-Remote vs uncontested-permanent-trap distinction;
  every lever as data-payload-plus-binding-AI-doctrine; the open arena
  making the combo dead-letter fate _more_ likely, not less) that
  neither opening alone contained. Per roadmap §6.2 the Gameplay PA
  "cuts off sub-agent debate when it has heard enough"; that threshold
  is met. **Terminate; arbitrate now.** No point is genuinely
  unresolvable.

**L7 ship-gate (handed to the Phase-D within-scenario loop — MEASURABLE,
per the L4-§9 falsification precedent the brief mandates):** implement
the §4 data delta + the §3.1.2 / §3.2 / §3.3 binding AI-doctrine
constraints; run the loop to fun-critic + interest-critic; **the L7
data ships when BOTH conditions hold:**

1. **Both critics ≥75/100** on the measured L7 config (§6.2 automatic
   stop A, evaluated where it belongs — on the built scenario), **AND**
2. **The measured ant win-rate lands in the ~62–66% band on the
   deterministic seeds-1..100 sweep** (the `baseline-l7` vs `spider-l7`
   orchestrator sweep, the §9.1/L4 falsification method as the
   acceptance test), **reading as a REBOUND ABOVE the measured L6 ~55%
   and above the L8 ~50 continuation.**

The rebound-up non-monotone requirement (L6 ~55 → L7 ~62–66) is a
**binding ship-gate**: per the L4-§9 falsification precedent, **a built
L7 that does NOT measure in the ~62–66% band reopens this arbitration**
under the §7 "ruled values are not free knobs — any change reopens"
clause. **Falsification fallback (the named acceptance risks, per the
L4-§9 / L6-§7 precedent):**

- **If a load-bearing lever is NOT AI-exercised** (the ant AI never
  plays cards; the rosters/AIs never assemble Royal Onslaught or Venom
  Storm; the spider never contests the Remote): the lever degenerates
  to the §4d / L4-§9 dead-letter (~0pp) and L7 fails to rebound
  (measures ~55% — no recovery) — that **explicitly reopens**, with the
  corrective levers: re-field the within-loop AI per the §3.1.2/§3.2/
  §3.3 binding constraints, and/or the §3.1(c) Level-PA Remote
  node-placement/owner recommendation (the L4-§9.3(c) escalation path).
- **If the Remote is uncontested-permanent** (the spider AI never
  sorties for it): the ant economy becomes the L4-§9 +39pp-class
  uncontested-permanent buff and L7 over-shoots to ~70%+ — that
  **explicitly reopens** (the §3.1 trap, the named risk), corrected by
  the §3.1.2 spider-contest doctrine being made to fire (loop re-tune)
  or the §3.1(c) Level-PA recommendation.
- **If the ceiling is tuned to ~0** (Venom Storm/blitz never register):
  L7 over-shoots to ~68%+, crowding the L7→L8 separation — that
  **explicitly reopens** (the dead-payoff fate the spider fought),
  corrected by the §3.3/§3.4 registering-ceiling + AI-assembly mandate.

The loop's tuning latitude is the Remote `healingRate` magnitude (the
§4a `4` midpoint), the spider-Remote-contest aggression threshold
(§3.1.2), the card deck contents / ant spend threshold (§3.2/§4b), the
combo party compositions/cadence (§3.3/§4c), the blitz `5%` /
Venom-Storm cadence (§3.4), and the Mantel / Couch-Cushion POST def
(Level-owned POST stats, Gameplay-neutral) toward the ~64 target. The
**ruled invariants** (not free knobs — any change reopens): the §4a
Remote payload _shape_ (`healingRate`-class occupation economy through
the _shipped_ field, **no new currency field**) and _direction_
(ant-favoring); the §3.1.2 spider-Remote-_contest_ existence (bounded,
not uncontested-permanent); the §3.2 ant-card-_play_ existence; the
§3.3 combo-_assembly_ existence (both combos); the §3.4 _registering_
ceiling (blitz a real measurable 5%, Venom Storm AI-assembled); the
§3.5/§4d **no-plane-affinity-delta**; and the carried-forward L6 state
byte-identity. **Note the §4c/§4d carried-forward cross-level
context:** L7 is `capture-post` (the level-progression-plan §4c
competent-defense → score-path / low-`drama` systemic signature is
expected here); per the recorded human decisions, that feel signature
(§4c) and plane-affinity inertness (§4d) are tracked cross-level (the
deferred UX/feel pass), **not** chased per-level — do not retune L7
mechanics for `drama` or re-introduce plane-affinity as a lever if
win-rate, the ~64 rebound, and the L6→L7→L8 shape hold.

---

## 8. Summary of the verdict

| Dimension                                | Ruling                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mechanic                                 | L7 Living Room delta vs L6 (data-only; existing `postSchema.healingRate`/`defensiveBonus` + shipped combo resolver + shop/ability data path; AI-config via the within-loop; **no engine code, no new schema field** — §4b)                                                                                                                                                     |
| L6 state carried forward                 | `planeAffinity` (incl. spider combat `wall {1,1}` + ceiling `{1,1}` + full corner coverage), Step-Landing occupation economy + sortie doctrine, hypnotize cap, recruit-as-order, Light-Switch payload + §9 AI-doctrine, venom-blast weak cap, plane-switch full coverage — **byte-identical**, not relitigated                                                                 |
| **Remote currency POST economy (FINAL)** | **`healingRate: 4` + `defensiveBonus: 2` on the Remote POST**, default `owner: "ant"` (Level-recommended) — a per-turn occupation economy through the **shipped `healingRate` field** (NO new currency field — engine frozen; gold is world-loop, no shop after L7). **Ant-favoring, contestable → bounded.** The rebound's engine core.                                       |
| **Binding spider-AI doctrine (Remote)**  | The within-loop spider AI **MUST** sortie to **contest the Remote** so its ownership genuinely flips/contests (seed-robust majority). Contest _existence_ = ruled invariant; aggression threshold/timing = loop-tunable. Bounds the engine (rejects the L4-§9 uncontested-permanent +39pp trap). (§3.1.2)                                                                      |
| **Commander cards**                      | Data/shop-expressible deck (the **single new high-cognitive mechanic**, §3.4.3), funded in-scenario by the Remote economy (no shop after L7). **Binding: the ant AI MUST play cards** (seed-robust majority — a dead deck is the §4d / L4-§9 trap, REJECTED). Part of the engine. (§3.2)                                                                                       |
| **Assembled-combo roster-gate-IN**       | L7 rosters composed for **Royal Onslaught** (ant mage+worker adjacent — engine) and **Venom Storm** (spider spinner+queen adjacent — ceiling); NO ability/engine change. **Binding: the AIs MUST assemble each combo** (seed-robust majority — bare roster data is the §4d dead-letter, MORE likely in the open arena, REJECTED). (§3.3)                                       |
| Spider blitz 5% debut                    | Real measurable **5%** initiative-burst ("light ≠ absent" — must register, not tuned to ~0); 3-scenario runway to L10 peak. Part of the ceiling. (§3.4)                                                                                                                                                                                                                        |
| **No plane-affinity delta**              | **EXPLICITLY CONFIRMED — carried from L6 BYTE-IDENTICAL, NOT budgeted as a curve mover (§4d-directed, §3.5).** The L7 ~9pp rebound is carried entirely by AI-exercised levers (the contested Remote economy, AI-played cards, AI-assembled Royal Onslaught; AI-assembled Venom Storm + measurable blitz as ceiling).                                                           |
| Capture-post AI exercise (per §4d)       | Remote `healingRate`: **yes** (first-order attrition-optimizer input, the L6-§3.2 mechanism; a _floor_ POST both AIs traverse — unlike the L4 north-wall Light-Switch or `wall` affinity) — **but needs the §3.1.2 binding contest** so it is bounded. Cards/combos: **only via the §3.2/§3.3 binding AI-play/assembly mandates**. Plane-affinity: **no** (§4d, not budgeted). |
| Favors                                   | Net **player/ant** (the licensed ~64% rebound); the contested Remote economy + cards + Royal Onslaught are the engine, Venom Storm online + blitz the budgeted ceiling                                                                                                                                                                                                         |
| L7 win-rate prediction                   | **~64%** (band ~62–66%); a **deliberate REBOUND UP** from L6 ~55% (NON-monotone by §5 design; the player gained its combined-arms toolkit, not a stat re-tune); separated above L6 ~55 and above the L8 ~50 continuation                                                                                                                                                       |
| Interest claim                           | The player's full combined-arms kit assembles in the first open arena (cards funded by the contested Remote, Royal Onslaught); the spider's kit assembles too (Venom Storm, blitz, the Remote contest); the rebound earned and contested, not handed — escalation + answer debut together by design                                                                            |
| Termination                              | §6.2 discretionary cutoff after 2 exchanges (2 debate docs); auto-stops A/B not fired; **measurable ship-gate** = both critics ≥75 **AND** measured ~62–66% on seeds 1..100, reading as the rebound above L6; a built L7 outside the band (dead lever / uncontested-permanent Remote / zeroed ceiling) reopens per the L4-§9 precedent                                         |

---

## RE-ARBITRATION (empirical, post-build) — Remote currency POST

**Status:** Amendment to this document. Triggered by the §7 named
falsification fallback (an empirical falsification is the trigger; the
built L7 missed its band). **Scope is the Remote POST ONLY.** The other
three L7 levers (commander cards, assembled combos / Royal Onslaught +
Venom Storm, spider blitz 5%, the no-plane-affinity / carried-L6 state)
are **NOT reopened** — they were orchestrator-verified as genuinely
exercised and fine (see the falsification evidence below) and the §3.2 /
§3.3 / §3.4 / §3.5 / §4f rulings stand byte-identical. This amendment
**re-rules §3.1 / §4a (the Remote payload, Gameplay's direct authority)
and issues a BINDING Level-PA directive on the Remote node (§4a #3
Level-owned placement/default-owner)**; it re-specifies the §3.1.2
binding within-loop doctrine so it can finally bite. Engine remains
FROZEN (§4b): data + Level-owned placement only, no engine code, no new
schema field.

### R.1 The falsification evidence (orchestrator-verified, deterministic, seeds 1..100, `baseline-l7` vs `spider-l7` on the built `data/level-7/`)

- **Measured ant 99%** (ant=99, spider=1; 89 score-resolved). Target
  band [62,66] (the licensed rebound above L6 56). A **~35pp overshoot**
  — precisely the L4-§9 / §3.1-named **uncontested-permanent-buff trap**
  (the +39pp-class structure), the exact acceptance risk §7 enumerated.
- **The other three levers are genuinely exercised and fine — NOT
  reopened.** Commander cards: 49 bought / 39 played per 100 (§3.2
  binding satisfied). Royal Onslaught fired 108×, Venom Storm 93× (§3.3
  binding satisfied, both combos assembling). Spider-blitz honored at 5%
  (§3.4). No plane-affinity delta; units byte-identical to L6 (§3.5 /
  §4e). These rulings stand unamended.
- **The §3.1.2 spider-Remote-contest is structurally inert: Remote
  ownership flipped 0/100 in EVERY tuned configuration.** The
  orchestrator swept holder party, `HOLDER_CONCEDE_HP` 0.5–0.95,
  `CONTEST_RETREAT_HP` 0.0–0.62, and ant-hold / spider-contest on/off:
  bracketed cards+combos-only = 43, spider-contest-only = 42,
  ant-hold-only = 53, both = 99 — **0 Remote flips throughout**. The
  lever the §3.1 ruling designated the **dominant rebound engine**
  contributes its +pp only as a one-way uncapturable subsidy: the
  difference between "no Remote economy" (~43) and "ant-permanent Remote
  economy" (99) is the unbounded +39pp-class trap, not the ruled bounded
  +6 to +8pp.

### R.2 Structural diagnosis (re-derived from source — confirmed)

The original §3.1 / §4a ruling (`owner:"ant"` + `defensiveBonus:2` +
`healingRate:4`, Remote at floor (6,2)), in the Level PA's **open
arena**, is **structurally uncontestable**, so §3.1.2 _cannot bite by
construction_. Re-derived end to end:

1. **`healingRate:4` (`engine/end-of-turn.ts:177–188`, `applyHealing`):**
   regen applies only on a _friendly_ POST (`friendlyPostUnder` — POST
   `owner === party.faction`). With default `owner:"ant"` the ant
   garrison (`vanguard-alpha`) banks +4/turn to **every unit** the
   instant it arrives, from turn 1, with no capture required.
2. **`defensiveBonus:2` (`engine/turn.ts:82–90`, `assignSides`):** a
   party on a _friendly_ POST is the **defender** and the attacker is
   capped at `+2`. The ant holder defends the Remote with a bonus; the
   sortieing spider rover attacks into it.
3. **2-turn capture (`engine/post-capture.ts:137–195`,
   `applyCaptureTick`):** a non-owner must be **alone** on the tile for
   2 end-of-turn ticks. Decisive line (146–147): **both factions
   co-located → PAUSE (no decrement, no abort)**. A lone spider rover
   that reaches the ant-held Remote _co-locates with the ant garrison_,
   so the capture clock **never advances** — it pauses indefinitely.
4. **Composition:** the ant holder reaches the node first (it is on the
   ant approach side at (6,2); the spider must detour off its mantel
   fortress); +2 def + `healingRate:4` regen (plus Royal-Onslaught
   support, which the build confirms fires 108×) make the ant holder
   **win the co-located attrition** and never drop below the rover's
   reach. The rover either dies in the open NE quadrant (the documented
   open-arena turkey-shoot — the exact reason L7's pre-delta baseline is
   51%) or breaks off at `CONTEST_RETREAT_HP`, at which point the ant
   holder is alone again and the Remote stays ant-owned. **Net: a lone
   spider rover can NEVER flip the Remote — 0/100, as measured.** The
   binding §3.1.2 spider-contest doctrine is doctrinally well-formed but
   **physically impossible against an ant-owned heal4/def2 node in the
   open arena** → uncontested-permanent ant heal4 → ant 99%.

The §3.1.2 doctrine's two failure modes are the only two outcomes the
geometry+payload permit: rover never genuinely contests (→ ant 99%, the
measured trap) **or** rover suicides into the open turkey-shoot (→ ant
~97–99% the other way, the L7 pre-delta baseline). There is **no
bounded middle** while the node is ant-owned with free regen — the
ruling's "earned each turn, not a free tick" is unreachable by
construction. This is exactly the §3.1.2 / §7 named fallback condition.

### R.3 The corrected ruling

The §3.1 _intent_ is upheld and unchanged: the Remote is the rebound's
**dominant but bounded engine**, ant-favoring **in net consequence**,
contested so the ant _earns_ it (the L4-§9.3(b) earned/transient
correction), expressed through the shipped `healingRate` field (engine
frozen, no currency field, no shop after L7). What is corrected is the
**payload shape and the node's default owner/placement**, so the
contest is _physically possible_ and _on-path_ (neither uncontestable
nor a turkey-shoot detour). Two parts, per the §4a #3 ownership split:

#### (i) The re-ruled Remote economy payload — Gameplay's DIRECT authority (re-rules §3.1 / §4a; exact stat values/fields)

```
// the Remote POST, RE-ARBITRATED L7 economy payload:
"healingRate":    3,
"defensiveBonus": 0
```

- **`defensiveBonus: 0` (was `2`) — drop it entirely.** This is the
  load-bearing correction. `defensiveBonus` only protects a defender
  whose faction `=== post.owner` (`turn.ts:82–90`); it is precisely the
  field that made the on-node holder _unbeatable in the co-located
  fight_ and thus made the node permanently uncapturable. With `0`, a
  party standing on the Remote gets **no POST defensive bonus** — the
  contesting party can actually win the co-located battle, drive the
  holder off, and then complete the 2-turn solo capture (the
  `post-capture.ts` mechanic can resolve). The Remote is _worth
  contesting_ now because the economy itself is the prize, not a
  fortress bonus stacked on top of it (a heal node, not a bunker — the
  L6 Step-Landings are `defensiveBonus:3` _because_ they are a held
  occupation line; the Remote is the opposite, a node that must change
  hands).
- **`healingRate: 3` (was `4`) — lowered to the L6 Step-Landing
  value.** With the node now genuinely flipping (R.3(ii)), the economy
  is _earned only the turns a side holds it_, so it no longer needs to
  be set _above_ L6's `3` to "register as the dominant +pp" (the
  original §4a reasoning assumed an always-on ant tick — falsified). `3`
  is a meaningful per-turn attrition/tempo economy (the verified
  `end-of-turn.ts:181` regen, read by both AIs' attrition optimizers —
  the §4d-robust first-order input, unchanged) that, gated behind a
  _winnable_ capture and a _losable_ hold, lands the bounded +6 to +8pp
  engine rather than the unbounded subsidy. `3` is the loop-tunable
  engine midpoint within [2,4]; the _shape_ (`healingRate`-class
  occupation economy through the shipped field, **no new currency
  field**) and the _net direction_ (ant-favoring, via R.3(ii) +
  on-path) remain ruled invariants.
- **Symmetric in data, ant-favoring in net consequence** — unchanged
  ruling, now actually realized: whoever holds the Remote gets the
  regen, but the ant captures it first (closer approach, on-path under
  R.3(ii)) and the §3.1.2 doctrine makes the spider _contest_ it so it
  flips both ways and the ant _earns_ it. The economy is no longer a
  free ant tick.

#### (ii) BINDING Level-PA node directive — Level-owned (§4a #3); the orchestrator/Level-PA implements (exact default `owner` + placement constraint)

This is a **BINDING DIRECTIVE Gameplay issues TO the Level PA** (the
§4a #3 split: Level owns the Remote node's placement and default
`owner`; this arbitration cannot edit `data/level-7/map.json` but RULES
it and the orchestrator/Level-PA micro-fix implements it). Two binding
constraints:

1. **Default `owner: "neutral"` (was `"ant"`) — BINDING.** A
   `neutral`-owned Remote is owned by _no faction_, so (a)
   `friendlyPostUnder` never matches → **neither side gets free regen
   while it is neutral** (the always-on ant subsidy is eliminated at the
   root — this alone breaks the +39pp trap); (b) `defensiveBonus` would
   not protect anyone even if nonzero (it is `0` anyway under R.3(i));
   (c) the per-turn economy pays out **only to a faction that has
   actually CAPTURED it** via the 2-turn solo hold (`post-capture.ts`),
   and the "both factions co-located → pause / capturer-absent → abort
   to neutral" rules mean a held Remote _can be taken back_ — the
   contest is now a real, bidirectional, recurring fight the §3.1.2
   doctrine can express. This is the §3.1(c)-contemplated /
   L4-§9.3(c)-escalation corrective the original ruling itself named:
   "default `owner:"neutral"` (both must capture it — the contest can
   exist)."
2. **Relocate the Remote onto a contested on-path lane the capture
   chain actually routes through — BINDING placement constraint.**
   Current (6,2) is in the empty NE quadrant: off the ant chain
   (couch-cushion (0,4) → coffee-table-top (3,6) → tv-stand (9,4) →
   mantel (9,9)), off the ant home (floor-vent (0,0)), and a pure
   detour from the spider's mantel fortress (9,9) / pickets (9,8) — so
   contesting it is a turkey-shoot detour for the spider and a free
   uncontested garrison for the ant (both measured). **Directive: place
   the Remote on the floor plane on the central contested approach the
   ant capture-chain transits and the spider can reach without
   abandoning the mantel fortress — the muster corridor between
   `tv-stand` (9,4, the §-ruled muster post) and the `coffee-table-top`
   (3,6) / `mantel` (9,9) leg, i.e. roughly the open mid-board band
   around floor (6,5)±1 (the loop may fine-tune the exact tile within
   that band toward the §5 band; the binding constraint is _on the
   chain-transited contested lane, floor plane, not the NE detour
   pocket, not adjacent to either home/objective POST_).** On-path means
   the ant naturally fights through/for it during the march and the
   spider's §3.1.2 sortie is a _real garrison-split on the route it is
   already defending_, not a suicidal detour into the open — the
   contest is genuine for both, the §3.D tactical-choice structure
   finally realized. The R.3(i) payload is `owner`-relative and
   value-stable under this move (the L4-§9.3(c) stability property,
   unchanged).

#### (iii) The re-specified binding within-loop doctrine (§3.1.2, re-specified — what makes it bite given (i)/(ii))

The within-loop binding doctrine **stays** (spider contests / ant
holds), re-specified for the corrected node:

- **Spider side (`ai/spider-l7.ts`, §3.1.2):** the rover still sorties
  to the Remote tile, but now (a) the node is _on its defended route_
  (R.3(ii)), so the sortie is a genuine garrison-split, not a detour
  turkey-shoot; (b) with `defensiveBonus:0` and `owner` not ant, the
  rover can **win the co-located fight and complete the 2-turn solo
  capture**, flipping the Remote to neutral-then-spider (or simply
  denying it: a contesting spider co-located with the ant holder
  _pauses_ the ant's own re-capture and, while neutral, denies the ant
  the regen entirely). The ruled invariant is unchanged: the spider
  _provably contests and the Remote ownership genuinely flips/contests
  in a seed-robust majority_ (now _physically possible_, where before it
  was impossible). `CONTEST_RETREAT_HP` remains the loop's bounded-
  aggression tuning latitude.
- **Ant side (`ai/baseline-l7.ts`, §3.1(c) symmetric hold):** the
  detached holder still garrisons the Remote, but must now _capture it
  first_ (it starts `neutral`, not ant-owned) and can _lose it back_
  when the spider rover wins the co-located fight (no `defensiveBonus`
  shield). `HOLDER_CONCEDE_HP` remains the loop's bounded latitude. The
  economy is earned the turns the ant wins the contest and forfeited the
  turns it loses it — the §3.1 "earned each turn, not a free all-game
  tick" ruling, now structurally realized rather than asserted.
- **Ruled invariant (unchanged in kind, now reachable):** the Remote
  ownership **genuinely flips/contests across a seed-robust majority of
  games** (the orchestrator's acceptance check: Remote flips > 0 and
  meaningfully bidirectional across seeds 1..100 — directly contradicting
  the measured 0/100). The aggression thresholds, holder/contester HP
  knobs, and exact in-band tile are the loop's tuning latitude toward
  the §5 band.

### R.4 Corrected win-rate prediction

**Predicted L7 ant win rate: ~64%** (band **[62,66]**), unchanged from
the original §5 target — this re-arbitration corrects the _mechanism_
that delivers it, not the target. Derivation against the now-measured
anchors:

1. **Cards + combos engine, measured-isolated: ~43% ant**
   (orchestrator's bracketed "cards+combos-only, no Remote economy"
   configuration — the genuine, exercised, NOT-reopened engine
   components: 49/39 cards, Royal Onslaught 108×, Venom Storm 93×, blitz
   5%). This is the empirically-grounded floor the Remote economy
   deltas _up_ from (it replaces the original §5's theoretical "~55 + …"
   anchor with the build's measured one).
2. **The corrected Remote economy: +19 to +23pp ant, BUT now BOUNDED to
   net ~+19 to +21 toward the target.** Measured "ant-permanent Remote"
   = 99 (the +56pp uncontested trap over the 43 floor — falsified).
   Under R.3: the node is `neutral`-default, `heal3`, `def0`, on-path,
   and _genuinely flips_ — the ant wins it the majority of contested
   turns (closer approach + on-path + Royal-Onslaught support, all
   measured-present) but **loses it the turns the spider rover wins the
   co-located fight and completes the now-possible 2-turn capture**, and
   banks **0 regen every turn it is neutral/spider-held**. The bounded
   economy is the difference between the 43 floor and the ~64 target:
   the ant nets the rebound's dominant engine **without** the +56pp
   permanent subsidy — the spider's recurring successful contest shaves
   ~35pp off the trap. `healingRate:3` (down from 4) and `def0` (down
   from 2) are the magnitude/shape that, gated behind a winnable capture
   and a losable hold, price this to land [62,66] (loop-tuned within
   `healingRate ∈ [2,4]`, the contest/concede HP knobs, and the exact
   in-band tile).
3. **The ceiling (Venom Storm 93× + blitz 5%): unchanged, registers**
   (§3.3/§3.4, NOT reopened) — the budgeted spider counter-pressure that
   holds the net at the controlled ~64 rather than overshooting.
4. **Net: ~43 (measured cards+combos floor) + bounded Remote economy →
   ~64, band [62,66].**

**Why it now BITES, is CONTESTED-not-permanent, and is NOT a
turkey-shoot:**

- **It bites (was structurally inert, 0/100 flips):** `defensiveBonus:0`
  - default `owner:"neutral"` together make the on-node holder _beatable
    in the co-located fight_ and the 2-turn capture _able to resolve_ —
    the `post-capture.ts` mechanic and the §3.1.2 sortie can finally
    change Remote ownership, which they provably could not while the node
    was ant-owned with +2 def + free heal4. The ruled "Remote ownership
    genuinely flips/contests" invariant becomes _physically reachable_.
- **Contested, not uncontested-permanent (was the +39pp-class trap, ant
  99):** `neutral` default eliminates the always-on ant regen at the
  root (no `friendlyPostUnder` match until _captured_); the economy is
  paid only to a side that won and is still holding the node, and a held
  node can be taken back (capturer-absent → abort-to-neutral; both
  co-located → pause). The ant _earns_ it each turn — the L4-§9.3(b)
  correction, now structural not asserted.
- **Not a turkey-shoot (was the alternative failure, the open-arena
  envelope, pre-delta 51 / ~97–99 the other way):** the relocation onto
  the chain-transited contested mid-board lane makes the spider's
  contest a garrison-split _on the route it already defends_, not a lone
  detour into the open NE killbox; the `CONTEST_RETREAT_HP` /
  `HOLDER_CONCEDE_HP` bounded-aggression knobs (retained) keep both
  detachments recurring rather than suicidal. The bounded middle the
  original ruling assumed but the geometry forbade is now _available_.

### R.5 Interest-claim delta

The §6 interest claim is **upheld and now structurally honest**, not
rewritten: "the rebound earned and contested, not handed." The
falsified build delivered the _opposite_ of the claim — an uncontested
free ant tick (the boring-but-balanced failure §6.2 names, in its
ant-favoring inversion: a runaway the spider provably could not fight
for, 0/100). The correction makes the claim true in play: the Remote is
a node **both factions must capture and can lose**, on the lane the
assault actually transits, so "you have to fight them for the Remote
every turn you want its economy" (the §4f one-sentence statement)
becomes a genuine recurring garrison-split decision for _both_ AIs
rather than a doctrinal assertion the geometry voided. No change to the
cards / Royal Onslaught / Venom Storm / blitz interest content (NOT
reopened).

### R.6 Termination basis

**Termination basis: the §7 named falsification fallback, invoked
exactly as written.** §7 enumerated this precise condition — "If the
Remote is uncontested-permanent (the spider AI never sorties for it /
cannot): the ant economy becomes the L4-§9 +39pp-class
uncontested-permanent buff and L7 over-shoots … that **explicitly
reopens** … corrected by the §3.1.2 spider-contest doctrine being made
to fire (loop re-tune) **or the §3.1(c) Level-PA recommendation**" — and
the measured ant 99% / 0-Remote-flips empirically triggered it. The
within-loop re-tune was swept and **exhausted** (0 flips across the full
holder/HP/on-off sweep: the §3.1.2 loop latitude cannot reach the band
because the falsification is _structural_, not a tuning miss), so the
corrective escalates to the **two §7-named structural levers**: (i) the
re-specified Remote payload (Gameplay's direct authority — `healingRate`
4→3, `defensiveBonus` 2→0) and (ii) the BINDING §3.1(c)/§4a-#3 Level-PA
node directive (default `owner` ant→neutral; relocate onto the
contested on-path mid-board lane). This is recorded as the binding
amendment; the §7 ship-gate is otherwise unchanged (both critics ≥75
**AND** measured [62,66] on the deterministic seeds-1..100
`baseline-l7` vs `spider-l7` sweep, **plus** the now-explicit
acceptance sub-check: **Remote ownership flips > 0 and is meaningfully
bidirectional across the sweep** — the direct contradiction of the
falsifying 0/100 measurement). Cards / combos / blitz / plane-affinity /
carried-L6 state remain ruled invariants, **not reopened**. No engine
change; data + Level-owned placement only (§4b). A built L7 still
outside [62,66], or still 0 Remote flips, reopens again per the same
clause.

---

## RE-ARBITRATION 2 (post-build, structural) — rebound re-ruled via cards/combos; Remote demoted

**Status:** Second and FINAL amendment to this document. Triggered by a
SECOND empirical falsification (the §7 / R.6 named fallback, invoked a
second time) and a recorded human corrective. **Scope is strictly: (a)
demote the Remote to minor neutral flavor — it is NO LONGER a curve
lever; (b) re-rule the cards+combos magnitudes STRONGER so they carry
the entire ~64% rebound from the measured cards+combos-only ~43%
floor.** Engine remains FROZEN (§4b): `data/level-7/{abilities,roster-
ants,roster-spiders,shop}.json` only — no engine code, no new schema
field, no scenario-data edits made by this document (it RULES; the
orchestrator wires + re-tunes). **Plane-affinity (§3.5/§4e), spider
blitz 5% (§3.4/§4d), the carried-L6 state (§4f), the open-arena
geometry/POST placements (Level-owned), and every other level are NOT
reopened.** The §3.2 (ant-plays-cards) and §3.3 (combo-adjacency)
binding within-loop doctrines are CONFIRMED and STAY; only their ruled
_magnitudes_ are re-ruled stronger.

### R2.1 The §4e structural finding is the cause; the Remote is demoted to minor neutral flavor

**Cause (recorded BINDING as `docs/level-progression-plan.md` §4e —
read it; not re-derived here):** a POST `healingRate`/`defensiveBonus`
"occupation economy" **cannot express a bounded attritional win-rate
lever in a `capture-post` scenario under the frozen engine**. L7's
Remote was falsified TWICE: the original §3.1/§4a ruling
(`owner:ant`+`def2`+`heal4`) → uncontested-permanent **99%** (RE-ARB 1
R.1); RE-ARB 1's correction (`owner:neutral`+`def0`+`heal3`, relocated
on-path to floor (6,5)) made the contest go genuinely live (**94
flips**, 99%→**55%**) **but `healingRate` 2 vs 3 vs 4 produced 0.0pp** —
the post-capture **co-located-pause race** (`post-capture.ts`) makes a
contested capture-post a winner-take-all Manhattan race, not the
oscillating co-occupation the economy math assumes, so the per-turn
heal tick never accrues as a curve-shaping differential. This is
**structural under the frozen engine, not a tuning miss** — viable only
under `eradicate`/forced-co-occupation (L6), never `capture-post` (L7).
RE-ARB 1's R.3 mechanism is therefore **superseded**: the corrected
node is contestable (good, kept) but its `healingRate` magnitude is
**inert as a curve knob** (proven). The human ruled: **abandon the
Remote as the curve lever; demote to minor neutral flavor; carry the
~64% rebound through the already-proven-exercised commander-cards +
assembled-combos.**

**The Remote's FINAL demoted spec (no curve role, no economy
reliance):**

```
// the Remote POST, RE-ARB-2 FINAL — trivial neutral flavor:
"owner":          "neutral",
"defensiveBonus": 0,
"healingRate":    3   // at floor (6,5); inert in capture-post per §4e
```

- This is **exactly the configuration the orchestrator already wired
  during RE-ARB 1** (R.3(ii): `owner:neutral`, `def0`, `heal3`, floor
  (6,5)). **No data change to `data/level-7/map.json` is required or
  ruled by this amendment** — the Remote is simply _re-classified_:
  RE-ARB 1's `healingRate:3` is retained ONLY as flat, faction-agnostic,
  minor on-node regen flavor (a node a passing party can briefly sit on),
  **explicitly NOT budgeted as any pp of the curve**. `healingRate` is
  no longer a loop-tunable curve knob; `[2,4]` latitude is **withdrawn**
  (it measured 0.0pp — there is nothing to tune). `defensiveBonus`
  stays `0` (it must never re-introduce the §3.1 uncontestable-holder
  trap). The §3.1.2 spider-Remote-contest doctrine is **retired as a
  curve mechanism** (the contest may still occur as emergent flavor; it
  carries **0 budgeted pp** and is no longer a ruled invariant / ship-
  gate sub-check). The RE-ARB-1 "Remote flips > 0" acceptance sub-check
  is **withdrawn** (the Remote is no longer load-bearing).
- **No occupation-economy curve reliance anywhere in L7 (§4e honored).**
  The entire rebound is now carried by cards+combos (R2.2), which the
  build proved the frozen AIs genuinely exercise.

### R2.2 The concrete, data-only re-ruled card/combo deltas (lift measured ~43% → ~64%, band [62,66])

**Empirical anchor (orchestrator-verified, not re-derived):** in the
built L7 the ant AI bought **49** / played **39** commander cards per
100 games; Royal Onslaught fired **108×**; Venom Storm fired **93×** —
all three levers are genuinely exercised under the frozen AIs and the
binding §3.2/§3.3 doctrines. **Bracketed cards+combos-only ≈ 43% ant.**
The original L7 ruling priced cards+combos at only +6 to +8pp combined
_because it leaned on the Remote for the bulk of the rebound_ — that
assumption is now falsified twice. To reach the human-ruled **~64%
(band [62,66], above L6 56, separated above L8 ~50)** the player-
favorable card/combo magnitudes must be **re-ruled STRONGER**, net
+19 to +23pp over the 43 floor, bounded by Venom Storm as the ceiling
so it does not overshoot. Engine FROZEN — all deltas are in
`data/level-7/{abilities,roster-ants,roster-spiders,shop}.json`; no new
fields; the only tunable card-data surface is shop pricing + roster
caster mix + the data-resident combo `params` the resolver reads via
`numericParam`.

**(a) Royal Onslaught — the dominant re-ruled engine lever
(`data/level-7/abilities.json`, the `royal-onslaught` entry; verified
data-tunable — `fireRoyalOnslaught` reads `numericParam(def.params,
'damage', 0)` and applies it flat to EVERY living unit in the target
party):**

```
// data/level-7/abilities.json — royal-onslaught.params, RE-ARB-2:
"damage": 26,                       // was 18 — the primary +pp source
"componentAbilities": ["magic-arrow","jelly-apply"],   // unchanged
"mpCostBySource": { "magic-arrow": 2, "jelly-apply": 1 }  // was {3,1}
```

- **`damage` 18 → 26 (+8 flat, to ALL living target units).** This is
  the load-bearing rebound delta. Royal Onslaught fired 108×/100 in the
  build (genuinely exercised, §3.3 binding satisfied) — every one of
  those fires now lands ~44% more damage party-wide, swinging the
  open-arena exchanges the ant's way. This is a _player-favorable net_
  applied to a lever the frozen ant AI demonstrably assembles and fires;
  it is NOT an inert occupation tick. Loop-tunable inside `[24,28]`
  toward [62,66]; the _direction_ (ant-favorable) and the _shape_ (a
  re-ruled-stronger assembled combo as the rebound engine) are ruled
  invariants.
- **`mpCostBySource.magic-arrow` 3 → 2 (availability lever).** The mage
  tier-3 slot funds magic-arrow at cost 3 today; dropping to 2 lets the
  ant assemble Royal Onslaught **more often per game** (more fires ×
  higher damage = the rebound), without any engine change — the
  resolver passes `mpCostBySource` straight to `spendMpOnUnit`. This is
  the §4d-robust "make the exercised lever bite harder" move (it makes
  an already-exercised behavior recur more, not introduce a behavior the
  AI ignores).

**(b) Royal Onslaught assembly made MORE robust
(`data/level-7/roster-ants.json` — composition only, no engine
change):** add one dedicated **ant-worker-bearing party deployed
adjacent to an ant-mage party** so the §3.3 mage+worker partner-pair is
sustainable across more seeds in the open arena. Concretely: recompose
`vanguard-charlie` (currently `ant-worker×3 + ant-footman×2 + ant-
potato-bug×1` at (1,1)) to start adjacent to a mage party (it already
neighbors `vanguard-bravo` (mage) at (0,1) / `pathfinders` (mage) at
(0,2)) and **add a 2nd mage** to the roster's mage supply by promoting
one `pathfinders` archer slot to `ant-mage` (`ant-mage×2 + ant-scout×2

- ant-archer×2`), so a mage partner is reliably within Chebyshev 1 of
the worker party through the battle. This raises the per-seed Royal-
Onslaught fire rate (the §3.3 invariant: provably assembles in a seed-
robust majority — already true at 108×/100; this widens the majority so
the re-ruled `damage:26` lands consistently, not just in lucky seeds).
  Pure roster data; the binding §3.3 ant-combo-adjacency doctrine STAYS
  and now has a sturdier composition to satisfy it.

**(c) Commander-card spend re-ruled stronger via shop pricing
(`data/level-7/shop.json`) — the secondary engine lever.** Cards are
funded by `state.playerGold` (engine const pool / world-loop;
`engine/cards.ts` `buyCard`). The `CARD_POOL` magnitudes (frenzy +2 atk,
quick-strike 8 dmg, mass-heal 4, bulwark +2 arm) are **engine consts —
NOT data-tunable** (engine frozen). The ONLY data-resident card lever in
`data/level-7/` is therefore _card affordability_ and the _competing
shop sink_: lower the L7 shop's combat-consumable prices so the ant's
fixed gold buys MORE card-economy pressure rather than being drained by
shop items. Concretely in `data/level-7/shop.json`:

```
// data/level-7/shop.json — RE-ARB-2 (lower the competing gold sink so
// the ant AI's fixed gold funds more card buys; the build proved the
// ant plays 39/100 — raise that toward ~55/100 by freeing gold):
"sugar-poultice-small": price 35 → 25,
"sugar-poultice-big":   price 90 → 60,
"capsaicin-dram":       price 110 → 70,
"caffeine-crystal":     price 75 → 50
```

This is the data-only proxy for "cards pay off more" with the engine
frozen and `CARD_POOL` un-tunable: cheaper consumables + the unchanged
gold endowment = the ant AI clears its shop wants with gold to spare and
**plays more cards from the deck** (the §3.2 binding is already
satisfied at 39/100; this widens it). Loop-tunable: the orchestrator may
instead/additionally raise the ant gold endowment (loop AI-config, §4b-
permitted) to the same end — the ruled invariant is _the ant card-play
rate increases materially over the measured 39/100 baseline_, the
mechanism (cheaper sink and/or more gold) is loop latitude. **No new
card field; `CARD_POOL` untouched (engine frozen).**

**(d) Venom Storm — the BOUNDED CEILING (`data/level-7/abilities.json`,
the `venom-storm` entry) — re-ruled UP only enough to remain a
registering counter so the ant rebound does not overshoot [66]:**

```
// data/level-7/abilities.json — venom-storm.params, RE-ARB-2:
"damage": 5,                  // was 3 — ceiling stays registering
"movementPenalty": 2,         // unchanged
"attackPenalty": 1,           // unchanged
"durationTurns": 2,           // unchanged
"componentAbilities": ["venom-blast","web-tangle"],     // unchanged
"mpCostBySource": { "venom-blast": 2, "web-tangle": 2 } // unchanged
```

- **`damage` 3 → 5 (modest, ceiling-only).** Venom Storm fired 93×/100
  in the build (genuinely exercised, §3.3 binding satisfied). Raising it
  to 5 keeps the spider's combined-arms answer a _registering_ counter-
  pressure as the ant engine (R2.2(a)) is pushed up — the L5-precedent
  "must register, not tuned to ~0," now applied to bound the _stronger_
  ant rebound. It is deliberately raised LESS than Royal Onslaught
  (5 vs 26, and Royal Onslaught hits the same party-wide shape) so the
  **net is player-favorable** — Venom Storm is the bounded ceiling that
  caps the rebound at [62,66], not the engine. `mpCostBySource`
  unchanged (do NOT make the spider combo cheaper — that would lift the
  ceiling toward overshoot-suppression of the licensed rebound).
- Spider roster (`data/level-7/roster-spiders.json`): **unchanged from
  RE-ARB-1/§4c** — `north-picket`/`south-picket` spinner parties already
  deploy adjacent-capable to `end-guard` (queen); Venom Storm assembling
  93×/100 proves the §3.3 spider-combo-adjacency doctrine is already
  satisfied. No spider composition delta is needed or ruled.

**Net pricing:** measured cards+combos floor **~43%** + Royal Onslaught
`18→26` & cheaper assembly/cards (the dominant re-ruled engine,
+~24 to +28pp over the 43 floor on the 108×/100 + widened fire rate) −
Venom Storm `3→5` (the re-ruled-but-bounded ceiling, −~4 to −6pp on the
93×/100) ≈ **~64%, band [62,66]**, above L6 56, separated above L8 ~50.
No Remote/occupation-economy pp anywhere (§4e honored).

### R2.3 Binding within-loop doctrines

**STAY, byte-identical (the proven-exercised core — confirmed by the
build, NOT reopened):**

1. **§3.2 ant-plays-cards** — the L7 ant AI MUST play commander cards
   from the deck during the assault in a seed-robust majority. Build:
   49 bought / 39 played per 100 — **genuinely exercised, satisfied.**
   Stays; R2.2(c) only _widens_ the play rate via data (cheaper
   competing sink / loop gold endowment), it does not weaken the
   doctrine.
2. **§3.3 combo-adjacency** — the L7 ant AI MUST keep mage+worker
   parties adjacent (Royal Onslaught) and the L7 spider AI MUST keep
   spinner+queen parties adjacent (Venom Storm), each in a seed-robust
   majority. Build: Royal Onslaught 108×, Venom Storm 93× per 100 —
   **both genuinely exercised, satisfied.** Stays; R2.2(b) only adds a
   sturdier ant composition to _widen_ the Royal-Onslaught majority.

**New binding doctrine for the re-ruled magnitudes to bite (§4d/§4e
discipline — named + why it is exercised, not inert):**

3. **§R2.3 ant-prioritizes-Royal-Onslaught-target-on-the-capture-lane.**
   The L7 ant AI MUST direct its assembled Royal Onslaught at the
   spider party **contesting/blocking the ant capture-chain to the
   Mantel** (the engaged front-line spider party on the
   couch→coffee-table→tv-stand→mantel leg), in a seed-robust majority,
   rather than at an incidental/peripheral spider party. **Why it is
   exercised, not inert (the §4d/§4e test):** Royal Onslaught already
   fires 108×/100 under the frozen AI (the _existence_ of the cast is
   proven-exercised); this doctrine only constrains _which enemy party_
   the already-firing combo targets — a within-loop AI target-selection
   policy (engine frozen, §4b-permitted AI-config), exactly the L6-§3.1.2
   / L4-§9.3(b) "make the exercised lever bite where it moves the curve"
   pattern. The `damage:26` swing must land on the party that gates the
   capture-post race (the win condition), not be spent on a rover that
   does not, or the +pp dissipates the way the §4e occupation tick did.
   This is the §4e-compliant analogue of the (now-retired) §3.1.2
   contest doctrine: it ties the re-ruled magnitude to the _exercised,
   curve-moving_ behavior. Existence of capture-lane-prioritized Royal
   Onslaught targeting = ruled invariant; the exact target-scoring
   threshold is loop latitude.

### R2.4 Corrected win-rate prediction + measurable ship-gate + falsification fallback

**Predicted L7 ant win rate: ~64%** (band **[62,66]**) — the human-
ruled rebound, now carried entirely by proven-exercised cards+combos.
Derivation against the orchestrator-verified anchors (no Remote/
occupation pp; §4e honored):

1. **Measured cards+combos-only floor: ~43% ant** (orchestrator-
   bracketed, build-grounded: 49/39 cards, Royal Onslaught 108×, Venom
   Storm 93×, blitz 5% — the genuinely-exercised, NOT-reopened engine).
2. **Re-ruled engine (Royal Onslaught `damage` 18→26 + `magic-arrow`
   MP 3→2 + sturdier mage/worker composition + freed card-spend gold):
   +~24 to +28pp** over the 43 floor. The dominant driver, applied to
   the 108×/100 (widened) genuinely-exercised combo and the 39/100
   (widened) genuinely-exercised card play — §4d/§4e-robust (it makes
   _exercised_ levers bite harder + targets the curve-moving party per
   R2.3, it does not introduce a behavior the frozen AI ignores).
3. **Bounded ceiling (Venom Storm `damage` 3→5, 93×/100 exercised):
   −~4 to −6pp** — the registering spider counter that caps the net at
   [66], not the engine.
4. **Net: ~43 + (~24 to 28) − (~4 to 6) ≈ ~62–66, settling ~64.** No
   occupation-economy pp (§4e); no plane-affinity pp (§4d, §3.5/§4e
   unchanged); blitz 5% unchanged (§3.4).

**Measurable ship-gate (per the L6-§7 measurable-ship-gate /
falsification-fallback discipline; the RE-ARB-1 R.6 gate amended — the
Remote sub-check is RETIRED):** the L7 data ships when BOTH hold on the
deterministic seeds-1..100 `baseline-l7` vs `spider-l7` sweep:

1. **Interest-critic ≥75** (and fun-critic ≥75) on the measured config,
   **AND**
2. **Measured ant win-rate ∈ [62,66] on seeds 1..100, reading as the
   rebound ABOVE the measured L6 56 and separated above the L8 ~50
   continuation.**

The RE-ARB-1 "Remote flips > 0 / bidirectional" sub-check is
**withdrawn** (the Remote is demoted, no longer load-bearing — re-
imposing it would re-introduce the §4e-inert lever as a gate). The
acceptance check is now purely the band + critics (the L6-§7 shape:
measurable, falsifiable, no occupation-economy sub-gate).

**Falsification fallback (the named acceptance risks; same §7/L6-§7
discipline):**

- **If L7 measures below [62] (under-rebound):** the cards/combos
  magnitudes are still too weak — escalate Royal Onslaught `damage`
  toward the `[24,28]` cap, raise the ant card-spend (cheaper shop /
  higher gold endowment), and/or widen the §R2.3 target-priority — the
  re-ruled engine is the corrective lever (NOT the Remote — §4e
  forbids re-budgeting it). Reopens this arbitration per the §7 "ruled
  values are not free knobs" clause.
- **If L7 measures above [66] (overshoot):** Venom Storm is not
  registering enough — raise its `damage` toward 6 (the bounded
  ceiling), or trim Royal Onslaught toward 24. Reopens per §7.
- **If a re-ruled lever is NOT exercised** (the §4d/L4-§9 trap — e.g.
  the §R2.3 targeting doctrine fails to fire so `damage:26` lands on
  irrelevant rovers and the +pp dissipates like the §4e occupation
  tick): re-field the within-loop AI per §3.2/§3.3/§R2.3; reopens per
  §7. **Explicitly FORBIDDEN corrective:** re-introducing any POST
  `healingRate`/`defensiveBonus` occupation economy as a capture-post
  curve lever — that is the §4e-BINDING structural dead-end, falsified
  twice; the corrective is always the exercised cards/combos levers.

### R2.5 Interest-claim delta

The §6 / §4f interest claim is **revised**: the rebound is no longer
"funded by holding the Remote you fight for every turn" (that clause is
**retired** — the Remote is demoted to inert neutral flavor; the §4e
co-located-pause race made that fantasy unreachable under the frozen
engine, twice). The honest, build-true claim: _"In the first open room
your full kit finally comes together — you assemble the big mage+worker
combined strike and play your commander cards, hard enough to turn the
open arena your way — while the spiders weave their own escalating
venom-storm answer."_ The rebound is **earned by assembling and aiming
the combined-arms kit the build proves the AI actually uses** (Royal
Onslaught 108×, cards 39×), contested by the spider's registering Venom
Storm (93×), NOT by an occupation tick the engine cannot make matter.
This is _more_ structurally honest than both prior versions: the
interest payoff now rests entirely on mechanics empirically proven to
fire in the matchup. No change to blitz / plane-affinity / carried-L6
interest content (NOT reopened). The §3.D escalation-with-an-answer
doctrine is preserved (ant combined-arms kit ↑ ceilinged by spider
Venom Storm ↑), now carried by the proven-exercised levers only.

### R2.6 Termination basis

**Termination basis: the §7 / R.6 named falsification fallback, invoked
a SECOND time, plus the recorded human structural corrective.** The
RE-ARB-1 within-loop re-tune + structural Remote correction was itself
empirically falsified (contest went live — 94 flips — but `healingRate`
2/3/4 = 0.0pp: the lever is **structurally inert in capture-post race
conditions under the frozen engine**, now recorded BINDING as
`docs/level-progression-plan.md` §4e). The §4e structural finding makes
further Remote re-tuning futile by construction — the corrective
escalates to the human-ruled abandonment: **demote the Remote (R2.1);
carry the rebound on the proven-exercised cards+combos re-ruled
stronger (R2.2), with new binding doctrine R2.3 and the amended
measurable ship-gate R2.4.** Cards / combos remain the exercised core;
blitz / plane-affinity / carried-L6 state / geometry / every other
level remain ruled invariants, **NOT reopened**. No engine change; data
only (`data/level-7/{abilities,roster-ants,roster-spiders,shop}.json`) —
this document RULES; the orchestrator wires + re-tunes. A built L7
still outside [62,66] reopens again per the §7 clause, corrected by the
cards/combos levers ONLY — never by re-budgeting the §4e-dead
occupation economy.

---

## RE-ARBITRATION 3 (post-dep-#9) — Remote restored as `goldPerTurn` economy

**Status:** Third and intended-final amendment to this document.
Triggered NOT by a falsification but by a recorded human-authorized
**targeted engine un-freeze**: engine dependency #9 is now MERGED
(commit `81216b2`; `1b489f9` impl). This is the realization of the
ORIGINAL `level-progression-plan.md` §4a #3 intent ("Remote currency
POST → bonus gold/turn"), **not a new design** — the Remote was always
meant to be a gold/turn economy node; it only ever became the inert
heal-hack because the engine field that §4a #3 assumed did not exist.
It now does. **Scope is strictly the Remote POST**: restore it from
RE-ARB-2's demoted-neutral-flavor classification to its original §4a #3
**`goldPerTurn` economy** role. Engine is otherwise still frozen — this
amendment uses ONLY the now-shipped opt-in `goldPerTurn` field; no
other engine code, no further schema field.

**NOT reopened (ruled invariants, byte-identical, explicitly
confirmed):** the **RE-ARB-2 cards/combos magnitudes STAND in full** —
`royal-onslaught.damage:26` / `magic-arrow mp:2`, `venom-storm.damage:5`,
the 4 RE-ARB-2 shop price cuts (`sugar-poultice-small` 35→25,
`sugar-poultice-big` 90→60, `capsaicin-dram` 110→70, `caffeine-crystal`
75→50), the 2nd ant-mage roster recompose (R2.2(b)), and the §3.2
(ant-plays-cards) / §3.3 (combo-adjacency) / §R2.3
(RO-on-capture-lane-targeting) binding doctrines — all
**proven-exercised in the build** (Royal Onslaught fired 108×, Venom
Storm 93×, cards bought 49 / played 39 per 100) and were starved ONLY
by the missing in-sim gold that dep #9 now supplies. Also NOT reopened:
plane-affinity (§3.5/§4d/§4e, `data/level-7/units.json` byte-identical
to L6), the spider blitz 5% debut (§3.4/§4d), the carried-L6 state
(§4f), the open-arena geometry, and every other level.

### R3.1 §4e is RESOLVED for the intended expression; the Remote is RESTORED

`docs/level-progression-plan.md` §4e remains a true and BINDING finding
**for the lever it indicts**: a POST `healingRate`/`defensiveBonus`
_occupation economy_ is engine-inert as a `capture-post` curve lever —
the `post-capture.ts` co-located-pause rule makes a contested
capture-post a winner-take-all Manhattan race, never the oscillating
co-occupation a per-turn _heal_ tick needs to accrue (the exact
mechanism that falsified L7's Remote three times: build 99%, RE-ARB-1
55% with `healingRate` 2/3/4 = 0.0pp, RE-ARB-2 demotion). **§4e is NOT
overturned.** What dep #9 changes is that the §4a #3 economy is no
longer expressed _as the §4e-indicted occupation heal-hack at all_ — it
is expressed as **ownership-based gold income**, a structurally
different lever §4e never indicted and which **sidesteps the §4e race
by construction**:

- **Re-derived from source — exact dep-#9 semantics** (`engine/end-of-
turn.ts` `applyPostGoldIncome`, step 1a, lines ~221–273 + 815–826;
  `engine/schemas/map.ts` `goldPerTurn` lines ~114–129; verified
  against `engine/gold-per-turn.test.ts`): each end-of-turn, for every
  POST with `goldPerTurn > 0` whose `owner ∈ {ant, spider}` (a REAL
  faction), the **owning faction's `state.playerGold` is credited
  `goldPerTurn`** and a `gold-earned` (`source:'post'`) event emitted.
  `owner:"neutral"` ⇒ **0** credited (no faction match). An ownership
  flip moves the income to the new owner **the next turn** (test:
  "ownership flip moves the income to the new owner next turn").
  Absent/`0` ⇒ literal no-op (every shipped map byte-identical, gate-29
  baseline preserved). Crucially the credit is **on OWNERSHIP, NOT
  co-location**: the owning party need not stand on the node (test:
  "ownership, not co-location"; the synthetic POST sits on a corner
  tile no party occupies and still pays out).
- **Why this sidesteps the §4e co-located-pause race (the structural
  point):** the §4e dead-end was that a _heal_ tick requires sustained
  contested _co-occupation_, which `post-capture.ts` forbids
  (co-located → pause; winner-take-all race). `goldPerTurn` requires
  **only ownership** — it is paid to whoever _owns_ the node whether or
  not anyone stands on it, whether or not it is contested that turn.
  The §4e race that "never lets the per-turn tick accrue as a
  differential" simply does not apply: income accrues every turn of
  ownership regardless of the capture-clock pause state. This is the
  precise property `engine/gold-per-turn.test.ts` proves and the
  precise reason dep #9 was the authorized un-freeze. **§4e's binding
  guidance ("do NOT spend a capture-post curve budget on a POST
  _occupation_ economy") is honored** — the L7 curve budget is NOT on
  an occupation heal/def economy; it is on an ownership _gold-income_
  economy feeding the shipped card market, a different and now-shipped
  lever. The R2.1 statement that the Remote is "inert neutral flavor"
  is **superseded for the gold-income expression only**; the §4e
  occupation-economy prohibition stands untouched.

The Remote is therefore **RESTORED**: from RE-ARB-2's demoted
neutral-flavor classification back to its original
`level-progression-plan.md` §4a #3 role — a contestable currency POST
whose ownership funds the owner's card market. RE-ARB-2's demotion was
correct _for the heal-hack expression under the then-frozen engine_; it
is now obsoleted by the authorized engine field, exactly as RE-ARB-1's
heal correction was obsoleted by RE-ARB-2's §4e finding. This is a
linear escalation chain reaching its designed terminus, not a
re-litigation.

### R3.2 Concrete restored Remote spec (data-only, shipped `goldPerTurn`)

Wired into `data/level-7/map.json` over the current demoted Remote
(`owner:"neutral", defensiveBonus:0, healingRate:3 @ floor (6,5)`):

```
// the Remote POST, RE-ARB-3 FINAL — §4a #3 goldPerTurn economy:
"owner":          "neutral",   // contestable; capture to fund YOUR market / deny enemy's
"goldPerTurn":    4,           // loop-tunable band [3,6]; the §4a #3 economy
"defensiveBonus": 0,           // STAYS 0 — the §4e/RE-ARB-1 load-bearing fix; never reintroduce the unbeatable on-node holder
"healingRate":    0,           // remove the inert heal-hack entirely — economy is GOLD now, no confound
"location": { "plane": "floor", "x": 6, "y": 5 }  // stays the RE-ARB-1 on-path tile
```

- **`owner: "neutral"`** — the Remote is **contestable and unowned at
  start**: while neutral it pays _nobody_ (dep #9: neutral ⇒ 0), so
  there is no §3.1-class always-on subsidy at the root. A faction must
  **capture it** (the shipped `post-capture.ts` 2-turn solo hold) to
  begin earning; **capturing it both funds YOUR card market AND denies
  the enemy's**. This is the §3.1(c)/RE-ARB-1-contemplated
  `owner:"neutral"` corrective, now finally attached to a lever that
  can express it.
- **`goldPerTurn: 4`, loop-tunable band `[3, 6]`** — reasoned against
  the card-market anchor (`engine/cards.ts` `CARD_POOL`: card costs
  25–60, mean ~40, `MARKET_SIZE 6`, `HAND_CAP 3`; the RE-ARB-2 shop
  cuts free the ant's fixed gold so the deck is the live sink) over a
  ~55–90-turn game. A faction that holds the Remote across a realistic
  back-half ownership window (~30–55 owned turns) banks ~120–220 gold
  at `4`/turn ≈ **~3–6 card buys** — _materially_ funding the card
  market RE-ARB-2 priced as the rebound engine, without being an
  instant runaway (a full-game ~80-turn hold ≈ 320 ≈ ~8 cards is
  strong but earned and contestable, not the §3.1 +39pp instant trap;
  the spider can capture it to zero the ant's income and fund Venom
  Storm instead). `3` is the low edge (risks under-funding if hold
  windows are short — escalate within band); `6` is the high edge
  (approaching runaway — trim if overshoot). `4` is the ruled starting
  midpoint; the band `[3,6]` is the loop's tuning latitude toward
  [62,66]. The **shape** (ownership `goldPerTurn` income feeding the
  shipped card market) and **net direction** (ant-favoring via faster
  capture + the §3.2/§R2.3 card/RO doctrines) are ruled invariants;
  the magnitude is the knob.
- **`defensiveBonus: 0` STAYS** — this is the load-bearing
  §4e/RE-ARB-1 fix and is a **ruled invariant**. `defensiveBonus`
  protects only a defender whose faction `=== post.owner`
  (`engine/turn.ts` `assignSides`); any nonzero value reintroduces the
  RE-ARB-1-diagnosed _unbeatable on-node holder_ that made the node
  permanently uncapturable (the original 99% trap). It MUST remain `0`
  so the contesting party can win the co-located fight, drive the
  holder off, and complete the 2-turn capture — i.e. so ownership can
  genuinely flip, which is exactly what gates the gold income.
- **`healingRate: 0`** — remove the inert heal-hack **entirely**. The
  economy is gold now; leaving any `healingRate` on the Remote would be
  a §4e-inert confound (it contributes 0 curve pp by the §4e finding
  and muddies the measurement). Clean: gold-income economy, zero
  occupation-heal.
- **Placement stays the RE-ARB-1 on-path `floor (6,5)`** — the central
  contested capture-lane tile on the couch→coffee-table→tv-stand→mantel
  leg, NOT the original NE-detour pocket. Contesting it is a real
  **garrison-split on the route the spider already defends**, not the
  open-arena turkey-shoot detour. Even though `goldPerTurn` is
  ownership-based (no co-occupation needed), on-path placement keeps
  the _capture/recapture_ fight a genuine recurring decision both AIs
  route through rather than an ignorable corner node.

This is the §4a #3 design, finally expressible: data-only on the
shipped `goldPerTurn` field; no engine code, no further schema field.

### R3.3 Binding within-loop doctrine — now MEANINGFUL & race-proof

The §3.1.2-class Remote-contest doctrine is **RESTORED as a ruled
invariant and a ship-gate sub-check** (it was retired in RE-ARB-2
_because the §4e heal-hack made it inert_; dep #9 makes it meaningful
and the §4e race no longer applies):

- **Spider side (`ai/spider-l7.ts`):** the spider AI **MUST** sortie
  to contest/capture the Remote — to **deny the ant's card economy**
  (a neutral or spider-held Remote pays the ant 0) **and fund its own**
  (a spider-held Remote credits `state.playerGold.spider`, the pool
  Venom Storm support / the spider deck draws on). With
  `defensiveBonus:0` and `owner` not ant, the rover can win the
  co-located fight and complete the 2-turn capture. The sortie is a
  genuine garrison-split on the lane it already defends (R3.2 on-path).
- **Ant side (`ai/baseline-l7.ts`):** the ant AI **MUST** capture and
  hold/retake the Remote to fund its RE-ARB-2 card market (the §3.2
  ant-plays-cards engine). The ant captures first (closer approach,
  on-path, Royal-Onslaught support per R2.3) but can lose it back when
  the spider rover wins — income is **earned the turns it owns the
  node, zero the turns it does not**.
- **Why it is now race-proof (the structural correction vs RE-ARB-1/2):**
  `goldPerTurn` accrues on **ownership**, not co-occupation, so the
  §4e co-located-pause race that flattened the heal differential to
  0.0pp **does not apply** — every turn a faction owns the Remote it is
  credited, full stop, regardless of the capture-clock pause state.
  Ownership flips therefore _do_ translate into a curve-shaping gold
  differential (the heal version provably did not). This is a **genuine
  recurring bidirectional contest** with real economic stakes for both
  sides.
- **Ship-gate sub-checks (BOTH required, restored & sharpened):**
  (a) **Remote ownership genuinely contests** — flips > 0 AND
  meaningfully bidirectional across the deterministic seeds-1..100
  sweep (directly contradicting the falsifying 0/100 of the original
  build; this sub-check, withdrawn in RE-ARB-2 as the lever was inert,
  is **re-imposed** because the lever is load-bearing again); AND
  (b) **the ant card economy is funded** — card buys/plays materially
  exceed the **starved ~1 bought / ~0 played** baseline of the
  cards+combos-only RE-ARB-2 falsification configuration (i.e. the
  in-sim gold the Remote now supplies demonstrably reaches the card
  market — gold-earned `source:'post'` events for the ant > 0 and ant
  card buys rise materially above the gold-starved floor).

The contest _existence_ and the _card-economy-funded_ condition are
ruled invariants; the spider aggression / holder-concede HP knobs, the
exact in-band tile, and the `goldPerTurn` magnitude within `[3,6]` are
the loop's tuning latitude toward [62,66].

### R3.4 Corrected win-rate prediction: ~64% (band [62,66])

**Predicted L7 ant win rate: ~64%** (band **[62,66]**, clearly above
the measured L6 **56** and separated above the L8 ~50 continuation) —
the human-ruled rebound target, **unchanged**; this amendment corrects
the _mechanism that delivers it_ (Remote-funded card market instead of
a starved one), not the target. Derivation against the
orchestrator-verified anchors:

1. **Cards+combos measured ~43% — but ONLY because gold-starved.** The
   RE-ARB-2 bracketed "cards+combos-only" config measured ~43% ant with
   the card economy _starved_ (no in-sim gold source existed: ~1
   bought / ~0 played in the gold-starved bracket; the 49/39 figure was
   the build's between-scenario-seeded gold, not an in-sim
   self-sustaining economy). The RE-ARB-2 magnitudes (`royal-
onslaught.damage:26`, `venom-storm.damage:5`, the shop cuts, the
   mage recompose) are proven-exercised and STAND — they were never the
   problem; they were _under-fed_.
2. **A Remote-funded card market + the standing RE-ARB-2 magnitudes →
   the ruled ~+21pp rebound.** dep #9 supplies the missing in-sim gold:
   holding the Remote credits `state.playerGold` (`buyCard` spends
   exactly that pool), so the RE-ARB-2-priced card market — already
   proven to be a lever the frozen ant AI exercises when funded —
   finally runs at its ruled magnitude through the whole scenario. The
   ~43% gold-starved floor + the now-funded card/combo engine
   (RE-ARB-2's `damage:26` RO landing on the §R2.3 capture-lane target
   - the freed/funded card deck) delivers the bulk of the rebound;
     bounded by the spider's RE-ARB-2 Venom Storm `damage:5` ceiling
     (93×, registers) AND the spider's own ability to capture the Remote
     to zero the ant's income — net **~+21pp** over the starved floor →
     **~64**, settling within [62,66].
3. **Net: ~43 (gold-starved cards+combos floor) + ~+21pp (Remote-funded
   card market at the standing RE-ARB-2 magnitudes, contest-bounded by
   spider Venom Storm + spider Remote-capture) ≈ ~64, band [62,66].**
   No occupation-economy pp (§4e honored — the economy is gold income,
   not a heal tick); no plane-affinity pp (§3.5/§4d, none); blitz 5%
   unchanged (§3.4).

**Measurable ship-gate** (the L6-§7 / RE-ARB-2 R2.4 discipline,
amended to re-impose the Remote sub-checks now the lever is
load-bearing again): the L7 data ships when ALL hold on the
deterministic seeds-1..100 `baseline-l7` vs `spider-l7` sweep:

1. **Interest composite ≥ 75** (fun-critic AND interest-critic ≥75) on
   the measured config, **AND**
2. **Measured ant win-rate ∈ [62,66]**, reading as the rebound ABOVE
   the measured L6 56 and separated above the L8 ~50 continuation,
   **AND**
3. **The R3.3 contest/funding sub-checks both hold** — Remote ownership
   flips > 0 and is meaningfully bidirectional across the sweep; AND
   the ant card economy is materially funded (ant gold-earned
   `source:'post'` > 0 and ant card buys/plays materially exceed the
   gold-starved ~1/~0 RE-ARB-2 baseline).

**Falsification fallback — the explicit FOURTH-failure escalation
clause:** if, after this amendment is wired and loop-tuned within its
ruled latitude (`goldPerTurn ∈ [3,6]`, the contest/concede HP knobs,
the exact in-band tile), L7 still cannot reach [62,66] with the R3.3
sub-checks holding, that is **L7's FOURTH failure** (build 99%,
RE-ARB-1 55%, RE-ARB-2 still-starved, and now this) and a **genuine
escalation beyond any remaining engine knob**. The authorized engine
un-freeze (dep #9) is the _last_ engine lever — it was the realization
of the original §4a #3 intent and **no further engine knobs remain**
(no additional schema field, no further un-freeze is contemplated; the
RE-ARB-2 cards/combos magnitudes are at their ruled values and are not
the diagnosed problem). A fourth failure would therefore mean L7's
scenario **identity** itself is non-viable under the engine — i.e. the
`capture-post` Living-Room concept with this lever set cannot express
the licensed ~64 rebound — and the corrective is **NOT another lever
re-tune** but the `level-progression-plan.md` §4.1
**reorder/replacement license**: L7's scenario identity needs redesign
(a different victory kind / room concept), explicitly invoked. This
amendment states that escalation clause **explicitly and in advance**:
RE-ARB-3 is the intended-final mechanism correction; a fourth failure
escalates to scenario-identity redesign, not to a fifth re-arbitration
of the same lever set.

### R3.5 Not reopened — explicit confirmation

The following are **NOT reopened** and remain ruled invariants,
byte-identical:

- **Plane-affinity (§3.5/§4d, §4e sibling theme):**
  `data/level-7/units.json` `planeAffinity` = `data/level-6/units.json`,
  **byte-identical**; not budgeted; empirically inert; no delta.
- **Spider blitz 5% debut (§3.4/§4d):** real measurable 5%, unchanged.
- **The RE-ARB-2 card/combo magnitudes (R2.2, R2.3):**
  `royal-onslaught.damage:26` / `magic-arrow mp:2`,
  `venom-storm.damage:5`, the 4 RE-ARB-2 shop price cuts, the 2nd
  ant-mage roster recompose, and the §3.2 / §3.3 / §R2.3 binding
  doctrines — **STAND in full**, proven-exercised, NOT reopened. They
  were under-fed, not mis-priced; dep #9 feeds them.
- **The carried-L6 state (§4f):** Step-Landing ability/affinity state,
  hypnotize cap, recruit-as-order, Light-Switch payload + §9
  AI-doctrine, venom-blast weak cap, plane-switch coverage —
  byte-identical, not relitigated.
- **Every other level:** untouched.

This document RULES; the orchestrator wires the R3.2 Remote spec into
`data/level-7/map.json` (the now-shipped `goldPerTurn` field), restores
the R3.3 binding within-loop doctrine + ship-gate sub-checks, and
re-tunes within the ruled `[3,6]` latitude toward [62,66]. No engine
change beyond the already-merged dep #9; data + the merged opt-in field
only. A built L7 still outside [62,66], or with the R3.3 sub-checks
failing, triggers the R3.4 FOURTH-failure scenario-identity-redesign
escalation — not a fifth lever re-arbitration.
