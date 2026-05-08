# SPEC A: Food Fight — Battle of the Ants

> **Current build status (post-round-18)**: Level 1 is implemented and
> passing the gate at ~57% baseline ant win rate (within the spec's
> 65-80% range when L1 is targeted at 75% per `docs/roadmap-tier-1.md`).
> Mechanics in place: per-seed map randomization, plane affinity,
> asymmetric plane-switch, day/night cycle, pheromone trail, neutral
> parties (mice/cockroaches/stinkbugs) with recruit + hypnotize, gold
> tracking, items (6 templates with stat buffs), retreat/flee with
> pre-battle threat assessment, POST 2-turn capture hold, spider
> heal-priority web defense, pre-game placement, scout-majority speed
> bonus. See `STATUS.md` for round-by-round detail.
>
> **Tier-1 execution plan**: `docs/roadmap-tier-1.md` is the authoritative
> roadmap for Levels 1–10. This spec defines the static game model;
> the roadmap defines how to introduce mechanics across the tier.

## Project framing

Food Fight is a turn-based single-player strategy game inspired by Ogre Battle. The player controls a colony of ants commanded by their Queen, deploying parties across multi-plane environments (floor / wall / ceiling, and others as scenarios scale up) to capture strategic positions and defeat opposing factions. The campaign begins in a single bathroom and escalates over the course of dozens of scenarios to encompass houses, yards, neighborhoods, and eventually a city block — with new mechanics, units, and command-scale paradigms introduced at each tier.

This document specifies Level 1 (Ants vs Spiders, bathroom) in detail, with broader campaign and system architecture sketched at the level needed to keep Level 1 design choices forward-compatible.

The game has no graphics in the planning phase. State is tracked in structured data; output is text and JSON. Visual presentation is a future consideration.

## Design tone

The game is deliberately silly while taking its mechanics seriously. Ants speak in army-movie clichés and overuse acronyms (Position Of Strategic interesT — P.O.S.T. — being the foundational example). Food-themed weaponry. Household environments. Biologically grounded creature behavior wherever it can be had without sacrificing playability. Knowingly stupid is a feature; gameplay depth is non-negotiable.

## Core mechanics

### World model

The game world is represented as a stacked set of 2D grid planes. In Level 1, three planes are in use: Floor, Wall, and Ceiling. Future scenarios introduce additional planes (Underfloor, Inside-Wall, Outside-Surface) as the environment expands. Each plane is a tile grid (~10×10 in Level 1) with terrain types, obstacles, and POSTs.

Planes are connected by _plane transitions_, which are paired POSTs — one on each plane — that together form a transit corridor. To move a unit between planes via a transition, the moving party must control both endpoints simultaneously. Some unit types (flying units, climbing units) can transition between specific plane pairs without using paired POSTs; other unit types (e.g., mice) are restricted to specific planes and require transitions to move at all.

### POSTs (Position Of Strategic interesT)

POSTs are named locations on the map that serve as strategic nodes. Each POST has:

- A location (which plane, which tile)
- An ownership state (player / enemy / neutral)
- A defensive bonus that applies to garrisoned parties
- Optional special properties (healing accelerator, ability access, plane transition endpoint, shop, etc.)
- An optional pairing with another POST (for plane transitions)

POSTs are captured by defeating the garrisoning party in battle (which forces the loser to retreat) and then occupying the now-undefended POST with a friendly party. Garrisoned parties heal at accelerated rates while occupying friendly POSTs. POST ownership confers map control benefits and is the primary axis of strategic competition.

Level 1 contains 5 POSTs:

- **The Storm Drain** — Queen's home base. Floor plane, corner. Player starts here. Loss condition: Queen dies here.
- **The Soap Dish** — Neutral start, contestable, defensive bonus. Floor plane.
- **The Towel Rack** — Floor plane. Plane transition endpoint paired with Wall Crack.
- **The Wall Crack** — Wall plane. Plane transition endpoint paired with Towel Rack.
- **The Spider Web** — Ceiling plane, far corner. Spider stronghold. Player victory: destroy the web.

