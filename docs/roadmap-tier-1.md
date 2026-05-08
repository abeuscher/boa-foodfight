# Roadmap — Tier 1 (Scenarios 1–10)

## Purpose

This document is the execution plan for **Tier 1** of boa-foodfight: the first
ten scenarios, beginning in the bathroom and expanding through a small house.
It synthesizes three sources:

1. **`game-outline.md`** — the static game spec. This roadmap _references_ it
   (Tier 1 framing in "Campaign structure"; Level 1 detail in "Level 1: Ants
   vs Spiders"). It does not redefine those.
2. **`docs/design-memo-tbs-expert.md`** — the TBS expert memo (Ogre Battle,
   StarCraft, Civ IV). Cited as "TBS memo §X.Y".
3. **`docs/design-memo-mechanics-research.md`** — the mechanics research memo
   (FF3, Chrono Trigger, Risk 2210, deeper OB). Cited as "Mechanics memo §X.Y".

Plus the user's progression-plan kickoff (preserved verbatim where authored,
expanded with bridging context where needed).

This is an engineering plan — practical, phased, with clear entrance and exit
criteria. It does not introduce new untested mechanics; it sequences and
distributes mechanics that already have specs.

---

## Table of contents

1. Goal and scope
2. Phase boundaries and the closing of the Level-1 build
3. Mechanics progression (reverse-engineered)
4. Setting progression (forward-engineered)
5. Win-rate curve
6. Agent architecture
7. Tensions resolved
8. Open questions
9. Implementation phasing
10. Cross-references

---

## 1. Goal and scope

**Tier 1 = 10 scenarios.** End state: a player can complete a 10-scenario
campaign with mechanic and environmental variety across the run, the world
loop functions between scenarios (roster persistence, party management,
recruiting, shop), and an agent system manages progression design.

The static spec (`game-outline.md`, "Campaign structure") frames Tier 1 as
"the bathroom expanding to the full house. Party cap: 8. Currency: buttons.
New units introduced one or two per scenario, accumulated." This roadmap
covers _execution_: the order things land in, the agents that decide which
mechanics go where, and the criteria for moving between phases.