### The three loops

**World loop.** Between scenarios. Player manages roster: organizes parties, equips units, recruits new units at home base, applies experience to level up units, spends button currency at shops. Triggered by completing or failing a scenario.

**Scenario loop.** Within a scenario, on a map. Turn-based. Each turn:

1. Player issues or revises movement orders for parties (orders persist across turns until completed or revised)
2. Both sides' parties execute movement simultaneously up to their movement allowance
3. When parties from opposing sides occupy the same tile, battle is triggered
4. Special abilities resolve (PheroBlast, plane-switching, etc.)
5. Victory/loss conditions checked

**Battle loop.** Triggered by intersection. Auto-resolved JRPG-style. Player chooses pre-battle posture (Run / Fight / Defend) and may apply strategy modifiers (offensive, defensive, protect leader, target weakest, etc.). Battle resolves over 3-5 internal rounds with unit-vs-unit pairings determined by posture and class matchups. Outcomes:

- Loser's party retreats one tile from the battle location (winner remains stationary, holds ground)
- Surviving units take damage and earn experience
- If a party leader dies, the party automatically retreats toward home base at reduced movement speed; uncontrollable until leader is revived at home base
- If a party is destroyed entirely, it is lost for the scenario duration

### Stats and unit design

Unit stats: HP, Attack, Agility, Armor, Intelligence, Constitution.

JRPG conventions apply: damage is calculated from attacker's Attack vs defender's Armor; Agility determines turn order in battle rounds; Intelligence governs special abilities; Constitution governs environmental resistance (water, hazards, terrain damage).

**Ant design principle:** Ants have disproportionately high Attack and Constitution, low HP. They hit hard, survive environmental hazards well, but die quickly in protracted combat. They are designed to win battles fast or lose them costly.

**Cooperative ant mechanic:** Ants near the Queen, or carrying Royal Jelly, gain bonus Attack and resilience. Multiple ants in close formation may combine for stronger group attacks (specific implementation TBD by design agents).

### Parties

Parties are 8 slots wide. Unit size cost: small = 1 slot, medium = 2 slots, large = 3 slots, huge = 4-5 slots. The Queen's party (the home base garrison) is exceptional: 12 slots, with the Queen herself occupying 4 of them.

Each party has a leader. Leader class confers a party-wide modifier (specifics TBD by design agents). Leader death triggers retreat-to-base behavior.

A party's movement allowance per turn is determined by its slowest member modified by terrain type. Some terrain types have preferred paths that grant movement bonuses to ground units; flying units ignore paths and move in straight tile sequences.

Parties scale with campaign progression: 8 slots at start, doubling at each major tier transition (8 → 16 → 32 → 64 → 128 → 256). Aggregation tools (formations, templates, standing orders, subordinate captains) are introduced at each tier to keep the player's cognitive load manageable as roster size grows.

### The Queen

The Queen is the player's commander, located at home base, immobile within a scenario. She must be relocated narratively between scenarios as the campaign progresses (Level 1 ends with the spider queen swearing fealty and helping move the Ant Queen to the next location).

Queen properties:

- Cannot move during a scenario
- Brutal stats — extremely high Attack
- Fights in defense if home base is attacked
- Has a charging "ultimate" ability that builds slowly over the course of the scenario; player-triggered when ready; typically wipes most or all attackers from the battle when used
- Produces ant units at a rate that increases with colony size and Queen level
- Confers Queen-proximity bonuses to nearby ant units
- Death = immediate scenario loss

### Royal Jelly

A consumable resource produced at home base. Parties can carry doses; consuming a dose grants Queen-proximity bonuses for a limited duration. Capacity per party, production rate per turn, and effect magnitude are tuning parameters. Royal Jelly creates strategic logistics: forward parties must return to home base to resupply, or be supplied by support parties.

### Fog of war

The player has limited visibility. Enemy parties' locations and approximate strength (small / medium / large) are visible; exact composition is revealed only in battle. Pheromone trails from ant movement reveal terrain. Some enemy unit types can erase pheromone trails on tiles where no friendly units are present, restoring fog. (Pheromone-erasure mechanic is planned for Level 2+; Level 1 uses simple persistent fog-of-war.)

### Out-of-battle abilities

Most units have no out-of-battle actions. Selected units (mages, healers, scouts, special-class) have abilities that function as one-off or limited-use effects. Abilities fall into a taxonomy:

- _Information abilities_ (e.g., PheroBlast — clear fog around party)
- _Movement abilities_ (e.g., Boat-Form — worker ants chain into floating platform; Plane-Switch — bypass standard plane transition requirements)
- _Buff/debuff abilities_ (e.g., apply Royal Jelly)
- _Special attacks_ (e.g., the Queen's ultimate)

Specific abilities and their numbers are TBD by design agents.

### Currency and economy

**Buttons** are the currency for the early campaign (Levels 1-20 approximately). Buttons are awarded for scenario completion, captured POSTs, and defeated enemies. Spent at shops on healing items, stat-boost potions, equipment, and recruitment.

When the campaign scales up to the city-block tier, button currency is narratively abandoned and replaced with real currency (the colony has gone professional). This is both a tonal escalation and a mechanical reset point.

### Shops

Shops appear at certain POSTs in towns / safe locations between scenarios. Level 1's shop equivalent is a forgotten shoebox in the ceiling, run by a grasshopper, with one mouse mercenary available at high cost. Shops sell healing items, stat boosters, and occasionally mercenary unit recruitment.

### Experience and leveling

Units earn XP from individual battle participation and from collective scenario victory (alive-at-end XP for all surviving units). Leveling up grants HP and stat increases. Level-ups are processed in the world loop between scenarios.

No morality system. No alignment shifts based on whom you killed. Straightforward XP-and-levels.

### Class change

Class change is introduced in later scenarios (~Level 3+). Two principle modes:

- _Biological evolution_ (caterpillar → butterfly: weak ground unit becomes powerful flying unit at threshold)
- _Equipment progression_ (ant soldiers gain new weaponry and gear at level thresholds; class is functionally defined by equipment loadout)

Specific class trees are TBD by design agents.

### Save system

Save anywhere, save anytime. Always-available save-and-quit. Mid-scenario save slots supported. Auto-save on scenario boundaries.

## Campaign structure

Scenarios are organized in 10-scenario tiers. Each tier introduces new units, mechanics, and environments cumulatively. Tier transitions reset the operating paradigm — new home base scale, new party-size cap, new command tools.

Approximate tier outline:

- **Tier 1 (Scenarios 1-10):** The bathroom expanding to the full house. Party cap: 8. Currency: buttons. New units introduced one or two per scenario, accumulated.
- **Tier 2 (Scenarios 11-20):** The yard and neighboring houses. Party cap: 16. Larger command base (e.g., living-room desk array). Currency: buttons + emergent real currency.
- **Tier 3 (Scenarios 21-30):** The block. Party cap: 32. Full transition to real currency.
- _Subsequent tiers_ scale up through neighborhoods, districts, the city, etc., doubling party caps and introducing new command paradigms (subordinate captains for delegation, automated standing orders, etc.).

Difficulty scales with tier transitions, not within tiers. Within a tier, scenarios introduce variety; between tiers, the stakes raise.

## Level 1: Ants vs Spiders (the bathroom)

### Setup

The Ant colony emerges from the bathroom storm drain in the corner. The bathroom is a 10×10 grid spanning three planes (floor, wall, ceiling). A spider colony occupies the ceiling corner opposite the storm drain, anchored by a large web. Five POSTs exist as listed above.

The Ant Queen is at the storm drain with her 12-slot home guard. The player has additional starting parties (TBD count, ~3) for field deployment.

The Spider Queen is in the web with her elite guard. Spider parties (TBD count) are positioned defensively near the web and at one to two POSTs near the web side of the map.

### Victory conditions

- **Player victory:** Destroy the spider web (capture the Web POST).
- **Player loss:** The Ant Queen dies at home base.

### Enemy behavior (Level 1, tutorial)

The spiders' pattern is _explicitly described_ to the player at scenario start ("Sergeant Antonio briefs you: spiders will hunker down at the web, send scouts toward the soap dish, and respond to threats on plane transitions"). Tutorial transparency. Later scenarios reduce explicit pattern disclosure, requiring the player to deduce.

### Narrative bridge to Level 2

On player victory, the spider queen swears fealty. Spider units join the player's roster. The combined colony helps relocate the Ant Queen to the next scenario location.

## Open design questions for the agent system

Most originally-open items have been answered through the build process
(`STATUS.md`) and locked into data files (`data/level-1/`). Items still
genuinely open for the agent system to propose:

- Leader class bonuses (deferred — leaders exist but party-wide bonus
  effects are not yet implemented).
- Specific level-up stat curves (deferred to world loop / Phase B per
  roadmap).
- Class-change trees: bio-evolution tree shape (caterpillar → butterfly
  family). Trigger debut at L3 is locked; specific trees are PA-authored.
- Specific terrain types and modifiers (plane affinity exists; per-tile
  terrain types like grass/water/mud do not).
- Sergeant Antonio's voice and grasshopper-shop dialogue (writing task).
- Per-scenario POST flavor for L2–L10 (Level PA per roadmap §4.1).

Items previously listed but now answered (see `data/level-1/` for current
values):

- Specific stat values for all Level 1 units → `units.json`
- Specific battle resolution math → `engine/combat.ts`
- Cooperative ant mechanic → jelly + queen-proximity stack
- Queen ultimate behavior and charge time → `queen.json`
- Royal Jelly numbers → `jelly.json`
- Full unit roster for ants and spiders → `roster-ants.json`,
  `roster-spiders.json`
- POST defensive bonus values → `map.json`
- Out-of-battle ability list → `abilities.json` (17 abilities)
- Shop inventory and pricing → roadmap §6.5 (between-scenario shops
  spec'd; specific pricing TBD by Gameplay PA)
- Scenario layout → per-seed randomization (`engine/map-gen.ts`) plus
  pre-game placement (round-7 mechanic)

## Success criteria for Level 1

- **Win rate:** A locked baseline player AI should win Level 1 65-80% of the time against the designed enemy AI. (Higher = too easy; lower = too hard.) Per `docs/roadmap-tier-1.md` §5, L1 is targeted at the **top of this range (~75%)** because the Tier-1 win-rate curve runs from ~75% at L1 down to ~50% by L10.
- **Luck factor:** Across 100 simulated runs of identical conditions, win-rate variance should be measurable but not dominant. (Wins should reflect strategy, not coin flips.)
- **Route diversity:** At least three meaningfully different strategic approaches should produce wins (e.g., direct rush via towel-rack/wall-crack; soap-dish staging then ceiling assault; defensive turtle until Queen ultimate triggers).
- **Watchability:** Read playtest transcripts. Decisions should be articulate-able and the game should be interesting to read about, not just to track.
- **Fun Critic approval:** A dedicated agent reviews scenarios for tactical interest beyond mechanical balance. Scenarios that pass mechanical checks but fail Fun Critic review are flagged for redesign.

## Tuning levers

When success criteria are not met, the following parameters can be adjusted (in roughly this order of preference):

1. Enemy pattern (predictability, aggression, response thresholds)
2. Initial circumstances (party positions, starting POST ownership, Queen guard composition)
3. Battlefield (POST count, POST placement, terrain features, plane transition layout)
4. Scenario goal (alternative or supplementary win conditions)

The player roster is held constant once established — tuning happens against a fixed reference player force.