Not in scope: Tier 2+ scaling (yard, neighborhood, block); new _unit_
mechanics beyond the spec and the two memos (environment invention is
in-scope); visual presentation (per `game-outline.md`, "no graphics in the
planning phase").

---

## 2. Phase boundaries and the closing of the Level-1 build

The team has been building forward by layering mechanics onto a single
end-state Level-1 build. The user's plan (verbatim):

> I've been building this scenario forward by layering new mechanics onto a
> single end-state version of the game. Once we wrap the current stage of
> work — at whatever level of complexity feels like the right place to close
> it out — the next phase is to build out a 10-scenario progression with a
> compelling arc.

Closing the Level-1 build means landing the queued mechanics from the
mechanics memo in the user's chosen order and then declaring Level 1 frozen
as the canonical "all mechanics on" reference scenario. The queue:

| Order | Mechanics-memo § | Mechanic                                  |
| ----- | ---------------- | ----------------------------------------- |
| 1     | §1.6             | Hard turn-cap with score-based tiebreaker |
| 2     | §1.5             | Formation slots (front-row / back-row)    |
| 3     | §1.1             | Tiered MP pool ("spell-level slots")      |
| 4     | §1.2             | Combo abilities (dual techs)              |
| 5     | §1.3             | Commander cards (gold sink)               |
| 6     | §1.4             | Charisma-gated promotion chain            |

Order rationale (preserved from the mechanics memo §4): score-tiebreaker
ships first because it's "almost free and unblocks better diagnostics for
every other rec"; formation slots second because they fix a latent flaw in
the already-shipped row-blind combat resolver; tiered MP third because it
fixes the flat-`uses` ability counter; combos and cards extend systems
already built (party adjacency, gold); charisma promotion lands last because
it depends on retreat (R15/R16) and recruit (R10) being in their final
shape, both of which are already in the build.

**Phase A exit criterion** (closing the Level-1 build): all six mechanics
above are in the build, the rebalance loop has produced a Level-1
configuration that hits the win-rate band (currently `[55%, 65%]` from
`STATUS.md`; for Tier-1 framing we relax this to **L1 = 75%** per §5
below — top of the spec range), and the Fun Critic rubric is satisfied
against the end-state config (mechanics memo §4 implicitly assumes this; the
Fun Critic is non-optional per `PLAN.md`).

After Phase A, the build pivots from "single scenario, all mechanics on" to
"ten scenarios, mechanics distributed."

---

## 3. Mechanics progression (reverse-engineered)

This is a **reverse-engineering problem**. The user's plan (verbatim):

> Mechanics progression is a reverse-engineering problem. We have an end
> state with a lot of layered mechanics. We need to work backward from that
> to figure out the order in which to introduce them across 10 levels.
>
> Work backward from the round-10 end state to figure out the first 10
> scenarios. Start with a manageable set of troop types — say 2 on each side
> — stripped down in number of choices and, where feasible, in abilities
> (acknowledging that most units currently do one thing, so ability-stripping
> may be limited in practice). POSTs can be fixed-location to begin, with
> randomization added as a later progression step. Retreat (which applies to
> both sides) is another mechanic to fold in early. We should identify what
> stripped-down lineups on each side make sense to provide balanced gameplay
> that becomes both more difficult and more complex as it moves forward.

Two notes on agent autonomy:

- The specific round at which each mechanic enters is **not prescribed**.
  The Gameplay Progression Agent (defined in §6) decides distribution within
  the bounds below.
- Where this section gives an illustrative slot ("L2", "L4ish"), treat it
  as a hint, not a constraint.

### 3.1 Hard floors (from `game-outline.md`)

These are **not** negotiable — they are spec constraints:

- **Pheromone trail / advanced fog**: full pheromone-erasure mechanic is
  L2+. Level 1 uses simple persistent fog (game-outline, "Fog of war").
  Tier-1 mode keeps the current Level-1 partial-information layer (TBS memo
  §1.5 `pheroTrail`) as a scaled-down baseline; the L2+ erasure mechanic
  layers in starting at L2.
- **Class change**: deferred to ~L3+ (game-outline, "Class change"). The
  charisma-gated promotion chain (mechanics memo §1.4) is the v1 implementation
  shape; the Gameplay PA may not introduce it before L3.
- **Party cap = 8** throughout Tier 1 (game-outline, "Campaign structure").
  This rules out scaling tools (formations templates, standing orders) that
  the spec reserves for tier transitions.

### 3.2 Stripped-down opening (L1)

Per the user's plan: **two unit types per side.**

The natural pair on each side, working backward from the current Level-1
roster:

- **Ants:** Queen + ant-footman. The footman is the workhorse melee unit;
  the Queen is a spec-required immobile commander. This gives a single
  field-deployable type plus the home-base anchor — minimum viable while
  preserving the spec's queen-loss-condition shape.
- **Spiders:** Spider-queen + spider-soldier. Same reasoning: one
  field-deployable melee type plus the queen.

Abilities at L1 are stripped to: queen ultimate (spec-locked, must exist),
basic fight/defend/run postures, and a single information ability so the
fog layer has _something_ to interact with. The user's note on
ability-stripping limits is preserved verbatim:

> acknowledging that most units currently do one thing, so ability-stripping
> may be limited in practice

So "stripped" here means "no Royal Jelly application, no plane-switch as
order, no recruit, no combos, no cards, no promotion." The ability inventory
that does ship at L1 is small and deliberately pedagogical.

### 3.3 Sketch distribution (illustrative; the Gameplay PA picks the actual slots)

| Phase | Scenarios | Mechanics that enter (cumulative)                                                                                                                                                                                                                                   |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Early | L1–L3     | Stripped pair; basic fog; **retreat** (both sides, early per user); Royal Jelly resupply; pheromone-erasure (L2+); class-change groundwork (L3+)                                                                                                                    |
| Mid   | L4–L7     | POST randomization; archer / mage class addition; combo abilities (mechanics §1.2); plane-switch asymmetric costs (TBS §1.4); plane-affinity (TBS §1.3); commander cards (mechanics §1.3); leader-driven party identity (TBS §2.1)                                  |
| Late  | L8–L10    | Tiered MP slots (mechanics §1.1); charisma-gated promotion (mechanics §1.4); day/night cycle (TBS §1.2); civic slot system (TBS §2.2); score-based tiebreaker active in all scenarios (mechanics §1.6); aggression score (TBS §2.4); espionage queen-ult (TBS §2.5) |

Specifically called out by the user:

- **Retreat** is currently in the late R15/R16 build but should appear early
  (likely L2): "Retreat (which applies to both sides) is another mechanic to
  fold in early."
- **POST randomization** should be **L1 fixed**, with randomization added
  around L4 so the player has time to learn POSTs as fixed strategic anchors
  before they become variable.
- The six **queued mechanics** from §2 are the late-game payoff — not all
  six need to be in by L10, but the Gameplay PA should target landing the
  highest-leverage ones (score tiebreaker, formation slots, tiered MP) by
  the mid-Tier transitions and saving the most disruptive (cards, charisma)
  for L8–L10 climaxes.

### 3.4 Constraints the Gameplay PA must respect

1. **Hard floors above** (§3.1).
2. **Cumulative addition only.** Once a mechanic is introduced at scenario
   N, it remains active through L10. No mechanic is "removed" mid-Tier.
   This matches the spec's accumulation framing ("New units introduced one
   or two per scenario, accumulated").
3. **At most one new high-cognitive mechanic per scenario.** Two stat-tunes
   plus a new mechanic is fine; two new mechanics in one scenario is not.
   This is to preserve learnability — the player should be able to identify
   "what's new this level" in one sentence.
4. **The win-rate curve in §5 trumps mechanic placement.** If shipping
   mechanic X at scenario N pushes the win rate outside the curve target,
   the PA reschedules.

---

## 4. Setting progression (forward-engineered)

This is a **forward-engineering problem**. The user's plan (verbatim):

> Level/environment progression is a forward-engineering problem. Right now
> there's effectively one level. Variety in the environment — different room
> shapes, new POST types, possibly entirely new environment mechanics —
> needs to be invented going forward, not pulled apart from something we
> already have.
>
> The gameplay progression is solid, but the setting progression needs to
> be built out — there's effectively one environment today, and we need
> variety across the 10 levels. The playfield is 6 grids describing the
> walls of a room, so room shape is a real lever. I want to experiment with
> different-shaped rooms: a long rectangular hallway, a narrow pipe-like
> space, and so on. Other levers include growing the room, introducing
> additional unit types, and — importantly — establishing new types of POSTs
> or even new environment mechanics entirely if that pushes the interest
> and fun ceiling higher. This is invention work, not deconstruction.

The user added a logical-progression idea:

> A nice logical room progression is: We are in the bathroom in level one.
> We can go from there into the bedroom, then a hallway, then maybe a
> flight of stairs makes an interesting level; point being; as we take
> control of the house, it can be a logical progression through rooms as
> you might find in a standard small home layout of ten total rooms
> (perhaps including attic and basement for another sort of variety). I am
> open to other ideas as well we could also go from the bathroom into a
> pipe and then into a kitchen through plumbing, for instance. The idea is
> to provide a thin layer of game world context aware logic to the level
> progression.

### 4.1 Proposed 10-room sequence

Treat this as a strong recommendation that the Level Progression Agent
refines but does not throw out wholesale. Each entry sketches geometry and
distinguishing POST flavor.

| #   | Room        | Geometry                                                                                               | POST flavor (replaces / extends spec POSTs)                                                       | Distinguishing setting mechanic                                                         |
| --- | ----------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| L1  | Bathroom    | 10×10, six planes, near-square. Spec-locked layout.                                                    | Storm Drain, Soap Dish, Towel Rack, Wall Crack, Spider Web (per `game-outline.md`)                | Baseline. Spec-faithful.                                                                |
| L2  | Pipe        | Long narrow tube — 4×16, two planes (inner-floor, inner-ceiling). Cross-room passage shape.            | Pipe-Joint (T-intersection POST), Drain-Cap, Trap (the U-bend) — chokepoints, not strongholds.    | One-dimensional combat. Plane-switch is the only flank. Pheromone-erasure intro.        |
| L3  | Kitchen     | 10×10 with a center "island" (impassable cluster). Two rooms-worth of POSTs.                           | Crumb-Pile (Soap-Dish equivalent), Counter-Edge (height-advantage POST), Sink-Drain (transition). | Class-change groundwork: first promotion-eligible units appear here.                    |
| L4  | Hallway     | Long rectangle 6×16. Two ceiling planes, one floor. POSTs randomized within constrained regions.       | Doorway POSTs (multiple), Light-Switch (a flip-state POST that toggles a global modifier).        | **POST randomization debuts** here. POSTs land in fixed regions, randomized within.     |
| L5  | Bedroom     | 10×10 with a bed (large impassable region splitting plane).                                            | Under-Bed (concealment POST: occupants fog-immune), Pillow-Fort (high def-bonus POST).            | First "concealment" POST type — adds an info-asymmetry knob.                            |
| L6  | Stairs      | Vertical traversal level. 4-wide stack of 5 floor planes. Movement up/down restricted by unit type.    | Step-Landings (one per stair). No conventional POSTs; each landing IS a POST.                     | **Vertical traversal** as a setting mechanic. Flying / climbing units strongly favored. |
| L7  | Living room | Large 14×14, irregular L-shape, three furniture clusters (couch, coffee table, TV stand) as obstacles. | Couch-Cushion (large defensive POST), Remote (a "currency" POST awarding bonus gold per turn).    | First map larger than 10×10. Cards economy starts paying off here.                      |
| L8  | Attic       | Cramped 8×8, low ceiling clipped to 5×5 ceiling plane. Boxes everywhere. Heavy obstacle density.       | Trunk (treasure-style POST), Rafter-Beam (unique ceiling POST), Skylight (one-way plane transit). | Variety bookend #1. Unit-size cost penalties for large units.                           |
| L9  | Basement    | 12×12, dim. Pools-of-water hazard tiles. Underfloor plane introduced (spec future plane).              | Boiler (hazard-emitting POST), Workbench, Sump-Pump (water-control POST flips hazards on/off).    | Variety bookend #2. First scenario with a player-controllable environment mechanic.     |
| L10 | Garage      | 16×12 climax map. Multi-cluster geometry (workbench, car, shelving). All Tier-1 mechanics active.      | Tool-Rack (shop-extension POST), Garage-Door (large transition POST), Engine-Block (boss-arena).  | Tier-1 finale. All systems on. Day/night cycle activates here.                          |

Two design notes:

- **Stairs (L6) and the pipe (L2)** are deliberately the most
  geometry-divergent rooms. The user called out the pipe and stairs
  explicitly; both serve as natural "format-break" scenarios that prevent
  the tier from feeling like ten variations on one room.
- **Cross-room passages.** L2 (pipe) and L9 (basement underfloor) double as
  physical bridges in the campaign narrative. The user's "pipe between
  bathroom and kitchen" idea is folded into L1→L2→L3 as a continuous
  passage motif. The narrative bridge from L1 (spider queen swears fealty,
  helps relocate the Ant Queen) is now "the colony moves through the wall
  pipe to the kitchen sink."

### 4.2 Per-scenario setting deliverables

Each scenario must specify:

1. Plane geometry (which planes, dimensions).
2. POST list (5–8 per room, mostly room-specific flavors).
3. Obstacle map (impassable / hazard tiles).
4. Plane-transition pairings.
5. Starting positions for both factions (party count + per-party
   composition).
6. Any new environment mechanic (e.g., L4's light-switch flip-state, L9's
   sump-pump).

The Level Progression Agent owns this output.

---

## 5. Win-rate curve

User's plan (verbatim):

> Win rate should move from 75/25 in the ants' favor at the outset to
> roughly 50/50 by level 10 — these targets are loose. We're running 100
> games at a stretch and "interesting" is a meaningful metric that can
> override "fair." The curve doesn't need to be monotonic; an occasional
> surprising spike — a hard level before the end, for instance — is a good
> thing for the player and the agents should feel free to use those.

`game-outline.md` specifies a Level-1 baseline of **65–80%** ant wins. Two
ranges to reconcile:

- Level-1 (spec): `[65%, 80%]`.
- Tier-1 curve (user plan): start `≈75%`, end `≈50%`.

**Reconciliation:** L1 is set at the **top of the spec range** (~75%). L10
sits at ~50%. Intermediate scenarios fall on a non-monotonic curve. An
illustrative shape:

| Scenario | Target ant win rate | Notes                                                  |
| -------- | ------------------- | ------------------------------------------------------ |
| L1       | 75% (±5)            | Top of spec range. Stripped-down, tutorial-friendly.   |
| L2       | 72%                 | New mechanic (pheromone-erasure, retreat). Slight dip. |
| L3       | 70%                 | Class-change groundwork. Slight dip.                   |
| L4       | 60%                 | POST randomization shock. Spike toward spider.         |
| L5       | 65%                 | Concealment POSTs. Player adapts; rebound.             |
| L6       | 55%                 | Stairs. Geometry novelty favors the defender (spider). |
| L7       | 65%                 | Living room. Player has access to cards. Rebound.      |
| L8       | 50%                 | Attic. Spike — "hard level before the end" per user.   |
| L9       | 60%                 | Basement. Player exploits sump-pump.                   |
| L10      | 50%                 | Garage. Tier finale. Genuinely close.                  |

Numbers are illustrative; the Gameplay PA + faction sub-agents (§6) refine
the actual curve. The "interesting > fair" override is licensed: if a
scenario produces compelling play at 45/55 or 60/40, that's preferable to
forcing it back to spec.

The Level-1 spec window (`[65%, 80%]`) acts as a **hard ceiling and floor**
for L1 only. L2–L10 are governed by the Tier-1 curve, not the L1 spec.

---

## 6. Agent architecture

User's plan (verbatim):

> A secondary (and equally important) goal of this project is exercising
> multi-agent orchestration: where there's a natural opportunity to split
> responsibilities across agents, we should take it. Building a genuinely
> fun game with AI is one of the open white whales in this space, and the
> multi-agent angle is part of what makes it worth chasing. This is roadmap
> work — flagging it now so the plan is in place when we get there.

The architecture is two-tier:

### 6.1 Per-scenario (existing)

The current designer-agent system (firepower / strategy designers per
faction; Fun Critic; metrics critic; spec-compliance critic) continues to
operate **inside any given scenario** for tuning. See `STATUS.md` (Phase-6
coevolution loop) and `PLAN.md` Phase 1. These agents are not modified by
Tier-1 work; they tune at the Gameplay PA's request.

### 6.2 Across-scenario (new)

Three new roles:

#### Gameplay Progression Agent

User's plan (verbatim):

> Add a Progression Agent. Let it learn the pivots by which complexity is
> going to be adjusted, and let it decide how to distribute that complexity
> across the 10 levels.

Responsibilities:

- Owns the mechanics-progression problem (§3).
- Distributes the inventory of mechanics across the 10 scenarios within the
  hard floors.
- Arbitrates between the two faction sub-agents.
- Targets the win-rate curve in §5.
- Cuts off sub-agent debate when it has heard enough.

#### Faction sub-agents (ant + spider) — adversarial pair under the Gameplay PA

User's plan (verbatim):

> Under the Gameplay Progression Agent, set up two faction sub-agents — one
> per side — each advocating for its faction's experience and win
> conditions. The tension between them is itself a balance signal:
> imbalances should surface faster through their disagreement than through
> neutral playtesting alone. They also keep the progression from drifting
> toward symmetric, samey design by fighting for each faction's mechanical
> identity. This is also where "interesting can override fair" gets
> operationalized: two adversaries arguing about a level is a more concrete
> way to find the right tradeoff than a single agent trying to balance both
> goals in its own head. The Gameplay Progression Agent arbitrates and
> makes the final call.

**Communication format** (verbatim from user plan):

> The faction sub-agents communicate in **natural language arguments**,
> with an attached **structured summary** for each argument containing:
>
> - **Position** — what the sub-agent is advocating for or against
> - **Faction impact** — how the proposal affects the sub-agent's side
> - **Win-rate prediction** — quantitative estimate of effect on outcomes
> - **Interest claim** — qualitative argument about player experience
>
> Natural language is the substance; the structured fields make it easier
> for the Gameplay Progression Agent to compare positions and for human
> review to skim logs without re-reading every exchange. The Gameplay
> Progression Agent has authority to cut off debate and decide when it's
> heard enough.
>
> This format was chosen deliberately:
>
> - "Interesting can override fair" is a qualitative judgment that win-rate
>   deltas alone can't capture. Boring-but-balanced is the failure mode to
>   avoid, and natural language forces the sub-agents to articulate _why_
>   something is interesting, frustrating, or anticlimactic.
> - It gives the Gameplay Progression Agent real positions to weigh rather
>   than just numbers to average — closer to what a human designer does.
> - Rich logs make hands-off operation viable. Spot-checking reasoning is
>   faster than reverse-engineering decisions from spreadsheets.
> - Adversarial natural language between agents tends to surface design
>   considerations that neither would generate alone.
>
> Throughput is not the bottleneck; quality of the resulting progression is.

#### Level Progression Agent — solo

User's plan (verbatim):

> The Level Progression Agent stays solo — environment design isn't a
> per-team problem in the same way (a long hallway is a long hallway for
> both sides), so the adversarial structure doesn't map cleanly there.
>
> This should be a separate agent from the Gameplay Progression Agent. The
> split is intentional on two fronts: the two agents are solving
> fundamentally different problems (working backward from a known end state
> vs. inventing forward into open space), and the multi-agent management is
> itself a goal of the project.

Responsibilities:

- Owns the setting-progression problem (§4).
- Designs each scenario's geometry, POST list, obstacle map, plane
  transitions, and any new environment mechanic.
- Has no faction sub-agents.

### 6.3 Mechanic ownership rule

User's plan (verbatim):

> To prevent scope collisions between the Gameplay and Level Progression
> Agents: unit, combat, and faction mechanics belong to Gameplay. Spatial
> and environmental mechanics belong to Level. When a proposed mechanic
> crosses the line — destructible walls, terrain that affects unit
> abilities, POST types that introduce new combat behavior, etc. — the
> agents flag it for human resolution rather than racing to claim it.

In practice the boundary cases are: POST types with combat side-effects
(L4 light-switch, L9 sump-pump), terrain hazards (basement water), and
environmental triggers for combat states (day/night per TBS §1.2 — does it
belong to Level or Gameplay?). All of these go to human review.

### 6.4 Research-agent follow-ups

User's plan (verbatim):

> The research agent who looked at comparable games may be able to help
> with the questions raised above — specifically, how level progression and
> unit progression are handled in the case-study games. Those answers should
> feed into both progression agents, but probably weigh more heavily for
> the Level Progression Agent.

Tier-1 implementation should commission a follow-up memo on
_environment_-progression patterns — the existing memos cover unit and
faction mechanics well but weren't framed around environment progression.
That memo feeds the Level PA.

---

## 7. Tensions resolved

Several spec / plan / memo tensions surfaced during this synthesis. Each is
called out so the agent system inherits a resolved view.

### 7.1 Win-rate range conflict

Spec specifies L1 `[65%, 80%]`; user plan specifies curve ~75% → ~50%.
Resolution: L1 = 75% (top of spec range). L2–L10 are governed by the
Tier-1 curve, not the L1 spec window. See §5.

### 7.2 Mechanic-floor conflict

Spec specifies pheromone-erasure L2+ and class-change L3+. User plan gives
Gameplay PA autonomy on mechanic placement. Resolution: hard floors (§3.1)
bind the PA; PA has autonomy _within_ the bounds.

### 7.3 Bathroom-as-Tier-1 vs bathroom-as-L1

The spec's "Tier 1: The bathroom expanding to the full house" reads
ambiguously. Roadmap resolution: bathroom is L1 only; L2–L10 are different
rooms in the same house. The "expanding to the full house" framing is
consistent with the 10-room sequence in §4.1. Narrative: L1 ends with the
spider queen swearing fealty per spec; L2–L10 are "the colony moves through
the house, one room at a time."

### 7.4 Existing within-scenario agents vs new across-scenario agents

The existing designer-agent system operates **inside** scenarios for
tuning; the new Progression Agents operate **across** scenarios for
distribution. The Gameplay PA _commissions_ the within-scenario loop on a
given scenario, with a curve target.

---

## 8. Open questions

Items the roadmap deliberately does not resolve, and where they go for
resolution:

1. **Specific mechanics-per-level mapping** — left to the Gameplay PA
   within the §3.4 constraints.
2. **Specific room geometry per level** — proposed in §4.1; refined by the
   Level PA.
3. **Per-scenario win condition variety.** Spec calls out spider-web
   capture as the L1 win condition. Should each L2–L10 have a unique
   objective, or do they all reduce to "destroy enemy stronghold"? This is
   an open question for the user (the obvious candidates: stairs as
   "reach the top," basement as "control the sump-pump for N turns,"
   garage as a multi-objective finale).
4. **Class-change tree shape.** Spec defers ("specific class trees are TBD
   by design agents"); mechanics memo §1.4 proposes charisma-gated
   single-step promotion as the v1 ceiling. The Gameplay PA picks the L3
   debut tree. Left open: whether biological-evolution (caterpillar →
   butterfly) lands in Tier 1 or waits for Tier 2.
5. **Currency continuity.** Gold tracking is in (R12); commander-cards
   shop (mechanics memo §1.3) is the v1 sink. Open question: do shops
   exist in the world loop between scenarios in Tier 1 (spec mentions a
   grasshopper shoebox shop in the ceiling at L1) or only inside
   scenarios? Resolution probably: yes, between-scenario shops exist;
   they're a world-loop feature.
6. **Faction sub-agent termination criterion.** The user plan says the
   Gameplay PA "has authority to cut off debate and decide when it's heard
   enough." The PA needs an explicit policy here — open question for the
   PA's prompt design.

---

## 9. Implementation phasing

Each phase has a clear entrance gate (what must be true before starting)
and exit criterion (what must be true to proceed).

### Phase A — Close the Level-1 build

**Entrance:** Phase 6 coevolution loop is at equilibrium (per `STATUS.md`,
already true).

**Work:** Land the six queued mechanics in user-specified order: 6, 5, 1,
2, 3, 4 (mechanics memo numbering: score-tiebreaker → formation slots →
tiered MP → combos → cards → charisma promotion). Each lands as its own
designer-agent round under the existing within-scenario loop.

**Exit:**

- All six mechanics in the build with passing engine tests.
- Win-rate landed at L1 target (~75% per §5).
- Fun Critic rubric satisfied.
- Level 1 is declared the canonical "all mechanics on" reference scenario.

### Phase B — Build the world loop

**Entrance:** Phase A complete.

**Work:** Implement what `game-outline.md` calls the world loop ("Between
scenarios. Player manages roster: organizes parties, equips units, recruits
new units at home base, applies experience to level up units, spends button
currency at shops"). This is currently absent from the build.

Concretely:

- Roster persistence across scenarios (which units / parties carry forward,
  XP retained, gold retained).
- Between-scenario party management (re-form parties, re-equip).
- Recruitment at home base.
- Shop interaction (the L1 grasshopper-shoebox / mouse-mercenary shop;
  later rooms get their own shops).
- Auto-save on scenario boundaries (per spec "Save system" section).

**Exit:**

- Two scenarios run end-to-end with a persistent roster between them. (The
  second scenario can be a stub copy of L1 for this milestone.)
- The auto-save / scenario-boundary save loop fires.
- Roster + gold + XP carry over correctly.

### Phase C — Build the Progression Agents

**Entrance:** Phase B complete.

**Work:** Implement the agent architecture in §6.

- Gameplay PA — orchestrator. Reads `game-outline.md`, the two memos, and
  the inventory of currently-implemented mechanics. Produces a per-scenario
  mechanic-distribution plan.
- Faction sub-agents (ant, spider) — natural-language + structured-summary
  format per §6.2. They argue scenario-by-scenario; the Gameplay PA
  arbitrates.
- Level PA — solo. Reads the spec, the memos, and the proposed 10-room
  sequence in §4.1. Produces per-scenario environment design.
- Wire all three into the existing within-scenario loop: the PA hands a
  scenario spec to the within-scenario designer agents, which tune to the
  curve target.

**Exit:**

- The Gameplay PA + faction sub-agents produce a coherent mechanic-
  distribution plan for L2–L10 that respects all hard floors and
  cumulative-addition rule.
- The Level PA produces a coherent 10-room environment plan (which may or
  may not match §4.1's proposal; both are inputs to its decision).
- The mechanic-ownership boundary cases (§6.3) are surfaced and resolved
  by human review.

### Phase D — Design and implement Levels 2–10

**Entrance:** Phase C complete; PAs have produced their plans.

**Work:** Build out scenarios in sequence (L2 → L10). For each scenario:

1. Level PA finalizes geometry, POST list, obstacles, transitions.
2. Gameplay PA + faction sub-agents finalize mechanic delta from previous
   scenario.
3. Within-scenario designer agents tune to the win-rate target.
4. Fun Critic gates the result.
5. Replay/transcript review by humans before the scenario is locked.

**Exit:**

- All ten scenarios run end-to-end with persistent roster.
- Each scenario hits its win-rate-curve target (within the loose tolerance
  the user authorized).
- Fun Critic clears all ten.
- A Tier-1 retrospective: which mechanics-per-level placements worked,
  which felt forced, which open questions need answers before Tier 2.

---

## 10. Cross-references

Where this roadmap defers to other docs:

- **`game-outline.md`**: World model, POSTs, the three loops, stats, parties,
  the Queen, Royal Jelly, fog, abilities, currency, shops, XP, class change,
  save system, campaign structure, Level 1 setup/victory/enemy/narrative,
  open questions, success criteria, tuning levers. **None of this is
  duplicated here**; the roadmap references these sections by name.
- **`docs/design-memo-tbs-expert.md`** (TBS memo): §1.1 parallel capture
  chain; §1.2 day/night; §1.3 plane-affinity; §1.4 asymmetric plane-switch;
  §1.5 pheromone trail; §2.1 leader-driven party identity; §2.2 civic
  slots; §2.3 promote chain (superseded by mechanics memo §1.4); §2.4
  aggression score; §2.5 espionage queen-ult.
- **`docs/design-memo-mechanics-research.md`** (mechanics memo): §1.1
  tiered MP; §1.2 combo abilities; §1.3 commander cards; §1.4 charisma
  promotion (supersedes TBS §2.3); §1.5 formation slots; §1.6
  score-tiebreaker.
- **`STATUS.md`**: current Phase-6 coevolution loop state, the within-
  scenario designer-agent system that Tier-1 work inherits.
- **`PLAN.md`**: original phase-by-phase execution plan; Tier-1 work
  begins where it leaves off.

This roadmap does not replace any of those — it composes them into a
ten-scenario plan with explicit ownership of who decides what.
